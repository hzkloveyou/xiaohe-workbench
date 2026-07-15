import Dexie, { type EntityTable } from "dexie";
import type { SyncEntity } from "../../../shared/entities";

export interface WorkspaceMeta {
  key: string;
  value: unknown;
}

export class WorkspaceDatabase extends Dexie {
  entities!: EntityTable<SyncEntity, "id">;
  syncQueue!: EntityTable<SyncEntity, "id">;
  meta!: EntityTable<WorkspaceMeta, "key">;

  constructor(name = "xiaohe-workbench") {
    super(name);
    this.version(1).stores({
      entities: "&id,type,updatedAt,deletedAt",
      syncQueue: "&id,updatedAt",
      meta: "&key"
    });
  }
}
