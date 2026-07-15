import type { SyncEntity } from "../../../shared/entities";

const groups = [
  ["group-ai", "AI"],
  ["group-work", "工作"],
  ["group-dev", "开发"],
  ["group-study", "学习"],
  ["group-media", "影音"]
] as const;

const bookmarks = [
  ["bookmark-chatgpt", "ChatGPT", "https://chatgpt.com", "group-ai", "✦"],
  ["bookmark-deepseek", "DeepSeek", "https://chat.deepseek.com", "group-ai", "深"],
  ["bookmark-feishu", "飞书", "https://www.feishu.cn", "group-work", "飞"],
  ["bookmark-tencent-docs", "腾讯文档", "https://docs.qq.com", "group-work", "文"],
  ["bookmark-github", "GitHub", "https://github.com", "group-dev", "⌘"],
  ["bookmark-mdn", "MDN", "https://developer.mozilla.org/zh-CN", "group-dev", "M"],
  ["bookmark-bilibili", "哔哩哔哩", "https://www.bilibili.com", "group-media", "B"]
] as const;

export function createDefaultEntities(): SyncEntity[] {
  const groupEntities: SyncEntity[] = groups.map(([id, title], order) => ({
    id,
    type: "bookmarkGroup",
    updatedAt: 0,
    data: { title, order }
  }));
  const bookmarkEntities: SyncEntity[] = bookmarks.map(
    ([id, title, url, groupId, icon], order) => ({
      id,
      type: "bookmark",
      updatedAt: 0,
      data: { title, url, groupId, icon, order }
    })
  );
  return [...groupEntities, ...bookmarkEntities];
}
