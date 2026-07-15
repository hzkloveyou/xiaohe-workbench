import type { SyncEntity } from "../shared/entities";

export interface SyncStore {
  getChanges(userId: string, since: number): Promise<SyncEntity[]>;
  getEntity(userId: string, id: string): Promise<SyncEntity | null>;
  putEntity(userId: string, entity: SyncEntity): Promise<void>;
}

function clock(entity: SyncEntity): number {
  return Math.max(entity.updatedAt, entity.deletedAt ?? 0);
}

export function createSyncService(store: SyncStore) {
  return {
    async pull(userId: string, since: number) {
      const changes = await store.getChanges(userId, Math.max(0, since));
      const cursor = changes.reduce((latest, entity) => Math.max(latest, clock(entity)), since);
      return { changes, cursor };
    },
    async push(userId: string, changes: SyncEntity[]) {
      const acknowledgedIds: string[] = [];
      for (const change of changes) {
        const existing = await store.getEntity(userId, change.id);
        if (!existing || clock(change) >= clock(existing)) await store.putEntity(userId, change);
        acknowledgedIds.push(change.id);
      }
      return { acknowledgedIds };
    }
  };
}
