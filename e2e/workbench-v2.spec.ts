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
