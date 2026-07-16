import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SyncEntity, ThemeId, WorkspaceSnapshot } from "../../../shared/entities";
import { authApi, type AuthUser } from "../../features/auth/auth-api";
import type { PanelVisibility } from "../../features/customize/CustomizeDrawer";
import { getWorkspacePreferences, upsertWorkspacePreferences, type WorkspacePreferences } from "../../features/customize/preference-model";
import { createWorkspaceRepository, type WorkspaceRepository } from "../../lib/db/repository";
import { createSyncApi } from "../../lib/sync/api";
import { createSyncEngine, type SyncState } from "../../lib/sync/engine";
import { tombstoneEntity } from "./workspace-actions";
import { WorkspaceContext } from "./workspace-context";

interface AuthClient {
  session(): Promise<{ user: AuthUser | null }>;
  logout(): Promise<unknown>;
}

export function WorkspaceProvider({
  children,
  repository: providedRepository,
  authClient = authApi
}: {
  children: ReactNode;
  repository?: WorkspaceRepository;
  authClient?: AuthClient;
}) {
  const [repository] = useState(() => providedRepository ?? createWorkspaceRepository());
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(navigator.onLine ? "idle" : "offline");
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    setSnapshot(await repository.getSnapshot());
  }, [repository]);

  useEffect(() => {
    let active = true;
    void repository.initializeDefaults()
      .then(() => repository.getSnapshot())
      .then((value) => { if (active) setSnapshot(value); })
      .catch(() => { if (active) setToast("本地数据暂时无法读取，请刷新重试"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repository]);

  useEffect(() => {
    void authClient.session().then(({ user: sessionUser }) => setUser(sessionUser)).catch(() => undefined);
  }, [authClient]);

  useEffect(() => {
    if (!user) return;
    const sync = createSyncEngine({ repository, api: createSyncApi(), online: () => navigator.onLine });
    const unsubscribe = sync.subscribe(setSyncState);
    const flush = () => void sync.flush();
    const visible = () => { if (document.visibilityState === "visible") flush(); };
    sync.start();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", visible);
      unsubscribe();
      sync.stop();
    };
  }, [repository, user]);

  useEffect(() => {
    document.documentElement.dataset.theme = snapshot?.theme ?? "morning";
  }, [snapshot?.theme]);

  const commit = useCallback(async (changes: SyncEntity[]) => {
    await Promise.all(changes.map((change) => repository.applyChange(change)));
    await refresh();
  }, [refresh, repository]);

  const preferences = useMemo(() => getWorkspacePreferences(snapshot?.entities ?? []), [snapshot?.entities]);
  const visibility = preferences.panels;

  const remove = useCallback(async (entity: SyncEntity) => {
    await commit([tombstoneEntity(entity)]);
  }, [commit]);

  const setTheme = useCallback(async (theme: ThemeId) => {
    setSnapshot((current) => current ? { ...current, theme } : current);
    try {
      await repository.setTheme(theme);
    } catch {
      await refresh();
      setToast("主题保存失败，请重试");
    }
  }, [refresh, repository]);

  const setPreferences = useCallback((patch: Partial<WorkspacePreferences>) => {
    if (!snapshot) return;
    const entities = upsertWorkspacePreferences(snapshot.entities, patch);
    const preference = entities.find((entity) => entity.id === "workspace-preferences");
    setSnapshot({ ...snapshot, entities });
    if (preference) void repository.applyChange(preference).then(refresh).catch(() => {
      void refresh();
      setToast("偏好设置保存失败，请重试");
    });
  }, [refresh, repository, snapshot]);

  const setVisibility = useCallback((value: PanelVisibility) => {
    setPreferences({ panels: value });
  }, [setPreferences]);

  const importSnapshot = useCallback(async (value: WorkspaceSnapshot) => {
    await repository.replaceSnapshot(value);
    await refresh();
    setToast("备份已恢复");
  }, [refresh, repository]);

  const logout = useCallback(async () => {
    await authClient.logout().catch(() => undefined);
    setUser(null);
    setSyncState("idle");
    setToast("已退出，仍可使用本地数据");
  }, [authClient]);

  const value = useMemo(() => ({
    snapshot,
    entities: snapshot?.entities ?? [],
    loading,
    user,
    syncState,
    toast,
    visibility,
    preferences,
    commit,
    remove,
    setTheme,
    setVisibility,
    setPreferences,
    importSnapshot,
    refresh,
    setAuthenticatedUser: setUser,
    logout,
    showToast: setToast,
    clearToast: () => setToast("")
  }), [commit, importSnapshot, loading, logout, preferences, refresh, remove, setPreferences, setTheme, setVisibility, snapshot, syncState, toast, user, visibility]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
