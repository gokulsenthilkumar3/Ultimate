// Vite replaces this marker with a digest of the emitted build. Never cache personal data or HTML.
const CACHE = 'growthtrack-static-__BUILD_VERSION__';
const scope = new URL(self.registration.scope);
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name !== CACHE && (name.startsWith('growthtrack-static-') || name === 'growthtrack-shell-v1')) await caches.delete(name);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const assetRoot = new URL('assets/', scope).pathname;
  // A strict allowlist avoids intercepting authentication, APIs, cross-origin services,
  // documents, navigations, uploads, and large immersive assets. No offline submit queue exists.
  if (request.method !== 'GET' || url.origin !== scope.origin || request.mode === 'navigate' || request.headers.has('authorization') || !url.pathname.startsWith(assetRoot) || !/\/[^/]+-[\w-]{6,}\.(?:js|css|woff2?)$/.test(url.pathname) || url.search) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      try { await cache.put(request, response.clone()); } catch { /* storage failure must not fail a network response */ }
    }
    return response;
  })());
});
