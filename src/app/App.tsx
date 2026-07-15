import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SyncEntity, ThemeId, WorkspaceSnapshot } from "../../shared/entities";
import { Button } from "../components/Button";
import { Toast } from "../components/Toast";
import { createWorkspaceRepository } from "../lib/db/repository";
import { createSyncApi } from "../lib/sync/api";
import { createSyncEngine, type SyncState } from "../lib/sync/engine";
import { AccountMenu } from "../features/auth/AccountMenu";
import { AuthDialog } from "../features/auth/AuthDialog";
import { authApi, type AuthUser } from "../features/auth/auth-api";
import { BookmarkDialog } from "../features/bookmarks/BookmarkDialog";
import { BookmarkGrid } from "../features/bookmarks/BookmarkGrid";
import { createBookmark, isBookmarkEntity, reorderBookmarks, updateBookmark, type BookmarkEntity, type BookmarkInput } from "../features/bookmarks/bookmark-model";
import { CustomizeDrawer, type PanelVisibility } from "../features/customize/CustomizeDrawer";
import { TodayPanel } from "../features/focus/TodayPanel";
import { createTimerState, type TimerState } from "../features/focus/timer";
import { SearchBar } from "../features/search/SearchBar";
import type { SearchEngineId } from "../features/search/search";

const defaultVisibility: PanelVisibility = { search: true, bookmarks: true, focus: true };

function readVisibility(): PanelVisibility {
  try { return { ...defaultVisibility, ...JSON.parse(localStorage.getItem("xiaohe-panels") ?? "{}") as Partial<PanelVisibility> }; }
  catch { return defaultVisibility; }
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 6 ? "夜深了" : hour < 11 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
}

