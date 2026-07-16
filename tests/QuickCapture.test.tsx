import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickCapture } from "../src/features/inbox/QuickCapture";

describe("QuickCapture", () => {
  it("saves an automatically classified task", () => {
    const onSave = vi.fn();
    render(<QuickCapture onSave={onSave} now={() => new Date("2026-07-16T08:00:00+08:00")} />);

    fireEvent.change(screen.getByRole("textbox", { name: "快速收集内容" }), { target: { value: "任务 明天交报告" } });
    fireEvent.click(screen.getByRole("button", { name: "保存到收集箱" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      type: "inboxItem",
      data: expect.objectContaining({ kind: "task", title: "交报告", scheduledFor: "2026-07-17" })
    }));
  });

  it("allows forcing note mode and reports empty input", () => {
    const onSave = vi.fn();
    render(<QuickCapture onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "记录" }));
    fireEvent.change(screen.getByRole("textbox", { name: "快速收集内容" }), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "保存到收集箱" }));
    expect(onSave.mock.calls[0][0].data.kind).toBe("note");

    fireEvent.click(screen.getByRole("button", { name: "保存到收集箱" }));
    expect(screen.getByRole("alert")).toHaveTextContent("请输入要收集的内容");
  });
});
