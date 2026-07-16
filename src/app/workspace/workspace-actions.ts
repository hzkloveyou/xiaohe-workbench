import type { SyncEntity } from "../../../shared/entities";

export function tombstoneEntity(entity: SyncEntity, now = Date.now()): SyncEntity {
  return { ...entity, updatedAt: now, deletedAt: now };
}
