import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SyncEntity, WorkspaceSnapshot } from "../shared/entities";
import { WorkspaceProvider } from "../src/app/workspace/WorkspaceProvider";
import { useWorkspace } from "../src/app/workspace/workspace-context";

const initialSnapshot: WorkspaceSnapshot = {
  version: 1,
  theme: "morning",
  entities: [{ id: "note-1", type: "note", updatedAt: 1, data: { content: "初始内容" } }]
};

function createRepository() {
  let snapshot = initialSnapshot;
  return {
    initializeDefaults: vi.fn(async () => undefined),
    getSnapshot: vi.fn(async () => snapshot),
    applyChange: vi.fn(async (change: SyncEntity) => {
      snapshot = { ...snapshot, entities: [...snapshot.entities.filter((item) => item.id !== change.id), change] };
    }),
    applyRemoteChanges: vi.fn(),
    getPendingChanges: vi.fn(async () => []),
    removePendingChanges: vi.fn(),
    getSyncCursor: vi.fn(async () => 0),
    setSyncCursor: vi.fn(),
    setTheme: vi.fn(async (theme: WorkspaceSnapshot["theme"]) => { snapshot = { ...snapshot, theme }; }),
    replaceSnapshot: vi.fn(),
    close: vi.fn()
  };
}

function Probe() {
  const workspace = useWorkspace();
  return (
    <div>
      <output>{workspace.loading ? "loading" : `${workspace.snapshot?.theme}:${workspace.entities.length}`}</output>
      <button type="button" onClick={() => void workspace.commit([{
        id: "note-2", type: "note", updatedAt: 2, data: { content: "新增内容" }
      }])}>新增</button>
    </div>
  );
}

describe("WorkspaceProvider", () => {
  it("initializes defaults and exposes one shared snapshot", async () => {
    const repository = createRepository();
    render(
      <WorkspaceProvider repository={repository} authClient={{ session: vi.fn(async () => ({ user: null })), logout: vi.fn() }}>
        <Probe />
      </WorkspaceProvider>
    );

    expect(await screen.findByText("morning:1")).toBeVisible();
    expect(repository.initializeDefaults).toHaveBeenCalledOnce();
  });

  it("commits local entities and refreshes every consumer", async () => {
    const repository = createRepository();
    render(
      <WorkspaceProvider repository={repository} authClient={{ session: vi.fn(async () => ({ user: null })), logout: vi.fn() }}>
        <Probe />
      </WorkspaceProvider>
    );
    await screen.findByText("morning:1");

    screen.getByRole("button", { name: "新增" }).click();

    await waitFor(() => expect(screen.getByText("morning:2")).toBeVisible());
    expect(repository.applyChange).toHaveBeenCalledOnce();
  });
});
