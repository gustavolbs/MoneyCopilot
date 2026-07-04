/* global self, caches, URL, fetch, Response */

const CACHE_VERSION = 'moneycopilot-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const APP_SHELL = [
  '/',
  '/transacoes',
  '/cofrinhos',
  '/orcamentos',
  '/insights',
  '/ajustes',
  '/copilot',
  '/entrar',
  '/manifest.webmanifest',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypass(request) {
  const url = new URL(request.url);
  return (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('openai.com')
  );
}

async function networkFirst(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match('/'));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) void cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? (await fresh) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (shouldBypass(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  const destination = request.destination;
  if (['style', 'script', 'font', 'image', 'manifest'].includes(destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) client.postMessage({ type: 'MONEYCOPILOT_SYNC' });
}

self.addEventListener('sync', (event) => {
  if (event.tag !== 'moneycopilot-sync') return;
  event.waitUntil(notifyClientsToSync());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'MONEYCOPILOT_SKIP_WAITING') self.skipWaiting();
});
