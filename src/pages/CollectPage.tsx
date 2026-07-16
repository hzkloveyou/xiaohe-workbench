import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { SyncEntity } from "../../shared/entities";
import { useWorkspace } from "../app/workspace/workspace-context";
import { GlassCard } from "../components/GlassCard";
import { BookmarkDialog } from "../features/bookmarks/BookmarkDialog";
import { BookmarkGrid } from "../features/bookmarks/BookmarkGrid";
import {
  createBookmark,
  isBookmarkEntity,
  reorderBookmarks,
  updateBookmark,
  type BookmarkEntity,
  type BookmarkInput
} from "../features/bookmarks/bookmark-model";
import { InboxList } from "../features/inbox/InboxList";
import { QuickCapture } from "../features/inbox/QuickCapture";
import { archiveInboxItem, isInboxItem, type InboxItemEntity } from "../features/inbox/inbox-model";
import { fetchLinkPreview } from "../features/inbox/preview-api";

export default function CollectPage() {
  const { entities, loading, commit, remove, showToast } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkEntity | undefined>();
  const groups = entities.filter((entity) => entity.type === "bookmarkGroup" && !entity.deletedAt);
  const bookmarks = entities.filter(isBookmarkEntity);
  const inboxItems = entities.filter(isInboxItem);
  const captureParameter = searchParams.get("capture");
  const initialCapture = captureParameter && captureParameter !== "auto" ? captureParameter : "";

  const saveInbox = async (entity: InboxItemEntity) => {
    await commit([entity]);
    setSearchParams({}, { replace: true });
    showToast("已放入收集箱");
    if (entity.data.kind === "link" && entity.data.url) {
      void fetchLinkPreview(entity.data.url).then((preview) => {
        if (!preview.title) return;
        return commit([{
          ...entity,
          updatedAt: Date.now(),
          data: { ...entity.data, title: preview.title }
        }]);
      }).catch(() => undefined);
    }
  };

  const convertInbox = async (item: InboxItemEntity) => {
    const archived = archiveInboxItem(item);
    if (item.data.kind === "link" && item.data.url) {
      const bookmark = createBookmark({
        title: item.data.title ?? new URL(item.data.url).hostname,
        url: item.data.url,
        groupId: groups[0]?.id ?? "group-work",
        order: bookmarks.length
      });
      await commit([bookmark, archived]);
      showToast("已整理为书签");
      return;
    }
    if (item.data.kind === "task") {
      const task: SyncEntity = {
        id: crypto.randomUUID(),
        type: "task",
        updatedAt: Date.now(),
        data: {
          title: item.data.title ?? item.data.raw,
          completed: false,
          order: entities.filter((entity) => entity.type === "task").length,
          scheduledFor: item.data.scheduledFor
        }
      };
      await commit([task, archived]);
      showToast("已加入今日计划");
      return;
    }
    await commit([archived]);
    showToast("记录已归档");
  };

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

  const moveBookmark = async (activeId: string, overId: string) => {
    const reordered = reorderBookmarks(bookmarks, activeId, overId);
    const changed = reordered.filter((entity) => {
      if (!isBookmarkEntity(entity)) return false;
      return bookmarks.find((bookmark) => bookmark.id === entity.id)?.data.order !== entity.data.order;
    });
    if (changed.length) await commit(changed);
  };

  return (
    <main className="app-shell route-page collect-page">
      <section className="hero route-page__hero"><p className="eyebrow">COLLECT</p><h1>收集与书签</h1><p>把链接、任务和灵感先放进来，再从容整理。</p></section>
      <div className="collect-layout">
        <GlassCard className="capture-panel">
          <header className="panel-header"><div><p className="eyebrow">INBOX</p><h2>万能收集箱</h2></div><span className="task-count">{inboxItems.filter((item) => item.data.status === "pending").length} 待整理</span></header>
          <QuickCapture key={initialCapture} initialValue={initialCapture} onSave={(entity) => void saveInbox(entity)} />
          {loading ? <div className="loading-card" role="status"><span />正在读取收集箱…</div> : (
            <InboxList
              items={inboxItems}
              onArchive={(item) => void commit([archiveInboxItem(item)])}
              onDelete={(item) => { if (window.confirm("删除这条收集内容？")) void remove(item); }}
              onConvert={(item) => void convertInbox(item)}
            />
          )}
        </GlassCard>
        <BookmarkGrid
          bookmarks={bookmarks}
          groups={groups}
          onAdd={() => { setEditingBookmark(undefined); setBookmarkOpen(true); }}
          onEdit={(bookmark) => { setEditingBookmark(bookmark); setBookmarkOpen(true); }}
          onDelete={(bookmark) => { if (window.confirm(`删除“${bookmark.data.title}”？`)) void remove(bookmark); }}
          onReorder={(active, over) => void moveBookmark(active, over)}
        />
      </div>
      <BookmarkDialog
        open={bookmarkOpen}
        bookmark={editingBookmark}
        bookmarks={bookmarks}
        groups={groups}
        onClose={() => { setBookmarkOpen(false); setEditingBookmark(undefined); }}
        onSave={(input) => void saveBookmark(input)}
      />
    </main>
  );
}
