# ✅ GUÍA: Verificar Configuración de Firebase

## Paso 1: Abrir Firebase Console

1. Ve a: https://console.firebase.google.com/
2. Inicia sesión con tu cuenta de Google
3. Selecciona tu proyecto existente

---

## Paso 2: Verificar Cloud Messaging está Habilitado

1. En el panel izquierdo, busca "**Build**" o "**Compilación**"
2. Click en "**Cloud Messaging**"
3. Deberías ver:
   - ✅ "Firebase Cloud Messaging API (V1)" → **Habilitado**
   - Si dice "Deshabilitado", click en "Habilitar"

---

## Paso 3: Verificar Firestore está Activo

1. En el panel izquierdo, click "**Firestore Database**"
2. Si no existe, click "**Crear base de datos**"
3. Selecciona:
   - Modo: **Producción** (por ahora)
   - Ubicación: **us-central** o la más cercana
4. Click "Habilitar"

---

## Paso 4: Obtener Credenciales (Solo para verificar)

### A) Server Key (Backend)
1. Ve a: **⚙️ Project Settings** (arriba izquierda)
2. Pestaña: **Cloud Messaging**
3. Scroll hasta "**Cloud Messaging API (Legacy)**"
4. Copia la "**Server key**" (debería empezar con "AAAA...")

### B) Web App Config (Frontend)
1. En **Project Settings** → Pestaña **General**
2. Scroll hasta "**Your apps**" / "**Tus aplicaciones**"
3. Si NO hay una app web, click en el ícono **`</>`** para agregar
4. Nombre: "Alertas Web"
5. NO marcar "Firebase Hosting"
6. Click "**Registrar app**"
7. Aparecerá un código como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxx"
};
```

### C) VAPID Key (Web Push)
1. En **Project Settings** → **Cloud Messaging**
2. Scroll hasta "**Web Push certificates**"
3. Si no existe, click "**Generate key pair**"
4. Copia el "**Key pair**" (empieza con "B...")

---

## ✅ VERIFICACIÓN RÁPIDA:

¿Tienes acceso a estas 3 cosas en Firebase Console?

- [ ] Cloud Messaging habilitado
- [ ] Firestore Database creado
- [ ] Web App registrada con firebaseConfig

Si respondiste SÍ a las 3, **estás listo**! ✅

---

## 🚀 ALTERNATIVA MÁS SIMPLE (Sin Firebase):

Si prefieres algo más simple para pruebas, puedo crear:

1. **Sistema de Polling:** La app móvil consulta cada 5 segundos si hay alertas nuevas
   - ✅ No necesita Firebase Cloud Messaging
   - ✅ Funciona con tu servidor local
   - ❌ Consume más batería
   - ❌ No funciona con app cerrada

2. **WebSockets:** Conexión en tiempo real
   - ✅ Instantáneo
   - ✅ No necesita Firebase
   - ❌ Requiere servidor WebSocket corriendo 24/7
   - ❌ No funciona con app cerrada

**¿Prefieres usar Firebase (gratis y profesional) o prefieres una alternativa más simple para pruebas?**