export function App() {
  const [repository] = useState(() => createWorkspaceRepository());
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [engine, setEngine] = useState<SearchEngineId>("bing");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(navigator.onLine ? "idle" : "offline");
  const [authOpen, setAuthOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkEntity | undefined>();
  const [visibility, setVisibility] = useState(readVisibility);
  const [toast, setToast] = useState("");
  const reduceMotion = useReducedMotion();

  const refresh = async () => setSnapshot(await repository.getSnapshot());
  useEffect(() => {
    let active = true;
    void repository.initializeDefaults().then(() => repository.getSnapshot()).then((value) => { if (active) setSnapshot(value); }).catch(() => { if (active) setToast("本地数据暂时无法读取，请刷新重试"); });
    return () => { active = false; void repository.close(); };
  }, [repository]);
  useEffect(() => {
    void authApi.session().then(({ user: sessionUser }) => setUser(sessionUser)).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!user) return;
    const sync = createSyncEngine({ repository, api: createSyncApi(), online: () => navigator.onLine });
    const unsubscribe = sync.subscribe(setSyncState);
    sync.start();
    const online = () => void sync.flush();
    window.addEventListener("online", online);
    return () => { window.removeEventListener("online", online); unsubscribe(); sync.stop(); };
  }, [repository, user]);
  useEffect(() => {
    const theme = snapshot?.theme ?? "morning";
    document.documentElement.dataset.theme = theme;
  }, [snapshot?.theme]);

  const commit = async (changes: SyncEntity[]) => {
    await Promise.all(changes.map((change) => repository.applyChange(change)));
    await refresh();
  };
  const setTheme = async (theme: ThemeId) => { await repository.setTheme(theme); await refresh(); };
  const setPanels = (value: PanelVisibility) => { setVisibility(value); localStorage.setItem("xiaohe-panels", JSON.stringify(value)); };
  const groups = snapshot?.entities.filter((entity) => entity.type === "bookmarkGroup" && !entity.deletedAt) ?? [];
  const bookmarks = snapshot?.entities.filter(isBookmarkEntity) ?? [];
  const tasks = snapshot?.entities.filter((entity) => entity.type === "task" && !entity.deletedAt) ?? [];
  const noteEntity = snapshot?.entities.find((entity) => entity.type === "note" && !entity.deletedAt);
  const timerEntity = snapshot?.entities.find((entity) => entity.type === "timer" && !entity.deletedAt);
  const note = (noteEntity?.data as { content?: string } | undefined)?.content ?? "";
  const timer = (timerEntity?.data as TimerState | undefined) ?? createTimerState();
  const saveBookmark = async (input: BookmarkInput) => {
    if (editingBookmark) {
      const next = updateBookmark(bookmarks, editingBookmark.id, input).find((entity) => entity.id === editingBookmark.id);
      if (next) await commit([next]);
    } else await commit([createBookmark(input)]);
    setBookmarkOpen(false); setEditingBookmark(undefined); setToast("书签已保存");
  };
  const deleteBookmark = async (bookmark: BookmarkEntity) => {
    if (!window.confirm(`删除“${bookmark.data.title}”？`)) return;
    await commit([{ ...bookmark, updatedAt: Date.now(), deletedAt: Date.now() }]);
    setToast("书签已删除");
  };
  const moveBookmark = async (activeId: string, overId: string) => {
    const reordered = reorderBookmarks(bookmarks, activeId, overId);
    await commit(reordered.filter((entity, index) => (entity.data as { order: number }).order !== bookmarks[index]?.data.order));
  };
  const addTask = async (title: string) => commit([{ id: crypto.randomUUID(), type: "task", updatedAt: Date.now(), data: { title, order: tasks.length, completed: false } }]);
  const toggleTask = async (task: SyncEntity) => commit([{ ...task, updatedAt: Date.now(), data: { ...(task.data as object), completed: true } }]);
  const saveNote = async (content: string) => commit([{ id: noteEntity?.id ?? "quick-note", type: "note", updatedAt: Date.now(), data: { content } }]);
  const saveTimer = async (value: TimerState) => commit([{ id: timerEntity?.id ?? "focus-timer", type: "timer", updatedAt: Date.now(), data: value }]);
  const importSnapshot = async (value: WorkspaceSnapshot) => { await repository.replaceSnapshot(value); await refresh(); setCustomizeOpen(false); setToast("备份已恢复"); };
  const logout = async () => { await authApi.logout().catch(() => undefined); setUser(null); setSyncState("idle"); setToast("已退出，仍可使用本地数据"); };
  const reveal = { initial: reduceMotion ? false : { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45 } } as const;

  return (
    <div className="app-canvas">
      <div className="ambient ambient--one" /><div className="ambient ambient--two" /><div className="ambient ambient--three" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="小贺的工作台首页"><span className="brand__mark">贺</span><span><strong>小贺的工作台</strong><small>MY DAILY SPACE</small></span></a>
        <nav className="topbar__actions" aria-label="账户与设置"><AccountMenu user={user} syncState={syncState} onLogin={() => setAuthOpen(true)} onLogout={() => void logout()} /><Button className="settings-button" variant="ghost" aria-label="打开个性化设置" onClick={() => setCustomizeOpen(true)}>⚙</Button></nav>
      </header>
      <main id="top" className="app-shell">
        <motion.section className="hero" {...reveal}>
          <p className="hero__date">{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p>
          <h1 aria-label="小贺的工作台"><span aria-hidden="true">{greeting()}，</span>小贺的工作台</h1>
          <p>把常用的事，放在伸手可及的地方。</p>
        </motion.section>
        {visibility.search ? <motion.div className="search-section" {...reveal} transition={{ duration: 0.45, delay: 0.06 }}><SearchBar engine={engine} onEngineChange={setEngine} /></motion.div> : null}
        {!snapshot ? <div className="loading-card" role="status"><span />正在准备你的工作台…</div> : (
          <div className="workspace-grid">
            {visibility.bookmarks ? <motion.div className="workspace-grid__bookmarks" {...reveal} transition={{ duration: 0.45, delay: 0.12 }}><BookmarkGrid bookmarks={bookmarks} groups={groups} onAdd={() => { setEditingBookmark(undefined); setBookmarkOpen(true); }} onEdit={(bookmark) => { setEditingBookmark(bookmark); setBookmarkOpen(true); }} onDelete={(bookmark) => void deleteBookmark(bookmark)} onReorder={(active, over) => void moveBookmark(active, over)} /></motion.div> : null}
            {visibility.focus ? <motion.div className="workspace-grid__focus" {...reveal} transition={{ duration: 0.45, delay: 0.18 }}><TodayPanel tasks={tasks} note={note} timer={timer} onAddTask={(title) => void addTask(title)} onToggleTask={(task) => void toggleTask(task)} onNoteChange={(value) => void saveNote(value)} onTimerChange={(value) => void saveTimer(value)} /></motion.div> : null}
          </div>
        )}
        <footer><span>小贺的工作台</span><span>数据优先保存在本机 · 登录后云端同步</span></footer>
      </main>
      {snapshot ? <BookmarkDialog open={bookmarkOpen} bookmark={editingBookmark} bookmarks={bookmarks} groups={groups} onClose={() => { setBookmarkOpen(false); setEditingBookmark(undefined); }} onSave={(input) => void saveBookmark(input)} /> : null}
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={(nextUser) => { setUser(nextUser); setToast("登录成功，正在同步"); }} />
      {snapshot ? <CustomizeDrawer open={customizeOpen} theme={snapshot.theme} visibility={visibility} snapshot={snapshot} onClose={() => setCustomizeOpen(false)} onThemeChange={(theme) => void setTheme(theme)} onVisibilityChange={setPanels} onImport={(value) => void importSnapshot(value)} onError={setToast} /> : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
