// Firebase Configuration for Web Push
// Configuración correcta para API V1

const firebaseConfig = {
  apiKey: "AIzaSyBZ-XRSRgC2gz9E6zdYpes7yv5nLZtKmSw",
  authDomain: "neos-tech.firebaseapp.com",
  projectId: "neos-tech",
  storageBucket: "neos-tech.appspot.com",
  messagingSenderId: "738411977369",
  appId: "1:738411977369:web:7facc71cea4c271d217608"
};

const vapidKey = "BBNPz5TTMqfFZSSRBAaYq43gW5uIW8wMhtYpK9loHna1m_ntxXNjjbDVUR0Y5q8jCao_5AcdfDPf1wvvEZ1MYTU";

// Inicializar Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Auto-suscripción al topic all-devices
messaging.getToken({ vapidKey: vapidKey })
  .then((currentToken) => {
    if (currentToken) {
      console.log('✅ FCM Token:', currentToken);
      localStorage.setItem('fcm_token', currentToken);
      
      // Suscribirse al topic global
      fetch(`https://iid.googleapis.com/iid/v1/${currentToken}/rel/topics/all-devices`, {
        method: 'POST',
        headers: { 'Authorization': 'key=BBNPz5TTMqfFZSSRBAaYq43gW5uIW8wMhtYpK9loHna1m_ntxXNjjbDVUR0Y5q8jCao_5AcdfDPf1wvvEZ1MYTU' }
      }).then(() => console.log('✅ Suscrito a all-devices'));
    }
  });

// Manejo de mensajes en foreground
messaging.onMessage((payload) => {
  console.log('📨 Push recibido:', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    vibrate: [500, 200, 500, 200, 500],
    requireInteraction: true,
    tag: 'emergency'
  });
});

export { firebaseConfig, vapidKey };
