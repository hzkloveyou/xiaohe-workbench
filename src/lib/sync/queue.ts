import type { SyncEntity } from "../../../shared/entities";

export function dedupePendingChanges(changes: SyncEntity[]): SyncEntity[] {
  const newest = new Map<string, SyncEntity>();
  for (const change of changes) {
    const existing = newest.get(change.id);
    if (!existing || change.updatedAt >= existing.updatedAt) newest.set(change.id, change);
  }
  return [...newest.values()];
}
