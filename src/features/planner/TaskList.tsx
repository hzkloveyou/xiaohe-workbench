import type { TaskEntity, TaskView } from "./task-model";

interface TaskListProps {
  tasks: TaskEntity[];
  view: TaskView;
  onComplete: (task: TaskEntity) => void;
  onRestore: (task: TaskEntity) => void;
  onEdit: (task: TaskEntity) => void;
  onDelete: (task: TaskEntity) => void;
}

const PRIORITY_LABELS = { high: "高优先级", medium: "中优先级", low: "低优先级" } as const;

export function TaskList({ tasks, view, onComplete, onRestore, onEdit, onDelete }: TaskListProps) {
  if (!tasks.length) {
    return <div className="planner-empty"><span aria-hidden="true">✓</span><h3>{view === "completed" ? "还没有已完成任务" : "这一栏已经清空"}</h3><p>{view === "completed" ? "完成任务后，可以在这里恢复它。" : "给重要的事留出明确位置。"}</p></div>;
  }
  return (
    <ul className="planner-list">
      {tasks.map((task) => (
        <li key={task.id} className="planner-task" data-priority={task.data.priority ?? "medium"}>
          {view === "completed" ? (
            <button type="button" className="task-check task-check--restore" aria-label={`恢复 ${task.data.title}`} onClick={() => onRestore(task)}>↺</button>
          ) : (
            <input type="checkbox" aria-label={`完成：${task.data.title}`} onChange={() => onComplete(task)} />
          )}
          <div className="planner-task__copy">
            <strong>{task.data.title}</strong>
            <div className="planner-task__meta">
              <span>{PRIORITY_LABELS[task.data.priority ?? "medium"]}</span>
              {task.data.scheduledFor ? <time dateTime={task.data.scheduledFor}>{task.data.scheduledFor}</time> : <span>今天</span>}
              {task.data.recurrence ? <span>重复 · {{ daily: "每天", weekly: "每周", monthly: "每月" }[task.data.recurrence]}</span> : null}
            </div>
            {task.data.note ? <p>{task.data.note}</p> : null}
          </div>
          <div className="planner-task__actions">
            <button type="button" className="icon-button" aria-label={`编辑 ${task.data.title}`} onClick={() => onEdit(task)}>✎</button>
            <button type="button" className="icon-button" aria-label={`删除 ${task.data.title}`} onClick={() => onDelete(task)}>×</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
