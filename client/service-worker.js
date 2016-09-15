'use strict';
// Derived from
// https://github.com/progers/base64/blob/master/simple-offline-service-worker.js

// This cache always requests from the network to keep the cache fresh. There is a tradeoff here
// because it'll wait ages for a slow network despite having a cached response ready to go. If stale
// content is acceptable, use an 'eventually fresh' approach as described by Jake Archibald or
// Nicolás Bevacqua in https://ponyfoo.com/articles/progressive-networking-serviceworker

var kVersion = 'v1.0.0';
var kOfflineFiles = [ './' ];

self.addEventListener('install', function(event) {
  // Cache our list of files.
  event.waitUntil(
    caches.open(kVersion).then(function(cache) {
      return cache.addAll(kOfflineFiles).then(function() {
        return self.skipWaiting();
      });
    })
  );
});

// Remove any stale cache entries.
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        if (key !== kVersion)
          return caches.delete(key);
      }));
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    // FIXME: We should send off the fetch request and check the cache in parallel.
    fetch(event.request).then(function(networkReponse) {
      // Check if this request is already in our cache. We only want to cache previously
      // cached items to prevent the cache from getting polluted.
      return caches.open(kVersion).then(function(cache) {
        return cache.match(event.request).then(function(cachedResponse) {
        if (cachedResponse)
          cache.put(event.request, networkReponse.clone());
        return networkReponse;
        });
      });
    }).catch(function(networkError) {
      return caches.open(kVersion).then(function(cache) {
        return cache.match(event.request).then(function(cachedResponse) {
          return cachedResponse || networkError;
        });
      });
    })
  );
});
