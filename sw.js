// Service Worker: オフライン対応 / PWA
const CACHE_NAME = 'coffee-quiz-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './docs.css',
  './questions.js',
  './affiliates.js',
  './game.js',
  './manifest.json',
  './about.html',
  './privacy.html',
  './terms.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 広告・解析系はキャッシュせずネットワーク優先
  const url = req.url;
  if (
    url.includes('googlesyndication') ||
    url.includes('googletagmanager') ||
    url.includes('google-analytics') ||
    url.includes('doubleclick')
  ) {
    return; // デフォルト挙動に任せる
  }

  // 同一オリジンのみキャッシュ戦略 (Stale-While-Revalidate)
  if (new URL(url).origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
