// Define a unique name for the cache
const CACHE_NAME = 'finance-flow-cache-v1';

// List all the files that make up the application's "shell"
const URLS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './services/geminiService.ts',
  './services/googleDriveService.ts',
  './manifest.json'
];

// Event listener for the 'install' event
// This is where we download and cache the app shell files.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Event listener for the 'fetch' event
// This intercepts network requests and serves cached files if available.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the request is in the cache, return the cached response.
        // Otherwise, fetch the resource from the network.
        return response || fetch(event.request);
      })
  );
});

// Event listener for the 'activate' event
// This is where we clean up old, unused caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If the cache name is not in our whitelist, delete it.
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
