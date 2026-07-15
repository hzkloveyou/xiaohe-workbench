export const THEME_IDS = ["morning", "dusk", "night", "system"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type EntityType =
  | "bookmark"
  | "bookmarkGroup"
  | "task"
  | "note"
  | "timer"
  | "preference";

export interface SyncEntity<T = unknown> {
  id: string;
  type: EntityType;
  updatedAt: number;
  deletedAt?: number;
  data: T;
}

export interface WorkspaceSnapshot {
  version: 1;
  theme: ThemeId;
  entities: SyncEntity[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
