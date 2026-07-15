import type { WorkspaceSnapshot } from "../../../shared/entities";
import { parseWorkspaceSnapshot } from "../../../shared/contracts";

export function exportBackup(snapshot: WorkspaceSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseBackup(content: string): WorkspaceSnapshot {
  try {
    return parseWorkspaceSnapshot(JSON.parse(content));
  } catch {
    throw new Error("备份文件无效，请选择由小贺的工作台导出的 JSON 文件");
  }
}
