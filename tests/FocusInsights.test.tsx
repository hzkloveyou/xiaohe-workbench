import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FocusInsights } from "../src/features/insights/FocusInsights";

describe("FocusInsights", () => {
  it("renders a useful empty state", () => {
    render(<FocusInsights stats={{ days: [], totalMinutes: 0, completedSessions: 0, completedTasks: 0, streakDays: 0 }} />);
    expect(screen.getByText("完成一次专注后，这里会长出你的节奏")).toBeInTheDocument();
  });

  it("renders totals and seven accessible bars", () => {
    const days = Array.from({ length: 7 }, (_, index) => ({ date: `2026-07-${String(index + 10).padStart(2, "0")}`, minutes: index * 5, sessions: index ? 1 : 0 }));
    render(<FocusInsights stats={{ days, totalMinutes: 105, completedSessions: 6, completedTasks: 4, streakDays: 6 }} />);
    expect(screen.getByText("105 分钟")).toBeInTheDocument();
    expect(screen.getAllByRole("meter")).toHaveLength(7);
  });
});
