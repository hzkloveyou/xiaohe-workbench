# 小贺的工作台

一个中文、本地优先、可跨设备同步的个人启动台。核心功能是智能搜索、快捷书签和今日专注；支持书签拖拽、四套主题、备份恢复、游客模式和账户同步。

## 技术架构

- React 19 + TypeScript + Vite PWA
- Dexie / IndexedDB 本地优先存储
- Cloudflare Worker + D1 账户与增量同步
- GitHub Pages 前端托管，Cloudflare Worker Route 提供自定义域名与 `www` 重定向
- Vitest、Testing Library、axe-core、Playwright 自动验收

## 本地运行

```bash
pnpm install
pnpm dev
```

完整验证：

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

游客可使用全部本地功能；注册只用于跨设备同步。账户密码经 PBKDF2-SHA-256 派生，服务端只存派生结果；登录会话使用安全 HttpOnly Cookie。

前端推送到 `main` 后由 Pages 自动发布。Worker 工作流保留为手动触发，配置长期有效的 `CLOUDFLARE_API_TOKEN` 后即可在 GitHub Actions 中发布 API 与站点路由。
