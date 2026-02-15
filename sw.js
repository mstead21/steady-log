/* Steady Log Service Worker - Premium vP1 */
const CACHE_NAME = "steady-log-cache-vp1";

const ASSETS = [
  "./",
  "./index.html?v=sl-p1",
  "./styles.css?v=sl-p1",
  "./app.js?v=sl-p1",
  "./manifest.webmanifest?v=sl-p1",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return resp;
        }).catch(() => cached)
      );
    })
  );
});
