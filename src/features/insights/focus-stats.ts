import type { FocusSessionData, SyncEntity } from "../../../shared/entities";
import { isTaskEntity, localDate, type TaskEntity } from "../planner/task-model";

export type FocusSessionEntity = SyncEntity<FocusSessionData> & { type: "focusSession" };

export interface FocusDay {
  date: string;
  minutes: number;
  sessions: number;
}

export interface FocusStats {
  days: FocusDay[];
  totalMinutes: number;
  completedSessions: number;
  completedTasks: number;
  streakDays: number;
}

export function isFocusSessionEntity(entity: SyncEntity): entity is FocusSessionEntity {
  return entity.type === "focusSession" && !entity.deletedAt;
}

function lastSevenLocalDates(today: Date): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return localDate(date);
  });
}

export function buildFocusStats(
  sessions: FocusSessionEntity[],
  taskEntities: Array<TaskEntity | SyncEntity>,
  today = new Date()
): FocusStats {
  const days = lastSevenLocalDates(today).map((date) => ({ date, minutes: 0, sessions: 0 }));
  const buckets = new Map(days.map((day) => [day.date, day]));
  for (const session of sessions) {
    if (!session.data.completed) continue;
    const bucket = buckets.get(localDate(new Date(session.data.endedAt)));
    if (!bucket) continue;
    bucket.minutes += Math.round(session.data.actualMs / 60_000);
    bucket.sessions += 1;
  }
  const tasks = taskEntities.filter(isTaskEntity);
  const completedTasks = tasks.filter((task) => task.data.completedAt && buckets.has(localDate(new Date(task.data.completedAt)))).length;
  let streakDays = 0;
  for (let index = days.length - 1; index >= 0 && days[index]!.sessions > 0; index -= 1) streakDays += 1;
  return {
    days,
    totalMinutes: days.reduce((sum, day) => sum + day.minutes, 0),
    completedSessions: days.reduce((sum, day) => sum + day.sessions, 0),
    completedTasks,
    streakDays
  };
}
