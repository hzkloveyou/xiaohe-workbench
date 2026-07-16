import { describe, expect, it } from "vitest";
import { getWorkspacePreferences, upsertWorkspacePreferences } from "../src/features/customize/preference-model";

describe("workspace preferences", () => {
  it("uses practical defaults", () => {
    expect(getWorkspacePreferences([])).toEqual({ searchEngine: "bing", githubUsername: "hzkloveyou", panels: { search: true, bookmarks: true, focus: true } });
  });

  it("updates one preference without discarding other values", () => {
    const first = upsertWorkspacePreferences([], { githubUsername: "xiaohe" }, 10);
    const second = upsertWorkspacePreferences(first, { searchEngine: "google" }, 20);
    expect(getWorkspacePreferences(second)).toMatchObject({ githubUsername: "xiaohe", searchEngine: "google" });
    expect(second).toHaveLength(1);
    expect(second[0]?.updatedAt).toBe(20);
  });

  it("keeps an explicit empty GitHub draft editable", () => {
    const entities = upsertWorkspacePreferences([], { githubUsername: "" }, 10);
    expect(getWorkspacePreferences(entities).githubUsername).toBe("");
  });
});
