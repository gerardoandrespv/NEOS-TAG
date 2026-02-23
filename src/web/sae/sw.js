// sw.js — Service Worker SAE (neostech — Sistema de Alertas de Emergencia)
// Scope: /sae/ — independiente del Service Worker del dashboard
// Estrategia: network-first con fallback a caché para operación offline básica.
const CACHE = 'neostech-sae-v1';
const PRECACHE = [
  '/sae/',
  '/sae/index.html',
  '/assets/images/neostechb.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: intenta red, cae a caché si sin conexión
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
