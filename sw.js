/* Phase 1–4.1 service worker – offline cache */
const CACHE = 'edu-video-factory-v7';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/styles-anim.css',
  '/app.js',
  '/app-b0.js',
  '/app-b1.js',
  '/app-b2.js',
  '/app-b3.js',
  '/ai-providers.js',
  '/pdf-extract.js',
  '/lesson-engine.js',
  '/animation-engine.js',
  '/ae-b0.js',
  '/ae-b1.js',
  '/ae-b2.js',
  '/video-export.js',
  '/narration.js',
  '/na-b3.js',
  '/na-b2.js',
  '/na-b1.js',
  '/na-b0.js',
  '/ve-b0.js',
  '/ve-b1.js',
  '/ve-b2.js',
  '/ve-b3.js',
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
