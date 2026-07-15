import { syncEntitySchema } from "../shared/contracts";
import type { SyncEntity } from "../shared/entities";
import type { SyncStore } from "./sync-service";

interface EntityRow {
  id: string;
  type: string;
  data_json: string;
  updated_at: number;
  deleted_at: number | null;
}

function mapEntity(row: EntityRow): SyncEntity {
  return syncEntitySchema.parse({
    id: row.id,
    type: row.type,
    data: JSON.parse(row.data_json),
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined
  }) as SyncEntity;
}

export class D1SyncStore implements SyncStore {
  constructor(private readonly database: D1Database) {}

  async getChanges(userId: string, since: number) {
    const result = await this.database
      .prepare(
        "SELECT id, type, data_json, updated_at, deleted_at FROM workspace_entities WHERE user_id = ? AND MAX(updated_at, COALESCE(deleted_at, 0)) > ? ORDER BY MAX(updated_at, COALESCE(deleted_at, 0)) ASC LIMIT 1000"
      )
      .bind(userId, since)
      .all<EntityRow>();
    return result.results.map(mapEntity);
  }

  async getEntity(userId: string, id: string) {
    const row = await this.database
      .prepare(
        "SELECT id, type, data_json, updated_at, deleted_at FROM workspace_entities WHERE user_id = ? AND id = ? LIMIT 1"
      )
      .bind(userId, id)
      .first<EntityRow>();
    return row ? mapEntity(row) : null;
  }

  async putEntity(userId: string, entity: SyncEntity) {
    await this.database
      .prepare(
        `INSERT INTO workspace_entities (user_id, id, type, data_json, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, id) DO UPDATE SET
           type = excluded.type,
           data_json = excluded.data_json,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at
         WHERE MAX(excluded.updated_at, COALESCE(excluded.deleted_at, 0)) >=
               MAX(workspace_entities.updated_at, COALESCE(workspace_entities.deleted_at, 0))`
      )
      .bind(
        userId,
        entity.id,
        entity.type,
        JSON.stringify(entity.data),
        entity.updatedAt,
        entity.deletedAt ?? null
      )
      .run();
  }
}
