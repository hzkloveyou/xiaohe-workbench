import { Button } from "../../components/Button";
import type { InboxItemEntity } from "./inbox-model";

export function InboxList({
  items,
  onArchive,
  onDelete,
  onConvert
}: {
  items: InboxItemEntity[];
  onArchive: (item: InboxItemEntity) => void;
  onDelete: (item: InboxItemEntity) => void;
  onConvert: (item: InboxItemEntity) => void;
}) {
  const pending = items.filter((item) => item.data.status === "pending").sort((left, right) => right.data.createdAt - left.data.createdAt);
  if (!pending.length) {
    return <div className="empty-state inbox-empty"><span aria-hidden="true">＋</span><h3>收集箱是空的</h3><p>遇到有用的链接或突然想到的事，先放在这里。</p></div>;
  }
  return (
    <ul className="inbox-list" aria-label="待整理内容">
      {pending.map((item) => (
        <li key={item.id}>
          <span className={`inbox-kind inbox-kind--${item.data.kind}`}>{item.data.kind === "link" ? "链接" : item.data.kind === "task" ? "任务" : "记录"}</span>
          <div><strong>{item.data.title ?? item.data.raw}</strong>{item.data.url ? <small>{new URL(item.data.url).hostname}</small> : item.data.scheduledFor ? <small>{item.data.scheduledFor}</small> : null}</div>
          <div className="inbox-list__actions">
            {item.data.kind !== "note" ? <Button onClick={() => onConvert(item)}>{item.data.kind === "link" ? "整理为书签" : "加入计划"}</Button> : null}
            <Button variant="ghost" onClick={() => onArchive(item)}>归档</Button>
            <Button variant="ghost" aria-label={`删除：${item.data.title ?? item.data.raw}`} onClick={() => onDelete(item)}>×</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
