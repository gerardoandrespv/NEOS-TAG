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

// Mostrar notificación cuando la app está en segundo plano
// El mensaje es data-only (sin notification field) → onBackgroundMessage se llama
// una sola vez → exactamente una notificación con sonido.
messaging.onBackgroundMessage(function(payload) {
  const d     = payload.data || {};
  const title = d.title || payload.notification?.title || '🚨 Alerta de Emergencia';
  const body  = d.body  || payload.notification?.body  || '';
  const options = {
    body,
    icon:    '/assets/images/neostechb.png',
    badge:   '/assets/images/neostechb.png',
    vibrate: [400, 100, 400],
    tag:     'sae-alert',
    renotify: true,
    silent:  false,
    data:    d,
  };
  return self.registration.showNotification(title, options);
});

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
const CACHE    = 'neostech-sae-v5';
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
