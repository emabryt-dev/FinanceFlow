const CACHE_NAME = 'wealth-command-v11';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './js/main.js',
  './js/storage.js',
  './js/state.js',
  './js/utils.js',
  './js/engines.js',
  './js/ui.js',
  './js/sync.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://unpkg.com/dexie@3/dist/dexie.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
