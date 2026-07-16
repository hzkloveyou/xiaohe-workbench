import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { localDate, type TaskEntity, type TaskInput } from "./task-model";

interface TaskDialogProps {
  open: boolean;
  task?: TaskEntity;
  defaultDate?: string;
  onClose: () => void;
  onSave: (input: TaskInput) => void;
}

export function TaskDialog({ open, task, defaultDate, onClose, onSave }: TaskDialogProps) {
  if (!open) return null;
  return <TaskDialogForm task={task} defaultDate={defaultDate} onClose={onClose} onSave={onSave} />;
}

function TaskDialogForm({ task, defaultDate, onClose, onSave }: Omit<TaskDialogProps, "open">) {
  const [title, setTitle] = useState(task?.data.title ?? "");
  const [scheduledFor, setScheduledFor] = useState(task?.data.scheduledFor ?? defaultDate ?? localDate());
  const [priority, setPriority] = useState<TaskInput["priority"]>(task?.data.priority ?? "medium");
  const [recurrence, setRecurrence] = useState<TaskInput["recurrence"]>(task?.data.recurrence);
  const [note, setNote] = useState(task?.data.note ?? "");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("请输入任务名称");
      return;
    }
    onSave({ title, scheduledFor, priority, recurrence, note, order: task?.data.order });
  };

  return (
    <Dialog open title={task ? "编辑任务" : "添加任务"} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>任务名称<input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={300} /></label>
        <div className="form-grid">
          <label>计划日期<input type="date" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} required /></label>
          <label>优先级<select value={priority} onChange={(event) => setPriority(event.target.value as TaskInput["priority"])}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
        </div>
        <label>重复<select value={recurrence ?? ""} onChange={(event) => setRecurrence((event.target.value || undefined) as TaskInput["recurrence"])}><option value="">不重复</option><option value="daily">每天</option><option value="weekly">每周</option><option value="monthly">每月</option></select></label>
        <label>备注<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={2000} placeholder="补充上下文、下一步或完成标准" /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="dialog__actions"><Button onClick={onClose}>取消</Button><Button variant="primary" type="submit">保存任务</Button></div>
      </form>
    </Dialog>
  );
}
