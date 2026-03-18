const CACHE_NAME = 'tokyo-hanami-v2026'; // 新しいキャッシュ名（古いものと完全に区別）
const urlsToCache = [
  'index.html?v=2026',
  'manifest.json?v=2026',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// インストール
self.addEventListener('install', event => {
  console.log('Service Worker (2026): Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker (2026): Caching files');
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('Some files not cached, continuing...', err);
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベート：古いキャッシュをすべて削除
self.addEventListener('activate', event => {
  console.log('Service Worker (2026): Activating...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          // 現在のキャッシュ名以外はすべて削除（古いアプリのキャッシュを完全に消去）
          if (key !== CACHE_NAME) {
            console.log('Service Worker (2026): Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker (2026): Now controlling clients');
      return self.clients.claim();
    })
  );
});

// フェッチ
self.addEventListener('fetch', event => {
  // 画像リクエスト
  if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response;
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response(
              '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#362f4a"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="#ffa5b9" text-anchor="middle">🌸</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          });
      })
    );
    return;
  }

  // HTMLなど
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('index.html?v=2026');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});