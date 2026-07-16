import { expect, test } from "@playwright/test";

test("switches all four workbench pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "收集" }).click();
  await expect(page.getByRole("heading", { name: "收集与书签" })).toBeVisible();
  await page.getByRole("link", { name: "今日" }).click();
  await expect(page.getByRole("heading", { name: "今日计划" })).toBeVisible();
  await page.getByRole("link", { name: "连接" }).click();
  await expect(page.getByRole("heading", { name: "连接与状态" })).toBeVisible();
  await page.getByRole("link", { name: "概览" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "小贺的工作台" })).toBeVisible();
});

test("refreshes a deep workbench link", async ({ page }) => {
  await page.goto("/collect");
  await expect(page.getByRole("heading", { name: "收集与书签" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "收集与书签" })).toBeVisible();
});

test("uses bottom navigation on a phone without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today");
  await expect(page.getByRole("navigation", { name: "主要页面" })).toBeVisible();
  await expect(page.getByRole("button", { name: "25 分钟" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("persists collected content, an enhanced bookmark and a planned task", async ({ page }) => {
  await page.goto("/collect");
  await page.getByRole("textbox", { name: "快速收集内容" }).fill("部署前检查灵感");
  await page.getByRole("button", { name: "保存到收集箱" }).click();
  await expect(page.getByText("部署前检查灵感")).toBeVisible();

  await page.getByRole("button", { name: "添加书签" }).click();
  await page.getByRole("textbox", { name: "名称", exact: true }).fill("Cloudflare 控制台");
  await page.getByRole("textbox", { name: "网址", exact: true }).fill("dash.cloudflare.com");
  await page.getByRole("textbox", { name: "标签" }).fill("运维，部署");
  await page.getByRole("checkbox", { name: "加入收藏" }).check();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("link", { name: /Cloudflare 控制台/ })).toBeVisible();

  await page.goto("/today");
  await page.getByRole("button", { name: "添加任务" }).click();
  await page.getByRole("textbox", { name: "任务名称" }).fill("发布后复盘");
  await page.getByLabel("优先级").selectOption("high");
  await page.getByRole("button", { name: "保存任务" }).click();
  await page.reload();
  await expect(page.getByRole("region", { name: "任务安排" }).getByText("发布后复盘")).toBeVisible();

  await page.goto("/collect");
  await expect(page.getByText("部署前检查灵感")).toBeVisible();
  await expect(page.getByRole("link", { name: /Cloudflare 控制台/ })).toBeVisible();
});
