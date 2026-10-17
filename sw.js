// Service Worker - Gelişmiş Cache Yönetimi
const CACHE_NAME = 'mayar-v3'; // Sürümü v3 yaptık, eskiyi silecek
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Kurulum: Yeni önbelleği oluştur
self.addEventListener('install', event => {
  self.skipWaiting(); // Yeni service worker'ın hemen devreye girmesini sağla
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Aktivasyon: Eski önbellekleri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski önbellek silindi:', cacheName);
            return caches.delete(cacheName); // Eski sürümleri (v1, v2 vb.) sil
          }
        })
      );
    }).then(() => self.clients.claim()) // Kontrolü hemen devral
  );
});

// 3. Fetch: İstekleri yakala (API isteklerini önbelleğe alma)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // API ve B2 görsel isteklerini asla önbelleğe alma (hep güncel kalsın)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/storage-img/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Eğer önbellekte varsa onu döndür
      if (response) {
        return response;
      }
      
      // Yoksa ağdan çek
      return fetch(event.request).then(fetchRes => {
        // Sadece başarılı yanıtları önbelleğe al
        if (fetchRes.status === 200 && url.origin === location.origin) {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fetchRes;
      }).catch(() => {
        // İnternet yoksa ve sayfa isteniyorsa index.html göster
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});