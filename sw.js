// Simple offline cache
const CACHE = "steady-log-premium-2026-02-15";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=2026-02-15-premium",
  "./app.js?v=2026-02-15-premium",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE ? caches.delete(k) : null)))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(cache=>cache.put(req, copy)).catch(()=>{});
      return res;
    }).catch(()=>cached))
  );
});
