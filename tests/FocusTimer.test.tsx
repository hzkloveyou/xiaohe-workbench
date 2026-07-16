import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusTimer } from "../src/features/focus/FocusTimer";
import { startTimer } from "../src/features/focus/timer";

afterEach(() => vi.useRealTimers());

describe("FocusTimer", () => {
  it("reports one session even if the completed interval runs again", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100);
    const state = startTimer({ durationMs: 1_000, remainingMs: 1_000, running: false }, 100);
    const onSessionComplete = vi.fn();
    render(<FocusTimer state={state} onChange={() => undefined} onSessionComplete={onSessionComplete} />);

    act(() => { vi.advanceTimersByTime(3_000); });
    expect(onSessionComplete).toHaveBeenCalledOnce();
  });
});
