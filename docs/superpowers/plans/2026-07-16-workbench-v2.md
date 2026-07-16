# 小贺的工作台 V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有本地优先启动台、账户同步、视觉风格和部署架构的基础上，一次发布完成多页面导航、全局指令中心、万能收集箱、增强书签、今日计划、专注统计、GitHub 面板和状态中心。

**Architecture:** React 应用增加 Browser History 路由和共享工作台 Provider，四个页面按领域懒加载；所有用户数据继续使用通用 `SyncEntity` 先写 Dexie 再同步 D1。Cloudflare API Worker 增加受限链接预览和健康 CORS，站点 Worker 增加只针对 HTML 导航的 SPA 回退。

**Tech Stack:** React 19、TypeScript 6、Vite 8、react-router-dom 7.18.1、Dexie 4、Zod 4、Hono、Motion、dnd-kit、Vitest、Testing Library、Playwright、Cloudflare Workers/D1、GitHub Pages。

## Global Constraints

- 仅增量升级现有项目，不替换技术栈，不删除现有搜索、书签、今日专注、主题、备份、账户、恢复码、同步或 PWA。
- 主站固定为 `https://080492.xyz`，API 固定为 `https://api.080492.xyz`，GitHub 仓库固定为 `hzkloveyou/xiaohe-workbench`。
- 密码证明继续由浏览器执行 PBKDF2-SHA-256 310,000 次；Worker 只哈希 43 字符证明。
- 不新增 `public/CNAME`；自定义域名继续由 `xiaohe-workbench-site` Worker Route 代理 GitHub Pages 项目路径。
- 所有用户数据先写 IndexedDB；登录仅用于跨设备同步，网络错误不得阻止本地操作。
- 不在代码、日志、D1 工作台实体、浏览器存储、备份或交付包中保存 GitHub/Cloudflare 私人令牌。
- 新字段和新实体必须兼容已有备份与 D1 `workspace_entities`；本次不做破坏性 D1 迁移。
- 所有交互覆盖加载、空、错误、离线和禁用状态；触控目标不小于 44px；支持键盘和 `prefers-reduced-motion`。
- 每项实现遵循 Red → Green → Refactor；每个任务结束运行聚焦测试并提交独立 Git commit。

---

## File Structure

- `src/app/App.tsx`: 只装配 BrowserRouter、WorkspaceProvider 和 AppShell。
- `src/app/router/routes.tsx`: 路由表与页面懒加载。
- `src/app/router/AppShell.tsx`: 品牌、桌面导航、手机底栏、账户、指令中心和 Toast。
- `src/app/workspace/WorkspaceProvider.tsx`: 快照、账户、同步、主题和实体写入的唯一 React 边界。
- `src/app/workspace/workspace-actions.ts`: 创建、更新、删除实体的无 UI 领域动作。
- `src/pages/*.tsx`: Overview、Collect、Today、Connect 四个页面。
- `src/features/command/*`: 指令索引、匹配、键盘选择和弹层。
- `src/features/inbox/*`: 输入分类、待整理实体和收集界面。
- `src/features/bookmarks/*`: 书签模型、筛选、收藏、标签、访问记录和拖拽。
- `src/features/planner/*`: 任务模型、日期/重复规则、编辑器和列表。
- `src/features/focus/*`, `src/features/insights/*`: 计时状态、会话落库和七天统计。
- `src/features/github/*`: GitHub 公开 API、运行时校验、缓存和面板。
- `src/features/status/*`: 固定服务健康检查和状态卡。
- `shared/entities.ts`, `shared/contracts.ts`: 前后端共享实体与 Zod 契约。
- `src/lib/db/*`, `src/lib/sync/*`: Dexie 元数据、同步游标、批量推送和主动拉取。
- `worker/preview.ts`: 受限链接预览路由。
- `worker/site-proxy.ts`: GitHub Pages 代理与 HTML 导航回退。
- `tests/**`, `e2e/workbench-v2.spec.ts`: 新功能、回归、无障碍和跨页面验收。

### Task 1: 建立多页面路由和安全 SPA 回退

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/app/router/routes.tsx`
- Create: `src/app/router/AppShell.tsx`
- Create: `src/pages/OverviewPage.tsx`
- Create: `src/pages/CollectPage.tsx`
- Create: `src/pages/TodayPage.tsx`
- Create: `src/pages/ConnectPage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `worker/site-proxy.ts`
- Test: `tests/worker/site-proxy.test.ts`
- Test: `e2e/workbench-v2.spec.ts`

**Interfaces:**
- Consumes: existing `AccountMenu`, `Button`, `Toast`, `createSiteProxy(fetcher)`.
- Produces: `APP_ROUTES`, `AppRoutes`, `AppShell`, route URLs `/`, `/collect`, `/today`, `/connect`.

- [ ] **Step 1: Add failing Worker and E2E tests**

```ts
it("falls back to the app shell only for HTML navigation", async () => {
  const fetcher = vi.fn(async (request: Request) =>
    new URL(request.url).pathname.endsWith("/collect")
      ? new Response("missing", { status: 404 })
      : new Response('<div id="root"></div>', { status: 200, headers: { "Content-Type": "text/html" } })
  );
  const response = await createSiteProxy(fetcher).fetch(
    new Request("https://080492.xyz/collect", { headers: { Accept: "text/html" } })
  );
  expect(response.status).toBe(200);
  expect(await response.text()).toContain('id="root"');
});

test("switches all four pages and refreshes a deep link", async ({ page }) => {
  await page.goto("/collect");
  await expect(page.getByRole("heading", { name: "收集与书签" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "收集与书签" })).toBeVisible();
});
```

