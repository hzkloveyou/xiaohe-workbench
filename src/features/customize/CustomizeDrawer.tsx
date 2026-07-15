import { useRef, type ChangeEvent } from "react";
import type { ThemeId, WorkspaceSnapshot } from "../../../shared/entities";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { exportBackup, parseBackup } from "./backup";
import { ThemePicker } from "./ThemePicker";

export interface PanelVisibility { search: boolean; bookmarks: boolean; focus: boolean }

interface CustomizeDrawerProps {
  open: boolean;
  theme: ThemeId;
  visibility: PanelVisibility;
  snapshot: WorkspaceSnapshot;
  onClose: () => void;
  onThemeChange: (theme: ThemeId) => void;
  onVisibilityChange: (value: PanelVisibility) => void;
  onImport: (snapshot: WorkspaceSnapshot) => void;
  onError: (message: string) => void;
}

export function CustomizeDrawer(props: CustomizeDrawerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  if (!props.open) return null;
  const download = () => {
    const blob = new Blob([exportBackup(props.snapshot)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `小贺的工作台-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { props.onImport(parseBackup(await file.text())); }
    catch (reason) { props.onError(reason instanceof Error ? reason.message : "导入失败"); }
    event.target.value = "";
  };
  return (
    <Dialog open title="个性化工作台" onClose={props.onClose}>
      <div className="customize-content">
        <ThemePicker value={props.theme} onChange={props.onThemeChange} />
        <fieldset className="visibility-picker"><legend>显示模块</legend>{(["search", "bookmarks", "focus"] as const).map((key) => <label key={key}><input type="checkbox" checked={props.visibility[key]} onChange={(event) => props.onVisibilityChange({ ...props.visibility, [key]: event.target.checked })} />{key === "search" ? "智能搜索" : key === "bookmarks" ? "快捷书签" : "今日专注"}</label>)}</fieldset>
        <div className="backup-actions"><div><strong>本地备份</strong><p>导出内容不包含密码，可随时恢复。</p></div><Button onClick={download}>导出 JSON</Button><Button onClick={() => fileRef.current?.click()}>导入备份</Button><input ref={fileRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importFile} /></div>
      </div>
    </Dialog>
  );
}
