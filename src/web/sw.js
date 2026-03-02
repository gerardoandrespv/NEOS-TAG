// sw.js — Service Worker mínimo para instalabilidad PWA (neostech dashboard)
// Estrategia: network-first con fallback a caché para operación offline básica.
const CACHE = 'neostech-dash-v6';
const PRECACHE = [
  '/dashboard-v3.html',
  '/css/dashboard-v3.css?v=20260225',
  '/js/dashboard-v3.js?v=20260225e',
  '/firebase-config.js',
  '/assets/images/neostechb.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
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
