const CACHE_NAME = "xiaohe-workbench-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/workbench.svg",
  "/icons/workbench-maskable.svg"
];

async function cacheBuiltAssetGraph(cache, html) {
  const queue = [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)].map((match) => match[1]);
  const seen = new Set();
  while (queue.length) {
    const path = queue.shift();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const response = await fetch(path);
    if (!response.ok) continue;
    await cache.put(path, response.clone());
    if (path.endsWith(".js")) {
      const source = await response.text();
      for (const match of source.matchAll(/["'](\/?assets\/[^"']+\.(?:js|css))["']/g)) {
        queue.push(match[1].startsWith("/") ? match[1] : `/${match[1]}`);
      }
      for (const match of source.matchAll(/["'](\.\/[^"']+\.(?:js|css))["']/g)) {
        queue.push(new URL(match[1], new URL(path, self.location.origin)).pathname);
      }
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    await cache.addAll(APP_SHELL);
    const indexResponse = await cache.match("/index.html");
    const html = indexResponse ? await indexResponse.text() : "";
    await cacheBuiltAssetGraph(cache, html);
  }));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/v1/") || url.pathname === "/health") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(url.pathname, { ignoreSearch: true, ignoreVary: true }).then((cached) => cached ?? fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
