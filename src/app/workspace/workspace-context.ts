import { createContext, useContext } from "react";
import type { SyncEntity, ThemeId, WorkspaceSnapshot } from "../../../shared/entities";
import type { AuthUser } from "../../features/auth/auth-api";
import type { PanelVisibility } from "../../features/customize/CustomizeDrawer";
import type { SyncState } from "../../lib/sync/engine";

export interface WorkspaceContextValue {
  snapshot: WorkspaceSnapshot | null;
  entities: SyncEntity[];
  loading: boolean;
  user: AuthUser | null;
  syncState: SyncState;
  toast: string;
  visibility: PanelVisibility;
  commit(changes: SyncEntity[]): Promise<void>;
  remove(entity: SyncEntity): Promise<void>;
  setTheme(theme: ThemeId): Promise<void>;
  setVisibility(value: PanelVisibility): void;
  importSnapshot(snapshot: WorkspaceSnapshot): Promise<void>;
  refresh(): Promise<void>;
  setAuthenticatedUser(user: AuthUser): void;
  logout(): Promise<void>;
  showToast(message: string): void;
  clearToast(): void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace 必须在 WorkspaceProvider 内使用");
  return value;
}
