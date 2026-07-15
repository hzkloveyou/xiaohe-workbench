import type { WorkspaceRepository } from "../db/repository";
import { ApiRequestError, type SyncApi } from "./api";
import { mergeEntities } from "./merge";

export type SyncState = "idle" | "syncing" | "offline" | "needs-auth" | "error";

export function createSyncEngine({
  repository,
  api,
  online
}: {
  repository: WorkspaceRepository;
  api: SyncApi;
  online: () => boolean;
}) {
  let state: SyncState = "idle";
  const listeners = new Set<(state: SyncState) => void>();
  let stopped = false;

  const updateState = (next: SyncState) => {
    state = next;
    listeners.forEach((listener) => listener(next));
  };

  const flush = async () => {
    if (stopped) return;
    if (!online()) {
      updateState("offline");
      return;
    }
    const pending = await repository.getPendingChanges();
    if (pending.length === 0) {
      updateState("idle");
      return;
    }
    updateState("syncing");
    try {
      const result = await api.push(pending);
      const snapshot = await repository.getSnapshot();
      await repository.applyRemoteChanges(mergeEntities(snapshot.entities, result.changes));
      await repository.removePendingChanges(result.acknowledgedIds);
      updateState("idle");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) updateState("needs-auth");
      else updateState("error");
    }
  };

  return {
    getState: () => state,
    flush,
    start() {
      stopped = false;
      void flush();
    },
    stop() {
      stopped = true;
    },
    subscribe(listener: (next: SyncState) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
