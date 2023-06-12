const version = '1.0.2';
const cacheName = `filelove-${version}`;

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(
        [
          '/index.html',
          '/assets/css/style.css',
          '/assets/js/webtorrent.min.js',
          '/assets/js/prettier-bytes.min.js',
          '/assets/js/upload-element.min.js',
          '/assets/js/app.js'
        ]
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== "POST") {
    event.respondWith(
      caches.open(cacheName).then(function(cache) {
        return fetch(event.request).then(function(response) {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    );
  }
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          // Return true if you want to remove this cache,
          // but remember that caches are shared across
          // the whole origin
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

