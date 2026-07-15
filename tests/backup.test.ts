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
});
