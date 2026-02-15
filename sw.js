const CACHE_NAME = "steady-log-cache-20260215_01";
const ASSETS = [
  "./",
  "./index.html?v=20260215_01",
  "./styles.css?v=20260215_01",
  "./app.js?v=20260215_01",
  "./manifest.json?v=20260215_01"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(()=>{})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async ()=>{
      const keys = await caches.keys();
      await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((resp)=>{
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache=> cache.put(event.request, copy)).catch(()=>{});
        return resp;
      }).catch(()=>cached);
    })
  );
});
