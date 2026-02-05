// Steady Log SW v12 (cache-fix)
const CACHE = "steady-log-v12";
const ASSETS = ["./","./index.html","./styles.css","./manifest.json","./icon-192.png","./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil((async ()=>{
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
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
  // Always try network first for app.js (updates)
  if (url.pathname.endsWith("/app.js")) {
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
