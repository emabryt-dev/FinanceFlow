// Finance Flow Service Worker
const CACHE_NAME = 'finance-flow-v2.0';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css'
];

self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('/api/') || event.request.url.includes('googleapis.com')) {
    // Network-first for API calls and Google APIs
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            return response;
          }
          return fetch(event.request);
        }
      )
    );
  }
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
  if (event.tag === 'finance-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      // This would sync data when back online
      Promise.resolve()
    );
  }
});
