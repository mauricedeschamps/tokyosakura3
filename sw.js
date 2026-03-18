const CACHE_NAME = 'sakura-lift-v3';
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
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Caching failed', error);
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
  const url = event.request.url;
  
  // 画像リクエストの処理
  if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/) || 
      url.includes('images.unsplash.com') ||
      url.includes('cloudfront') ||
      url.includes('walkerkus') ||
      url.includes('static.tenki.jp') ||
      url.includes('encrypted-tbn0.gstatic.com') ||
      url.includes('ana.co.jp') ||
      url.includes('kanko-chiyoda.jp') ||
      url.includes('tokyo-park.or.jp')) {
    
    event.respondWith(
      caches.match(event.request).then(response => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        
        // なければネットワークから取得してキャッシュに保存
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
          .catch(() => {
            // 画像取得失敗時のフォールバック - アイコン画像を返す
            console.log('画像取得失敗、フォールバック:', url);
            return caches.match('icons/icon-192.png');
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
            
            return new Response('オフラインです', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
  );
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.jpg',
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'アプリを開く'
      },
      {
        action: 'close',
        title: '閉じる'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('桜の名所リフト', options)
  );
});

// 通知クリックイベント
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});