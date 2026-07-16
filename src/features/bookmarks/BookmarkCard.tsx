import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BookmarkEntity } from "./bookmark-model";

interface BookmarkCardProps {
  bookmark: BookmarkEntity;
  onEdit?: (bookmark: BookmarkEntity) => void;
  onDelete?: (bookmark: BookmarkEntity) => void;
  onVisit?: (bookmark: BookmarkEntity) => void;
  onToggleFavorite?: (bookmark: BookmarkEntity) => void;
  onCopy?: (bookmark: BookmarkEntity) => void;
}

export function BookmarkCard({ bookmark, onEdit, onDelete, onVisit, onToggleFavorite, onCopy }: BookmarkCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <article ref={setNodeRef} className="bookmark-card" style={style} data-dragging={isDragging || undefined}>
      <a className="bookmark-card__link" href={bookmark.data.url} target="_blank" rel="noreferrer" onClick={() => onVisit?.(bookmark)}>
        <span className="bookmark-card__icon" aria-hidden="true">{bookmark.data.icon ?? "↗"}</span>
        <span className="bookmark-card__copy">
          <strong>{bookmark.data.title}</strong>
          <small>{new URL(bookmark.data.url).hostname.replace(/^www\./, "")}</small>
        </span>
      </a>
      <div className="bookmark-card__actions">
        {onToggleFavorite ? <button type="button" className="icon-button" aria-label={`${bookmark.data.favorite ? "取消收藏" : "收藏"} ${bookmark.data.title}`} aria-pressed={Boolean(bookmark.data.favorite)} onClick={() => onToggleFavorite(bookmark)}>{bookmark.data.favorite ? "★" : "☆"}</button> : null}
        {onCopy ? <button type="button" className="icon-button" aria-label={`复制 ${bookmark.data.title} 链接`} onClick={() => onCopy(bookmark)}>⧉</button> : null}
        <button type="button" className="icon-button" aria-label={`拖动 ${bookmark.data.title} 调整顺序`} {...attributes} {...listeners}>⠿</button>
        {onEdit ? <button type="button" className="icon-button" aria-label={`编辑 ${bookmark.data.title}`} onClick={() => onEdit(bookmark)}>✎</button> : null}
        {onDelete ? <button type="button" className="icon-button" aria-label={`删除 ${bookmark.data.title}`} onClick={() => onDelete(bookmark)}>×</button> : null}
      </div>
    </article>
  );
}
