import { useState, type FormEvent } from "react";
import type { SyncEntity } from "../../../shared/entities";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { findDuplicateBookmark, normalizeBookmarkUrl, type BookmarkEntity, type BookmarkInput } from "./bookmark-model";

interface BookmarkDialogProps {
  open: boolean;
  bookmarks: SyncEntity[];
  groups: SyncEntity[];
  bookmark?: BookmarkEntity;
  onClose: () => void;
  onSave: (value: BookmarkInput) => void;
}

export function BookmarkDialog({ open, bookmarks, groups, bookmark, onClose, onSave }: BookmarkDialogProps) {
  if (!open) return null;
  return <BookmarkDialogForm bookmarks={bookmarks} groups={groups} bookmark={bookmark} onClose={onClose} onSave={onSave} />;
}

function BookmarkDialogForm({ bookmarks, groups, bookmark, onClose, onSave }: Omit<BookmarkDialogProps, "open">) {
  const [title, setTitle] = useState(bookmark?.data.title ?? "");
  const [url, setUrl] = useState(bookmark?.data.url ?? "");
  const [groupId, setGroupId] = useState(bookmark?.data.groupId ?? groups[0]?.id ?? "");
  const [tags, setTags] = useState(bookmark?.data.tags?.join("，") ?? "");
  const [favorite, setFavorite] = useState(Boolean(bookmark?.data.favorite));
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      normalizeBookmarkUrl(url);
      if (!title.trim()) throw new Error("请输入书签名称");
      if (findDuplicateBookmark(bookmarks, url, bookmark?.id)) throw new Error("这个网址已经在工作台里了");
      onSave({
        title,
        url,
        groupId,
        order: bookmark?.data.order ?? bookmarks.length,
        tags: tags.split(/[,，]/),
        favorite
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法保存书签");
    }
  };
  return (
    <Dialog open title={bookmark ? "编辑书签" : "添加书签"} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>名称<input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={60} /></label>
        <label>网址<input value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" placeholder="example.com" /></label>
        <label>分类<select value={groupId} onChange={(event) => setGroupId(event.target.value)}>{groups.map((group) => <option key={group.id} value={group.id}>{(group.data as { title: string }).title}</option>)}</select></label>
        <label>标签<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="例如：开发，文档" maxLength={120} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />加入收藏</label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="dialog__actions"><Button onClick={onClose}>取消</Button><Button variant="primary" type="submit">保存</Button></div>
      </form>
    </Dialog>
  );
}
