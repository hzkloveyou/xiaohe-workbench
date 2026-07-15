import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BookmarkEntity } from "./bookmark-model";

interface BookmarkCardProps {
  bookmark: BookmarkEntity;
  onEdit?: (bookmark: BookmarkEntity) => void;
  onDelete?: (bookmark: BookmarkEntity) => void;
}

export function BookmarkCard({ bookmark, onEdit, onDelete }: BookmarkCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <article ref={setNodeRef} className="bookmark-card" style={style} data-dragging={isDragging || undefined}>
      <a className="bookmark-card__link" href={bookmark.data.url}>
        <span className="bookmark-card__icon" aria-hidden="true">{bookmark.data.icon ?? "↗"}</span>
        <span className="bookmark-card__copy">
          <strong>{bookmark.data.title}</strong>
          <small>{new URL(bookmark.data.url).hostname.replace(/^www\./, "")}</small>
        </span>
      </a>
      <div className="bookmark-card__actions">
        <button type="button" className="icon-button" aria-label={`拖动 ${bookmark.data.title} 调整顺序`} {...attributes} {...listeners}>⠿</button>
        {onEdit ? <button type="button" className="icon-button" aria-label={`编辑 ${bookmark.data.title}`} onClick={() => onEdit(bookmark)}>✎</button> : null}
        {onDelete ? <button type="button" className="icon-button" aria-label={`删除 ${bookmark.data.title}`} onClick={() => onDelete(bookmark)}>×</button> : null}
      </div>
    </article>
  );
}
