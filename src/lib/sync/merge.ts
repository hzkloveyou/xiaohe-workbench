import type { SyncEntity } from "../../../shared/entities";

function entityClock(entity: SyncEntity): number {
  return Math.max(entity.updatedAt, entity.deletedAt ?? 0);
}

function sameData(left: SyncEntity, right: SyncEntity): boolean {
  return JSON.stringify(left.data) === JSON.stringify(right.data);
}

export function mergeEntities(
  localEntities: SyncEntity[],
  remoteEntities: SyncEntity[]
): SyncEntity[] {
  const merged = new Map(localEntities.map((entity) => [entity.id, entity]));

  for (const remote of remoteEntities) {
    const local = merged.get(remote.id);
    if (!local) {
      merged.set(remote.id, remote);
      continue;
    }

    const localClock = entityClock(local);
    const remoteClock = entityClock(remote);
    if (remoteClock > localClock) {
      merged.set(remote.id, remote);
      continue;
    }
    if (localClock > remoteClock || sameData(local, remote)) continue;

    if (local.type === "note" && remote.type === "note") {
      merged.set(`${remote.id}-conflict-remote-${remote.updatedAt}`, {
        ...remote,
        id: `${remote.id}-conflict-remote-${remote.updatedAt}`
      });
    }
  }

  return [...merged.values()];
}
