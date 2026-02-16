// FIX: make updates actually load (don’t ignore query strings)
// + network-first for HTML navigations so UI always updates

const CACHE = "steady-log-2026-02-16-fix2";
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
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Network-first for page loads (so "everything" appears with latest JS)
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (err) {
        return (await caches.match("./index.html")) || new Response("Offline", { status: 200 });
      }
    })());
    return;
  }

  // Cache-first for assets, but IMPORTANT: do NOT ignore query strings
  e.respondWith((async () => {
    const cached = await caches.match(req); // <-- NO ignoreSearch
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      return cached || new Response("Offline", { status: 200 });
    }
  })());
});
