import { describe, expect, it } from "vitest";
import type { WorkspaceSnapshot } from "../shared/entities";
import { exportBackup, parseBackup } from "../src/features/customize/backup";

const snapshot: WorkspaceSnapshot = {
  version: 1,
  theme: "morning",
  entities: [{ id: "note", type: "note", updatedAt: 1, data: { content: "重要内容" } }]
};

describe("workspace backup", () => {
  it("round-trips a valid snapshot", () => {
    expect(parseBackup(exportBackup(snapshot))).toEqual(snapshot);
  });

  it("rejects a damaged backup before it can replace local data", () => {
    expect(() => parseBackup('{"version":1,"theme":"unknown","entities":[]}')).toThrow("备份文件无效");
    expect(snapshot.entities).toHaveLength(1);
  });

  it("round-trips new workspace entity kinds", () => {
    const enhancedSnapshot = {
      version: 1,
      theme: "night",
      entities: [
        {
          id: "inbox-1",
          type: "inboxItem",
          updatedAt: 1,
          data: { kind: "link", raw: "https://example.com", status: "pending", createdAt: 1, url: "https://example.com" }
        },
        {
          id: "focus-1",
          type: "focusSession",
          updatedAt: 2,
          data: { plannedMs: 1_500_000, actualMs: 1_500_000, startedAt: 1, endedAt: 1_500_001, completed: true }
        },
        {
          id: "workspace-preferences",
          type: "preference",
          updatedAt: 3,
          data: { searchEngine: "google", githubUsername: "hzkloveyou", panels: { search: true, bookmarks: true, focus: false } }
        }
      ]
    } as unknown as WorkspaceSnapshot;

    expect(parseBackup(exportBackup(enhancedSnapshot))).toEqual(enhancedSnapshot);
  });
});
