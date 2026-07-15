import { describe, expect, it } from "vitest";
import type { SyncEntity } from "../shared/entities";
import { mergeEntities } from "../src/lib/sync/merge";

const bookmark = (updatedAt: number, deletedAt?: number): SyncEntity => ({
  id: "bookmark-1",
  type: "bookmark",
  updatedAt,
  deletedAt,
  data: { title: "GitHub", url: "https://github.com", groupId: "dev", order: 1 }
});

describe("mergeEntities", () => {
  it("keeps the newest version of an entity", () => {
    expect(mergeEntities([bookmark(10)], [bookmark(20)])[0]).toMatchObject({ updatedAt: 20 });
  });

  it("does not resurrect a newer tombstone", () => {
    expect(mergeEntities([bookmark(30, 30)], [bookmark(20)])[0]).toMatchObject({ deletedAt: 30 });
  });

  it("keeps both note bodies when equal timestamps conflict", () => {
    const local: SyncEntity = { id: "daily-note", type: "note", updatedAt: 50, data: { text: "本地版本" } };
    const remote: SyncEntity = { id: "daily-note", type: "note", updatedAt: 50, data: { text: "远端版本" } };

    const result = mergeEntities([local], [remote]);

    expect(result).toHaveLength(2);
    expect(result.map((entity) => entity.data)).toEqual(
      expect.arrayContaining([{ text: "本地版本" }, { text: "远端版本" }])
    );
  });
});