- [ ] **Step 2: Run tests and confirm the missing router/fallback failures**

Run: `pnpm vitest run tests/worker/site-proxy.test.ts && pnpm playwright test e2e/workbench-v2.spec.ts --project=desktop`

Expected: FAIL because `/collect` has no route and the proxy returns the upstream 404.

- [ ] **Step 3: Install router and implement the app shell**

Run: `pnpm add react-router-dom@7.18.1`

```tsx
export const APP_ROUTES = [
  { to: "/", label: "概览", icon: "⌂" },
  { to: "/collect", label: "收集", icon: "＋" },
  { to: "/today", label: "今日", icon: "✓" },
  { to: "/connect", label: "连接", icon: "◎" }
] as const;

export function AppRoutes() {
  return <Routes>
    <Route element={<AppShell />}>
      <Route index element={<OverviewPage />} />
      <Route path="collect" element={<CollectPage />} />
      <Route path="today" element={<TodayPage />} />
      <Route path="connect" element={<ConnectPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>;
}
```

In `site-proxy.ts`, request the original upstream first; when it returns 404 and `request.mode === "navigate"` or `Accept` contains `text/html`, fetch `${PROJECT_PREFIX}/` and return that HTML with status 200. Never apply fallback to paths containing a file extension or requests whose Accept does not include HTML.

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run tests/worker/site-proxy.test.ts && pnpm playwright test e2e/workbench-v2.spec.ts --project=desktop`

Expected: PASS; direct `/collect` navigation returns the app shell while a missing `.js` remains 404.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/app src/pages worker/site-proxy.ts tests/worker/site-proxy.test.ts e2e/workbench-v2.spec.ts
git commit -m "feat: add multi-page workbench shell"
```

### Task 2: 扩展向后兼容的共享数据契约

**Files:**
- Modify: `shared/entities.ts`
- Modify: `shared/contracts.ts`
- Test: `tests/contracts.test.ts`
- Test: `tests/backup.test.ts`

**Interfaces:**
- Produces: `BookmarkData`, `TaskData`, `InboxItemData`, `FocusSessionData`, `PreferenceData`, expanded `EntityType`.
- Consumes: existing `WorkspaceSnapshot` version 1 and old task/bookmark shapes.

- [ ] **Step 1: Write failing compatibility and new-entity tests**

```ts
it("accepts old bookmarks and new optional bookmark fields", () => {
  expect(syncEntitySchema.parse(oldBookmark)).toEqual(oldBookmark);
  expect(syncEntitySchema.parse({
    ...oldBookmark,
    data: { ...oldBookmark.data, tags: ["开发"], favorite: true, visitCount: 2, lastVisitedAt: 10 }
  })).toBeTruthy();
});

it("accepts inbox items and focus sessions", () => {
  expect(syncEntitySchema.parse({ id: "inbox-1", type: "inboxItem", updatedAt: 1,
    data: { kind: "note", raw: "灵感", status: "pending", createdAt: 1 } })).toBeTruthy();
  expect(syncEntitySchema.parse({ id: "focus-1", type: "focusSession", updatedAt: 2,
    data: { plannedMs: 1500000, actualMs: 1500000, startedAt: 1, endedAt: 1500001, completed: true } })).toBeTruthy();
});
```

- [ ] **Step 2: Run tests and confirm schema rejection**

Run: `pnpm vitest run tests/contracts.test.ts tests/backup.test.ts`

Expected: FAIL because `inboxItem` and `focusSession` are not discriminated-union members.

- [ ] **Step 3: Add exact shared types and optional compatibility fields**

```ts
export type TaskPriority = "low" | "medium" | "high";
export type RecurrenceRule = "daily" | "weekly" | "monthly";
export interface BookmarkData { title: string; url: string; groupId: string; order: number; icon?: string; tags?: string[]; favorite?: boolean; visitCount?: number; lastVisitedAt?: number }
export interface TaskData { title: string; completed: boolean; order: number; scheduledFor?: string; dueAt?: string; priority?: TaskPriority; note?: string; recurrence?: RecurrenceRule; seriesId?: string; completedAt?: number }
export interface InboxItemData { kind: "link" | "note" | "task"; raw: string; status: "pending" | "archived"; createdAt: number; title?: string; url?: string; scheduledFor?: string }
export interface FocusSessionData { plannedMs: number; actualMs: number; startedAt: number; endedAt: number; completed: boolean; taskId?: string }
export interface PreferenceData { searchEngine?: "bing" | "baidu" | "google"; githubUsername?: string; panels?: Record<string, boolean> }
```

Extend the Zod discriminated union with bounded strings, arrays capped at 20 tags, ISO date regexes, finite orders, nonnegative visit counts, focus duration capped at 24 hours, and old task unions unchanged.

- [ ] **Step 4: Run contract and backup tests**

Run: `pnpm vitest run tests/contracts.test.ts tests/backup.test.ts`

Expected: PASS for old and new snapshots; invalid URLs, oversized tags and negative durations remain rejected.

- [ ] **Step 5: Commit**

```bash
git add shared/entities.ts shared/contracts.ts tests/contracts.test.ts tests/backup.test.ts
git commit -m "feat: extend synced workspace entities"
```

### Task 3: 修复同步首次拉取、游标和批量推送

