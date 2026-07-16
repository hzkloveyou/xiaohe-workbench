import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskList } from "../src/features/planner/TaskList";
import { createTask } from "../src/features/planner/task-model";

const task = createTask({ title: "完成升级", scheduledFor: "2026-07-16", priority: "high", note: "先跑测试", order: 0 }, { id: "one" });

describe("TaskList", () => {
  it("shows task details and exposes complete, edit and delete actions", () => {
    const onComplete = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<TaskList tasks={[task]} view="today" onComplete={onComplete} onRestore={() => undefined} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText("先跑测试")).toBeInTheDocument();
    expect(screen.getByText("高优先级")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "完成：完成升级" }));
    fireEvent.click(screen.getByRole("button", { name: "编辑 完成升级" }));
    fireEvent.click(screen.getByRole("button", { name: "删除 完成升级" }));
    expect(onComplete).toHaveBeenCalledWith(task);
    expect(onEdit).toHaveBeenCalledWith(task);
    expect(onDelete).toHaveBeenCalledWith(task);
  });

  it("shows restore instead of completion for completed tasks", () => {
    const onRestore = vi.fn();
    const completed = { ...task, data: { ...task.data, completed: true, completedAt: 20 } };
    render(<TaskList tasks={[completed]} view="completed" onComplete={() => undefined} onRestore={onRestore} onEdit={() => undefined} onDelete={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "恢复 完成升级" }));
    expect(onRestore).toHaveBeenCalledWith(completed);
  });
});
