// Minimal SW (no caching) to avoid blank-screen cache issues.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
