// sw.js - FinanceFlowPro service worker
const CACHE_NAME = "financeflowpro-v1";
const ASSETS = [
  "/financeflowpro/",
  "/financeflowpro/index.html",
  "/financeflowpro/style.css",
  "/financeflowpro/app.js",
  "/financeflowpro/db.js",
  "/financeflowpro/ai.js",
  "/financeflowpro/drive-sync.js",
  "/financeflowpro/manifest.json"
];

// Install event - cache files
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Fetch event - serve from cache if offline
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
