import { describe, expect, it } from "vitest";
import type { SyncEntity } from "../../shared/entities";
import { createSyncService, type SyncStore } from "../../worker/sync-service";

class MemorySyncStore implements SyncStore {
  records = new Map<string, SyncEntity>();

  async getChanges(userId: string, since: number) {
    return [...this.records.entries()]
      .filter(([key, entity]) => key.startsWith(`${userId}:`) && entity.updatedAt > since)
      .map(([, entity]) => entity);
  }
  async getEntity(userId: string, id: string) {
    return this.records.get(`${userId}:${id}`) ?? null;
  }
  async putEntity(userId: string, entity: SyncEntity) {
    this.records.set(`${userId}:${entity.id}`, entity);
  }
}

const note = (updatedAt = 10): SyncEntity => ({
  id: "note-1",
  type: "note",
  updatedAt,
  data: { text: "你好" }
});

describe("sync service", () => {
  it("isolates entities by user", async () => {
    const service = createSyncService(new MemorySyncStore());
    await service.push("user-a", [note()]);

    expect((await service.pull("user-a", 0)).changes).toHaveLength(1);
    expect((await service.pull("user-b", 0)).changes).toHaveLength(0);
  });

  it("accepts a duplicate push idempotently", async () => {
    const service = createSyncService(new MemorySyncStore());
    await service.push("user-a", [note()]);
    const result = await service.push("user-a", [note()]);

    expect(result.acknowledgedIds).toEqual(["note-1"]);
    expect((await service.pull("user-a", 0)).changes).toHaveLength(1);
  });

  it("does not overwrite a newer server entity", async () => {
    const service = createSyncService(new MemorySyncStore());
    await service.push("user-a", [note(20)]);
    await service.push("user-a", [note(10)]);

    expect((await service.pull("user-a", 0)).changes[0].updatedAt).toBe(20);
  });

  it("returns the greatest entity clock as its pull cursor", async () => {
    const service = createSyncService(new MemorySyncStore());
    await service.push("user-a", [note(12), { ...note(20), id: "note-2", deletedAt: 25 }]);

    const result = await service.pull("user-a", 0);

    expect(result.cursor).toBe(25);
  });
});
