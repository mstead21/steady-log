// Service worker intentionally minimal (no caching) to prevent iPhone blank-screen cache issues.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
