// Envoys PWA service worker — installability shim only. No caching:
// every request goes straight to the network, so deploys are never stale.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* network pass-through */ });