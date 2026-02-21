# NeosTech Pro – Frontend Refactor Checklist
## Rama: redesign/dashboard-pro

---

## PROPUESTA DE ARQUITECTURA FRONTEND

### Estructura de carpetas objetivo

```
src/web/
├── index.html                  ← Login / redirect guard
├── dashboard-pro-v2.html       ← App shell SPA (NEW - base limpia)
│
├── styles/                     ← Design system (no tocar)
│   ├── tokens.css              ✅ ya existe
│   └── button.css              ✅ ya existe
│
├── css/
│   ├── dashboard-pro-v2.css    ← CSS moderno del dashboard (NEW)
│   └── [eliminar legacy]
│
├── js/
│   ├── dashboard-pro-v2.js     ← App principal (NEW - separar capas)
│   ├── services/
│   │   ├── auth.service.js     ← Firebase Auth
│   │   ├── firestore.service.js← Queries Firestore (multitenancy)
│   │   └── push.service.js     ← FCM / notificaciones
│   └── ui/
│       ├── router.js           ← Hash router SPA
│       ├── sidebar.js          ← Sidebar collapse/mobile
│       ├── virtual-list.js     ← VirtualScroller class
│       ├── toast.js            ← Sistema de toasts
│       └── charts.js           ← Sparklines (SVG vanilla)
│
├── firebase-config.js          ✅ ya existe (mantener)
├── firebase-messaging-sw.js    ← Limpiar console.logs
├── manifest.json               ✅ ya existe
└── sounds/                     ✅ mantener
```

---

## REGLAS DE ARQUITECTURA DE COMPONENTES

### 1. Separación de capas (sin frameworks)

```
HTML  → Estructura semántica + accesibilidad
CSS   → Solo presentación (NO lógica de estado en CSS puro)
JS    → 3 capas:
        - Services: comunicación Firebase (sin DOM)
        - State: objeto _state centralizado
        - UI: renderizado + event listeners
```

### 2. Convenciones de IDs

```
- IDs de vistas:       viewOverview, viewLive, viewLogs…
- IDs de KPIs:         kpiReadings, kpiAllowed…
- IDs de tablas:       recentEventsBody, logsTableBody…
- IDs de controles:    liveSearchInput, logsDateFrom…
- IDs de estado:       statusFirestore, statusReader…
```

### 3. Data attributes como interfaz JS↔HTML

```html
data-view="overview"      ← navegación SPA
data-sidebar="expanded"   ← estado del sidebar
data-state="online"       ← estado de conectores
data-filter="all"         ← filtros activos
data-modal-close="id"     ← cerrar modales
```

### 4. Multitenancy – patrón obligatorio

```javascript
// services/auth.service.js
async function getClientId(user) {
  const token = await user.getIdTokenResult();
  return token.claims.clientId ?? null;
}

// services/firestore.service.js
function queryCollection(collectionName, clientId, constraints = []) {
  return db.collection(collectionName)
    .where('clientId', '==', clientId)
    .where(...constraints);
}
// Todas las queries DEBEN pasar por esta función.
```

---

## CHECKLIST DE REFACTOR

### FASE 1 – Limpieza de archivos legacy

- [ ] Mover a `/archive/` (no eliminar hasta validar):
  - `app.html.OBSOLETO`
  - `dashboard.html.OBSOLETO`
  - `index.backup.html`
  - `index-backup-20260208-023349.html`
  - `dashboard-clean.html`
  - `dashboard.js` (legacy)
  - `dashboard-modules.js` (si dashboard-pro-v2.js lo reemplaza)
- [ ] Eliminar archivos de utilidad de un solo uso:
  - `test-minimal.html`
  - `test-push.html`
  - `restore-user-firestore.html`
  - `clear-cache.html`
  - `version.html`
- [ ] Revisar si `create-admin.html` sigue siendo necesario


### FASE 2 – Limpieza de console.log y debug

- [ ] `firebase-messaging-sw.js` – eliminar los 14 console.log con emoji
  - Mantener solo: `console.error` para errores reales en service worker
- [ ] `dashboard-modules.js` – eliminar:
  - `console.log('[NeosTech] Firebase ready...')`
  - `console.log('🚀 ======...')`
  - `console.log('[Auth]...')`
  - `console.log('[NeosTech] Datos cargados')`
  - `console.log('[NeosTech] Dashboard listo')`
  - Mantener: `console.error` para errores de Firestore, auth
- [ ] `dashboard-pro.js` – auditar y eliminar cualquier log de debug
- [ ] Patrón recomendado para logs controlados:
  ```javascript
  const DEBUG = false; // ← activar solo en desarrollo
  function log(...args) { if (DEBUG) console.log('[NT]', ...args); }
  ```


### FASE 3 – Corrección de encoding

- [ ] Verificar `<meta charset="UTF-8" />` en TODOS los HTML (ya están)
- [ ] En `dashboard-pro-v2.html`: usar HTML entities para caracteres latinos
  - `é` → `&eacute;` ✅ ya aplicado
  - `ó` → `&oacute;` ✅ ya aplicado
  - `ú` → `&uacute;` ✅ ya aplicado
  - `ñ` → `&ntilde;` ✅ ya aplicado
  - `–` → `&ndash;` ✅ ya aplicado
  - `·` → `&middot;` ✅ ya aplicado
- [ ] Asegurar que el servidor web envía `Content-Type: text/html; charset=UTF-8`
- [ ] Si se usan Firebase Hosting: verificar `firebase.json` headers


