/* Phase 1+2+3+4.1 service worker – cache static assets for offline use */
const CACHE = 'edu-video-factory-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/styles-anim.css',
  '/app.js',
  '/app-b0.js',
  '/app-b1.js',
  '/app-b2a.js',
  '/app-b2b.js',
  '/app-b3a.js',
  '/app-b3b.js',
  '/ai-providers.js',
  '/pdf-extract.js',
  '/lesson-engine.js',
  '/animation-engine.js',
  '/video-export.js',
  '/ae-b0.js',
  '/ae-b1.js',
  '/ae-b2.js',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
