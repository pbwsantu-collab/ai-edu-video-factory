/* Phase 4 service worker – offline cache (v8) */
const CACHE = 'edu-video-factory-v8';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/styles-anim.css',
  '/styles-pres.css',
  '/app.js',
  '/app-b0.js',
  '/app-b1.js',
  '/app-b2.js',
  '/app-b3.js',
  '/ai-providers.js',
  '/pdf-extract.js',
  '/lesson-engine.js',
  '/animation-engine.js',
  '/ae-src-a0.js',
  '/ae-src-a1.js',
  '/ae-src-b0.js',
  '/ae-src-b1.js',
  '/video-export.js',
  '/ve-src-a0.js',
  '/ve-src-a1.js',
  '/ve-src-a2.js',
  '/ve-src-b0.js',
  '/ve-src-b1.js',
  '/ve-src-b2.js',
  '/narration.js',
  '/na-b0.js',
  '/na-b1.js',
  '/na-b2.js',
  '/na-b3.js',
  '/presentation.js',
  '/pr-src-a0.js',
  '/pr-src-a1.js',
  '/pr-src-a2.js',
  '/pr-src-b0.js',
  '/pr-src-b1.js',
  '/pr-src-b2.js',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // Cache individually so one missing file does not fail the whole install
      await Promise.allSettled(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] skip', url, err.message))
        )
      );
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
