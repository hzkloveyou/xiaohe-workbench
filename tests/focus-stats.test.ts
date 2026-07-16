import { describe, expect, it } from "vitest";
import type { SyncEntity } from "../shared/entities";
import { buildFocusStats, type FocusSessionEntity } from "../src/features/insights/focus-stats";

function atLocalNoon(date: string): number {
  return new Date(`${date}T12:00:00`).getTime();
}

function session(date: string, minutes = 25): FocusSessionEntity {
  const endedAt = atLocalNoon(date);
  return { id: date, type: "focusSession", updatedAt: endedAt, data: { plannedMs: minutes * 60_000, actualMs: minutes * 60_000, startedAt: endedAt - minutes * 60_000, endedAt, completed: true } };
}

describe("focus stats", () => {
  it("builds seven local-day buckets and totals", () => {
    const task: SyncEntity = { id: "done", type: "task", updatedAt: atLocalNoon("2026-07-16"), data: { title: "完成", completed: true, completedAt: atLocalNoon("2026-07-16"), order: 0 } };
    const stats = buildFocusStats([session("2026-07-15"), session("2026-07-16", 45)], [task], new Date("2026-07-16T18:00:00"));
    expect(stats.days).toHaveLength(7);
    expect(stats.totalMinutes).toBe(70);
    expect(stats.completedSessions).toBe(2);
    expect(stats.completedTasks).toBe(1);
  });

  it("counts a consecutive focus streak ending today", () => {
    const stats = buildFocusStats([session("2026-07-14"), session("2026-07-15"), session("2026-07-16")], [], new Date("2026-07-16T18:00:00"));
    expect(stats.streakDays).toBe(3);
  });
});
