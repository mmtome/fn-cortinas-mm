/* FN Cortinas — Service Worker (offline)
 * Estratégia sem dependências (sem Workbox):
 *  - navegações (HTML): network-first com fallback ao cache (e a "/")
 *  - assets estáticos (/assets, imagens, fontes): stale-while-revalidate
 *  - demais GET same-origin: network-first com fallback ao cache
 *  - POST/PUT/etc. e cross-origin: passa direto (a fila de sync cuida do offline)
 * Bump CACHE_VERSION a cada mudança neste arquivo para invalidar o cache antigo.
 */
const CACHE_VERSION = "fn-cortinas-v1";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/logo-fn.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // best-effort: se um recurso falhar, não quebra a instalação
      Promise.allSettled(APP_SHELL.map((u) => cache.add(u)))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Permite que a página peça a ativação imediata de uma versão nova do SW.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const isAsset = (url) =>
  url.pathname.startsWith("/assets/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname);

async function networkFirst(request, fallbackToRoot) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackToRoot) {
      const root = await cache.match("/");
      if (root) return root;
    }
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // mutações vão pela rede/fila de sync
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // cross-origin: passa direto

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }
  if (isAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  event.respondWith(networkFirst(request, false));
});
