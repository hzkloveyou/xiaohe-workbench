import type { RecurrenceRule, SyncEntity, TaskData, TaskPriority } from "../../../shared/entities";

export type TaskEntity = SyncEntity<TaskData> & { type: "task" };
export type TaskView = "today" | "tomorrow" | "later" | "completed";

export interface TaskInput {
  title: string;
  order?: number;
  scheduledFor?: string;
  dueAt?: string;
  priority?: TaskPriority;
  note?: string;
  recurrence?: RecurrenceRule;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

export function localDate(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
  if (!DATE_PATTERN.test(value)) throw new Error("请选择有效日期");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) {
    throw new Error("请选择有效日期");
  }
  return date;
}

function formatUtcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function dateAfter(value: string, count: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + count);
  return formatUtcDate(date);
}

function addMonthClamped(value: string): string {
  const source = parseDate(value);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const day = source.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return formatUtcDate(new Date(Date.UTC(year, month + 1, Math.min(day, lastDay))));
}

export function isTaskEntity(entity: SyncEntity): entity is TaskEntity {
  return entity.type === "task" && !entity.deletedAt;
}

export function createTask(input: TaskInput, options: { id?: string; now?: number } = {}): TaskEntity {
  const title = input.title.trim();
  if (!title) throw new Error("请输入任务名称");
  if (title.length > 300) throw new Error("任务名称不能超过 300 个字");
  if (input.scheduledFor) parseDate(input.scheduledFor);
  const note = input.note?.trim();
  if (note && note.length > 2000) throw new Error("备注不能超过 2000 个字");
  const data: TaskData = { title, completed: false, order: input.order ?? 0 };
  if (input.scheduledFor) data.scheduledFor = input.scheduledFor;
  if (input.dueAt) data.dueAt = input.dueAt;
  if (input.priority) data.priority = input.priority;
  if (note) data.note = note;
  if (input.recurrence) data.recurrence = input.recurrence;
  return { id: options.id ?? crypto.randomUUID(), type: "task", updatedAt: options.now ?? Date.now(), data };
}

export function updateTask(task: TaskEntity, input: TaskInput, now = Date.now()): TaskEntity {
  const updated = createTask(input, { id: task.id, now });
  return {
    ...updated,
    data: {
      ...updated.data,
      completed: task.data.completed,
      completedAt: task.data.completedAt,
      seriesId: task.data.seriesId
    }
  };
}

export function nextRecurringTask(task: TaskEntity, now = Date.now()): TaskEntity {
  const recurrence = task.data.recurrence;
  if (!recurrence) throw new Error("这不是重复任务");
  const sourceDate = task.data.scheduledFor ?? localDate(new Date(now));
  const scheduledFor = recurrence === "daily"
    ? dateAfter(sourceDate, 1)
    : recurrence === "weekly"
      ? dateAfter(sourceDate, 7)
      : addMonthClamped(sourceDate);
  const seriesId = task.data.seriesId ?? task.id;
  return {
    id: crypto.randomUUID(),
    type: "task",
    updatedAt: now,
    data: {
      ...task.data,
      completed: false,
      completedAt: undefined,
      scheduledFor,
      seriesId
    }
  };
}

export function completeTask(task: TaskEntity, now = Date.now()): TaskEntity[] {
  const completed: TaskEntity = {
    ...task,
    updatedAt: now,
    data: { ...task.data, completed: true, completedAt: now }
  };
  return task.data.recurrence ? [completed, nextRecurringTask(task, now)] : [completed];
}

export function restoreTask(task: TaskEntity, now = Date.now()): TaskEntity {
  return { ...task, updatedAt: now, data: { ...task.data, completed: false, completedAt: undefined } };
}

export function tasksForView(tasks: TaskEntity[], view: TaskView, today = localDate()): TaskEntity[] {
  const tomorrow = dateAfter(today, 1);
  return tasks.filter((task) => {
    if (view === "completed") return task.data.completed;
    if (task.data.completed) return false;
    const scheduled = task.data.scheduledFor;
    if (view === "today") return !scheduled || scheduled <= today;
    if (view === "tomorrow") return scheduled === tomorrow;
    return Boolean(scheduled && scheduled > tomorrow);
  }).sort((left, right) => {
    const priority = (PRIORITY_WEIGHT[right.data.priority ?? "medium"] - PRIORITY_WEIGHT[left.data.priority ?? "medium"]);
    return priority || left.data.order - right.data.order || left.updatedAt - right.updatedAt;
  });
}
