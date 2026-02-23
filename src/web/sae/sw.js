// sw.js — Service Worker SAE (neostech — Sistema de Alertas de Emergencia)
// Scope: /sae/ — maneja caché + Firebase Messaging background push para residentes.

// ─── Firebase Messaging (background push) ──────────────────────────────────
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey:            'AIzaSyBZ-XRSRgC2gz9E6zdYpes7yv5nLZtKmSw',
    projectId:         'neos-tech',
    messagingSenderId: '738411977369',
    appId:             '1:738411977369:web:7facc71cea4c271d217608',
  });
}

const messaging = firebase.messaging();

// Con webpush.notification en el backend, Firebase Messaging muestra la
// notificación automáticamente vía protocolo Web Push nativo.
// onBackgroundMessage NO se registra — evita duplicados y depende de menos
// pasos JS en background. notificationclick sigue funcionando igual.

// Al hacer click en la notificación → abrir/enfocar la app SAE
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(cls) {
      for (const c of cls) {
        if (c.url.includes('/sae')) { c.focus(); return; }
      }
      // La página SAE lee clientId desde localStorage al abrir sin ?c=
      return clients.openWindow('/sae');
    })
  );
});

// ─── Caché offline ──────────────────────────────────────────────────────────
const CACHE    = 'neostech-sae-v6';
const PRECACHE = ['/sae/', '/sae/index.html', '/assets/images/neostechb.png'];

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

// Network-first para navegaciones HTML solamente.
// mode === 'navigate' filtra requests XHR/fetch de JS (Firestore, FCM, etc.)
// que NUNCA deben pasar por el SW — causan NS_BINDING_ABORTED en streaming.
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
