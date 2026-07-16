import { useMemo, useState, type FormEvent } from "react";
import type { InboxItemData } from "../../../shared/entities";
import { Button } from "../../components/Button";
import { classifyCapture, createInboxEntity, type InboxItemEntity } from "./inbox-model";

type CaptureMode = "auto" | InboxItemData["kind"];

const modes: Array<{ id: CaptureMode; label: string }> = [
  { id: "auto", label: "自动判断" },
  { id: "link", label: "链接" },
  { id: "note", label: "记录" },
  { id: "task", label: "任务" }
];

export function QuickCapture({
  onSave,
  initialValue = "",
  now = () => new Date()
}: {
  onSave: (entity: InboxItemEntity) => void;
  initialValue?: string;
  now?: () => Date;
}) {
  const [value, setValue] = useState(initialValue);
  const [mode, setMode] = useState<CaptureMode>("auto");
  const [error, setError] = useState("");
  const detected = useMemo(() => {
    try { return value.trim() ? classifyCapture(value, mode === "auto" ? undefined : mode, now()).kind : null; }
    catch { return null; }
  }, [mode, now, value]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const entity = createInboxEntity(value, { kind: mode === "auto" ? undefined : mode, now: now() });
      onSave(entity);
      setValue("");
      setMode("auto");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法保存这段内容");
    }
  };

  return (
    <form className="quick-capture" onSubmit={submit}>
      <div className="quick-capture__modes" aria-label="收集内容类型">
        {modes.map((item) => (
          <button key={item.id} type="button" aria-label={item.label} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>{item.label}</button>
        ))}
      </div>
      <label className="quick-capture__input">
        <span className="visually-hidden">快速收集内容</span>
        <textarea
          aria-label="快速收集内容"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="粘贴网址，或写下任务和灵感…"
          maxLength={20_000}
        />
      </label>
      <div className="quick-capture__footer">
        <span>{detected ? `将保存为${detected === "link" ? "链接" : detected === "task" ? "任务" : "记录"}` : "支持“任务 明天交报告”"}</span>
        <Button type="submit" variant="primary" aria-label="保存到收集箱">保存到收集箱</Button>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
