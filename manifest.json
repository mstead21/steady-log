// Cache-safe service worker (version bump = forced refresh)
const CACHE = "steady-log-cache-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Network-first for html/js/css, cache fallback for offline
self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith(
    fetch(req).then(res => res).catch(() => caches.match(req))
  );
});
