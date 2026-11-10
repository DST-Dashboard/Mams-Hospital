// OHTMS Service Worker — Stale-While-Revalidate with Last Known State Support

const CACHE_NAME = "ohtms-shell-v1";
const DATA_CACHE_NAME = "ohtms-data-v1";

const PRECACHE_ASSETS = [
  "/dashboard",
  "/favicon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache mutations or auth requests
  if (request.method !== "GET" || url.pathname.startsWith("/api/auth/")) {
    return;
  }

  // Handle /api/dashboard with Stale-While-Revalidate so offline fallback is available
  if (url.pathname === "/api/dashboard") {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          throw error;
        }
      })
    );
    return;
  }

  // App Shell & Static assets: cache-first with network fallback
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || PRECACHE_ASSETS.includes(url.pathname))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
