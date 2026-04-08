// IQ Suite Service Worker — v3.1
// Axios v3.1 · Harvest v1.3 · Sophia v1.0

const VERSION    = '3.1';
const CACHE_NAME = 'iq-suite-v3.1';

const PRECACHE_URLS = [
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
  '/sophia/index.html',
];

// Install: cache all precache URLs
self.addEventListener('install', function(evt) {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS.map(function(url) {
        return new Request(url, { cache: 'reload' });
      })).catch(function() { /* ignore individual failures */ });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: delete old caches
self.addEventListener('activate', function(evt) {
  evt.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      self.clients.matchAll({ includeUncontrolled: true }).then(function(clients) {
        clients.forEach(function(c) {
          c.postMessage({ type: 'SW_UPDATED', version: VERSION });
        });
      });
      return self.clients.claim();
    })
  );
});

// Fetch: network-first for JSON, cache-first for assets
self.addEventListener('fetch', function(evt) {
  if (evt.request.method !== 'GET') return;
  var url = evt.request.url;
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic') || url.includes('cdnjs')) return;

  var isJSON = url.endsWith('.json');
  
  evt.respondWith(
    isJSON
      ? fetch(evt.request).then(function(res) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(evt.request, clone); });
          return res;
        }).catch(function() {
          return caches.match(evt.request);
        })
      : caches.match(evt.request).then(function(cached) {
          return cached || fetch(evt.request).then(function(res) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(evt.request, clone); });
            return res;
          });
        })
  );
});

// Listen for SKIP_WAITING message
self.addEventListener('message', function(evt) {
  if (evt.data && evt.data.type === 'SKIP_WAITING') self.skipWaiting();
});
