/**
 * IQ Suite — Service Worker v1.1
 * Silent auto-update strategy:
 *   - Cache-first for all assets (fast loads)
 *   - On every fetch: revalidate in background
 *   - When new version detected: skipWaiting + clients.claim
 *   - No banner, no interruption — next page load = new version
 */

const CACHE_NAME = 'iq-suite-v3';
const VERSION_URL = '/version.json';

// Assets to pre-cache on install
const PRECACHE = [
  '/',
  '/index.html',
  '/tickers.json',
  '/axios/index.html',
  '/axios/academia.json',
  '/axios/courses.json',
  '/harvest/index.html',
  '/delfos/index.html',
  '/delfos/course.json',
  '/delfos/seasonal.json',
  '/delfos/js/config.js',
  '/delfos/js/engine.js',
  '/delfos/js/fetch.js',
  '/delfos/js/ai.js',
  '/delfos/js/oracle-ui.js',
  '/delfos/js/course-ui.js',
  '/delfos/js/app.js',
  '/version.json',
];

// ── INSTALL — pre-cache all assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'no-store' })))
        .catch(err => console.warn('[SW] Pre-cache partial fail:', err))
    ).then(() => self.skipWaiting())  // Activate immediately
  );
});

// ── ACTIVATE — delete old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // Take control of all tabs immediately
  );
});

// ── FETCH — cache-first + background revalidation ───────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET requests on our origin
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  // Skip external APIs and CDNs — never cache these
  if (req.url.includes('workers.dev') ||
      req.url.includes('yahoo.com') ||
      req.url.includes('groq.com') ||
      req.url.includes('openai.com') ||
      req.url.includes('fred.stlouisfed.org') ||
      req.url.includes('fonts.googleapis.com') ||
      req.url.includes('cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(req);

      // Fetch from network in background to revalidate
      const networkFetch = fetch(req.clone())
        .then(async response => {
          if (response && response.ok && response.status < 400) {
            cache.put(req, response.clone());

            // If this was version.json, check if we need to update
            if (req.url.includes('version.json')) {
              await checkVersion(response.clone());
            }
          }
          return response;
        })
        .catch(() => null);

      // Return cached immediately if available, else wait for network
      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }
      return networkFetch;
    })
  );
});

// ── VERSION CHECK — silent auto-update ──────────────────────────────────────
let _currentVersion = null;

async function checkVersion(response) {
  try {
    const data = await response.json();
    const incoming = data.suite;
    if (!incoming) return;

    if (_currentVersion === null) {
      _currentVersion = incoming;
      return;
    }

    if (_currentVersion !== incoming) {
      console.log(`[SW] New version: ${_currentVersion} → ${incoming}`);
      _currentVersion = incoming;

      // Re-fetch all assets silently
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        PRECACHE.map(url =>
          fetch(new Request(url, { cache: 'no-store' }))
            .then(r => { if (r && r.ok) cache.put(url, r); })
            .catch(() => {})
        )
      );

      // Notify all open tabs → they reload on next navigation
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED', version: incoming });
      });
    }
  } catch (e) {
    // Ignore parse errors
  }
}

// ── MESSAGE HANDLER — manual update trigger ──────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: _currentVersion });
  }
});
