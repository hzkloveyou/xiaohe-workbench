import type { SyncState } from "../lib/sync/engine";

const labels: Record<SyncState, string> = {
  idle: "已同步",
  syncing: "同步中…",
  offline: "离线，等待同步",
  "needs-auth": "请重新登录",
  error: "同步失败，将自动重试"
};

export function SyncStatus({ state }: { state: SyncState }) {
  return <span className={`sync-status sync-status--${state}`}>{labels[state]}</span>;
}
