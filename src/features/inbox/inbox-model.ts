import type { InboxItemData, SyncEntity } from "../../../shared/entities";
import { normalizeBookmarkUrl } from "../bookmarks/bookmark-model";

export type InboxItemEntity = SyncEntity<InboxItemData> & { type: "inboxItem" };

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addLocalDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function validIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value;
}

export function parseCaptureDate(raw: string, now = new Date()): { title: string; scheduledFor?: string } {
  const value = raw.trim();
  const relative = value.match(/^(今天|明天|后天)\s*/);
  if (relative) {
    const offset = relative[1] === "今天" ? 0 : relative[1] === "明天" ? 1 : 2;
    const title = value.slice(relative[0].length).trim();
    return { title: title || value, scheduledFor: localDate(addLocalDays(now, offset)) };
  }
  const absolute = value.match(/^(\d{4}-\d{2}-\d{2})\s+/);
  if (absolute && validIsoDate(absolute[1])) {
    return { title: value.slice(absolute[0].length).trim() || value, scheduledFor: absolute[1] };
  }
  return { title: value };
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^(?:localhost|(?:[\p{L}\p{N}-]+\.)+[\p{L}]{2,})(?::\d+)?(?:\/\S*)?$/u.test(value);
}

export function classifyCapture(
  raw: string,
  forcedKind?: InboxItemData["kind"],
  now = new Date()
): InboxItemData {
  const value = raw.trim();
  if (!value) throw new Error("请输入要收集的内容");
  const taskPrefix = /^(任务|todo)\s+/i;
  const kind = forcedKind ?? (looksLikeUrl(value) ? "link" : taskPrefix.test(value) ? "task" : "note");
  const base = { kind, raw: value, status: "pending" as const, createdAt: now.getTime() };
  if (kind === "link") {
    const url = normalizeBookmarkUrl(value);
    return { ...base, url, title: new URL(url).hostname };
  }
  if (kind === "task") {
    return { ...base, ...parseCaptureDate(value.replace(taskPrefix, ""), now) };
  }
  return base;
}

export function createInboxEntity(
  raw: string,
  options: { kind?: InboxItemData["kind"]; id?: string; now?: Date } = {}
): InboxItemEntity {
  const now = options.now ?? new Date();
  return {
    id: options.id ?? crypto.randomUUID(),
    type: "inboxItem",
    updatedAt: now.getTime(),
    data: classifyCapture(raw, options.kind, now)
  };
}

export function isInboxItem(entity: SyncEntity): entity is InboxItemEntity {
  return entity.type === "inboxItem" && !entity.deletedAt;
}

export function archiveInboxItem(entity: InboxItemEntity, now = Date.now()): InboxItemEntity {
  return { ...entity, updatedAt: now, data: { ...entity.data, status: "archived" } };
}
