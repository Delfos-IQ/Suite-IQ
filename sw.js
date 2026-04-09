// IQ Suite — Service Worker v3 — smart update strategy
const CACHE_NAME = 'iq-suite-v3';

const PRECACHE = [
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
];

// Nunca cachear — siempre van a red
const NEVER_CACHE = ['version.json', 'sw.js'];

// Red primero — JS y CSS siempre frescos si hay conexión
const NETWORK_FIRST = ['.js', '.css'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Carga individual — un 404 no rompe todo el install
      var promises = PRECACHE.map(function(url) {
        return cache.add(url).catch(function(err) {
          console.warn('[SW] No se pudo cachear:', url, err);
        });
      });
      return Promise.all(promises);
    }).then(function() {
      return self.skipWaiting();
    })
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
  var url = e.request.url;

  // APIs externas y fuentes — sin interceptar
  if (url.includes('workers.dev') ||
      url.includes('fonts.googleapis') ||
      url.includes('fonts.gstatic')) {
    return;
  }

  // NEVER_CACHE — siempre red
  if (NEVER_CACHE.some(function(p) { return url.includes(p); })) {
    e.respondWith(fetch(e.request));
    return;
  }

  // JS y CSS — network-first, caché como fallback
  if (NETWORK_FIRST.some(function(ext) { return url.includes(ext); })) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Todo lo demás — cache-first
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
