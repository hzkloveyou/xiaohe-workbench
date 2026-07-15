import { describe, expect, it } from "vitest";
import { resolveSearchInput } from "../src/features/search/search";

describe("resolveSearchInput", () => {
  it("opens an absolute HTTPS URL directly", () => {
    expect(resolveSearchInput("https://example.com/path", "bing")).toEqual({
      kind: "url",
      url: "https://example.com/path"
    });
  });

  it("adds HTTPS to a bare domain", () => {
    expect(resolveSearchInput("github.com", "bing")).toEqual({ kind: "url", url: "https://github.com/" });
  });

  it("searches ordinary text with the chosen engine", () => {
    expect(resolveSearchInput("个人启动台", "bing").url).toBe(
      "https://www.bing.com/search?q=%E4%B8%AA%E4%BA%BA%E5%90%AF%E5%8A%A8%E5%8F%B0"
    );
  });

  it("resolves GitHub and MDN shortcuts", () => {
    expect(resolveSearchInput("gh react", "bing").url).toBe("https://github.com/search?q=react");
    expect(resolveSearchInput("mdn grid", "bing").url).toBe(
      "https://developer.mozilla.org/zh-CN/search?q=grid"
    );
  });

  it("rejects dangerous protocols", () => {
    expect(() => resolveSearchInput("javascript:alert(1)", "bing")).toThrow("不支持的链接协议");
  });
});
