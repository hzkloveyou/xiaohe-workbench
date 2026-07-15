import "fake-indexeddb/auto";
import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("workbench accessibility", () => {
  it("renders the Chinese main experience without automatic accessibility violations", async () => {
    const { container } = render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "小贺的工作台" })).toBeInTheDocument();

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
