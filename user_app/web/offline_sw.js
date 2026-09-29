// Lets the web app open without internet. Network first (so updates are picked up
// immediately); the last saved copy is used only when the network fails.
// Only this site's own files are cached. API data is cached by the app itself.
const CACHE = 'rr-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Never cache the APK download or anything cross-origin (the API server).
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('.apk')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: url.pathname.endsWith('config.json') })
        || (req.mode === 'navigate' ? await cache.match('./') || await cache.match('index.html') : undefined);
      if (hit) return hit;
      throw err;
    }
  })());
});
