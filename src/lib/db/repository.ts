import type { SyncEntity, ThemeId, WorkspaceSnapshot } from "../../../shared/entities";
import { createDefaultEntities } from "./defaults";
import { WorkspaceDatabase } from "./database";

export interface WorkspaceRepository {
  initializeDefaults(): Promise<void>;
  getSnapshot(): Promise<WorkspaceSnapshot>;
  applyChange(change: SyncEntity): Promise<void>;
  applyRemoteChanges(changes: SyncEntity[]): Promise<void>;
  getPendingChanges(): Promise<SyncEntity[]>;
  removePendingChanges(ids: string[]): Promise<void>;
  setTheme(theme: ThemeId): Promise<void>;
  close(): Promise<void>;
}

export function createWorkspaceRepository(databaseName?: string): WorkspaceRepository {
  const database = new WorkspaceDatabase(databaseName);

  return {
    async initializeDefaults() {
      await database.transaction("rw", database.entities, database.meta, async () => {
        const initialized = await database.meta.get("initialized");
        if (initialized) return;
        await database.entities.bulkPut(createDefaultEntities());
        await database.meta.bulkPut([
          { key: "initialized", value: true },
          { key: "theme", value: "morning" }
        ]);
      });
    },
    async getSnapshot() {
      const [entities, themeRecord] = await Promise.all([
        database.entities.toArray(),
        database.meta.get("theme")
      ]);
      return {
        version: 1,
        theme: (themeRecord?.value as ThemeId | undefined) ?? "morning",
        entities
      };
    },
    async applyChange(change) {
      await database.transaction("rw", database.entities, database.syncQueue, async () => {
        await database.entities.put(change);
        await database.syncQueue.put(change);
      });
    },
    async applyRemoteChanges(changes) {
      await database.entities.bulkPut(changes);
    },
    async getPendingChanges() {
      return database.syncQueue.toArray();
    },
    async removePendingChanges(ids) {
      await database.syncQueue.bulkDelete(ids);
    },
    async setTheme(theme) {
      await database.meta.put({ key: "theme", value: theme });
    },
    async close() {
      database.close();
    }
  };
}
