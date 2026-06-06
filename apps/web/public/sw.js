/* eslint-disable no-restricted-globals */
/**
 * Diamond Luxea service worker.
 * - Static build assets (/_next/static, icons, fonts): cache-first (immutable).
 * - Pages & RSC navigations (same-origin): network-first, fall back to cache,
 *   then to the cached app shell ("/") so any route boots offline and the SPA
 *   takes over using the persisted React Query cache.
 * - API calls go to a different origin and are intentionally NOT handled here
 *   (offline writes are queued by the app's outbox; reads use the query cache).
 */
const VERSION = 'v2';
const STATIC_CACHE = `dl-static-${VERSION}`;
const PAGES_CACHE = `dl-pages-${VERSION}`;
const APP_SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/branding/') ||
    url.pathname === '/manifest.json' ||
    /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle our own origin; let cross-origin (the API) pass through.
  if (url.origin !== self.location.origin) return;

  // Cache-first for immutable/static assets.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Network-first for pages / RSC navigations, with offline fallbacks.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // For full-page navigations, fall back to the cached app shell.
        if (request.mode === 'navigate') {
          const shell = await caches.match(APP_SHELL);
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