### FASE 4 – CSS / Design System

- [ ] `dashboard-pro-v2.css` como CSS principal (NEW ✅ creado)
- [ ] Mantener `styles/tokens.css` – fuente única de tokens
- [ ] Mantener `styles/button.css` – primitiva reutilizable
- [ ] Revisar `css/dashboard.css` (base vars para dark theme):
  - Extraer solo lo necesario para dashboard-pro-v2.css
  - Consolidar o eliminar las reglas ya cubiertas por tokens.css
- [ ] Eliminar `style.css` de root web si solo era legacy
- [ ] No duplicar variables entre archivos CSS


### FASE 5 – JavaScript modular (sin build tool)

- [ ] Crear `js/services/auth.service.js`:
  ```javascript
  // Exports: initAuth(), signOut(), getClientId()
  ```
- [ ] Crear `js/services/firestore.service.js`:
  ```javascript
  // Exports: queryCollection(), getKPIs(), subscribeToLive(),
  //           getAlerts(), getLogs(), getUsers(), getDevices()
  ```
- [ ] Crear `js/ui/virtual-list.js`:
  - Extraer clase VirtualScroller de dashboard-pro.js
- [ ] Crear `js/ui/toast.js`:
  - showToast(msg, type) → success | error | warning | info
- [ ] Crear `js/ui/router.js`:
  - Hash-based SPA router (navigateTo, activateView)
- [ ] `js/dashboard-pro-v2.js`:
  - Importar servicios con `<script type="module">` o con globals
  - Solo lógica de coordinación e inicialización


### FASE 6 – Errores de Firestore

- [ ] **permission-denied**: Verificar reglas de Firestore Security Rules:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{collection}/{document} {
        allow read, write: if request.auth != null
          && request.auth.token.clientId == resource.data.clientId;
      }
    }
  }
  ```
- [ ] **Índices faltantes**: Ir a Firebase Console → Firestore → Índices
  - Crear índice compuesto para: `rfid_events` con `clientId` + `timestamp` DESC
  - Crear índice compuesto para: `access_logs` con `clientId` + `date` DESC
  - Crear índice compuesto para: `alerts` con `clientId` + `status` + `createdAt` DESC


### FASE 7 – Accesibilidad & Semántica

- [ ] Verificar landmarks: `<nav>`, `<main>`, `<header>`, `<aside>` ✅ en v2
- [ ] `aria-current="page"` en nav link activo ✅ en v2
- [ ] `aria-live="polite"` en KPIs ✅ en v2
- [ ] `aria-live="assertive"` en error de auth ✅ en v2
- [ ] `aria-busy="true"` en skeletons ✅ en v2
- [ ] `role="feed"` en virtual scroller ✅ en v2
- [ ] Tablas con `<caption>` o `aria-label` ✅ en v2
- [ ] Focus trap en modales (implementar en JS)
- [ ] Botón sign-out con `aria-label` ✅ en v2
- [ ] Min height 44px en todos los botones interactivos ✅ en button.css


### FASE 8 – Responsive & Performance

- [ ] Probar en 1440px, 1024px, 768px, 375px
- [ ] Sidebar off-canvas en mobile: `data-sidebar="mobile-open"` ✅ CSS listo
- [ ] `prefers-reduced-motion`: deshabilitar animaciones en tokens.css ✅ ya existe
- [ ] Lazy-load de vistas: solo cargar datos de la vista activa
- [ ] Virtual scroller solo en Live RFID (evitar DOM gigante)
- [ ] Pausar Firestore listener cuando la vista Live no está activa


### FASE 9 – Integración Firebase Auth

- [ ] Auth overlay ocultar con `appShell.classList.remove('app-shell--hidden')`
- [ ] Limpiar listeners Firestore en `signOut()`:
  ```javascript
  _state._unsubs.forEach(fn => fn());
  _state._unsubs = [];
  ```
- [ ] Redirigir a `index.html` al hacer sign-out
- [ ] Actualizar `userAvatar` con iniciales del displayName del usuario


### FASE 10 – QA Final

- [ ] Probar login con credencial inválida → muestra error en `#authError`
- [ ] Probar login exitoso → auth overlay desaparece, app carga
- [ ] Navegar entre todas las vistas → URL hash cambia, datos cargan
- [ ] Sidebar colapsar/expandir → estado persiste en localStorage
- [ ] Sidebar mobile: hamburger abre, backdrop cierra
- [ ] KPIs muestran skeleton y luego datos reales
- [ ] Live RFID: stream en tiempo real, pause funciona
- [ ] Alertas: crear alerta → aparece en lista, badge actualiza
- [ ] Sign-out → regresa a index.html

---

## ARCHIVOS NUEVOS CREADOS

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `src/web/dashboard-pro-v2.html` | Layout HTML base limpio | ✅ Creado |
| `src/web/css/dashboard-pro-v2.css` | CSS moderno del dashboard | ✅ Creado |
| `REFACTOR-CHECKLIST.md` | Este documento | ✅ Creado |

## PRÓXIMO PASO SUGERIDO

1. Crear `js/dashboard-pro-v2.js` conectando Firebase con el nuevo HTML
2. Probar `dashboard-pro-v2.html` en browser
3. Migrar funciones de `dashboard-pro.js` a la nueva estructura modular
4. Ejecutar Fase 1 (limpieza de archivos legacy)