**Files:**
- Modify: `src/lib/db/repository.ts`
- Modify: `src/lib/sync/api.ts`
- Modify: `src/lib/sync/engine.ts`
- Modify: `worker/sync.ts`
- Modify: `worker/sync-service.ts`
- Test: `tests/repository.test.ts`
- Test: `tests/sync-engine.test.ts`
- Test: `tests/worker/sync.test.ts`

**Interfaces:**
- Produces repository methods `getSyncCursor(): Promise<number>`, `setSyncCursor(cursor: number): Promise<void>`.
- Produces engine methods `flush(): Promise<void>`, `start(): void`, `stop(): void`, `subscribe(listener)`.
- Consumes `SyncApi.push(changes)` and `SyncApi.pull(since)`.

- [ ] **Step 1: Write failing pull-without-pending and batching tests**

```ts
it("pulls remote data on a clean new device", async () => {
  repository.getPendingChanges.mockResolvedValue([]);
  repository.getSyncCursor.mockResolvedValue(0);
  api.pull.mockResolvedValue({ changes: [remoteBookmark], cursor: 42 });
  await engine.flush();
  expect(api.pull).toHaveBeenCalledWith(0);
  expect(repository.applyRemoteChanges).toHaveBeenCalledWith([remoteBookmark]);
  expect(repository.setSyncCursor).toHaveBeenCalledWith(42);
});

it("pushes more than 500 changes in bounded batches", async () => {
  repository.getPendingChanges.mockResolvedValue(changes501);
  await engine.flush();
  expect(api.push.mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 101]);
});
```

- [ ] **Step 2: Run focused tests and confirm current early return**

Run: `pnpm vitest run tests/repository.test.ts tests/sync-engine.test.ts tests/worker/sync.test.ts`

Expected: FAIL because the engine returns when pending changes are empty and repository has no cursor methods.

- [ ] **Step 3: Implement cursor persistence and one-flight synchronization**

```ts
const PUSH_BATCH_SIZE = 200;
let inFlight: Promise<void> | null = null;

async function synchronize() {
  const pending = await repository.getPendingChanges();
  for (let offset = 0; offset < pending.length; offset += PUSH_BATCH_SIZE) {
    const result = await api.push(pending.slice(offset, offset + PUSH_BATCH_SIZE));
    await repository.removePendingChanges(result.acknowledgedIds);
  }
  const cursor = await repository.getSyncCursor();
  const remote = await api.pull(cursor);
  const snapshot = await repository.getSnapshot();
  await repository.applyRemoteChanges(mergeEntities(snapshot.entities, remote.changes));
  await repository.setSyncCursor(remote.cursor);
}

function flush() {
  if (inFlight) return inFlight;
  inFlight = synchronize().finally(() => { inFlight = null; });
  return inFlight;
}
```

Persist `syncCursor` in the Dexie `meta` table. Start a 60-second controlled interval only while logged in, also flush on `online` and visible-page transitions; use retry delays 2s, 5s, 15s, 30s capped at 60s. A 401 sets `needs-auth` and schedules no retry.

- [ ] **Step 4: Run sync suites**

Run: `pnpm vitest run tests/repository.test.ts tests/sync-engine.test.ts tests/worker/sync.test.ts`

Expected: PASS, including offline queue retention, first-device pull, batching, idempotency and authorization.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/repository.ts src/lib/sync worker/sync.ts worker/sync-service.ts tests/repository.test.ts tests/sync-engine.test.ts tests/worker/sync.test.ts
git commit -m "fix: make cloud sync pull and retry reliably"
```

### Task 4: 提取工作台 Provider 与共享应用动作

**Files:**
- Create: `src/app/workspace/WorkspaceProvider.tsx`
- Create: `src/app/workspace/workspace-context.ts`
- Create: `src/app/workspace/workspace-actions.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/router/AppShell.tsx`
- Test: `tests/WorkspaceProvider.test.tsx`
- Test: `tests/accessibility.test.tsx`

**Interfaces:**
- Produces `useWorkspace(): WorkspaceContextValue`.
- Produces actions `commit(changes)`, `remove(entity)`, `setTheme(theme)`, `importSnapshot(snapshot)`, `refresh()`, `showToast(message)`.
- Consumes existing repository, auth API and sync engine.

- [ ] **Step 1: Write failing provider lifecycle tests**

```tsx
function Probe() {
  const workspace = useWorkspace();
  return <output>{workspace.loading ? "loading" : `${workspace.snapshot?.theme}:${workspace.entities.length}`}</output>;
}

