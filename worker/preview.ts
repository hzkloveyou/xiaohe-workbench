import { Hono } from "hono";
import { z } from "zod";
import { D1AuthStore } from "./d1-auth-store";
import type { WorkerEnv } from "./env";

const previewRequestSchema = z.object({ url: z.string().trim().min(1).max(2048) });
const MAX_HTML_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 5_000;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

class PreviewError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 400 | 422 = 422
  ) {
    super(message);
  }
}

function validatePublicUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new PreviewError("INVALID_URL", "链接格式无效", 400); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new PreviewError("UNSAFE_URL", "仅支持公开的 HTTP 或 HTTPS 链接", 400);
  }
  const hostname = url.hostname.toLocaleLowerCase("en-US");
  const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
  const isIpv6 = hostname.startsWith("[") || hostname.includes(":");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isIpv4 ||
    isIpv6 ||
    !hostname.includes(".")
  ) {
    throw new PreviewError("UNSAFE_URL", "不能读取本机或私有网络地址", 400);
  }
  return url;
}

function decodeEntities(value: string): string {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x?[\da-f]+|\w+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLocaleLowerCase()] ?? match;
  });
}

function cleanText(value: string | undefined, maxLength: number): string | undefined {
  const cleaned = value ? decodeEntities(value).replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
  return cleaned || undefined;
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)) {
    attributes[match[1].toLocaleLowerCase()] = match[2];
  }
  return attributes;
}

export function extractPreviewMetadata(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  let description: string | undefined;
  let siteName: string | undefined;
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const key = (attributes.property ?? attributes.name ?? "").toLocaleLowerCase();
    if ((key === "og:description" || key === "description") && !description) description = attributes.content;
    if (key === "og:site_name" && !siteName) siteName = attributes.content;
  }
  return {
    title: cleanText(title, 200),
    description: cleanText(description, 500),
    siteName: cleanText(siteName, 100)
  };
}

async function readLimitedHtml(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_HTML_BYTES) throw new PreviewError("PAGE_TOO_LARGE", "网页内容过大");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new PreviewError("PAGE_TOO_LARGE", "网页内容过大");
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(joined);
}

async function fetchPreview(url: URL, fetcher: typeof fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let current = url;
    for (let redirect = 0; redirect <= 2; redirect += 1) {
      const response = await fetcher(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/html,application/xhtml+xml" }
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location");
        if (!location || redirect === 2) throw new PreviewError("TOO_MANY_REDIRECTS", "网页重定向次数过多");
        current = validatePublicUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) throw new PreviewError("UPSTREAM_FAILED", "网页暂时无法访问");
      if (!(response.headers.get("Content-Type") ?? "").toLocaleLowerCase().includes("text/html")) {
        throw new PreviewError("UNSUPPORTED_CONTENT", "这个链接不是网页内容");
      }
      return extractPreviewMetadata(await readLimitedHtml(response));
    }
    throw new PreviewError("UPSTREAM_FAILED", "网页暂时无法访问");
  } catch (error) {
    if (error instanceof PreviewError) throw error;
    throw new PreviewError("UPSTREAM_FAILED", "网页信息暂时无法读取");
  } finally {
    clearTimeout(timeout);
  }
}

async function defaultRateLimit(database: D1Database, ipAddress: string, now: number): Promise<boolean> {
  const store = new D1AuthStore(database);
  const key = `preview:${ipAddress}`;
  const existing = await store.getAttempts(key);
  if (existing && now - existing.windowStartedAt < RATE_WINDOW_MS && existing.count >= MAX_REQUESTS_PER_WINDOW) return false;
  const windowStartedAt = existing && now - existing.windowStartedAt < RATE_WINDOW_MS ? existing.windowStartedAt : now;
  const count = existing && windowStartedAt === existing.windowStartedAt ? existing.count + 1 : 1;
  await store.setAttempts(key, count, windowStartedAt);
  return true;
}

interface PreviewDependencies {
  fetcher?: typeof fetch;
  checkRateLimit?: (database: D1Database, ipAddress: string, now: number) => Promise<boolean>;
  cache?: Cache | null;
  now?: () => number;
}

export function createPreviewRoutes(dependencies: PreviewDependencies = {}) {
  const routes = new Hono<{ Bindings: WorkerEnv }>();
  const fetcher = dependencies.fetcher ?? fetch;
  const rateLimit = dependencies.checkRateLimit ?? defaultRateLimit;
  const now = dependencies.now ?? Date.now;

  routes.post("/", async (context) => {
    const ipAddress = context.req.header("CF-Connecting-IP") ?? "unknown";
    if (!(await rateLimit(context.env.DB, ipAddress, now()))) {
      return context.json({ error: { code: "RATE_LIMITED", message: "预览请求过多，请稍后再试" } }, 429);
    }
    const parsed = previewRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return context.json({ error: { code: "INVALID_URL", message: "链接格式无效" } }, 400);
    try {
      const url = validatePublicUrl(parsed.data.url);
      const cacheStorage = typeof caches !== "undefined" ? caches as CacheStorage & { default: Cache } : undefined;
      const cache = dependencies.cache === undefined ? cacheStorage?.default : dependencies.cache;
      const cacheKey = new Request(`https://preview-cache.invalid/?url=${encodeURIComponent(url.toString())}`);
      const cached = cache ? await cache.match(cacheKey) : undefined;
      if (cached) return new Response(cached.body, cached);
      const metadata = await fetchPreview(url, fetcher);
      const response = context.json(metadata);
      if (cache) {
        await cache.put(cacheKey, new Response(JSON.stringify(metadata), {
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" }
        }));
      }
      return response;
    } catch (error) {
      const previewError = error instanceof PreviewError ? error : new PreviewError("PREVIEW_FAILED", "网页信息暂时无法读取");
      return context.json({ error: { code: previewError.code, message: previewError.message } }, previewError.status);
    }
  });

  return routes;
}

export const previewRoutes = createPreviewRoutes();
