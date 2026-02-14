// Steady Log SW v13 (mobile-optimised, cache-safe)
const CACHE = "steady-log-v13";
self.addEventListener("install", (e) => {
  e.waitUntil((async ()=>{
    const cache = await caches.open(CACHE);
    await cache.addAll(["./","./index.html","./styles.css","./app.js","./manifest.json","./icon-192.png","./icon-512.png"]);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith("/app.js") || url.pathname.endsWith("/styles.css")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith((async ()=>{
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try{
      const resp = await fetch(e.request);
      const cache = await caches.open(CACHE);
      cache.put(e.request, resp.clone());
      return resp;
    }catch{
      return caches.match("./index.html");
    }
  })());
});
