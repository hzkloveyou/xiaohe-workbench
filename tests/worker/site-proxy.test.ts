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

  it("falls back to the application shell for an HTML navigation", async () => {
    const fetcher = vi.fn(async (request: Request) => {
      const pathname = new URL(request.url).pathname;
      return pathname === "/xiaohe-workbench/collect"
        ? new Response("missing", { status: 404 })
        : new Response('<div id="root"></div>', {
            status: 200,
            headers: { "Content-Type": "text/html" }
          });
    });
    const worker = createSiteProxy(fetcher as typeof fetch);

    const response = await worker.fetch(new Request("https://080492.xyz/collect", {
      headers: { Accept: "text/html" }
    }));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('id="root"');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("preserves a missing static asset response", async () => {
    const fetcher = vi.fn(async () => new Response("missing asset", { status: 404 }));
    const worker = createSiteProxy(fetcher as typeof fetch);

    const response = await worker.fetch(new Request("https://080492.xyz/assets/missing.js", {
      headers: { Accept: "*/*" }
    }));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("missing asset");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
