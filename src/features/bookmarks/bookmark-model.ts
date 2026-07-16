import type { BookmarkData as SharedBookmarkData, SyncEntity } from "../../../shared/entities";

export type BookmarkData = SharedBookmarkData;

export type BookmarkEntity = SyncEntity<BookmarkData> & { type: "bookmark" };

export interface BookmarkInput {
  title: string;
  url: string;
  groupId: string;
  order?: number;
  icon?: string;
  tags?: string[];
  favorite?: boolean;
}

export type BookmarkSort = "order" | "recent" | "popular" | "title";

export interface BookmarkFilterOptions {
  query?: string;
  groupId?: string;
  favoritesOnly?: boolean;
  sort?: BookmarkSort;
}

export function normalizeTags(tags: string[] = []): string[] {
  const seen = new Set<string>();
  return tags.reduce<string[]>((result, value) => {
    const tag = value.trim();
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) return result;
    seen.add(key);
    result.push(tag);
    return result;
  }, []);
}

export function normalizeBookmarkUrl(value: string): string {
  const candidate = value.trim();
  if (!candidate) throw new Error("请输入网址");
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("仅支持 HTTP 或 HTTPS 网址");
  }
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

export function isBookmarkEntity(entity: SyncEntity): entity is BookmarkEntity {
  return entity.type === "bookmark" && !entity.deletedAt;
}

export function createBookmark(
  input: BookmarkInput,
  options: { id?: string; now?: number } = {}
): BookmarkEntity {
  const title = input.title.trim();
  if (!title) throw new Error("请输入书签名称");
  const url = normalizeBookmarkUrl(input.url);
  const icon = input.icon?.trim() || Array.from(title)[0]?.toUpperCase() || "↗";
  const data: BookmarkData = {
    title,
    url,
    groupId: input.groupId,
    order: input.order ?? 0,
    icon
  };
  if (input.tags !== undefined) data.tags = normalizeTags(input.tags);
  if (input.favorite !== undefined) data.favorite = input.favorite;
  return {
    id: options.id ?? crypto.randomUUID(),
    type: "bookmark",
    updatedAt: options.now ?? Date.now(),
    data
  };
}

export function findDuplicateBookmark(
  entities: SyncEntity[],
  value: string,
  excludeId?: string
): string | undefined {
  const target = normalizeBookmarkUrl(value);
  return entities.find(
    (entity) =>
      isBookmarkEntity(entity) &&
      entity.id !== excludeId &&
      normalizeBookmarkUrl(entity.data.url) === target
  )?.id;
}

export function updateBookmark(
  entities: SyncEntity[],
  id: string,
  patch: Partial<BookmarkInput>,
  now = Date.now()
): SyncEntity[] {
  return entities.map((entity) => {
    if (!isBookmarkEntity(entity) || entity.id !== id) return entity;
    const data: BookmarkData = {
      ...entity.data,
      ...patch,
      title: patch.title === undefined ? entity.data.title : patch.title.trim(),
      url: patch.url === undefined ? entity.data.url : normalizeBookmarkUrl(patch.url),
      tags: patch.tags === undefined ? entity.data.tags : normalizeTags(patch.tags)
    };
    return { ...entity, updatedAt: now, data };
  });
}

export function toggleFavorite(entities: SyncEntity[], id: string, now = Date.now()): SyncEntity[] {
  return entities.map((entity) =>
    isBookmarkEntity(entity) && entity.id === id
      ? { ...entity, updatedAt: now, data: { ...entity.data, favorite: !entity.data.favorite } }
      : entity
  );
}

export function recordBookmarkVisit(entities: SyncEntity[], id: string, now = Date.now()): SyncEntity[] {
  return entities.map((entity) =>
    isBookmarkEntity(entity) && entity.id === id
      ? {
          ...entity,
          updatedAt: now,
          data: {
            ...entity.data,
            visitCount: (entity.data.visitCount ?? 0) + 1,
            lastVisitedAt: now
          }
        }
      : entity
  );
}

export function filterBookmarks(
  entities: SyncEntity[],
  options: BookmarkFilterOptions = {}
): BookmarkEntity[] {
  const query = options.query?.trim().toLocaleLowerCase() ?? "";
  const result = entities.filter(isBookmarkEntity).filter((bookmark) => {
    if (options.groupId && options.groupId !== "all" && bookmark.data.groupId !== options.groupId) return false;
    if (options.favoritesOnly && !bookmark.data.favorite) return false;
    if (!query) return true;
    const domain = new URL(bookmark.data.url).hostname.replace(/^www\./, "");
    return [bookmark.data.title, bookmark.data.url, domain, ...(bookmark.data.tags ?? [])]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });

  return [...result].sort((left, right) => {
    switch (options.sort ?? "order") {
      case "recent":
        return (right.data.lastVisitedAt ?? 0) - (left.data.lastVisitedAt ?? 0) || left.data.order - right.data.order;
      case "popular":
        return (right.data.visitCount ?? 0) - (left.data.visitCount ?? 0) || left.data.order - right.data.order;
      case "title":
        return left.data.title.localeCompare(right.data.title, "zh-CN");
      default:
        return left.data.order - right.data.order;
    }
  });
}

export function reorderBookmarks(
  entities: SyncEntity[],
  activeId: string,
  overId: string,
  now = Date.now()
): SyncEntity[] {
  const activeIndex = entities.findIndex((entity) => entity.id === activeId);
  const overIndex = entities.findIndex((entity) => entity.id === overId);
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return [...entities];
  const next = [...entities];
  const [active] = next.splice(activeIndex, 1);
  if (!active) return next;
  next.splice(overIndex, 0, active);
  return next.map((entity, order) =>
    isBookmarkEntity(entity) ? { ...entity, updatedAt: now, data: { ...entity.data, order } } : entity
  );
}
