// v3: два важных исправления PWA-обновлений.
//
// 1) HTML-навигация (index.html, "/") раньше отдавалась cache-first —
//    один раз закэшированная страница могла оставаться "навсегда" и не
//    обновляться для вернувшихся пользователей. Теперь навигация
//    network-first: пока есть сеть, всегда приходит свежий index.html,
//    офлайн-кэш — только как фолбэк без сети.
// 2) Раньше новый SW сразу вызывал self.skipWaiting() и подменял собой
//    активную вкладку без спроса — страница при этом продолжала работать
//    со старым JS в памяти до случайной перезагрузки, а обновление
//    происходило "рывком" в середине работы с сайтом. Теперь новая
//    версия ждёт в состоянии waiting, а index.js показывает пользователю
//    ненавязчивый тост "Доступно обновление" и активирует новую версию
//    только по явному клику (см. showUpdateAvailable в index.js).
const CACHE_VERSION = 'v3';
const CACHE_NAME = `kitsunewatch-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `kitsunewatch-dynamic-${CACHE_VERSION}`;
const API_CACHE = `kitsunewatch-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/assets/styles/index.min.css',
    '/assets/scripts/index.min.js',
    '/assets/scripts/theme-manager.min.js',
    '/site.webmanifest'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map(url => cache.add(url))
            );
        })
        // Специально НЕ вызываем self.skipWaiting() здесь — см. комментарий
        // в шапке файла. Активация нового SW происходит только по команде
        // SKIP_WAITING от страницы (обработчик 'message' ниже).
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names.map(name => {
                    if (name !== CACHE_NAME && name !== DYNAMIC_CACHE && name !== API_CACHE) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (['chrome-extension:', 'chrome:', 'moz-extension:', 'safari-extension:'].includes(url.protocol)) {
        return;
    }

    if (request.method !== 'GET') return;

    // Свои serverless-прокси /api/search, /api/years, /api/top заменили
    // прямые обращения к kodik-api.com с клиента — тот же network-first
    // с офлайн-фолбэком из кэша, что раньше применялся к kodik-api.com
    if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    if (url.hostname.includes('kodikplayer.com')) {
        event.respondWith(fetch(request));
        return;
    }

    // HTML-навигация — всегда network-first (см. комментарий в шапке файла)
    if (request.mode === 'navigate' || request.headers.get('Accept')?.includes('text/html')) {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    // Собственные CSS/JS (и переносимые модули achievements/cookie-widget) —
    // stale-while-revalidate: мгновенный ответ из кэша + фоновое
    // обновление, так что правки доходят до пользователя уже на
    // следующей загрузке, а не "никогда"
    if (url.origin === self.location.origin &&
        (url.pathname.startsWith('/assets/') ||
         url.pathname.startsWith('/achievements/') ||
         url.pathname.startsWith('/cookie-widget/') ||
         url.pathname === '/site.webmanifest')) {
        event.respondWith(handleStaleWhileRevalidate(request));
        return;
    }

    event.respondWith(handleStaticRequest(request));
});

async function handleApiRequest(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(API_CACHE);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;

        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleNavigationRequest(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Сети нет — отдаём то, что успели закэшировать (сам URL или
        // общий index.html как последний фолбэк для SPA-навигации)
        const cache = await caches.open(CACHE_NAME);
        const cached = (await cache.match(request)) || (await cache.match('/index.html'));
        if (cached) return cached;
        return new Response('', { status: 503 });
    }
}

async function handleStaleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const networkFetch = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => null);

    return cached || (await networkFetch) || new Response('', { status: 503 });
}

async function handleStaticRequest(request) {
    const url = new URL(request.url);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return fetch(request).catch(() => new Response('', { status: 503 }));
    }

    try {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        if (request.headers.get('Accept')?.includes('text/html')) {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('/index.html');
        }
        return new Response('', { status: 503 });
    }
}

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data?.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
        );
    }
});
