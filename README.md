# 小贺的工作台

一个中文、本地优先、可跨设备同步的个人工作台。网站分为概览、收集、今日和连接四个页面，数据会先保存到浏览器 IndexedDB；登录后再通过 Cloudflare D1 增量同步。

## 主要能力

- `Ctrl/Cmd + K` 全局指令中心：页面、书签、主题、搜索和快捷动作
- 万能收集箱：识别链接、任务和灵感，支持安全网页标题预览与后续整理
- 增强书签：分组、拖动、标签、收藏、搜索、最近/常用排序和访问统计
- 今日计划 2.0：日期、优先级、备注、重复任务、完成与恢复
- 专注统计：25/45/60 分钟计时、关联任务、刷新恢复和近七天洞察
- 连接中心：GitHub 公开数据、工作台服务状态及常用外部控制台
- 四套主题、模块开关、JSON 备份恢复、PWA 离线访问和移动端底部导航

## 技术架构

- React 19、TypeScript、Vite、React Router
- Dexie / IndexedDB 本地优先存储
- Cloudflare Worker + D1 账户、增量同步和安全链接预览
- GitHub Pages 构建源站，Cloudflare Worker 提供自定义域名入口
- Vitest、Testing Library、axe-core、Playwright 自动验收

## 本地运行与验证

```bash
pnpm install
pnpm dev
```

完整质量门：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

## 线上地址

- 工作台：https://080492.xyz
- 同步 API：https://api.080492.xyz/health
- GitHub：https://github.com/hzkloveyou/xiaohe-workbench

游客可使用全部本地功能；账户仅用于跨设备同步。前端推送到 `main` 后由 GitHub Pages 自动发布，Cloudflare Worker 通过 Wrangler 或手动 GitHub Actions 工作流发布。
