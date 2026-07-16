import { describe, expect, it, vi } from "vitest";
import { createPreviewRoutes } from "../../worker/preview";

function request(url: string) {
  return new Request("https://api.080492.xyz/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.8" },
    body: JSON.stringify({ url })
  });
}

describe("link preview route", () => {
  it.each([
    "http://127.0.0.1",
    "http://localhost",
    "http://10.0.0.2",
    "http://printer.local",
    "file:///etc/passwd"
  ])("rejects unsafe preview target %s", async (url) => {
    const fetcher = vi.fn();
    const routes = createPreviewRoutes({ fetcher: fetcher as typeof fetch, checkRateLimit: async () => true, cache: null });

    const response = await routes.fetch(request(url), { DB: {} as D1Database, ALLOWED_ORIGINS: "https://080492.xyz" });

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("extracts bounded public metadata", async () => {
    const fetcher = vi.fn(async () => new Response(`<!doctype html><html><head>
      <title>示例页面</title>
      <meta property="og:description" content="一个安全的说明">
      <meta property="og:site_name" content="示例站点">
    </head></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
    const routes = createPreviewRoutes({ fetcher: fetcher as typeof fetch, checkRateLimit: async () => true, cache: null });

    const response = await routes.fetch(request("https://example.com/article"), { DB: {} as D1Database, ALLOWED_ORIGINS: "https://080492.xyz" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ title: "示例页面", description: "一个安全的说明", siteName: "示例站点" });
  });

  it("rejects oversized HTML and rate-limited callers", async () => {
    const fetcher = vi.fn(async () => new Response("large", {
      headers: { "Content-Type": "text/html", "Content-Length": "600000" }
    }));
    const allowed = createPreviewRoutes({ fetcher: fetcher as typeof fetch, checkRateLimit: async () => true, cache: null });
    const limited = createPreviewRoutes({ fetcher: fetcher as typeof fetch, checkRateLimit: async () => false, cache: null });

    expect((await allowed.fetch(request("https://example.com"), { DB: {} as D1Database, ALLOWED_ORIGINS: "" })).status).toBe(422);
    expect((await limited.fetch(request("https://example.com"), { DB: {} as D1Database, ALLOWED_ORIGINS: "" })).status).toBe(429);
  });
});
