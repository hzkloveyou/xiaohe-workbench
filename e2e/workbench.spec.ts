import { expect, test } from "@playwright/test";

test("opens the Chinese workbench and adds a bookmark", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "小贺的工作台" })).toBeVisible();
  await page.getByRole("button", { name: "添加书签" }).click();
  await page.getByLabel("名称").fill("OpenAI 文档");
  await page.getByRole("textbox", { name: "网址", exact: true }).fill("platform.openai.com/docs");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("link", { name: /OpenAI 文档/ })).toBeVisible();
});

test("switches themes from the customization dialog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开个性化设置" }).click();
  await page.getByRole("radio", { name: /晚霞/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dusk");
});

test("has no horizontal overflow on a phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "phone-only layout check");
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("honors reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page.locator(".ambient--one").evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.01);
});

test("keeps the workbench shell available offline", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one production offline check is enough");
  const pageErrors: string[] = [];
  const failedAssets: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (/\.(?:js|css)$/.test(new URL(request.url()).pathname)) failedAssets.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cachedUrls = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()));
    return requests.flat().map((request) => request.url);
  });
  expect(cachedUrls.some((url) => url.endsWith(".js"))).toBe(true);
  expect(cachedUrls.some((url) => url.endsWith(".css"))).toBe(true);
  await page.context().setOffline(true);
  await page.reload();
  await page.waitForTimeout(300);
  expect(pageErrors).toEqual([]);
  expect(failedAssets).toEqual([]);
  expect(await page.content()).toContain('id="root"');
  await expect(page.getByRole("heading", { level: 1, name: "小贺的工作台" })).toBeVisible();
});
