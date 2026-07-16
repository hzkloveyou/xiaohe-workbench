import { describe, expect, it } from "vitest";
import type { TaskEntity } from "../src/features/planner/task-model";
import {
  completeTask,
  createTask,
  dateAfter,
  nextRecurringTask,
  restoreTask,
  tasksForView
} from "../src/features/planner/task-model";

function taskOn(date: string, recurrence?: "daily" | "weekly" | "monthly"): TaskEntity {
  return createTask(
    { title: "复盘", scheduledFor: date, recurrence, priority: "medium", order: 0 },
    { id: "task-one", now: 10 }
  );
}

describe("task model", () => {
  it("creates a trimmed scheduled task", () => {
    expect(createTask(
      { title: "  写周报  ", scheduledFor: "2026-07-16", priority: "high", order: 2 },
      { id: "new", now: 8 }
    )).toEqual({
      id: "new",
      type: "task",
      updatedAt: 8,
      data: { title: "写周报", completed: false, order: 2, scheduledFor: "2026-07-16", priority: "high" }
    });
  });

  it("groups overdue items into today and sorts priority first", () => {
    const low = createTask({ title: "低", scheduledFor: "2026-07-15", priority: "low", order: 0 }, { id: "low" });
    const high = createTask({ title: "高", scheduledFor: "2026-07-16", priority: "high", order: 3 }, { id: "high" });
    const future = createTask({ title: "未来", scheduledFor: "2026-07-17", priority: "high", order: 0 }, { id: "future" });

    expect(tasksForView([low, high, future], "today", "2026-07-16").map((task) => task.id)).toEqual(["high", "low"]);
    expect(tasksForView([low, high, future], "tomorrow", "2026-07-16").map((task) => task.id)).toEqual(["future"]);
  });

  it("completes a recurring task and generates the next instance", () => {
    const [completed, next] = completeTask(taskOn("2026-07-16", "weekly"), 20);
    expect(completed.data).toMatchObject({ completed: true, completedAt: 20 });
    expect(next?.data).toMatchObject({ completed: false, scheduledFor: "2026-07-23" });
    expect(next?.id).not.toBe(completed.id);
  });

  it("generates the next monthly task and clamps missing dates", () => {
    const task = taskOn("2026-01-31", "monthly");
    expect(nextRecurringTask(task, 20).data.scheduledFor).toBe("2026-02-28");
    expect(nextRecurringTask(task, 20).id).toBe(nextRecurringTask(task, 30).id);
  });

  it("restores a completed task without creating another recurrence", () => {
    const [completed] = completeTask(taskOn("2026-07-16", "daily"), 20);
    expect(restoreTask(completed, 30).data).toMatchObject({ completed: false });
    expect(restoreTask(completed, 30).data.completedAt).toBeUndefined();
  });

  it("calculates planner default dates across month boundaries", () => {
    expect(dateAfter("2026-07-31", 1)).toBe("2026-08-01");
  });
});
