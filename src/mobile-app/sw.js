const CACHE_NAME = 'neotech-alerts-v2';
const urlsToCache = [
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './sounds/emergency_alarm_fire.wav',
    './sounds/emergency_alarm_evacuation.wav',
    './sounds/emergency_alarm_flood.wav',
    './sounds/emergency_alarm_general.wav',
    './sounds/emergency_alarm_cancel.wav'
];

// Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Push Notifications
self.addEventListener('push', event => {
  console.log('Push recibido:', event);
  
  let data = {
    title: '🚨 Alerta de Emergencia',
    body: 'Nueva alerta del edificio',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [500, 200, 500, 200, 500],
    requireInteraction: true,
    tag: 'emergency-alert'
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      requireInteraction: data.requireInteraction,
      tag: data.tag,
      data: {
        url: '/index.html'
      }
    })
  );
});

// Notification Click
self.addEventListener('notificationclick', event => {
  console.log('Notificación clickeada:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/index.html')
  );
});
