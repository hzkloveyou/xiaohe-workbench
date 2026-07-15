import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "../src/features/search/SearchBar";

describe("SearchBar", () => {
  it("focuses the search field with Ctrl+K", () => {
    render(<SearchBar engine="bing" onEngineChange={() => undefined} />);
    const input = screen.getByRole("searchbox");

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(input).toHaveFocus();
  });

  it("resolves and navigates a submitted query", () => {
    const onNavigate = vi.fn();
    render(<SearchBar engine="bing" onEngineChange={() => undefined} onNavigate={onNavigate} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "小贺工作台" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(onNavigate).toHaveBeenCalledWith(
      "https://www.bing.com/search?q=%E5%B0%8F%E8%B4%BA%E5%B7%A5%E4%BD%9C%E5%8F%B0"
    );
  });
});
