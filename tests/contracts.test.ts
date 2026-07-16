import { describe, expect, it } from "vitest";
import { parseWorkspaceSnapshot } from "../shared/contracts";

describe("workspace contract", () => {
  it("rejects an unsupported theme", () => {
    expect(() =>
      parseWorkspaceSnapshot({ version: 1, theme: "neon", entities: [] })
    ).toThrow();
  });

  it("rejects an entity without an id", () => {
    expect(() =>
      parseWorkspaceSnapshot({
        version: 1,
        theme: "morning",
        entities: [{ type: "bookmark", updatedAt: 1, data: {} }]
      })
    ).toThrow();
  });

  it("rejects notes longer than 20000 characters", () => {
    expect(() =>
      parseWorkspaceSnapshot({
        version: 1,
        theme: "morning",
        entities: [
          {
            id: "note-1",
            type: "note",
            updatedAt: 1,
            data: { text: "x".repeat(20001) }
          }
        ]
      })
    ).toThrow();
  });

  it("accepts legacy bookmarks and enhanced bookmark fields", () => {
    const legacy = {
      id: "bookmark-old",
      type: "bookmark",
      updatedAt: 1,
      data: { title: "GitHub", url: "https://github.com", groupId: "dev", order: 0 }
    };
    const enhanced = {
      ...legacy,
      id: "bookmark-new",
      data: {
        ...legacy.data,
        tags: ["开发", "AI"],
        favorite: true,
        visitCount: 2,
        lastVisitedAt: 10
      }
    };

    expect(parseWorkspaceSnapshot({ version: 1, theme: "morning", entities: [legacy, enhanced] }).entities)
      .toHaveLength(2);
  });

  it("accepts inbox items, focus sessions and expanded tasks", () => {
    const entities = [
      {
        id: "inbox-1",
        type: "inboxItem",
        updatedAt: 1,
        data: { kind: "note", raw: "一个灵感", status: "pending", createdAt: 1 }
      },
      {
        id: "focus-1",
        type: "focusSession",
        updatedAt: 2,
        data: {
          plannedMs: 1_500_000,
          actualMs: 1_500_000,
          startedAt: 1,
          endedAt: 1_500_001,
          completed: true,
          taskId: "task-1"
        }
      },
      {
        id: "task-1",
        type: "task",
        updatedAt: 3,
        data: {
          title: "复盘",
          completed: false,
          order: 0,
          scheduledFor: "2026-07-16",
          dueAt: "2026-07-16",
          priority: "high",
          note: "整理今天的工作",
          recurrence: "daily",
          seriesId: "series-1"
        }
      }
    ];

    expect(parseWorkspaceSnapshot({ version: 1, theme: "morning", entities }).entities)
      .toHaveLength(3);
  });

  it("rejects oversized tags and invalid focus durations", () => {
    const bookmark = {
      id: "bookmark-tags",
      type: "bookmark",
      updatedAt: 1,
      data: {
        title: "标签过多",
        url: "https://example.com",
        groupId: "dev",
        order: 0,
        tags: Array.from({ length: 21 }, (_, index) => `标签${index}`)
      }
    };
    const focus = {
      id: "focus-invalid",
      type: "focusSession",
      updatedAt: 1,
      data: { plannedMs: -1, actualMs: 0, startedAt: 1, endedAt: 2, completed: false }
    };

    expect(() => parseWorkspaceSnapshot({ version: 1, theme: "morning", entities: [bookmark] })).toThrow();
    expect(() => parseWorkspaceSnapshot({ version: 1, theme: "morning", entities: [focus] })).toThrow();
  });
});
