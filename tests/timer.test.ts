import { describe, expect, it } from "vitest";
import { configureTimer, finishTimerSession, pauseTimer, resetTimer, restoreTimer, startTimer, type TimerState } from "../src/features/focus/timer";

const timer: TimerState = {
  durationMs: 25 * 60_000,
  remainingMs: 25 * 60_000,
  running: false
};

describe("focus timer", () => {
  it("restores elapsed time after a refresh", () => {
    const running = startTimer(timer, 1_000);
    const restored = restoreTimer(running, 61_000);

    expect(restored.remainingMs).toBe(24 * 60_000);
    expect(restored.startedAt).toBe(61_000);
    expect(restored.running).toBe(true);
  });

  it("does not decrease while paused", () => {
    const paused = pauseTimer(startTimer(timer, 1_000), 61_000);

    expect(restoreTimer(paused, 999_000)).toEqual(paused);
  });

  it("stops at zero when a session completes", () => {
    const short = startTimer({ durationMs: 1_000, remainingMs: 1_000, running: false }, 10);
    const completed = restoreTimer(short, 2_000);

    expect(completed.remainingMs).toBe(0);
    expect(completed.running).toBe(false);
    expect(completed.completedAt).toBe(2_000);
  });

  it("resets to the configured duration", () => {
    expect(resetTimer({ ...timer, remainingMs: 200, running: true }, 5)).toEqual({
      durationMs: 25 * 60_000,
      remainingMs: 25 * 60_000,
      running: false,
      updatedAt: 5
    });
  });

  it("changes duration and associates a task while stopped", () => {
    expect(configureTimer(timer, 45 * 60_000, "task-one")).toMatchObject({
      durationMs: 45 * 60_000,
      remainingMs: 45 * 60_000,
      taskId: "task-one"
    });
  });

  it("creates one completed focus session payload", () => {
    const running = startTimer({ durationMs: 1_000, remainingMs: 1_000, running: false, taskId: "task-one" }, 100);
    expect(finishTimerSession(running, 1_100)).toEqual({
      plannedMs: 1_000,
      actualMs: 1_000,
      startedAt: 100,
      endedAt: 1_100,
      completed: true,
      taskId: "task-one"
    });
    expect(finishTimerSession(timer, 1_100)).toBeNull();
  });
});