it("initializes defaults and exposes one shared snapshot", async () => {
  render(<WorkspaceProvider repository={repository}><Probe /></WorkspaceProvider>);
  expect(await screen.findByText(/^morning:/)).toBeVisible();
  expect(repository.initializeDefaults).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run test and confirm missing context**

Run: `pnpm vitest run tests/WorkspaceProvider.test.tsx tests/accessibility.test.tsx`

Expected: FAIL because `WorkspaceProvider` and `useWorkspace` do not exist.

- [ ] **Step 3: Implement a focused provider and shrink App**

```ts
export interface WorkspaceContextValue {
  snapshot: WorkspaceSnapshot | null;
  entities: SyncEntity[];
  loading: boolean;
  user: AuthUser | null;
  syncState: SyncState;
  commit(changes: SyncEntity[]): Promise<void>;
  remove(entity: SyncEntity): Promise<void>;
  setTheme(theme: ThemeId): Promise<void>;
  importSnapshot(snapshot: WorkspaceSnapshot): Promise<void>;
  refresh(): Promise<void>;
  showToast(message: string): void;
}
```

`App.tsx` becomes `BrowserRouter → WorkspaceProvider → AppRoutes`; dialogs, account state, Toast and sync state live in the provider/shell. Memoize context actions and prevent timer ticks from recreating the sync engine.

- [ ] **Step 4: Run provider and accessibility tests**

Run: `pnpm vitest run tests/WorkspaceProvider.test.tsx tests/accessibility.test.tsx`

Expected: PASS with one initialization, one app-level main landmark and no automatic axe violations.

- [ ] **Step 5: Commit**

```bash
git add src/app tests/WorkspaceProvider.test.tsx tests/accessibility.test.tsx
git commit -m "refactor: isolate shared workspace state"
```

### Task 5: 实现全局指令中心

**Files:**
- Create: `src/features/command/command-model.ts`
- Create: `src/features/command/CommandPalette.tsx`
- Create: `src/features/command/useCommandShortcut.ts`
- Modify: `src/app/router/AppShell.tsx`
- Modify: `src/features/search/SearchBar.tsx`
- Test: `tests/command-model.test.ts`
- Test: `tests/CommandPalette.test.tsx`

**Interfaces:**
- Produces `buildCommands(context): CommandItem[]`, `filterCommands(items, query): CommandItem[]`.
- `CommandItem = { id: string; group: "suggested" | "page" | "bookmark" | "action" | "web"; label: string; keywords: string[]; run(): void }`.

- [ ] **Step 1: Write failing ranking and keyboard tests**

```ts
it("ranks exact bookmark titles before fuzzy keyword matches", () => {
  const results = filterCommands(items, "GitHub");
  expect(results[0]?.id).toBe("bookmark-github");
});

it("opens with Ctrl+K and executes the selected command", async () => {
  render(<CommandPaletteHarness />);
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  expect(screen.getByRole("dialog", { name: "全局指令中心" })).toBeVisible();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "今日" } });
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
  expect(navigate).toHaveBeenCalledWith("/today");
});
```

- [ ] **Step 2: Run tests and confirm missing model/UI**

Run: `pnpm vitest run tests/command-model.test.ts tests/CommandPalette.test.tsx`

Expected: FAIL because command exports do not exist.

- [ ] **Step 3: Implement deterministic matching and accessible selection**

```ts
export function filterCommands(items: CommandItem[], raw: string): CommandItem[] {
  const query = raw.trim().toLocaleLowerCase("zh-CN");
  if (!query) return items.filter((item) => item.group === "suggested").slice(0, 8);
  return items
    .map((item) => ({ item, score: scoreCommand(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label, "zh-CN"))
    .slice(0, 12)
    .map(({ item }) => item);
}
```

Use `role="combobox"`, `role="listbox"`, `aria-activedescendant`, ArrowUp/ArrowDown/Enter/Escape, scroll selected result into view, restore trigger focus on close, and present web search plus quick capture fallbacks when no local command matches.

- [ ] **Step 4: Run command tests**

Run: `pnpm vitest run tests/command-model.test.ts tests/CommandPalette.test.tsx tests/SearchBar.test.tsx`

Expected: PASS for keyboard, mobile click, ranking, escape and no-result fallbacks.

- [ ] **Step 5: Commit**

```bash
git add src/features/command src/features/search/SearchBar.tsx src/app/router/AppShell.tsx tests/command-model.test.ts tests/CommandPalette.test.tsx tests/SearchBar.test.tsx
git commit -m "feat: add global command center"
```

### Task 6: 实现万能收集箱和受限链接预览

**Files:**
- Create: `src/features/inbox/inbox-model.ts`
- Create: `src/features/inbox/QuickCapture.tsx`
- Create: `src/features/inbox/InboxList.tsx`
- Create: `src/features/inbox/preview-api.ts`
- Create: `worker/preview.ts`
- Modify: `worker/index.ts`
- Modify: `src/pages/CollectPage.tsx`
- Test: `tests/inbox-model.test.ts`
- Test: `tests/QuickCapture.test.tsx`
- Test: `tests/worker/preview.test.ts`

**Interfaces:**
- Produces `classifyCapture(raw, forcedKind?, now?): InboxItemData`.
- Produces `parseCaptureDate(raw, today): { title: string; scheduledFor?: string }`.
- Produces `POST /v1/preview` body `{ url: string }`, response `{ title?: string; description?: string; siteName?: string }`.

- [ ] **Step 1: Write failing classification, fallback and SSRF tests**

```ts
expect(classifyCapture("example.com").kind).toBe("link");
expect(classifyCapture("任务 明天交报告", undefined, date("2026-07-16"))).toMatchObject({
  kind: "task", title: "交报告", scheduledFor: "2026-07-17"
});
expect(classifyCapture("一个灵感").kind).toBe("note");

it.each(["http://127.0.0.1", "http://localhost", "http://10.0.0.2", "file:///etc/passwd"])(
  "rejects unsafe preview target %s", async (url) => {
    const response = await app.request("/v1/preview", { method: "POST", body: JSON.stringify({ url }) }, env);
    expect(response.status).toBe(400);
  }
);
```

- [ ] **Step 2: Run tests and confirm missing capture/preview behavior**

Run: `pnpm vitest run tests/inbox-model.test.ts tests/QuickCapture.test.tsx tests/worker/preview.test.ts`

Expected: FAIL because the inbox model and preview route do not exist.

- [ ] **Step 3: Implement deterministic capture and a bounded preview route**

```ts
export function classifyCapture(raw: string, forcedKind?: InboxItemData["kind"], now = new Date()): InboxItemData {
  const value = raw.trim();
  if (!value) throw new Error("请输入要收集的内容");
  const kind = forcedKind ?? (looksLikeUrl(value) ? "link" : /^(任务|todo)\s+/i.test(value) ? "task" : "note");
  const parsed = kind === "task" ? parseCaptureDate(value.replace(/^(任务|todo)\s+/i, ""), now) : {};
  return { kind, raw: value, status: "pending", createdAt: now.getTime(), ...parsed };
}
```

Preview validation rejects non-HTTP protocols, credentials in URLs, IP literals, `localhost`, `.local`, `.internal`, and private IPv4-looking hostnames; follows at most two redirects; applies a five-second abort; accepts only `text/html`; reads at most 512 KiB; extracts `<title>`, OpenGraph description and site name; returns normalized strings capped at 200/500/100 characters. Return 422 for unavailable metadata without blocking client save.

Reuse the existing D1 window-counter storage with `preview:<client-ip>` keys to allow at most 20 preview requests per minute per address, cache successful public previews for 24 hours, and return 429 with the shared error shape after the limit. Never return upstream HTML, headers or arbitrary response bytes.

- [ ] **Step 4: Run inbox and Worker tests**

Run: `pnpm vitest run tests/inbox-model.test.ts tests/QuickCapture.test.tsx tests/worker/preview.test.ts tests/worker/security.test.ts`

Expected: PASS for URL/note/task classification, explicit type override, Chinese dates, preview success, timeout and unsafe targets.

- [ ] **Step 5: Commit**

```bash
git add src/features/inbox src/pages/CollectPage.tsx worker/index.ts worker/preview.ts tests/inbox-model.test.ts tests/QuickCapture.test.tsx tests/worker/preview.test.ts
git commit -m "feat: add universal capture inbox"
```

### Task 7: 增强书签标签、收藏、搜索和访问记录

**Files:**
- Modify: `src/features/bookmarks/bookmark-model.ts`
- Modify: `src/features/bookmarks/BookmarkDialog.tsx`
- Modify: `src/features/bookmarks/BookmarkCard.tsx`
- Modify: `src/features/bookmarks/BookmarkGrid.tsx`
- Create: `src/features/bookmarks/BookmarkToolbar.tsx`
- Modify: `src/pages/CollectPage.tsx`
- Test: `tests/bookmark-model.test.ts`
- Test: `tests/BookmarkGrid.test.tsx`

**Interfaces:**
- Produces `filterBookmarks(bookmarks, { query, groupId, favorite, sort })`.
- Produces `toggleFavorite(bookmark, now)`, `recordBookmarkVisit(bookmark, now)`.
- Extends `BookmarkInput` with `tags?: string[]`, `favorite?: boolean`.

- [ ] **Step 1: Write failing normalized-tag and sorting tests**

```ts
it("normalizes and de-duplicates Chinese bookmark tags", () => {
  expect(normalizeTags([" 开发 ", "开发", "AI"])).toEqual(["开发", "AI"]);
});

it("filters by title, domain and tags and sorts recent visits", () => {
  expect(filterBookmarks(bookmarks, { query: "开发", groupId: "all", favorite: false, sort: "recent" })[0]?.id)
    .toBe("recent-dev-link");
});
```

- [ ] **Step 2: Run tests and confirm missing fields/actions**

Run: `pnpm vitest run tests/bookmark-model.test.ts tests/BookmarkGrid.test.tsx`

Expected: FAIL because tags, favorite and visit functions are absent.

- [ ] **Step 3: Implement immutable bookmark enhancements**

```ts
export function recordBookmarkVisit(bookmark: BookmarkEntity, now = Date.now()): BookmarkEntity {
  return { ...bookmark, updatedAt: now, data: {
    ...bookmark.data,
    visitCount: (bookmark.data.visitCount ?? 0) + 1,
    lastVisitedAt: now
  }};
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Map(tags.map((tag) => tag.trim()).filter(Boolean).map((tag) => [tag.toLocaleLowerCase("zh-CN"), tag])).values()].slice(0, 20);
}
```

Open bookmarks in a new tab after committing the visit entity, preserve dnd-kit keyboard sorting, expose favorite as a named button, and keep old bookmarks readable with default `[]/false/0` values.

- [ ] **Step 4: Run bookmark regression tests**

Run: `pnpm vitest run tests/bookmark-model.test.ts tests/BookmarkGrid.test.tsx e2e/workbench.spec.ts`

Expected: PASS for old add/edit/delete/drag flows and new filters, favorites, copy, tags and recent sorting.

- [ ] **Step 5: Commit**

```bash
git add src/features/bookmarks src/pages/CollectPage.tsx tests/bookmark-model.test.ts tests/BookmarkGrid.test.tsx
git commit -m "feat: enhance bookmark organization"
```

### Task 8: 实现今日计划 2.0 和重复任务

**Files:**
- Create: `src/features/planner/task-model.ts`
- Create: `src/features/planner/TaskDialog.tsx`
- Create: `src/features/planner/TaskList.tsx`
- Create: `src/features/planner/PlannerTabs.tsx`
- Modify: `src/features/focus/TodayPanel.tsx`
- Modify: `src/pages/TodayPage.tsx`
- Modify: `src/pages/OverviewPage.tsx`
- Test: `tests/task-model.test.ts`
- Test: `tests/TaskList.test.tsx`
- Modify: `tests/TodayPanel.test.tsx`

**Interfaces:**
- Produces `createTask(input, options)`, `completeTask(task, now)`, `restoreTask(task, now)`, `nextRecurringTask(task, now)`, `tasksForView(tasks, view, today)`.
- `TaskView = "today" | "tomorrow" | "later" | "completed"`.

- [ ] **Step 1: Write failing scheduling and recurrence tests**

```ts
it("generates the next monthly task and clamps missing dates", () => {
  const task = taskOn("2026-01-31", "monthly");
  expect(nextRecurringTask(task, date("2026-01-31")).data.scheduledFor).toBe("2026-02-28");
});

it("restores a completed task without creating another recurrence", () => {
  expect(restoreTask(completedTask, 20).data).toMatchObject({ completed: false, completedAt: undefined });
});
```

- [ ] **Step 2: Run planner tests and confirm missing model/UI**

Run: `pnpm vitest run tests/task-model.test.ts tests/TaskList.test.tsx tests/TodayPanel.test.tsx`

Expected: FAIL because the planner model and components do not exist.

- [ ] **Step 3: Implement deterministic date buckets and recurrence**

```ts
export function completeTask(task: TaskEntity, now = Date.now()): TaskEntity[] {
  const completed = { ...task, updatedAt: now, data: { ...task.data, completed: true, completedAt: now } };
  return task.data.recurrence ? [completed, nextRecurringTask(task, now)] : [completed];
}

export function tasksForView(tasks: TaskEntity[], view: TaskView, today = localDate(new Date())) {
  return tasks.filter((task) => matchesTaskView(task.data, view, today)).sort(compareTaskPriorityAndOrder);
}
```

TaskDialog validates a non-empty title capped at 300 chars, local ISO date, priority, optional note capped at 2,000 chars and recurrence. Delete uses the existing confirmation pattern and tombstone; complete writes both the completed task and next recurring task atomically through `commit`.

- [ ] **Step 4: Run planner and old today tests**

Run: `pnpm vitest run tests/task-model.test.ts tests/TaskList.test.tsx tests/TodayPanel.test.tsx`

Expected: PASS; overview still shows at most three active tasks while Today page shows all applicable tasks.

- [ ] **Step 5: Commit**

```bash
git add src/features/planner src/features/focus/TodayPanel.tsx src/pages/TodayPage.tsx src/pages/OverviewPage.tsx tests/task-model.test.ts tests/TaskList.test.tsx tests/TodayPanel.test.tsx
git commit -m "feat: add daily planning workflow"
```

### Task 9: 记录专注会话并生成七天统计

**Files:**
- Modify: `src/features/focus/timer.ts`
- Modify: `src/features/focus/FocusTimer.tsx`
- Create: `src/features/insights/focus-stats.ts`
- Create: `src/features/insights/FocusInsights.tsx`
- Modify: `src/pages/TodayPage.tsx`
- Modify: `src/pages/OverviewPage.tsx`
- Test: `tests/timer.test.ts`
- Create: `tests/focus-stats.test.ts`
- Create: `tests/FocusInsights.test.tsx`

**Interfaces:**
- Produces `finishTimerSession(timer, endedAt): FocusSessionData | null`.
- Produces `buildFocusStats(sessions, tasks, today): FocusStats` with seven daily buckets, total minutes, completed sessions, completed tasks and streak.

- [ ] **Step 1: Write failing timer completion and seven-day tests**

```ts
it("creates exactly one completed focus session", () => {
  expect(finishTimerSession(runningTimer, runningTimer.startedAt! + runningTimer.durationMs)).toMatchObject({
    plannedMs: runningTimer.durationMs,
    actualMs: runningTimer.durationMs,
    completed: true
  });
});

it("counts a consecutive focus streak ending today", () => {
  expect(buildFocusStats(lastThreeDaysSessions, [], date("2026-07-16")).streakDays).toBe(3);
});
```

- [ ] **Step 2: Run focused tests and confirm missing session/stat logic**

Run: `pnpm vitest run tests/timer.test.ts tests/focus-stats.test.ts tests/FocusInsights.test.tsx`

Expected: FAIL because no session entity or statistics builder exists.

- [ ] **Step 3: Persist completion once and render lightweight bars**

```ts
export function buildFocusStats(sessions: FocusSessionEntity[], tasks: TaskEntity[], today: Date): FocusStats {
  const days = lastSevenLocalDates(today).map((date) => ({ date, minutes: 0, sessions: 0 }));
  for (const session of sessions.filter((item) => item.data.completed)) {
    const bucket = days.find((day) => day.date === localDate(new Date(session.data.endedAt)));
    if (bucket) { bucket.minutes += Math.round(session.data.actualMs / 60_000); bucket.sessions += 1; }
  }
  return { days, totalMinutes: sum(days, "minutes"), completedSessions: sum(days, "sessions"), completedTasks: countCompletedTasks(tasks, days), streakDays: calculateStreak(days) };
}
```

FocusTimer exposes 25/45/60 minute choices while stopped, optional task selection, and an `onSessionComplete` callback guarded by completed timer timestamp so interval rerenders cannot write duplicates. `FocusInsights` renders semantic labels plus CSS bars and a textual empty state.

- [ ] **Step 4: Run focus suites**

Run: `pnpm vitest run tests/timer.test.ts tests/focus-stats.test.ts tests/FocusInsights.test.tsx tests/TodayPanel.test.tsx`

Expected: PASS for restore, pause, reset, single completion, task association, empty stats and seven-day calculations.

- [ ] **Step 5: Commit**

```bash
git add src/features/focus src/features/insights src/pages/TodayPage.tsx src/pages/OverviewPage.tsx tests/timer.test.ts tests/focus-stats.test.ts tests/FocusInsights.test.tsx
git commit -m "feat: add focus history and insights"
```

### Task 10: 实现 GitHub 面板、缓存和固定服务状态

**Files:**
- Create: `src/features/github/github-schema.ts`
- Create: `src/features/github/github-api.ts`
- Create: `src/features/github/GitHubPanel.tsx`
- Create: `src/features/status/status-api.ts`
- Create: `src/features/status/StatusPanel.tsx`
- Modify: `src/pages/ConnectPage.tsx`
- Modify: `src/pages/OverviewPage.tsx`
- Modify: `worker/index.ts`
- Test: `tests/github-api.test.ts`
- Test: `tests/GitHubPanel.test.tsx`
- Test: `tests/status-api.test.ts`
- Test: `tests/worker/security.test.ts`

**Interfaces:**
- Produces `loadGitHubSummary(username, options): Promise<CachedResult<GitHubSummary>>`.
- Produces `checkWorkbenchServices(fetcher): Promise<ServiceStatus[]>`.
- Opens read-only CORS on `/health` only for configured allowed origins.

- [ ] **Step 1: Write failing parser/cache/status tests**

```ts
it("returns a fresh fifteen-minute GitHub cache without another request", async () => {
  storage.setItem(cacheKey, JSON.stringify({ savedAt: now - 60_000, data: summary }));
  expect(await loadGitHubSummary("hzkloveyou", { fetcher, storage, now })).toMatchObject({ source: "cache", data: summary });
  expect(fetcher).not.toHaveBeenCalled();
});

it("reports API failure without rejecting the whole status list", async () => {
  const result = await checkWorkbenchServices(selectiveFetcher);
  expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: "api", state: "down" })]));
});
```

- [ ] **Step 2: Run tests and confirm missing integrations**

Run: `pnpm vitest run tests/github-api.test.ts tests/GitHubPanel.test.tsx tests/status-api.test.ts tests/worker/security.test.ts`

Expected: FAIL because GitHub/status modules do not exist and health lacks browser CORS.

- [ ] **Step 3: Implement validated public API and graceful cached fallback**

```ts
const CACHE_TTL_MS = 15 * 60_000;
export async function loadGitHubSummary(username: string, options: GitHubLoadOptions): Promise<CachedResult<GitHubSummary>> {
  const cached = readCache(options.storage, username);
  if (cached && options.now - cached.savedAt < CACHE_TTL_MS) return { ...cached, source: "cache", stale: false };
  try {
    const data = await fetchAndParseGitHub(username, options.fetcher);
    writeCache(options.storage, username, options.now, data);
    return { data, source: "network", stale: false, savedAt: options.now };
  } catch (error) {
    if (cached) return { ...cached, source: "cache", stale: true };
    throw error;
  }
}
```

Fetch only public user/repository/commit/actions endpoints, cap displayed repositories at six, validate all responses with Zod, abort after eight seconds, and show rate-limit copy without retry loops. Status checks run only on mount and manual refresh; use `Promise.allSettled`. Add minimal `Access-Control-Allow-Origin` to `/health` after validating the configured origin.

- [ ] **Step 4: Run integration component tests**

Run: `pnpm vitest run tests/github-api.test.ts tests/GitHubPanel.test.tsx tests/status-api.test.ts tests/worker/security.test.ts`

Expected: PASS for network, fresh cache, stale cache, offline, rate-limit, partial status failure and allowed/rejected origins.

- [ ] **Step 5: Commit**

```bash
git add src/features/github src/features/status src/pages/ConnectPage.tsx src/pages/OverviewPage.tsx worker/index.ts tests/github-api.test.ts tests/GitHubPanel.test.tsx tests/status-api.test.ts tests/worker/security.test.ts
git commit -m "feat: add GitHub and service status center"
```

### Task 11: 完成视觉、移动导航、偏好同步和 PWA 更新

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `src/features/customize/CustomizeDrawer.tsx`
- Modify: `src/features/customize/backup.ts`
- Modify: `public/manifest.webmanifest`
- Modify: `public/sw.js`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `tests/accessibility.test.tsx`
- Modify: `tests/backup.test.ts`
- Modify: `e2e/workbench-v2.spec.ts`

**Interfaces:**
- Persists search engine, GitHub username and panel preferences as `preference` entities.
- Changes service-worker cache name to `xiaohe-workbench-v2` and caches routed navigation through the app shell.

- [ ] **Step 1: Add failing mobile, persistence and accessibility assertions**

```ts
test("uses bottom navigation on a phone without horizontal overflow", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("navigation", { name: "主要页面" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

it("round-trips new entities and preferences through backup", () => {
  expect(parseBackup(exportBackup(v2Snapshot))).toEqual(v2Snapshot);
});
```

- [ ] **Step 2: Run targeted acceptance checks and confirm gaps**

Run: `pnpm vitest run tests/accessibility.test.tsx tests/backup.test.ts && pnpm playwright test e2e/workbench-v2.spec.ts --project=mobile`

Expected: FAIL until bottom navigation, preferences and v2 service-worker behavior are wired.

- [ ] **Step 3: Apply the existing design tokens to all states**

Use existing `--page`, `--glass`, `--primary`, `--line`, radii and shadows. Add only semantic tokens `--success`, `--warning`, `--nav-height`. Desktop shows `.desktop-nav` and hides `.mobile-nav`; below 720px reverse that, add `padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom))`, keep all grids `minmax(0, 1fr)`, and set `overflow-wrap:anywhere` on external text. Page transitions animate opacity/translate for at most 240ms and become zero-duration under reduced motion.

Update the manifest description and shortcuts for Collect/Today/Connect. Increment the cache name, delete v1 on activation, cache the generated HTML assets, use network-first for navigations and cache-first for versioned assets. Never cache API or GitHub responses in the Service Worker.

- [ ] **Step 4: Run accessibility, backup, build and mobile E2E**

Run: `pnpm vitest run tests/accessibility.test.tsx tests/backup.test.ts && pnpm build && pnpm playwright test e2e/workbench-v2.spec.ts --project=mobile`

Expected: PASS with no horizontal overflow, named navigation, visible focus, reduced motion and backup round-trip.

- [ ] **Step 5: Commit**

```bash
git add src/styles src/features/customize public index.html README.md tests/accessibility.test.tsx tests/backup.test.ts e2e/workbench-v2.spec.ts
git commit -m "feat: polish responsive workbench experience"
```

### Task 12: 全量回归、生产发布、备份与经验记录

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `.github/workflows/worker.yml`
- Modify: `e2e/workbench.spec.ts`
- Modify: `e2e/workbench-v2.spec.ts`
- Modify: `C:\Users\Tom\Desktop\project\xiaohe-workbench-ai-handoff\xiaohe-workbench-operations\references\project-facts.md`
- Modify: `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger\references\catalog.md`
- Create: one dated project-lessons record selected by `$project-lessons-ledger` at completion.

**Interfaces:**
- Produces a verified GitHub commit, Pages deployment, API Worker deployment, site Worker deployment and synchronized Desktop backup.
- Consumes `scripts/verify-production.ps1` from the existing operations handoff.

- [ ] **Step 1: Expand E2E acceptance journeys before the final implementation pass**

```ts
test("persists one item from every new domain across reload", async ({ page }) => {
  await addInboxNote(page, "部署前检查");
  await addTaggedFavoriteBookmark(page, "Cloudflare", "https://dash.cloudflare.com", "运维");
  await addScheduledTask(page, "明天复盘", "high");
  await page.reload();
  await expect(page.getByText("部署前检查")).toBeVisible();
  await expect(page.getByRole("link", { name: /Cloudflare/ })).toBeVisible();
  await expect(page.getByText("明天复盘")).toBeVisible();
});
```

- [ ] **Step 2: Run every local quality gate independently**

Run in order:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
git diff --check
```

Expected: zero lint warnings, zero TypeScript errors, all Vitest files pass, Vite build succeeds, desktop/mobile Playwright pass with only intentional project skips, and no whitespace errors.

- [ ] **Step 3: Review changed code for security and release compatibility**

Verify exact conditions:

```text
No public/CNAME file.
No token-like strings in tracked files or Desktop package.
PBKDF2 remains in src/features/auth/password-proof.ts with 310000 iterations.
Preview rejects unsafe targets and has timeout/size limits.
GitHub code uses no Authorization header or private token.
New entities pass shared Zod contracts in browser and Worker.
Old backup fixture still imports.
Worker and frontend can be rolled back independently.
```

- [ ] **Step 4: Commit final release changes without publishing the frontend yet**

```bash
git add .github e2e README.md
git commit -m "test: verify workbench v2 release"
```

Record `git rev-parse HEAD`. Keep the frontend unpublished until the backward-compatible API and site proxy are deployed.

- [ ] **Step 5: Deploy Worker surfaces in compatibility order**

Run:

```text
pnpm exec wrangler whoami
pnpm exec wrangler d1 migrations list xiaohe-workbench --remote
pnpm exec wrangler deploy --config wrangler.jsonc
pnpm exec wrangler deploy --config wrangler.site.jsonc
```

Expected: authenticated Cloudflare account `f69cbb2e3af37977863db6695f801734`; no unapplied destructive migration; API and site Worker deployments succeed.

- [ ] **Step 6: Push main and verify the exact GitHub Pages release**

Run: `git push origin main`

Expected: the GitHub Pages workflow for the recorded SHA completes successfully and its deployment reports the expected Pages URL.

- [ ] **Step 7: Run public production verification**

Run the existing `verify-production.ps1`, then verify with a temporary account:

```text
GET /, /collect, /today, /connect return the application.
Built JS and CSS return 200.
GET https://api.080492.xyz/health reports ok.
www redirects to apex with 308.
Register, login, sync, logout/login, recovery rotation and cleanup work.
A clean browser profile pulls remote data with no local pending changes.
Desktop and mobile pages have no console error or horizontal overflow.
Offline reload opens the shell and local records.
GitHub rate-limit/error fallback leaves the page usable.
```

- [ ] **Step 8: Synchronize Desktop backup only after production passes**

Copy tracked project content from the authoritative Git repository to `C:\Users\Tom\Desktop\project`, excluding `.git`, `node_modules`, `.wrangler`, `dist`, test results and caches. Compare relative file lists, sizes and SHA-256. Preserve `ai-skills`, handoff archives and the user's reference DOCX.

- [ ] **Step 9: Update handoff and project-lessons Skill**

Invoke `$project-lessons-ledger`, record architecture decisions, failures, fixes, commands, verification evidence and reusable lessons without secrets. Validate both installed and Desktop Skill copies and compare SHA-256.

- [ ] **Step 10: Final completion commit if tracked handoff docs changed**

```bash
git add docs README.md
git commit -m "docs: record workbench v2 operations"
git push origin main
```

If this commit exists, wait for and verify its Pages run too; report the final production SHA, URLs, test counts, deployment evidence, Desktop backup verification and any remaining limitation.
