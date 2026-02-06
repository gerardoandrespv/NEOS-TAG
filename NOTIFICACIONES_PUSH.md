# Sistema de Notificaciones Push - NeosTech RFID Pro v2.5.0

## 🚨 Características Implementadas

### ✅ Diseño Mejorado de Alertas
- **Cards modernas** con bordes de color según tipo
- **Animación pulse** en alertas activas
- **Iconos grandes** con fondo degradado
- **Estadísticas visuales** con indicadores en tiempo real
- **Botón principal** con sombra y efecto hover

### 📱 Sistema de Notificaciones Push

#### **Funcionalidades:**
1. **Notificaciones en tiempo real** a todos los dispositivos móviles
2. **Notificaciones en segundo plano** (app cerrada/minimizada)
3. **Notificaciones en primer plano** (app abierta) con banner in-app
4. **Sonido de alerta** personalizado
5. **Vibración** diferenciada por severidad
6. **Botones de acción**:
   - ✓ Confirmar Recepción
   - 👁 Ver Detalles
7. **PWA instalable** en móviles (Add to Home Screen)

## 📋 Pasos para Activar las Notificaciones Push

### 1️⃣ Generar VAPID Key en Firebase

1. Ir a **Firebase Console**: https://console.firebase.google.com/project/neos-tech
2. Click en ⚙️ **Project Settings**
3. Ir a la pestaña **Cloud Messaging**
4. En **Web Push certificates**, click en **Generate key pair**
5. Copiar la **Key pair** generada

### 2️⃣ Actualizar el Código

Abrir `index.html` y buscar la línea (aprox. línea 11993):

```javascript
vapidKey: 'YOUR_VAPID_KEY_HERE' // Reemplazar con la key generada
```

Reemplazar con:
```javascript
vapidKey: 'TU_VAPID_KEY_COPIADA_DE_FIREBASE'
```

### 3️⃣ Configurar Cloud Function para Envío

Crear función en Firebase Functions:

```javascript
const admin = require('firebase-admin');
const functions = require('firebase-functions');

exports.sendAlertNotification = functions.https.onCall(async (data, context) => {
    const { alertId, title, message, severity } = data;
    
    // Obtener tokens FCM de todos los usuarios
    const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('notifications_enabled', '==', true)
        .get();
    
    const tokens = usersSnapshot.docs
        .map(doc => doc.data().fcm_token)
        .filter(token => token);
    
    // Configurar mensaje
    const payload = {
        notification: {
            title: title || 'Alerta de Emergencia',
            body: message,
            icon: '/assets/images/neostechc.png',
            badge: '/assets/images/neostechc.png',
            tag: 'emergency-alert',
            requireInteraction: true
        },
        data: {
            alertId: alertId,
            severity: severity,
            url: '/?tab=alerts',
            timestamp: Date.now().toString()
        }
    };
    
    // Enviar notificación
    const response = await admin.messaging().sendToDevice(tokens, payload, {
        priority: 'high',
        timeToLive: 3600
    });
    
    return { 
        success: true, 
        sent: response.successCount,
        failed: response.failureCount 
    };
});
```

### 4️⃣ Habilitar Service Worker

El archivo `firebase-messaging-sw.js` ya está creado en `/src/web/`.

**Verificar que se carga correctamente:**
1. Abrir DevTools (F12)
2. Ir a Application → Service Workers
3. Debe aparecer: `firebase-messaging-sw.js` (activated and running)

### 5️⃣ Probar en Móvil

#### **Android (Chrome/Edge):**
1. Abrir https://neos-tech.web.app
2. Click en menú (⋮) → **Add to Home screen**
3. Aceptar permisos de notificaciones
4. Probar emitiendo una alerta desde el dashboard

#### **iOS (Safari):**
1. Abrir https://neos-tech.web.app
2. Click en botón "Compartir" (□↑)
3. **Add to Home Screen**
4. Aceptar permisos (iOS 16.4+)

## 🎨 Cambios de Diseño

### Antes:
- Cards con gradientes de colores
- Fondo blanco/naranja
- Botones con colores hardcoded

### Ahora:
- Cards con bordes de color izquierdo
- Fondo oscuro consistente con sistema
- Iconos flotantes translúcidos
- Animación pulse en alertas activas
- Estadísticas con metadata descriptiva

## 🔧 Archivos Modificados

```
src/web/
├── index.html (v2.5.0)
│   ├── Firebase Messaging SDK agregado
│   ├── Función initPushNotifications()
│   ├── showInAppNotification()
│   ├── Animaciones slideIn/slideOut
│   └── Nuevo diseño de stats cards
├── firebase-messaging-sw.js (NUEVO)
│   ├── Background message handler
│   ├── Notification click handler
│   └── Custom notification options
└── manifest.json (NUEVO)
    ├── PWA configuration
    ├── Icons & theme
    └── Shortcuts
```

## 📊 Flujo de Notificaciones

```
[Admin emite alerta]
        ↓
[Cloud Function: emit_alert]
        ↓
[Firebase Cloud Messaging]
        ↓
    ┌───┴───┐
    ↓       ↓
[App abierta]  [App cerrada]
    ↓              ↓
[In-app banner] [System notification]
    ↓              ↓
[Confirmar] → [Guardar en Firestore]
```

## 🎯 Próximos Pasos

- [ ] Generar VAPID key en Firebase Console
- [ ] Actualizar `vapidKey` en index.html
- [ ] Crear Cloud Function `sendAlertNotification`
- [ ] Probar en dispositivo móvil
- [ ] Configurar sonidos personalizados por severidad
- [ ] Implementar historial de notificaciones
- [ ] Agregar estadísticas de entrega

## 🐛 Troubleshooting

**Notificaciones no llegan:**
- Verificar que el Service Worker esté activo
- Revisar permisos del navegador
- Confirmar que FCM token se guardó en Firestore
- Verificar Cloud Function logs

**Error "messaging/permission-blocked":**
- Usuario bloqueó notificaciones manualmente
- Ir a Settings → Notifications → Permitir

**Service Worker no se activa:**
- Verificar que `firebase-messaging-sw.js` esté en raíz web
- Limpiar cache y recargar (Ctrl+Shift+R)

---

**Versión:** 2.5.0  
**Fecha:** 03/02/2026  
**Autor:** GitHub Copilot  
