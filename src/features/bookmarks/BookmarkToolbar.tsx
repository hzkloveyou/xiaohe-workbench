import type { BookmarkSort } from "./bookmark-model";

interface BookmarkToolbarProps {
  query: string;
  sort: BookmarkSort;
  favoritesOnly: boolean;
  onQueryChange: (value: string) => void;
  onSortChange: (value: BookmarkSort) => void;
  onFavoritesChange: (value: boolean) => void;
}

export function BookmarkToolbar({
  query,
  sort,
  favoritesOnly,
  onQueryChange,
  onSortChange,
  onFavoritesChange
}: BookmarkToolbarProps) {
  return (
    <div className="bookmark-toolbar">
      <label className="bookmark-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          aria-label="搜索书签"
          placeholder="搜索名称、网址或标签"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <label className="bookmark-sort">
        <span className="sr-only">书签排序</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value as BookmarkSort)}>
          <option value="order">自定义排序</option>
          <option value="recent">最近访问</option>
          <option value="popular">最常访问</option>
          <option value="title">名称排序</option>
        </select>
      </label>
      <button
        type="button"
        className="filter-chip"
        aria-pressed={favoritesOnly}
        onClick={() => onFavoritesChange(!favoritesOnly)}
      >
        只看收藏
      </button>
    </div>
  );
}
