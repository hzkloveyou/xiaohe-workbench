# 小贺的工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建并上线一个可游客使用、可注册同步、支持个性化与离线运行的中文个人启动台。

**Architecture:** React/Vite PWA 在 GitHub Pages 上运行，IndexedDB 承担本地优先数据和同步队列；Cloudflare Worker + D1 提供账户、会话、恢复和增量同步 API。前后端共享严格 TypeScript 数据契约，按实体版本合并冲突。

**Tech Stack:** React 19、TypeScript 5、Vite 7、Motion、dnd-kit、Dexie、Zod、Hono、Cloudflare Workers/D1、Vitest、Testing Library、Playwright、pnpm、GitHub Actions。

## Global Constraints

- 产品名称固定为“小贺的工作台”，界面语言为中文。
- 主域名固定为 `https://080492.xyz`，API 固定为 `https://api.080492.xyz`。
- 默认视觉固定为“晨雾玻璃”：天空蓝、薄荷绿、奶油白、克制玻璃拟态。
- 第一版核心模块固定为智能搜索、快捷书签、今日专注。
- 游客模式必须可用；登录仅用于跨设备同步。
- 所有交互支持键盘；完整支持 `prefers-reduced-motion`。
- 不加入天气、邮箱、AI 助手、虚构数据或来源不明的远程图片。

---

## File Structure

- `package.json`: 项目命令与依赖。
- `src/app/`: 应用入口、路由级外壳和全局状态编排。
- `src/components/`: Button、GlassCard、Dialog、Toast、SyncStatus 等通用组件。
- `src/features/search/`: 搜索解析、引擎与指令栏。
- `src/features/bookmarks/`: 书签模型、编辑器、分组和拖拽网格。
- `src/features/focus/`: 今日三件事、便笺与计时器。
- `src/features/auth/`: 注册、登录、恢复、会话和账户界面。
- `src/features/customize/`: 主题、卡片显隐、布局与导入导出。
- `src/lib/db/`: Dexie 数据库与仓储接口。
- `src/lib/sync/`: 同步队列、合并算法和 API 客户端。
- `src/styles/`: 设计令牌、全局样式、动效和响应式规则。
- `shared/`: 前后端共享 Zod 契约、实体类型和常量。
- `worker/`: Cloudflare Worker 路由、认证、安全与同步处理。
- `migrations/`: D1 数据库迁移。
- `tests/`: 单元、组件和 API 测试。
- `e2e/`: Playwright 端到端测试。
- `.github/workflows/`: Pages 与 Worker 发布工作流。

