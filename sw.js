// Service Worker для PWA - версия без диалогов обновления
const CACHE_NAME = 'english-learning-v1.2.0';
const STATIC_CACHE = 'static-v1.2.0';
const DYNAMIC_CACHE = 'dynamic-v1.2.0';

// Файлы для кэширования
const STATIC_FILES = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './animations-fix.css',
  './z-index-fix.css',
  './settings.json',
  './manifest.json'
];

// Установка Service Worker - БЕЗ диалогов обновления
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Установка v1.2.0...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Кэширование статических файлов...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Установка завершена');
        // Принудительно активируем новый Service Worker БЕЗ диалогов
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Ошибка установки:', error);
      })
  );
});

// Активация Service Worker - БЕЗ диалогов обновления
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Активация v1.2.0...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Удаляем ВСЕ старые кэши
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Удаление старого кэша:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Активация завершена');
        // Принудительно берем контроль над всеми клиентами БЕЗ диалогов
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Ошибка активации:', error);
      })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Стратегия кэширования для разных типов файлов
  if (request.method === 'GET') {
    // Статические файлы - Cache First
    if (STATIC_FILES.includes(url.pathname) || 
        url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.json') ||
        url.pathname.endsWith('.html')) {
      
      event.respondWith(cacheFirst(request));
    }
    // Firebase API - Network First
    else if (url.hostname.includes('firebase') || 
             url.hostname.includes('firestore')) {
      
      event.respondWith(networkFirst(request));
    }
    // Остальные запросы - Stale While Revalidate
    else {
      event.respondWith(staleWhileRevalidate(request));
    }
  }
});

// Cache First стратегия
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache First ошибка:', error);
    return new Response('Офлайн режим', { status: 503 });
  }
}

// Network First стратегия
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('🌐 Нет сети, проверяем кэш...');
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Офлайн режим', { status: 503 });
  }
}

// Stale While Revalidate стратегия
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    return cachedResponse || new Response('Офлайн режим', { status: 503 });
  });
  
  return cachedResponse || fetchPromise;
}

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  console.log('📱 Service Worker: Получено push уведомление');
  
  const options = {
    body: event.data ? event.data.text() : 'Новое уведомление',
    icon: './icons/icon-192x192.svg',
    badge: './icons/icon-72x72.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Открыть приложение',
        icon: './icons/icon-96x96.svg'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: './icons/icon-96x96.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('English Learning', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Клик по уведомлению');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Синхронизация в фоне
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Фоновая синхронизация');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log('🔄 Выполняется фоновая синхронизация...');
  } catch (error) {
    console.error('❌ Ошибка фоновой синхронизации:', error);
  }
}

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('✅ Service Worker v1.2.0 загружен - БЕЗ диалогов обновления');