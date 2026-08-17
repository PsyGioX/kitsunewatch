const CACHE_NAME = 'kitsunewatch-v1';
const DYNAMIC_CACHE = 'kitsunewatch-dynamic-v1';
const API_CACHE = 'kitsunewatch-api-v1';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/assets/styles/index.css',
    '/assets/scripts/index.js',
    '/site.webmanifest'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map(url => cache.add(url))
            );
        }).then(() => self.skipWaiting())
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
    
    if (url.pathname === '/api/config') {
        event.respondWith(fetch(request));
        return;
    }
    
    if (url.hostname.includes('kodik-api.com')) {
        event.respondWith(handleApiRequest(request));
        return;
    }
    
    if (url.hostname.includes('kodikplayer.com')) {
        event.respondWith(fetch(request));
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