### Task 1: 建立严格类型的应用基础

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `index.html`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/styles/tokens.css`, `src/styles/global.css`
- Create: `shared/entities.ts`, `shared/contracts.ts`
- Test: `tests/contracts.test.ts`

**Interfaces:**
- Produces: `WorkspaceSnapshot`, `SyncEntity`, `ThemeId`, `ApiError`, `parseWorkspaceSnapshot(value)`.

- [ ] 写失败测试：无效主题、缺少实体 ID 和超长便笺必须被共享 Zod 契约拒绝。
- [ ] 运行 `pnpm vitest run tests/contracts.test.ts`，确认因共享契约不存在而失败。
- [ ] 创建 Vite/React 严格 TypeScript 配置、设计令牌和共享契约；`ThemeId` 仅允许 `morning | dusk | night | system`。
- [ ] 运行契约测试、`pnpm typecheck` 和 `pnpm build`，确认通过。
- [ ] 提交：`feat: establish typed workbench foundation`。

### Task 2: 本地数据库、默认数据与确定性合并

**Files:**
- Create: `src/lib/db/database.ts`, `src/lib/db/repository.ts`, `src/lib/db/defaults.ts`
- Create: `src/lib/sync/merge.ts`, `src/lib/sync/queue.ts`
- Test: `tests/merge.test.ts`, `tests/repository.test.ts`

**Interfaces:**
- Consumes: `WorkspaceSnapshot`, `SyncEntity`。
- Produces: `workspaceRepository.getSnapshot()`, `workspaceRepository.applyChange(change)`, `mergeEntities(local, remote)`, `syncQueue.enqueue(change)`。

- [ ] 写失败测试：较新的实体胜出、删除标记不复活、同时间冲突的便笺生成保留副本、默认书签只初始化一次。
- [ ] 运行两个测试文件并确认失败。
- [ ] 用 Dexie 实现 IndexedDB 表：`entities`、`syncQueue`、`meta`；实现默认 AI/工作/开发/学习/影音分类。
- [ ] 实现逐实体合并和队列去重；所有写入先落本地再入队。
- [ ] 运行测试并提交：`feat: add local-first workspace storage`。

### Task 3: Cloudflare D1 账户与安全会话

**Files:**
- Create: `wrangler.jsonc`, `worker/index.ts`, `worker/env.ts`, `worker/security.ts`, `worker/auth.ts`
- Create: `migrations/0001_initial.sql`
- Test: `tests/worker/security.test.ts`, `tests/worker/auth.test.ts`

**Interfaces:**
- Produces API: `POST /v1/auth/register`, `/login`, `/logout`, `/recover`, `GET /v1/auth/session`。
- Produces helpers: `derivePassword(password, salt)`, `hashToken(token)`, `requireSession(c)`。

- [ ] 写失败测试：密码派生可重复、错误密码失败、令牌仅保存哈希、来源不匹配被拒绝、连续失败触发限流。
- [ ] 运行 Worker 测试并确认失败。
- [ ] 创建 D1 表 `users`、`sessions`、`auth_attempts`；使用 Web Crypto PBKDF2-SHA-256、随机盐和 256 位令牌。
- [ ] 实现最少 12 字符密码、一次性恢复码、安全 Cookie、30 天会话、参数化查询和统一错误体。
- [ ] 运行测试并提交：`feat: add secure cloud accounts`。

### Task 4: 增量同步 API 与前端同步客户端

**Files:**
- Create: `worker/sync.ts`, `src/lib/sync/api.ts`, `src/lib/sync/engine.ts`, `src/components/SyncStatus.tsx`
- Modify: `worker/index.ts`, `src/app/App.tsx`
- Test: `tests/worker/sync.test.ts`, `tests/sync-engine.test.ts`

**Interfaces:**
- Produces API: `GET /v1/sync?since=<cursor>`, `POST /v1/sync/push`。
- Produces: `createSyncEngine({ repository, api, online })` with `start()`, `flush()`, `stop()`。

- [ ] 写失败测试：未登录返回 401、其他用户实体不可见、重复推送幂等、离线不丢队列、401 暂停上传、恢复联网指数退避重试。
- [ ] 运行测试并确认失败。
- [ ] 创建 `workspace_entities` 和 `sync_cursors` 数据结构，实现批量拉取/推送和实体所有权校验。
- [ ] 实现前端同步引擎与“已同步/同步中/离线/需登录/同步失败”状态。
- [ ] 运行测试并提交：`feat: sync workspace across devices`。

### Task 5: 智能搜索与快捷指令

**Files:**
- Create: `src/features/search/search.ts`, `src/features/search/SearchBar.tsx`, `src/features/search/SearchEngineMenu.tsx`
- Test: `tests/search.test.ts`, `tests/SearchBar.test.tsx`

**Interfaces:**
- Produces: `resolveSearchInput(input, engine, shortcuts): { kind: 'url' | 'search'; url: string }`。

- [ ] 写失败测试：完整 URL、裸域名、普通搜索词、`gh` 和 `mdn` 指令解析正确；危险协议被拒绝。
- [ ] 运行测试并确认失败。
- [ ] 实现搜索引擎选择、最近记录、快捷键聚焦和可访问下拉菜单。
- [ ] 运行测试并提交：`feat: add smart command search`。

### Task 6: 书签管理与可访问拖拽

**Files:**
- Create: `src/features/bookmarks/BookmarkGrid.tsx`, `BookmarkCard.tsx`, `BookmarkDialog.tsx`, `bookmark-model.ts`
- Create: `src/components/GlassCard.tsx`, `src/components/Dialog.tsx`, `src/components/Button.tsx`
- Test: `tests/bookmark-model.test.ts`, `tests/BookmarkGrid.test.tsx`

**Interfaces:**
- Produces: `createBookmark(input)`, `updateBookmark(id, patch)`, `reorderBookmarks(activeId, overId)`。

- [ ] 写失败测试：URL 规范化、重复提示、添加/编辑/删除、键盘排序和空状态。
- [ ] 运行测试并确认失败。
- [ ] 使用 dnd-kit 实现鼠标、触摸、键盘拖拽；移动端关闭倾斜但保留长按拖动。
- [ ] 实现表单校验、确认删除、分类筛选和本地 SVG/首字图标。
- [ ] 运行测试并提交：`feat: add customizable bookmark grid`。

### Task 7: 今日三件事、便笺与专注计时器

**Files:**
- Create: `src/features/focus/TodayPanel.tsx`, `QuickNote.tsx`, `FocusTimer.tsx`, `timer.ts`
- Test: `tests/timer.test.ts`, `tests/TodayPanel.test.tsx`

**Interfaces:**
- Produces: `restoreTimer(state, now)`, `startTimer(state, now)`, `pauseTimer(state, now)`。

- [ ] 写失败测试：刷新恢复、后台经过时间、暂停不递减、完成归零、最多三项突出任务。
- [ ] 运行测试并确认失败。
- [ ] 实现任务、自动保存便笺、25 分钟计时和经授权后的完成通知。
- [ ] 运行测试并提交：`feat: add daily focus workspace`。

### Task 8: 账户界面、个性化、导入导出与完整视觉

**Files:**
- Create: `src/features/auth/AuthDialog.tsx`, `AccountMenu.tsx`, `auth-api.ts`
- Create: `src/features/customize/CustomizeDrawer.tsx`, `ThemePicker.tsx`, `backup.ts`
- Create: `src/components/Toast.tsx`, `src/components/ErrorBoundary.tsx`
- Modify: `src/app/App.tsx`, `src/styles/global.css`, `src/styles/tokens.css`
- Test: `tests/backup.test.ts`, `tests/AuthDialog.test.tsx`, `tests/accessibility.test.tsx`

**Interfaces:**
- Produces: `exportBackup(snapshot)`, `parseBackup(file)`, authentication UI and theme/layout persistence。

- [ ] 写失败测试：损坏备份不覆盖数据、恢复码只展示一次、错误/加载/禁用状态、主要界面无基础 a11y 违规。
- [ ] 运行测试并确认失败。
- [ ] 实现注册、登录、恢复、退出、设置抽屉、主题和卡片显隐/排序。
- [ ] 完成晨雾渐变、玻璃卡片、分层进入、统一按钮状态、四档响应式和 `prefers-reduced-motion`。
- [ ] 运行测试并提交：`feat: polish responsive cloud workbench`。

### Task 9: PWA、端到端验收与持续部署

**Files:**
- Create: `public/icons/*`, `public/robots.txt`, `public/404.html`
- Create: `e2e/workbench.spec.ts`, `playwright.config.ts`
- Create: `.github/workflows/pages.yml`, `.github/workflows/worker.yml`
- Modify: `vite.config.ts`, `wrangler.jsonc`, `README.md`

**Interfaces:**
- Produces: installable offline PWA, GitHub Pages release, Cloudflare Worker release。

- [ ] 写端到端测试：首页可打开、游客添加书签、拖拽、主题切换、注册登录、同步、移动端无横向滚动、减少动态效果关闭持续动画。
- [ ] 运行 E2E，确认未完成状态失败。
- [ ] 配置 PWA 清单、缓存策略、离线壳、Pages SPA 回退和两条部署工作流。
- [ ] 运行 `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`，全部通过。
- [ ] 检查浏览器控制台、桌面/平板/手机截图、键盘操作和 Lighthouse 关键项。
- [ ] 提交：`ci: deploy workbench and cloud sync`。

### Task 10: 公网发布与最终验证

**Files:**
- Modify: repository settings, GitHub Actions secrets, Cloudflare D1/Worker/DNS resources
- Modify: `README.md` only if live URLs differ from the fixed architecture

**Interfaces:**
- Produces: `https://080492.xyz` and `https://api.080492.xyz` production services。

- [ ] 创建公开 GitHub 仓库 `xiaohe-workbench`，推送 `main`，启用 Pages Actions。
- [ ] 创建 D1 数据库并执行 `migrations/0001_initial.sql`；部署 Worker 到 `api.080492.xyz`。
- [ ] 配置根域名和 `www` 的 Pages DNS/重定向，等待证书激活。
- [ ] 从公网验证首页 200、静态资源无 404、API 健康检查、注册、登录、同步、恢复、退出和离线模式。
- [ ] 保存最终验证输出并报告上线地址、仓库、检查结果和任何外部限制。
