# Firebase Cloud Messaging - Configuración

## Paso 1: Crear proyecto Firebase

1. Ve a https://console.firebase.google.com/
2. Click "Agregar proyecto"
3. Nombre: "NeosTech-Alertas"
4. Desactiva Google Analytics (opcional)
5. Click "Crear proyecto"

## Paso 2: Configurar Cloud Messaging

1. En el panel de Firebase, ve a "Project Settings" (⚙️)
2. Pestaña "Cloud Messaging"
3. Copia la "Server Key" (necesaria para el backend)
4. Habilita "Firebase Cloud Messaging API (V1)"

## Paso 3: Obtener credenciales Web

1. En "Project Settings" → "General"
2. Scroll hasta "Tus aplicaciones"
3. Click en el ícono web (</>)
4. Nombre: "Alertas Web"
5. NO marcar "Configurar Firebase Hosting"
6. Click "Registrar app"
7. Copiar la configuración:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "neotech-alertas.firebaseapp.com",
  projectId: "neotech-alertas",
  storageBucket: "neotech-alertas.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxx"
};
```

## Paso 4: Obtener VAPID Key

1. En "Project Settings" → "Cloud Messaging"
2. Scroll a "Web Push certificates"
3. Click "Generate key pair"
4. Copiar el "Key pair" generado

---

## Variables de entorno necesarias:

```
FIREBASE_SERVER_KEY=TU_SERVER_KEY_AQUI
FIREBASE_API_KEY=TU_API_KEY
FIREBASE_PROJECT_ID=neotech-alertas
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:xxxxx
FIREBASE_VAPID_KEY=TU_VAPID_KEY
```

---

**IMPORTANTE:** Guarda todas estas claves de forma segura.
**NO las subas a GitHub sin cifrar.**

