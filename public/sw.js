// Legacy MAMS/OHTMS service-worker cleanup only.
// It does not unregister unrelated workers or purge unrelated browser caches.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => /^(mams-|ohtms-|next-pwa-)/i.test(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});
