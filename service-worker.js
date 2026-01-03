// Simple service worker for app-shell caching
const CACHE_NAME = 'sportclub-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/main.js',
  '/firebase-config.js'
];

// Install - cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))
    ).then(() => self.clients.claim())
  );
});

// Fetch - cache-first for navigation & app shell, network-first for /api/firestore requests if needed
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Serve navigation (app shell) from cache
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(resp => resp || fetch(req))
    );
    return;
  }

  // For other requests: try cache first, then network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkResp => {
        // optionally cache responses for images/static
        return networkResp;
      }).catch(() => {
        // fallback could be manifest icon or placeholder
        if (req.destination === 'image') return caches.match('/web-app-manifest-192x192.png');
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
