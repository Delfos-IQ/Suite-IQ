// IQ Suite — Service Worker v3 — silent auto-update
const CACHE_NAME = 'iq-suite-v3';

const PRECACHE = [
  '/',
  '/index.html',
  '/tickers.json',
  '/axios/index.html',
  '/axios/css/tokens.css',
  '/axios/css/base.css',
  '/axios/css/mobile.css',
  '/axios/js/data.js',
  '/axios/js/core.js',
  '/axios/js/autofill.js',
  '/axios/js/analyzer.js',
  '/axios/js/ai.js',
  '/axios/js/scorecard.js',
  '/axios/js/screener.js',
  '/axios/js/comparador.js',
  '/axios/js/ui.js',
  '/axios/js/about.js',
  '/axios/js/app.js',
  '/harvest/index.html',
  '/delfos/index.html',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(PRECACHE); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      // Notify all clients of update
      return self.clients.matchAll({ includeUncontrolled: true });
    }).then(function(clients) {
      clients.forEach(function(c) {
        c.postMessage({ type: 'SW_UPDATED', version: '3.2.0' });
      });
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Network-first for API/worker calls
  if (e.request.url.includes('workers.dev') ||
      e.request.url.includes('fonts.googleapis') ||
      e.request.url.includes('fonts.gstatic')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var network = fetch(e.request).then(function(res) {
        if (res && res.status === 200 && e.request.method === 'GET') {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      });
      return cached || network;
    })
  );
});
