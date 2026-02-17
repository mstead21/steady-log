// Steady Log BEST V3 - minimal SW (no caching). Not registered by app.js.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
