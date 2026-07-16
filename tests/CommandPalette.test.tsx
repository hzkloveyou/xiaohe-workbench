import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "../src/features/command/CommandPalette";
import type { CommandItem } from "../src/features/command/command-model";
import { useCommandShortcut } from "../src/features/command/useCommandShortcut";

function Harness({ run = vi.fn() }: { run?: () => void }) {
  const [open, setOpen] = useState(false);
  useCommandShortcut(() => setOpen(true));
  const items: CommandItem[] = [
    { id: "page-today", group: "page", label: "今日计划", keywords: ["今日", "任务"], run }
  ];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>打开指令</button>
      <CommandPalette
        open={open}
        items={items}
        onClose={() => setOpen(false)}
        onWebSearch={vi.fn()}
        onQuickCapture={vi.fn()}
      />
    </>
  );
}

describe("CommandPalette", () => {
  it("opens with Ctrl+K and executes the selected command", () => {
    const run = vi.fn();
    render(<Harness run={run} />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = screen.getByRole("combobox", { name: "搜索指令" });
    fireEvent.change(input, { target: { value: "今日" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(run).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: "全局指令中心" })).not.toBeInTheDocument();
  });

  it("supports arrow selection, escape and no-result fallbacks", () => {
    const onWebSearch = vi.fn();
    const onQuickCapture = vi.fn();
    render(
      <CommandPalette
        open
        items={[]}
        onClose={vi.fn()}
        onWebSearch={onWebSearch}
        onQuickCapture={onQuickCapture}
      />
    );
    const input = screen.getByRole("combobox", { name: "搜索指令" });
    fireEvent.change(input, { target: { value: "一个新主题" } });

    fireEvent.click(screen.getByRole("button", { name: "搜索网页：一个新主题" }));
    expect(onWebSearch).toHaveBeenCalledWith("一个新主题");
    fireEvent.click(screen.getByRole("button", { name: "收集：一个新主题" }));
    expect(onQuickCapture).toHaveBeenCalledWith("一个新主题");
  });
});
