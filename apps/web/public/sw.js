/* eslint-disable no-restricted-globals */
/**
 * Diamond Luxea service worker.
 * - Static build assets (/_next/static, icons, fonts): cache-first (immutable).
 * - Page navigations: network-first, fall back to cache, then to a cached
 *   shell page so any route boots offline; the SPA then takes over using the
 *   persisted React Query cache.
 * - Redirected responses are "cleaned" before caching/serving, because Safari
 *   refuses a navigation response served by a SW if it came from a redirect
 *   ("Response served by service worker has redirections"). The app's "/" route
 *   redirects, so this is required.
 * - API calls go to another origin and are intentionally NOT handled here
 *   (offline writes are queued by the app's outbox; reads use the query cache).
 */
const VERSION = 'v3';
const STATIC_CACHE = `dl-static-${VERSION}`;
const PAGES_CACHE = `dl-pages-${VERSION}`;
// Pages cached for offline boot/shell fallback. "/" redirects, so it is
// stored cleaned (see stripRedirect); /login is the universal fallback.
const SHELL_URLS = ['/', '/login', '/dashboard', '/sales'];

/**
 * Download every build asset listed in /sw-precache.json so the whole app is
 * available offline after the first online load. Only fetches assets not
 * already cached, so repeat calls (on new deploys) are cheap.
 */
async function precacheAllAssets() {
  try {
    const res = await fetch('/sw-precache.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const data = await res.json();
    const assets = Array.isArray(data.assets) ? data.assets : [];
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(
      assets.map(async (url) => {
        const hit = await cache.match(url);
        if (!hit) await cache.add(url);
      })
    );
  } catch {
    /* best effort — app still works via lazy caching */
  }
}

/** Return a redirect-free copy of a response (Safari rejects redirected nav responses). */
async function stripRedirect(res) {
  if (!res || !res.redirected) return res;
  const body = await res.arrayBuffer();
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      await Promise.all(
        SHELL_URLS.map(async (u) => {
          try {
            const res = await fetch(u, { redirect: 'follow' });
            if (res.ok) await cache.put(u, await stripRedirect(res.clone()));
          } catch {
            /* best effort */
          }
        })
      );
      // Download all JS/CSS/font assets up front for full offline support.
      await precacheAllAssets();
    })()
  );
  self.skipWaiting();
});

// Lets the page ask the SW to (re)download assets, e.g. after a new deploy.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRECACHE') {
    event.waitUntil(precacheAllAssets());
  }
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

  // Page navigations: network-first, clean redirects, offline shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const toCache = await stripRedirect(res.clone());
            caches.open(PAGES_CACHE).then((c) => c.put(request, toCache));
          }
          return await stripRedirect(res);
        } catch {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          for (const u of SHELL_URLS) {
            const shell = await caches.match(u);
            if (shell) return shell;
          }
          return Response.error();
        }
      })()
    );
    return;
  }

  // Other same-origin GET (e.g. RSC payloads): network-first, cache fallback.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
