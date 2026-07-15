import { describe, expect, it } from "vitest";
import { parseWorkspaceSnapshot } from "../shared/contracts";

describe("workspace contract", () => {
  it("rejects an unsupported theme", () => {
    expect(() =>
      parseWorkspaceSnapshot({ version: 1, theme: "neon", entities: [] })
    ).toThrow();
  });

  it("rejects an entity without an id", () => {
    expect(() =>
      parseWorkspaceSnapshot({
        version: 1,
        theme: "morning",
        entities: [{ type: "bookmark", updatedAt: 1, data: {} }]
      })
    ).toThrow();
  });

  it("rejects notes longer than 20000 characters", () => {
    expect(() =>
      parseWorkspaceSnapshot({
        version: 1,
        theme: "morning",
        entities: [
          {
            id: "note-1",
            type: "note",
            updatedAt: 1,
            data: { text: "x".repeat(20001) }
          }
        ]
      })
    ).toThrow();
  });
});
