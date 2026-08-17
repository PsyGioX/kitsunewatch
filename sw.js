// sw.js

const CACHE_NAME = 'kitsunewatch-cache-v1';
const DYNAMIC_CACHE = 'kitsunewatch-dynamic-v1';
const API_CACHE = 'kitsunewatch-api-v1';

// Ресурсы для предварительного кэширования
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/assets/styles/index.css',
    '/assets/scripts/index.js',
    '/site.webmanifest',
    '/imgs/favicon-32x32.png',
    '/imgs/apple-touch-icon.png',
    '/imgs/android-chrome-192x192.png',
    '/imgs/android-chrome-512x512.png'
];

// Внешние ресурсы для кэширования
const EXTERNAL_ASSETS = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                console.log('Кэширование статических ресурсов');
                return cache.addAll(STATIC_ASSETS);
            }),
            caches.open(DYNAMIC_CACHE).then((cache) => {
                console.log('Кэширование внешних ресурсов');
                return Promise.allSettled(
                    EXTERNAL_ASSETS.map(url => 
                        cache.add(url).catch(err => 
                            console.warn(`Не удалось закэшировать: ${url}`, err)
                        )
                    )
                );
            })
        ]).then(() => {
            console.log('Service Worker установлен');
            return self.skipWaiting();
        })
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (
                        cacheName !== CACHE_NAME &&
                        cacheName !== DYNAMIC_CACHE &&
                        cacheName !== API_CACHE
                    ) {
                        console.log('Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker активирован');
            return self.clients.claim();
        })
    );
});

// Обработка fetch запросов
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Пропускаем не-GET запросы
    if (request.method !== 'GET') {
        return;
    }
    
    // Обработка API запросов
    if (request.url.includes('kodik-api.com')) {
        event.respondWith(handleApiRequest(request));
        return;
    }
    
    // Обработка запросов к плееру
    if (request.url.includes('kodikplayer.com')) {
        event.respondWith(handlePlayerRequest(request));
        return;
    }
    
    // Обработка статических ресурсов
    event.respondWith(handleStaticRequest(request));
});

// Обработка API запросов с кэшированием
async function handleApiRequest(request) {
    // Стратегия: Network First, затем Cache
    try {
        const response = await fetch(request);
        
        // Кэшируем успешные ответы
        if (response.ok) {
            const cache = await caches.open(API_CACHE);
            await cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // Если сеть недоступна, используем кэш
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Если нет кэша, возвращаем ошибку
        return new Response(
            JSON.stringify({
                error: 'Отсутствует подключение к сети',
                cached: false
            }),
            {
                status: 503,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}

// Обработка запросов к плееру
async function handlePlayerRequest(request) {
    // Стратегия: Network Only для плеера
    try {
        return await fetch(request);
    } catch (error) {
        return new Response('Плеер недоступен без подключения к сети', {
            status: 503,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        });
    }
}

// Обработка статических запросов
async function handleStaticRequest(request) {
    // Стратегия: Cache First, затем Network
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const response = await fetch(request);
        
        // Кэшируем успешные GET запросы
        if (response.ok && request.method === 'GET') {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // Если запрос к HTML, возвращаем офлайн страницу
        if (request.headers.get('Accept').includes('text/html')) {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('/index.html');
        }
        
        throw error;
    }
}

// Обработка push уведомлений
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Новое уведомление от KitsuneWatch',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'open',
                title: 'Открыть'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('KitsuneWatch', options)
    );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
    
    if (event.data && event.data.type === 'CHECK_UPDATE') {
        event.waitUntil(
            self.registration.update()
        );
    }
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
    
    if (event.tag === 'sync-history') {
        event.waitUntil(syncHistory());
    }
});

// Синхронизация избранного
async function syncFavorites() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const favoritesResponse = await cache.match('/api/favorites');
        
        if (favoritesResponse) {
            const favorites = await favoritesResponse.json();
            
            // Отправляем на сервер
            await fetch('/api/sync/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(favorites)
            });
        }
    } catch (error) {
        console.error('Ошибка синхронизации избранного:', error);
    }
}

// Синхронизация истории
async function syncHistory() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const historyResponse = await cache.match('/api/history');
        
        if (historyResponse) {
            const history = await historyResponse.json();
            
            // Отправляем на сервер
            await fetch('/api/sync/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(history)
            });
        }
    } catch (error) {
        console.error('Ошибка синхронизации истории:', error);
    }
}

// Периодическая синхронизация
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-content') {
        event.waitUntil(updateContent());
    }
});

// Обновление контента
async function updateContent() {
    try {
        const cache = await caches.open(API_CACHE);
        const keys = await cache.keys();
        
        // Обновляем кэшированные API ответы
        for (const key of keys) {
            if (key.url.includes('kodik-api.com')) {
                try {
                    const response = await fetch(key);
                    if (response.ok) {
                        await cache.put(key, response);
                    }
                } catch (error) {
                    console.warn('Не удалось обновить:', key.url);
                }
            }
        }
    } catch (error) {
        console.error('Ошибка обновления контента:', error);
    }
}