import { useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { SyncEntity } from "../../../shared/entities";
import { Button } from "../../components/Button";
import { GlassCard } from "../../components/GlassCard";
import { BookmarkCard } from "./BookmarkCard";
import { BookmarkToolbar } from "./BookmarkToolbar";
import { filterBookmarks, type BookmarkEntity, type BookmarkSort } from "./bookmark-model";

interface BookmarkGridProps {
  bookmarks: SyncEntity[];
  groups: SyncEntity[];
  onAdd: () => void;
  onEdit?: (bookmark: BookmarkEntity) => void;
  onDelete?: (bookmark: BookmarkEntity) => void;
  onReorder?: (activeId: string, overId: string) => void;
  onVisit?: (bookmark: BookmarkEntity) => void;
  onToggleFavorite?: (bookmark: BookmarkEntity) => void;
  onCopy?: (bookmark: BookmarkEntity) => void;
}

export function BookmarkGrid({ bookmarks, groups, onAdd, onEdit, onDelete, onReorder, onVisit, onToggleFavorite, onCopy }: BookmarkGridProps) {
  const [activeGroup, setActiveGroup] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BookmarkSort>("order");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const visible = useMemo(
    () => filterBookmarks(bookmarks, { query, groupId: activeGroup, favoritesOnly, sort }),
    [activeGroup, bookmarks, favoritesOnly, query, sort]
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorder?.(String(active.id), String(over.id));
  };

  return (
    <GlassCard className="bookmark-panel" aria-labelledby="bookmark-heading">
      <header className="panel-header">
        <div><p className="eyebrow">QUICK LINKS</p><h2 id="bookmark-heading">快捷书签</h2></div>
        <Button variant="primary" onClick={onAdd}>＋ 添加书签</Button>
      </header>
      <BookmarkToolbar query={query} sort={sort} favoritesOnly={favoritesOnly} onQueryChange={setQuery} onSortChange={setSort} onFavoritesChange={setFavoritesOnly} />
      <div className="filter-row" aria-label="书签分类">
        <button type="button" className="filter-chip" aria-pressed={activeGroup === "all"} onClick={() => setActiveGroup("all")}>全部</button>
        {groups.filter((group) => group.type === "bookmarkGroup" && !group.deletedAt).map((group) => {
          const title = (group.data as { title: string }).title;
          return <button key={group.id} type="button" className="filter-chip" aria-label={`只看${title}`} aria-pressed={activeGroup === group.id} onClick={() => setActiveGroup(group.id)}>{title}</button>;
        })}
      </div>
      {visible.length === 0 ? (
        <div className="empty-state"><span aria-hidden="true">⌁</span><h3>把常用网站放在这里</h3><p>添加以后，一次点击就能到达。</p><Button onClick={onAdd}>添加第一个书签</Button></div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map((bookmark) => bookmark.id)} strategy={rectSortingStrategy}>
            <div className="bookmark-grid">
              {visible.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} onEdit={onEdit} onDelete={onDelete} onVisit={onVisit} onToggleFavorite={onToggleFavorite} onCopy={onCopy} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </GlassCard>
  );
}
