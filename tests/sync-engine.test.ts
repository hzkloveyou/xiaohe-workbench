import { describe, expect, it, vi } from "vitest";
import type { SyncEntity, WorkspaceSnapshot } from "../shared/entities";
import { ApiRequestError } from "../src/lib/sync/api";
import { createSyncEngine } from "../src/lib/sync/engine";

const change: SyncEntity = {
  id: "note-1",
  type: "note",
  updatedAt: 10,
  data: { text: "离线也要保存" }
};

const snapshot: WorkspaceSnapshot = { version: 1, theme: "morning", entities: [change] };

function createRepository() {
  return {
    initializeDefaults: vi.fn(),
    getSnapshot: vi.fn(async () => snapshot),
    applyChange: vi.fn(),
    applyRemoteChanges: vi.fn(),
    getPendingChanges: vi.fn(async () => [change]),
    removePendingChanges: vi.fn(),
    getSyncCursor: vi.fn(async () => 0),
    setSyncCursor: vi.fn(),
    setTheme: vi.fn(),
    replaceSnapshot: vi.fn(),
    close: vi.fn()
  };
}

describe("sync engine", () => {
  it("keeps queued changes while offline", async () => {
    const repository = createRepository();
    const api = { push: vi.fn(), pull: vi.fn() };
    const engine = createSyncEngine({ repository, api, online: () => false });

    await engine.flush();

    expect(engine.getState()).toBe("offline");
    expect(api.push).not.toHaveBeenCalled();
    expect(repository.removePendingChanges).not.toHaveBeenCalled();
  });

  it("pauses uploads without deleting data after a 401", async () => {
    const repository = createRepository();
    const api = {
      push: vi.fn(async () => {
        throw new ApiRequestError(401, "UNAUTHORIZED", "请重新登录");
      }),
      pull: vi.fn()
    };
    const engine = createSyncEngine({ repository, api, online: () => true });

    await engine.flush();

    expect(engine.getState()).toBe("needs-auth");
    expect(repository.removePendingChanges).not.toHaveBeenCalled();
  });

  it("removes acknowledged changes after a successful push", async () => {
    const repository = createRepository();
    const api = {
      push: vi.fn(async () => ({ acknowledgedIds: ["note-1"], changes: [] })),
      pull: vi.fn(async () => ({ changes: [], cursor: 10 }))
    };
    const engine = createSyncEngine({ repository, api, online: () => true });

    await engine.flush();

    expect(engine.getState()).toBe("idle");
    expect(repository.removePendingChanges).toHaveBeenCalledWith(["note-1"]);
    expect(repository.setSyncCursor).toHaveBeenCalledWith(10);
  });

  it("pulls remote data on a clean new device", async () => {
    const repository = createRepository();
    repository.getPendingChanges.mockResolvedValue([]);
    const remote: SyncEntity = {
      id: "bookmark-remote",
      type: "bookmark",
      updatedAt: 42,
      data: { title: "远端书签", url: "https://example.com", groupId: "dev", order: 0 }
    };
    const api = {
      push: vi.fn(),
      pull: vi.fn(async () => ({ changes: [remote], cursor: 42 }))
    };
    const engine = createSyncEngine({ repository, api, online: () => true });

    await engine.flush();

    expect(api.push).not.toHaveBeenCalled();
    expect(api.pull).toHaveBeenCalledWith(0);
    expect(repository.applyRemoteChanges).toHaveBeenCalledWith(expect.arrayContaining([remote]));
    expect(repository.setSyncCursor).toHaveBeenCalledWith(42);
  });

  it("pushes a large queue in bounded batches", async () => {
    const repository = createRepository();
    const changes = Array.from({ length: 501 }, (_, index): SyncEntity => ({
      id: `note-${index}`,
      type: "note",
      updatedAt: index + 1,
      data: { content: `记录 ${index}` }
    }));
    repository.getPendingChanges.mockResolvedValue(changes);
    const api = {
      push: vi.fn(async (batch: SyncEntity[]) => ({
        acknowledgedIds: batch.map((entity) => entity.id),
        changes: []
      })),
      pull: vi.fn(async () => ({ changes: [], cursor: 501 }))
    };
    const engine = createSyncEngine({ repository, api, online: () => true });

    await engine.flush();

    expect(api.push.mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 101]);
    expect(repository.removePendingChanges).toHaveBeenCalledTimes(3);
  });
});
