// Firebase Cloud Messaging Service Worker
// NeosTech RFID System Pro - Push Notifications

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Firebase config
firebase.initializeApp({
    apiKey: "AIzaSyBZ-XRSRgC2gz9E6zdYpes7yv5nLZtKmSw",
    authDomain: "neos-tech.firebaseapp.com",
    projectId: "neos-tech",
    storageBucket: "neos-tech.firebasestorage.app",
    messagingSenderId: "738411977369",
    appId: "1:738411977369:web:7facc71cea4c271d217608",
    measurementId: "G-DL4X5MX5JL"
});

const messaging = firebase.messaging();

// Get sound file based on alert type
function getAlertSound(alertType) {
    const soundMap = {
        'fire': '/sounds/emergency_alarm_fire.wav',
        'flood': '/sounds/emergency_alarm_flood.wav',
        'evacuation': '/sounds/emergency_alarm_evacuation.wav',
        'cancel': '/sounds/emergency_alarm_cancel.wav',
        'general': '/sounds/emergency_alarm_general.wav'
    };
    return soundMap[alertType] || '/sounds/emergency_alarm_general.wav';
}

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] ✅ BACKGROUND MESSAGE RECEIVED!', payload);
    console.log('[firebase-messaging-sw.js] Payload data:', payload.data);
    console.log('[firebase-messaging-sw.js] Payload notification:', payload.notification);

    const alertType = payload.data?.alert_type || 'general';
    const soundUrl = getAlertSound(alertType);
    const severity = payload.data?.severity || 'critical';
    const alertId = payload.data?.alertId || 'unknown';
    const title = payload.data?.title || payload.notification?.title || 'Alerta de Emergencia';
    const message = payload.data?.body || payload.notification?.body || 'Nueva alerta del sistema';
    
    // Build mobile-alerts URL (redirect to mobile app)
    const alertUrl = `/mobile-alerts.html`;
    
    // Try to play sound (may not work in all browsers for service workers)
    try {
        const audio = new Audio(soundUrl);
        audio.volume = 1.0;
        audio.play().catch(err => console.log('[SW] Sound play failed:', err));
    } catch (err) {
        console.log('[SW] Audio not supported in service worker');
    }
    
    const notificationTitle = title;
    const notificationOptions = {
        body: message,
        icon: '/assets/images/neostechc.png',
        badge: '/assets/images/neostechc.png',
        tag: 'emergency-alert-' + alertId,
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500],
        silent: false,
        renotify: true,
        data: {
            url: alertUrl,
            alertId: alertId,
            severity: severity,
            alertType: alertType,
            title: title,
            message: message,
            timestamp: Date.now()
        },
        actions: [
            {
                action: 'confirm',
                title: '✓ Confirmar Recepción',
                icon: '/assets/images/check.png'
            },
            {
                action: 'view',
                title: '👁 Ver Detalles',
                icon: '/assets/images/view.png'
            }
        ]
    };

    // Customize notification based on severity
    if (payload.data?.severity === 'critical') {
        notificationOptions.badge = '🚨';
        notificationOptions.vibrate = [300, 100, 300, 100, 300, 100, 300];
        notificationOptions.silent = false;
    }

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click received.');
    
    event.notification.close();

    if (event.action === 'confirm') {
        // Send confirmation to server
        event.waitUntil(
            fetch('/api/alerts/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertId: event.notification.data.alertId,
                    timestamp: Date.now()
                })
            })
        );
    } else if (event.action === 'view' || !event.action) {
        // Open app to view alert with sound trigger
        const urlWithParams = event.notification.data.url + 
            '?alertId=' + event.notification.data.alertId + 
            '&alertType=' + event.notification.data.alertType;
            
        event.waitUntil(
            clients.openWindow(urlWithParams)
        );
    }
});

// Handle push event (for custom handling)
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received.', event);
    
    if (event.data) {
        const data = event.data.json();
        console.log('[Service Worker] Push data:', data);
    }
});
