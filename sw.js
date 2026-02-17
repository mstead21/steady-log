// Steady Log: service worker disabled to prevent caching issues.
// This file remains only to help unregister old SWs.
self.addEventListener('install', (e)=>{ self.skipWaiting(); });
self.addEventListener('activate', (e)=>{ e.waitUntil(self.registration.unregister().then(()=>self.clients.claim())); });
