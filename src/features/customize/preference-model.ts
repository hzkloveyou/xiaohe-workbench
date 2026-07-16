import type { PreferenceData, SyncEntity } from "../../../shared/entities";

export interface PanelVisibility { search: boolean; bookmarks: boolean; focus: boolean }
export interface WorkspacePreferences {
  searchEngine: "bing" | "baidu" | "google";
  githubUsername: string;
  panels: PanelVisibility;
}

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  searchEngine: "bing",
  githubUsername: "hzkloveyou",
  panels: { search: true, bookmarks: true, focus: true }
};

export function getWorkspacePreferences(entities: SyncEntity[]): WorkspacePreferences {
  const entity = entities.find((item) => item.type === "preference" && item.id === "workspace-preferences" && !item.deletedAt);
  const data = (entity?.data ?? {}) as PreferenceData;
  return {
    searchEngine: data.searchEngine ?? DEFAULT_PREFERENCES.searchEngine,
    githubUsername: typeof data.githubUsername === "string" ? data.githubUsername.trim() : DEFAULT_PREFERENCES.githubUsername,
    panels: { ...DEFAULT_PREFERENCES.panels, ...(data.panels ?? {}) }
  };
}

export function upsertWorkspacePreferences(
  entities: SyncEntity[],
  patch: Partial<WorkspacePreferences>,
  now = Date.now()
): SyncEntity[] {
  const current = getWorkspacePreferences(entities);
  const data: WorkspacePreferences = {
    ...current,
    ...patch,
    panels: patch.panels ? { ...current.panels, ...patch.panels } : current.panels
  };
  const entity: SyncEntity = { id: "workspace-preferences", type: "preference", updatedAt: now, data };
  const index = entities.findIndex((item) => item.id === entity.id);
  if (index < 0) return [...entities, entity];
  return entities.map((item) => item.id === entity.id ? entity : item);
}
