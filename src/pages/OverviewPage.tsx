import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { FocusSessionData, SyncEntity } from "../../shared/entities";
import { useWorkspace } from "../app/workspace/workspace-context";
import { BookmarkDialog } from "../features/bookmarks/BookmarkDialog";
import { BookmarkGrid } from "../features/bookmarks/BookmarkGrid";
import {
  createBookmark,
  isBookmarkEntity,
  recordBookmarkVisit,
  reorderBookmarks,
  toggleFavorite,
  updateBookmark,
  type BookmarkEntity,
  type BookmarkInput
} from "../features/bookmarks/bookmark-model";
import { TodayPanel } from "../features/focus/TodayPanel";
import { createTimerState, type TimerState } from "../features/focus/timer";
import { SearchBar } from "../features/search/SearchBar";
import type { SearchEngineId } from "../features/search/search";
import { completeTask, createTask, isTaskEntity, localDate } from "../features/planner/task-model";

function greeting() {
  const hour = new Date().getHours();
  return hour < 6 ? "夜深了" : hour < 11 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
}

export default function OverviewPage() {
  const { snapshot, entities, loading, visibility, preferences, setPreferences, commit, remove, showToast } = useWorkspace();
  const engine = preferences.searchEngine as SearchEngineId;
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkEntity | undefined>();
  const reduceMotion = useReducedMotion();

  const groups = entities.filter((entity) => entity.type === "bookmarkGroup" && !entity.deletedAt);
  const bookmarks = entities.filter(isBookmarkEntity);
  const tasks = entities.filter(isTaskEntity);
  const noteEntity = entities.find((entity) => entity.type === "note" && !entity.deletedAt);
  const timerEntity = entities.find((entity) => entity.type === "timer" && !entity.deletedAt);
  const note = (noteEntity?.data as { content?: string } | undefined)?.content ?? "";
  const timer = (timerEntity?.data as TimerState | undefined) ?? createTimerState();

  const saveBookmark = async (input: BookmarkInput) => {
    if (editingBookmark) {
      const next = updateBookmark(bookmarks, editingBookmark.id, input).find((entity) => entity.id === editingBookmark.id);
      if (next) await commit([next]);
    } else {
      await commit([createBookmark(input)]);
    }
    setBookmarkOpen(false);
    setEditingBookmark(undefined);
    showToast("书签已保存");
  };

  const deleteBookmark = async (bookmark: BookmarkEntity) => {
    if (!window.confirm(`删除“${bookmark.data.title}”？`)) return;
    await remove(bookmark);
    showToast("书签已删除");
  };

  const moveBookmark = async (activeId: string, overId: string) => {
    const reordered = reorderBookmarks(bookmarks, activeId, overId);
    const changed = reordered.filter((entity) => {
      if (!isBookmarkEntity(entity)) return false;
      const previous = bookmarks.find((bookmark) => bookmark.id === entity.id);
      return previous?.data.order !== entity.data.order;
    });
    if (changed.length) await commit(changed);
  };

  const commitBookmarkChange = async (next: SyncEntity[], id: string) => {
    const changed = next.find((entity) => entity.id === id);
    if (changed) await commit([changed]);
  };

  const copyBookmark = async (bookmark: BookmarkEntity) => {
    try {
      await navigator.clipboard.writeText(bookmark.data.url);
      showToast("链接已复制");
    } catch {
      showToast("复制失败，请手动复制");
    }
  };

  const addTask = async (title: string) => commit([createTask({ title, order: tasks.length, scheduledFor: localDate() })]);
  const toggleTask = async (task: SyncEntity) => {
    if (isTaskEntity(task)) await commit(completeTask(task));
  };
  const saveNote = async (content: string) => commit([{
    id: noteEntity?.id ?? "quick-note",
    type: "note",
    updatedAt: Date.now(),
    data: { content }
  }]);
  const saveTimer = async (value: TimerState) => commit([{
    id: timerEntity?.id ?? "focus-timer",
    type: "timer",
    updatedAt: Date.now(),
    data: value
  }]);
  const saveFocusSession = async (session: FocusSessionData) => commit([{
    id: `focus-${session.startedAt}`,
    type: "focusSession",
    updatedAt: session.endedAt,
    data: session
  }]);

  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45 }
  } as const;

  return (
    <main id="top" className="app-shell">
      <motion.section className="hero" {...reveal}>
        <p className="hero__date">{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p>
        <h1 aria-label="小贺的工作台"><span aria-hidden="true">{greeting()}，</span>小贺的工作台</h1>
        <p>把常用的事，放在伸手可及的地方。</p>
      </motion.section>
      {visibility.search ? (
        <motion.div className="search-section" {...reveal} transition={{ duration: 0.45, delay: 0.06 }}>
          <SearchBar engine={engine} onEngineChange={(value) => setPreferences({ searchEngine: value })} />
        </motion.div>
      ) : null}
      {loading || !snapshot ? (
        <div className="loading-card" role="status"><span />正在准备你的工作台…</div>
      ) : (
        <div className="workspace-grid">
          {visibility.bookmarks ? (
            <motion.div className="workspace-grid__bookmarks" {...reveal} transition={{ duration: 0.45, delay: 0.12 }}>
              <BookmarkGrid
                bookmarks={bookmarks}
                groups={groups}
                onAdd={() => { setEditingBookmark(undefined); setBookmarkOpen(true); }}
                onEdit={(bookmark) => { setEditingBookmark(bookmark); setBookmarkOpen(true); }}
                onDelete={(bookmark) => void deleteBookmark(bookmark)}
                onReorder={(active, over) => void moveBookmark(active, over)}
                onVisit={(bookmark) => void commitBookmarkChange(recordBookmarkVisit(bookmarks, bookmark.id), bookmark.id)}
                onToggleFavorite={(bookmark) => void commitBookmarkChange(toggleFavorite(bookmarks, bookmark.id), bookmark.id)}
                onCopy={(bookmark) => void copyBookmark(bookmark)}
              />
            </motion.div>
          ) : null}
          {visibility.focus ? (
            <motion.div className="workspace-grid__focus" {...reveal} transition={{ duration: 0.45, delay: 0.18 }}>
              <TodayPanel
                tasks={tasks}
                note={note}
                timer={timer}
                onAddTask={(title) => void addTask(title)}
                onToggleTask={(task) => void toggleTask(task)}
                onNoteChange={(value) => void saveNote(value)}
                onTimerChange={(value) => void saveTimer(value)}
                onSessionComplete={(session) => void saveFocusSession(session)}
              />
            </motion.div>
          ) : null}
        </div>
      )}
      <footer><span>小贺的工作台</span><span>数据优先保存在本机 · 登录后云端同步</span></footer>
      {snapshot ? (
        <BookmarkDialog
          open={bookmarkOpen}
          bookmark={editingBookmark}
          bookmarks={bookmarks}
          groups={groups}
          onClose={() => { setBookmarkOpen(false); setEditingBookmark(undefined); }}
          onSave={(input) => void saveBookmark(input)}
        />
      ) : null}
    </main>
  );
}
