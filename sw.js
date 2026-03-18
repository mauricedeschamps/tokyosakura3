const CACHE_NAME = 'tokyo-cherry-v2';
const urlsToCache = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// インストールイベント
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Service Worker: Caching failed for some files:', error);
          // 失敗したファイルがあっても続行（アイコンファイルがなくても動作するように）
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// アクティベートイベント
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Service Worker: Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// フェッチイベント - オフライン対応
self.addEventListener('fetch', event => {
  // 画像リクエストの処理
  if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        
        // なければネットワークから取得
        return fetch(event.request)
          .then(networkResponse => {
            // 有効なレスポンスのみキャッシュ
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
              return networkResponse;
            }
            
            // 画像をキャッシュに保存（将来のオフライン閲覧用）
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            
            return networkResponse;
          })
          .catch(error => {
            console.log('Service Worker: Image fetch failed', error);
            // 画像取得失敗時はシンプルなプレースホルダーを返す
            return new Response(
              '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#362f4a"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="#ffa5b9" text-anchor="middle">🌸</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          });
      })
    );
    return;
  }

  // HTMLとマニフェストの処理
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            // 有効なレスポンスのみキャッシュ
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
              return networkResponse;
            }
            
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            
            return networkResponse;
          })
          .catch(error => {
            console.log('Service Worker: Fetch failed', error);
            
            // オフラインでHTMLリクエストの場合はメインページを返す
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('index.html');
            }
            
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification('Tokyo Cherry Blossom Guide', options)
  );
});