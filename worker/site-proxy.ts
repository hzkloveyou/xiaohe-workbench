const GITHUB_PAGES_ORIGIN = "https://hzkloveyou.github.io";
const PROJECT_PREFIX = "/xiaohe-workbench";

export function createSiteProxy(fetcher: typeof fetch = fetch) {
  return {
    async fetch(request: Request): Promise<Response> {
      const incoming = new URL(request.url);
      if (incoming.hostname === "www.080492.xyz") {
        incoming.hostname = "080492.xyz";
        return Response.redirect(incoming.toString(), 308);
      }

      const upstream = new URL(`${PROJECT_PREFIX}${incoming.pathname}`, GITHUB_PAGES_ORIGIN);
      upstream.search = incoming.search;
      const upstreamRequest = new Request(upstream, request);
      const response = await fetcher(upstreamRequest);
      const headers = new Headers(response.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("X-Frame-Options", "SAMEORIGIN");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }
  };
}

export default createSiteProxy();
