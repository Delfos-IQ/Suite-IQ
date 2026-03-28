/**
 * IQ Suite — Service Worker v1.2
 * Strategy: activate-on-deploy
 *   - Cache-first for all assets (fast loads)
 *   - Background revalidation on every fetch
 *   - NEW: on SW upgrade (new CACHE_NAME detected), immediately re-fetch
 *     all assets and notify all open tabs → they reload on next navigation
 *   - No banner, no interruption — seamless update
 */

const CACHE_NAME = 'iq-suite-v3';

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

// ── INSTALL — pre-cache everything, activate immediately ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'no-store' })))
          .catch(err => console.warn('[SW] Pre-cache partial fail:', err))
      )
      .then(() => self.skipWaiting())  // Don't wait for old SW to die
  );
});

// ── ACTIVATE — delete old caches, claim clients, notify if upgrade ───────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const oldKeys = keys.filter(k => k !== CACHE_NAME);
    const isUpgrade = oldKeys.length > 0;

    // Delete old caches
    await Promise.all(oldKeys.map(k => caches.delete(k)));

    // Take control of all open tabs immediately
    await self.clients.claim();

    if (isUpgrade) {
      // This is a real deploy — re-fetch all assets fresh and tell tabs to reload
      console.log('[SW] Upgrade detected: old caches deleted. Refreshing assets...');
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        PRECACHE.map(url =>
          fetch(new Request(url, { cache: 'no-store' }))
            .then(r => { if (r && r.ok) cache.put(url, r); })
            .catch(() => {})
        )
      );

      // Read new version from freshly fetched version.json
      let newVersion = CACHE_NAME;
      try {
        const vRes = await cache.match('/version.json');
        if (vRes) {
          const vData = await vRes.json();
          if (vData.suite) newVersion = vData.suite;
        }
      } catch(e) {}

      // Notify all open tabs → client-side handler reloads the page
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client =>
        client.postMessage({ type: 'SW_UPDATED', version: newVersion })
      );
      console.log('[SW] Notified', clients.length, 'tab(s) to reload. Version:', newVersion);
    }
  })());
});

// ── FETCH — cache-first + background revalidation ───────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  // Never cache external APIs
  if (req.url.includes('workers.dev')    ||
      req.url.includes('yahoo.com')      ||
      req.url.includes('groq.com')       ||
      req.url.includes('openai.com')     ||
      req.url.includes('fred.stlouisfed.org') ||
      req.url.includes('fonts.googleapis.com') ||
      req.url.includes('cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(req);

      // Revalidate in background regardless
      const networkFetch = fetch(req.clone())
        .then(response => {
          if (response && response.ok && response.status < 400) {
            cache.put(req, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // Serve cached immediately if available
      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }
      return networkFetch;
    })
  );
});

// ── MESSAGE HANDLER ──────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
