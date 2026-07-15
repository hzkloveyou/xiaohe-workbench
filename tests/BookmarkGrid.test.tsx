import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SyncEntity } from "../shared/entities";
import { BookmarkGrid } from "../src/features/bookmarks/BookmarkGrid";

const groups: SyncEntity[] = [
  { id: "all", type: "bookmarkGroup", updatedAt: 1, data: { title: "常用", order: 0 } }
];

const bookmarks: SyncEntity[] = [
  {
    id: "github",
    type: "bookmark",
    updatedAt: 1,
    data: { title: "GitHub", url: "https://github.com/", groupId: "all", order: 0, icon: "G" }
  }
];

describe("BookmarkGrid", () => {
  it("shows a useful empty state and starts adding a bookmark", () => {
    const onAdd = vi.fn();
    render(<BookmarkGrid bookmarks={[]} groups={groups} onAdd={onAdd} />);

    expect(screen.getByText("把常用网站放在这里")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "添加第一个书签" }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("exposes edit, delete and keyboard drag controls", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <BookmarkGrid
        bookmarks={bookmarks}
        groups={groups}
        onAdd={() => undefined}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", "https://github.com/");
    expect(screen.getByRole("button", { name: "拖动 GitHub 调整顺序" })).toHaveAttribute("aria-describedby");
    fireEvent.click(screen.getByRole("button", { name: "编辑 GitHub" }));
    fireEvent.click(screen.getByRole("button", { name: "删除 GitHub" }));
    expect(onEdit).toHaveBeenCalledWith(bookmarks[0]);
    expect(onDelete).toHaveBeenCalledWith(bookmarks[0]);
  });

  it("filters bookmarks by category", () => {
    const otherGroup: SyncEntity = {
      id: "learn",
      type: "bookmarkGroup",
      updatedAt: 1,
      data: { title: "学习", order: 1 }
    };
    const otherBookmark: SyncEntity = {
      id: "mdn",
      type: "bookmark",
      updatedAt: 1,
      data: { title: "MDN", url: "https://developer.mozilla.org/", groupId: "learn", order: 1 }
    };
    render(
      <BookmarkGrid
        bookmarks={[...bookmarks, otherBookmark]}
        groups={[...groups, otherGroup]}
        onAdd={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "只看学习" }));
    expect(screen.getByRole("link", { name: /MDN/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /GitHub/ })).not.toBeInTheDocument();
  });
});
