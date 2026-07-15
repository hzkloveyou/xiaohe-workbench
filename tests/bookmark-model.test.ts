import { describe, expect, it } from "vitest";
import type { SyncEntity } from "../shared/entities";
import {
  createBookmark,
  findDuplicateBookmark,
  normalizeBookmarkUrl,
  reorderBookmarks,
  updateBookmark
} from "../src/features/bookmarks/bookmark-model";

const bookmarks: SyncEntity[] = [
  {
    id: "one",
    type: "bookmark",
    updatedAt: 1,
    data: { title: "GitHub", url: "https://github.com/", groupId: "dev", order: 0 }
  },
  {
    id: "two",
    type: "bookmark",
    updatedAt: 1,
    data: { title: "MDN", url: "https://developer.mozilla.org/zh-CN", groupId: "dev", order: 1 }
  }
];

describe("bookmark model", () => {
  it("normalizes a bare domain to a secure URL", () => {
    expect(normalizeBookmarkUrl(" Example.COM/docs ")).toBe("https://example.com/docs");
  });

  it("creates a trimmed bookmark with a normalized URL", () => {
    const bookmark = createBookmark(
      { title: "  OpenAI  ", url: "openai.com", groupId: "ai", order: 3 },
      { id: "new", now: 42 }
    );

    expect(bookmark).toEqual({
      id: "new",
      type: "bookmark",
      updatedAt: 42,
      data: {
        title: "OpenAI",
        url: "https://openai.com/",
        groupId: "ai",
        order: 3,
        icon: "O"
      }
    });
  });

  it("detects duplicate URLs while editing a different bookmark", () => {
    expect(findDuplicateBookmark(bookmarks, "github.com")).toBe("one");
    expect(findDuplicateBookmark(bookmarks, "github.com", "one")).toBeUndefined();
  });

  it("updates one bookmark without mutating the source", () => {
    const updated = updateBookmark(bookmarks, "one", { title: "代码" }, 8);

    expect((updated[0]?.data as { title: string }).title).toBe("代码");
    expect(updated[0]?.updatedAt).toBe(8);
    expect((bookmarks[0]?.data as { title: string }).title).toBe("GitHub");
  });

  it("reorders bookmarks and assigns deterministic positions", () => {
    const reordered = reorderBookmarks(bookmarks, "two", "one", 9);

    expect(reordered.map((bookmark) => bookmark.id)).toEqual(["two", "one"]);
    expect(reordered.map((bookmark) => (bookmark.data as { order: number }).order)).toEqual([0, 1]);
    expect(reordered.every((bookmark) => bookmark.updatedAt === 9)).toBe(true);
  });
});
