const CACHE_NAME = 'math-gravity-v31';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './game.js',
    './icon.svg',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js'
];

self.addEventListener('install', (event) => {
    // Instala inmediatamente el service worker y almacena los archivos en la boveda interna
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(ASSETS_TO_CACHE))
        .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Estrategia Network-First con Fallback a Cache (Ideal para modo avión en iPad)
    event.respondWith(
        fetch(event.request)
        .then(response => {
            // Actualizar caché sobre la marcha
            let responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
            });
            return response;
        }).catch(() => {
            // Si la red falla (No interet), usa la copia local
            return caches.match(event.request);
        })
    );
});
