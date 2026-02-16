// Service worker disabled intentionally to prevent caching issues
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
