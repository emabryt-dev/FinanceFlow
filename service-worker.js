// Finance Flow Service Worker: Offline Support, Push Notifications, Sync

const CACHE_NAME = 'finance-flow-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/js-confetti@0.12.0/dist/js-confetti.browser.js',
  'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.21.0/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js',
  'https://cdn.jsdelivr.net/npm/list-view@0.0.3/dist/list-view.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.pathname.includes('googleapis.com')) {
    if (navigator.onLine) {
      event.respondWith(fetch(event.request));
    } else {
      event.respondWith(new Response('Offline: Unable to fetch sensitive data', { status: 503 }));
    }
    return;
  }
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(networkResponse => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    }).catch(() => {
      return caches.match('/index.html');
    })
  );
});

self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.message,
    icon: '/icons/icon-192.png'
  });
});

self.addEventListener('message', event => {
  if (event.data.type === 'SYNC_DATA') {
    event.waitUntil(
      fetch('https://www.googleapis.com/drive/v3/files?q=name="finance_flow_data.json"', {
        headers: { Authorization: `Bearer ${event.data.accessToken}` }
      }).then(response => {
        if (response.ok) {
          return response.json().then(data => {
            if (data.files.length) {
              return fetch(`https://www.googleapis.com/drive/v3/files/${data.files[0].id}?alt=media`, {
                headers: { Authorization: `Bearer ${event.data.accessToken}` }
              });
            }
          });
        }
      })
    );
  }
});
