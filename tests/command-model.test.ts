import { describe, expect, it, vi } from "vitest";
import type { SyncEntity } from "../shared/entities";
import { buildCommands, filterCommands } from "../src/features/command/command-model";

const bookmarks: SyncEntity[] = [
  {
    id: "bookmark-github",
    type: "bookmark",
    updatedAt: 1,
    data: { title: "GitHub", url: "https://github.com", groupId: "dev", order: 0, tags: ["开发"] }
  },
  {
    id: "bookmark-docs",
    type: "bookmark",
    updatedAt: 1,
    data: { title: "开发文档", url: "https://developer.mozilla.org", groupId: "dev", order: 1, tags: ["开发"] }
  }
];

describe("command model", () => {
  it("ranks an exact bookmark title before keyword matches", () => {
    const commands = buildCommands({
      bookmarks,
      navigate: vi.fn(),
      openUrl: vi.fn(),
      setTheme: vi.fn()
    });

    const results = filterCommands(commands, "GitHub");

    expect(results[0]?.id).toBe("bookmark-github");
  });

  it("finds pages, bookmark tags and actions with Chinese queries", () => {
    const commands = buildCommands({
      bookmarks,
      navigate: vi.fn(),
      openUrl: vi.fn(),
      setTheme: vi.fn()
    });

    expect(filterCommands(commands, "今日").some((item) => item.id === "page-today")).toBe(true);
    expect(filterCommands(commands, "开发").some((item) => item.id === "bookmark-github")).toBe(true);
    expect(filterCommands(commands, "25").some((item) => item.id === "action-focus-25")).toBe(true);
  });
});
