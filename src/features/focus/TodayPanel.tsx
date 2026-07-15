import { useState, type FormEvent } from "react";
import type { SyncEntity } from "../../../shared/entities";
import { Button } from "../../components/Button";
import { GlassCard } from "../../components/GlassCard";
import { FocusTimer } from "./FocusTimer";
import { QuickNote } from "./QuickNote";
import { createTimerState, type TimerState } from "./timer";

interface TaskData { title: string; order: number; completed: boolean }
type TaskEntity = SyncEntity<TaskData> & { type: "task" };

interface TodayPanelProps {
  tasks: SyncEntity[];
  note: string;
  timer?: TimerState;
  onAddTask: (title: string) => void;
  onToggleTask?: (task: TaskEntity) => void;
  onNoteChange?: (value: string) => void;
  onTimerChange?: (timer: TimerState) => void;
}

function isActiveTask(entity: SyncEntity): entity is TaskEntity {
  return entity.type === "task" && !entity.deletedAt && !(entity.data as TaskData).completed;
}

export function TodayPanel({ tasks, note, timer: controlledTimer, onAddTask, onToggleTask, onNoteChange, onTimerChange }: TodayPanelProps) {
  const [title, setTitle] = useState("");
  const [localTimer, setLocalTimer] = useState(createTimerState);
  const activeTasks = tasks.filter(isActiveTask).sort((a, b) => a.data.order - b.data.order).slice(0, 3);
  const timer = controlledTimer ?? localTimer;
  const setTimer = onTimerChange ?? setLocalTimer;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = title.trim();
    if (!value || activeTasks.length >= 3) return;
    onAddTask(value);
    setTitle("");
  };
  return (
    <GlassCard className="today-panel" aria-labelledby="today-heading">
      <header className="panel-header"><div><p className="eyebrow">TODAY</p><h2 id="today-heading">今日专注</h2></div><span className="task-count">{activeTasks.length} / 3</span></header>
      <div className="today-panel__grid">
        <div className="today-panel__tasks">
          <p className="section-label">今天最重要的三件事</p>
          {activeTasks.length ? <ul className="task-list">{activeTasks.map((task) => <li key={task.id}><label><input type="checkbox" aria-label={`完成：${task.data.title}`} onChange={() => onToggleTask?.(task)} /><span>{task.data.title}</span></label></li>)}</ul> : <p className="subtle-empty">先写下今天最值得完成的一件事。</p>}
          <form className="task-add" onSubmit={submit}>
            <input aria-label="添加今日任务" value={title} onChange={(event) => setTitle(event.target.value)} disabled={activeTasks.length >= 3} placeholder={activeTasks.length >= 3 ? "今日清单已满" : "添加一件事…"} maxLength={100} />
            <Button type="submit" disabled={activeTasks.length >= 3 || !title.trim()} aria-label="确认添加任务">＋</Button>
          </form>
          <QuickNote value={note} onChange={onNoteChange} />
        </div>
        <FocusTimer state={timer} onChange={setTimer} />
      </div>
    </GlassCard>
  );
}
