self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('my-cache').then(cache => {
            return cache.addAll([
                '/pwa-app/',
                '/pwa-app/index.html',
                '/pwa-app/assets/css/style.css',
                '/pwa-app/assets/js/script.js',
                '/pwa-app/assets/js/indexedDb.js',
                '/pwa-app/assets/js/nodeDb.js',
                '/pwa-app/assets/js/colorDb.js',
                '/pwa-app/config/manifest.json'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
