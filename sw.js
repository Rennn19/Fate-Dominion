const CACHE_NAME = 'fate-dominion-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/masters.html',
  '/gallery.html',
  '/war.html',
  '/gacha.html',
  '/assets/images/bg.png',
  '/assets/images/logo.png',
  '/assets/images/favicon.png'
];

// 1. Install & Pre-cache aset utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate & Hapus Cache Lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Stale-While-Revalidate Caching Strategy
self.addEventListener('fetch', (event) => {
  // Hanya proses request GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Simpan salinan terbaru dari network ke cache jika HTTP status OK
        if (networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // Fallback jika offline dan request gagal
        return cachedResponse;
      });

      // Kembalikan versi cache secara instan jika ada, atau tunggu network
      return cachedResponse || fetchPromise;
    })
  );
});