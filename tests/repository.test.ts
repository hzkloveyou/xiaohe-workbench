import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createWorkspaceRepository } from "../src/lib/db/repository";

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(
    databaseNames.splice(0).map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        })
    )
  );
});

describe("workspace repository", () => {
  it("initializes default bookmarks only once", async () => {
    const name = `workspace-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const repository = createWorkspaceRepository(name);

    await repository.initializeDefaults();
    const first = await repository.getSnapshot();
    await repository.initializeDefaults();
    const second = await repository.getSnapshot();

    expect(first.entities.length).toBeGreaterThan(5);
    expect(second.entities).toHaveLength(first.entities.length);
    await repository.close();
  });

  it("persists a change and enqueues it for synchronization", async () => {
    const name = `workspace-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const repository = createWorkspaceRepository(name);
    const change = {
      id: "note-1",
      type: "note" as const,
      updatedAt: 100,
      data: { text: "记住这件事" }
    };

    await repository.applyChange(change);

    expect((await repository.getSnapshot()).entities).toContainEqual(change);
    expect(await repository.getPendingChanges()).toContainEqual(change);
    await repository.close();
  });
});
