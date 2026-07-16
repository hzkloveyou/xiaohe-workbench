import { useEffect, useRef } from "react";
import type { FocusSessionData } from "../../../shared/entities";
import { Button } from "../../components/Button";
import type { TaskEntity } from "../planner/task-model";
import { configureTimer, finishTimerSession, formatRemainingTime, pauseTimer, resetTimer, restoreTimer, startTimer, type TimerState } from "./timer";

interface FocusTimerProps {
  state: TimerState;
  onChange: (state: TimerState) => void;
  tasks?: TaskEntity[];
  onSessionComplete?: (session: FocusSessionData) => void;
}

export function FocusTimer({ state, onChange, tasks = [], onSessionComplete }: FocusTimerProps) {
  const recordedCompletion = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state.running) return;
    const timerId = window.setInterval(() => {
      const now = Date.now();
      const session = finishTimerSession(state, now);
      const next = restoreTimer(state, now);
      onChange(next);
      if (session && recordedCompletion.current !== session.startedAt) {
        recordedCompletion.current = session.startedAt;
        onSessionComplete?.(session);
      }
      if (!next.running && next.remainingMs === 0 && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("专注完成", { body: "辛苦了，起来走一走吧。" });
      }
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [onChange, onSessionComplete, state]);

  const progress = state.durationMs === 0 ? 0 : 1 - state.remainingMs / state.durationMs;
  return (
    <div className="focus-timer" style={{ "--timer-progress": `${Math.round(progress * 360)}deg` } as React.CSSProperties}>
      {!state.running ? <div className="focus-timer__setup">
        <div className="duration-choices" aria-label="专注时长">{[25, 45, 60].map((minutes) => <button key={minutes} type="button" aria-pressed={state.durationMs === minutes * 60_000} onClick={() => onChange(configureTimer(state, minutes * 60_000, state.taskId))}>{minutes} 分钟</button>)}</div>
        {tasks.length ? <label className="focus-task-select"><span>关联任务</span><select value={state.taskId ?? ""} onChange={(event) => onChange(configureTimer(state, state.durationMs, event.target.value || undefined))}><option value="">不关联任务</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.data.title}</option>)}</select></label> : null}
      </div> : null}
      <div className="focus-timer__dial" aria-label={`专注计时剩余 ${formatRemainingTime(state.remainingMs)}`}>
        <strong>{formatRemainingTime(state.remainingMs)}</strong><span>保持专注</span>
      </div>
      <div className="focus-timer__actions">
        <Button variant="primary" onClick={() => onChange(state.running ? pauseTimer(state) : startTimer(state))}>{state.running ? "暂停" : "开始专注"}</Button>
        <Button variant="ghost" onClick={() => onChange(resetTimer(state))}>重置</Button>
      </div>
    </div>
  );
}
