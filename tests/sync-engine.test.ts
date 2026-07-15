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
      pull: vi.fn()
    };
    const engine = createSyncEngine({ repository, api, online: () => true });

    await engine.flush();

    expect(engine.getState()).toBe("idle");
    expect(repository.removePendingChanges).toHaveBeenCalledWith(["note-1"]);
  });
});
