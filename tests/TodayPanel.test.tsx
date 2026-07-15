import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SyncEntity } from "../shared/entities";
import { TodayPanel } from "../src/features/focus/TodayPanel";

const tasks: SyncEntity[] = ["整理桌面", "完成周报", "阅读半小时"].map((title, order) => ({
  id: `task-${order}`,
  type: "task",
  updatedAt: 1,
  data: { title, order, completed: false }
}));

describe("TodayPanel", () => {
  it("highlights no more than three active tasks", () => {
    const fourth: SyncEntity = {
      id: "task-4",
      type: "task",
      updatedAt: 1,
      data: { title: "第四件事", order: 3, completed: false }
    };
    render(<TodayPanel tasks={[...tasks, fourth]} note="" onAddTask={() => undefined} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.queryByText("第四件事")).not.toBeInTheDocument();
  });

  it("adds a trimmed task and disables adding after three", () => {
    const onAddTask = vi.fn();
    const { rerender } = render(<TodayPanel tasks={[]} note="" onAddTask={onAddTask} />);
    const input = screen.getByRole("textbox", { name: "添加今日任务" });
    fireEvent.change(input, { target: { value: "  回复重要消息  " } });
    fireEvent.submit(input.closest("form")!);
    expect(onAddTask).toHaveBeenCalledWith("回复重要消息");

    rerender(<TodayPanel tasks={tasks} note="" onAddTask={onAddTask} />);
    expect(screen.getByRole("textbox", { name: "添加今日任务" })).toBeDisabled();
  });

  it("completes a task and saves the quick note", () => {
    const onToggleTask = vi.fn();
    const onNoteChange = vi.fn();
    render(
      <TodayPanel
        tasks={tasks.slice(0, 1)}
        note="明天继续"
        onAddTask={() => undefined}
        onToggleTask={onToggleTask}
        onNoteChange={onNoteChange}
      />
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "完成：整理桌面" }));
    fireEvent.change(screen.getByRole("textbox", { name: "随手记" }), { target: { value: "记得备份" } });
    expect(onToggleTask).toHaveBeenCalledWith(tasks[0]);
    expect(onNoteChange).toHaveBeenCalledWith("记得备份");
  });
});
