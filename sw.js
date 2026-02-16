// Service worker intentionally minimal (no caching) to prevent blank-screen cache issues.
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { self.clients.claim(); });
