export const SEARCH_ENGINES = {
  bing: { label: "必应", buildUrl: (query: string) => `https://www.bing.com/search?q=${encodeURIComponent(query)}` },
  baidu: { label: "百度", buildUrl: (query: string) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}` },
  google: { label: "Google", buildUrl: (query: string) => `https://www.google.com/search?q=${encodeURIComponent(query)}` }
} as const;

export type SearchEngineId = keyof typeof SEARCH_ENGINES;

const SHORTCUTS: Record<string, (query: string) => string> = {
  gh: (query) => `https://github.com/search?q=${encodeURIComponent(query)}`,
  mdn: (query) => `https://developer.mozilla.org/zh-CN/search?q=${encodeURIComponent(query)}`
};

export function resolveSearchInput(
  rawInput: string,
  engine: SearchEngineId
): { kind: "url" | "search"; url: string } {
  const input = rawInput.trim();
  if (!input) throw new Error("请输入搜索内容或网址");

  const protocol = input.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  if (protocol && protocol !== "http" && protocol !== "https") {
    throw new Error("不支持的链接协议");
  }

  if (protocol === "http" || protocol === "https") {
    return { kind: "url", url: new URL(input).toString() };
  }

  if (/^(?:localhost|(?:[\p{L}\p{N}-]+\.)+[\p{L}]{2,})(?::\d+)?(?:\/\S*)?$/u.test(input)) {
    return { kind: "url", url: new URL(`https://${input}`).toString() };
  }

  const [prefix, ...rest] = input.split(/\s+/);
  const shortcut = SHORTCUTS[prefix.toLowerCase()];
  if (shortcut && rest.length > 0) {
    return { kind: "search", url: shortcut(rest.join(" ")) };
  }

  return { kind: "search", url: SEARCH_ENGINES[engine].buildUrl(input) };
}
