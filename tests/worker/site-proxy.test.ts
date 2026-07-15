import { describe, expect, it, vi } from "vitest";
import { createSiteProxy } from "../../worker/site-proxy";

describe("site proxy worker", () => {
  it("maps apex-domain requests to the GitHub Pages project path", async () => {
    const fetcher = vi.fn(async (request: Request) => new Response(request.url, { status: 200 }));
    const worker = createSiteProxy(fetcher as typeof fetch);

    const response = await worker.fetch(new Request("https://080492.xyz/assets/app.js?v=1"));

    expect(await response.text()).toBe("https://hzkloveyou.github.io/xiaohe-workbench/assets/app.js?v=1");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("redirects www to the canonical apex domain", async () => {
    const worker = createSiteProxy(vi.fn() as unknown as typeof fetch);

    const response = await worker.fetch(new Request("https://www.080492.xyz/settings?q=1"));

    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe("https://080492.xyz/settings?q=1");
  });
});
