import type { SyncEntity, ThemeId } from "../../../shared/entities";
import { isBookmarkEntity } from "../bookmarks/bookmark-model";

export type CommandGroup = "suggested" | "page" | "bookmark" | "action" | "web";

export interface CommandItem {
  id: string;
  group: CommandGroup;
  label: string;
  description?: string;
  icon?: string;
  keywords: string[];
  run(): void;
}

interface CommandContext {
  bookmarks: SyncEntity[];
  navigate(path: string): void;
  openUrl(url: string): void;
  setTheme(theme: ThemeId): void;
}

const pageCommands = [
  ["page-overview", "概览", "/", "首页 工作台", "⌂"],
  ["page-collect", "收集与书签", "/collect", "收集 链接 记录 书签", "＋"],
  ["page-today", "今日计划", "/today", "今日 任务 专注 统计", "✓"],
  ["page-connect", "连接与状态", "/connect", "GitHub 状态 部署", "◎"]
] as const;

export function buildCommands(context: CommandContext): CommandItem[] {
  const pages: CommandItem[] = pageCommands.map(([id, label, path, keywords, icon]) => ({
    id,
    group: "page",
    label,
    description: "打开页面",
    icon,
    keywords: keywords.split(" "),
    run: () => context.navigate(path)
  }));
  const actions: CommandItem[] = [
    { id: "action-capture", group: "action", label: "快速收集", description: "记录链接、任务或灵感", icon: "＋", keywords: ["添加", "记录", "收集"], run: () => context.navigate("/collect?capture=auto") },
    { id: "action-task", group: "action", label: "新建任务", description: "添加到今日计划", icon: "✓", keywords: ["任务", "待办", "todo"], run: () => context.navigate("/today?new=1") },
    { id: "action-focus-25", group: "action", label: "开始 25 分钟专注", description: "打开今日计时器", icon: "◷", keywords: ["专注", "番茄", "25"], run: () => context.navigate("/today?focus=25") },
    { id: "theme-morning", group: "action", label: "切换晨雾主题", icon: "☀", keywords: ["主题", "浅色", "晨雾"], run: () => context.setTheme("morning") },
    { id: "theme-dusk", group: "action", label: "切换晚霞主题", icon: "◐", keywords: ["主题", "晚霞", "暮光"], run: () => context.setTheme("dusk") },
    { id: "theme-night", group: "action", label: "切换夜雾主题", icon: "☾", keywords: ["主题", "深色", "夜间"], run: () => context.setTheme("night") }
  ];
  const bookmarks: CommandItem[] = context.bookmarks.filter(isBookmarkEntity).map((bookmark) => ({
    id: bookmark.id,
    group: "bookmark",
    label: bookmark.data.title,
    description: new URL(bookmark.data.url).hostname,
    icon: bookmark.data.icon ?? "↗",
    keywords: [bookmark.data.url, ...(bookmark.data.tags ?? [])],
    run: () => context.openUrl(bookmark.data.url)
  }));
  return [...pages, ...actions, ...bookmarks];
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function scoreCommand(item: CommandItem, query: string): number {
  const label = normalize(item.label);
  if (label === query) return 1_000;
  if (label.startsWith(query)) return 800;
  if (label.includes(query)) return 600;
  const keywordScores = item.keywords.map(normalize).map((keyword) => {
    if (keyword === query) return 500;
    if (keyword.startsWith(query)) return 400;
    if (keyword.includes(query)) return 300;
    return query.split(/\s+/).every((part) => keyword.includes(part)) ? 200 : 0;
  });
  return Math.max(0, ...keywordScores);
}

export function filterCommands(items: CommandItem[], raw: string): CommandItem[] {
  const query = normalize(raw);
  if (!query) return items.slice(0, 10);
  return items
    .map((item) => ({ item, score: scoreCommand(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label, "zh-CN"))
    .slice(0, 12)
    .map(({ item }) => item);
}
