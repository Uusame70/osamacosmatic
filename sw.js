// Service Worker - Basit Cache
const CACHE_NAME = 'mayar-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/kozmetik.html',
  '/parfum.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // API ve B2 isteklerini cache'leme
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/storage-img/')) return;

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchRes => {
        if (fetchRes.status === 200 && url.origin === location.origin) {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fetchRes;
      }).catch(() => caches.match('/index.html'));
    })
  );
});