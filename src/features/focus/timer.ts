import type { FocusSessionData } from "../../../shared/entities";

export interface TimerState {
  durationMs: number;
  remainingMs: number;
  running: boolean;
  startedAt?: number;
  completedAt?: number;
  updatedAt?: number;
  taskId?: string;
  sessionStartedAt?: number;
}

export const DEFAULT_FOCUS_DURATION = 25 * 60_000;

export function createTimerState(durationMs = DEFAULT_FOCUS_DURATION): TimerState {
  return { durationMs, remainingMs: durationMs, running: false };
}

export function restoreTimer(state: TimerState, now = Date.now()): TimerState {
  if (!state.running || state.startedAt === undefined) return state;
  const elapsed = Math.max(0, now - state.startedAt);
  const remainingMs = Math.max(0, state.remainingMs - elapsed);
  if (remainingMs === 0) {
    return { ...state, remainingMs: 0, running: false, startedAt: undefined, completedAt: now, updatedAt: now };
  }
  return { ...state, remainingMs, startedAt: now, updatedAt: now };
}

export function startTimer(state: TimerState, now = Date.now()): TimerState {
  if (state.running) return state;
  const remainingMs = state.remainingMs > 0 ? state.remainingMs : state.durationMs;
  return { ...state, remainingMs, running: true, startedAt: now, sessionStartedAt: state.sessionStartedAt ?? now, completedAt: undefined, updatedAt: now };
}

export function pauseTimer(state: TimerState, now = Date.now()): TimerState {
  const restored = restoreTimer(state, now);
  return { ...restored, running: false, startedAt: undefined, updatedAt: now };
}

export function resetTimer(state: TimerState, now = Date.now()): TimerState {
  const reset: TimerState = { durationMs: state.durationMs, remainingMs: state.durationMs, running: false, updatedAt: now };
  if (state.taskId) reset.taskId = state.taskId;
  return reset;
}

export function configureTimer(state: TimerState, durationMs: number, taskId?: string): TimerState {
  if (state.running) return state;
  const next: TimerState = { durationMs, remainingMs: durationMs, running: false };
  if (taskId) next.taskId = taskId;
  return next;
}

export function finishTimerSession(state: TimerState, endedAt = Date.now()): FocusSessionData | null {
  if (!state.running || state.startedAt === undefined) return null;
  const elapsedSinceTick = Math.max(0, endedAt - state.startedAt);
  if (elapsedSinceTick < state.remainingMs) return null;
  const startedAt = state.sessionStartedAt ?? state.startedAt;
  const session: FocusSessionData = {
    plannedMs: state.durationMs,
    actualMs: state.durationMs,
    startedAt,
    endedAt,
    completed: true
  };
  if (state.taskId) session.taskId = state.taskId;
  return session;
}

export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
