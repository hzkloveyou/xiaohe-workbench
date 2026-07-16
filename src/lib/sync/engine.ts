import type { WorkspaceRepository } from "../db/repository";
import { ApiRequestError, type SyncApi } from "./api";
import { mergeEntities } from "./merge";

export type SyncState = "idle" | "syncing" | "offline" | "needs-auth" | "error";

const PUSH_BATCH_SIZE = 200;
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000, 60_000] as const;
const SYNC_INTERVAL_MS = 60_000;

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
  let started = false;
  let inFlight: Promise<void> | null = null;
  let retryAttempt = 0;
  let retryTimer: number | undefined;
  let intervalTimer: number | undefined;

  const updateState = (next: SyncState) => {
    state = next;
    listeners.forEach((listener) => listener(next));
  };

  const clearRetry = () => {
    if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    retryTimer = undefined;
  };

  const scheduleRetry = () => {
    if (!started || stopped || retryTimer !== undefined) return;
    const delay = RETRY_DELAYS[Math.min(retryAttempt, RETRY_DELAYS.length - 1)];
    retryAttempt += 1;
    retryTimer = window.setTimeout(() => {
      retryTimer = undefined;
      void flush();
    }, delay);
  };

  const synchronize = async () => {
    if (!online()) {
      updateState("offline");
      return;
    }
    const pending = await repository.getPendingChanges();
    updateState("syncing");
    try {
      for (let offset = 0; offset < pending.length; offset += PUSH_BATCH_SIZE) {
        const result = await api.push(pending.slice(offset, offset + PUSH_BATCH_SIZE));
        await repository.removePendingChanges(result.acknowledgedIds);
      }
      const cursor = await repository.getSyncCursor();
      const result = await api.pull(cursor);
      const snapshot = await repository.getSnapshot();
      await repository.applyRemoteChanges(mergeEntities(snapshot.entities, result.changes));
      await repository.setSyncCursor(result.cursor);
      retryAttempt = 0;
      clearRetry();
      updateState("idle");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) updateState("needs-auth");
      else {
        updateState("error");
        scheduleRetry();
      }
    }
  };

  const flush = () => {
    if (stopped) return Promise.resolve();
    if (inFlight) return inFlight;
    inFlight = synchronize().finally(() => { inFlight = null; });
    return inFlight;
  };

  return {
    getState: () => state,
    flush,
    start() {
      stopped = false;
      started = true;
      if (intervalTimer !== undefined) window.clearInterval(intervalTimer);
      intervalTimer = window.setInterval(() => void flush(), SYNC_INTERVAL_MS);
      void flush();
    },
    stop() {
      stopped = true;
      started = false;
      clearRetry();
      if (intervalTimer !== undefined) window.clearInterval(intervalTimer);
      intervalTimer = undefined;
    },
    subscribe(listener: (next: SyncState) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
