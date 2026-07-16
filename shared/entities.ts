export const THEME_IDS = ["morning", "dusk", "night", "system"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type EntityType =
  | "bookmark"
  | "bookmarkGroup"
  | "task"
  | "note"
  | "timer"
  | "inboxItem"
  | "focusSession"
  | "preference";

export type TaskPriority = "low" | "medium" | "high";
export type RecurrenceRule = "daily" | "weekly" | "monthly";

export interface BookmarkData {
  title: string;
  url: string;
  groupId: string;
  order: number;
  icon?: string;
  tags?: string[];
  favorite?: boolean;
  visitCount?: number;
  lastVisitedAt?: number;
}

export interface TaskData {
  title: string;
  completed: boolean;
  order: number;
  scheduledFor?: string;
  dueAt?: string;
  priority?: TaskPriority;
  note?: string;
  recurrence?: RecurrenceRule;
  seriesId?: string;
  completedAt?: number;
}

export interface InboxItemData {
  kind: "link" | "note" | "task";
  raw: string;
  status: "pending" | "archived";
  createdAt: number;
  title?: string;
  url?: string;
  scheduledFor?: string;
}

export interface FocusSessionData {
  plannedMs: number;
  actualMs: number;
  startedAt: number;
  endedAt: number;
  completed: boolean;
  taskId?: string;
}

export interface PreferenceData {
  searchEngine?: "bing" | "baidu" | "google";
  githubUsername?: string;
  panels?: Record<string, boolean>;
  [key: string]: unknown;
}

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
