import { useEffect } from "react";
import { Button } from "../../components/Button";
import { formatRemainingTime, pauseTimer, resetTimer, restoreTimer, startTimer, type TimerState } from "./timer";

interface FocusTimerProps {
  state: TimerState;
  onChange: (state: TimerState) => void;
}

export function FocusTimer({ state, onChange }: FocusTimerProps) {
  useEffect(() => {
    if (!state.running) return;
    const timerId = window.setInterval(() => {
      const next = restoreTimer(state, Date.now());
      onChange(next);
      if (!next.running && next.remainingMs === 0 && Notification.permission === "granted") {
        new Notification("专注完成", { body: "辛苦了，起来走一走吧。" });
      }
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [onChange, state]);

  const progress = state.durationMs === 0 ? 0 : 1 - state.remainingMs / state.durationMs;
  return (
    <div className="focus-timer" style={{ "--timer-progress": `${Math.round(progress * 360)}deg` } as React.CSSProperties}>
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
