User: @workspace Analiza TODO el workspace referenciado.

Objetivo:
Construir un mapa arquitectónico completo del sistema.

Entrega obligatoria:

1. Propósito general del proyecto (máx 10 líneas).
2. Diagrama lógico textual del flujo principal.
3. Componentes principales agrupados por responsabilidad.
4. Dependencias externas detectadas.
5. Flujo de datos end-to-end.
6. Riesgos técnicos estructurales.
7. Inconsistencias o acoplamientos fuertes.
8. Lista de archivos críticos (entry point, servicios core, clientes externos).
9. Suposiciones explícitas (si falta información).

Restricciones:
- No generes código.
- No propongas refactorización aún.
- No optimices.
- No simplifiques.
- No hagas recomendaciones de estilo.
- Limítate a entender y mapear.

Si el proyecto es grande:
- Resume por módulos.
- No expandas cada clase individualmente.

Workspace: Collecting workspace information# Mapa Arquitectónico — NeosTech RFID System Pro

---

## 1. Propósito General

Sistema profesional de **control de acceso RFID** para edificios residenciales/comerciales. Combina hardware (lectoras RFID físicas), un **Gateway local** en C# .NET 8.0 que actúa como puente entre hardware y nube, un **Dashboard web** Firebase con gestión en tiempo real, y **Cloud Functions** Python para validación y notificaciones. Adicionalmente incorpora un **sistema de alertas de emergencia** con push notifications (FCM), SMS (Twilio), email (SendGrid) y sonidos diferenciados por tipo de emergencia. La plataforma soporta multi-tenancy (Client ID), gestión de bloques/departamentos, tags RFID (whitelist/blacklist), y registro completo de eventos de acceso.

---

## 2. Diagrama Lógico Textual del Flujo Principal

```
[Hardware: Lectora RFID THY]
  IP: 192.168.1.200:60000
  │
  │  HTTP GET /readerid?id=<TAG_UID>
  ▼
[Gateway Local: Rfid_gateway.exe]        ← C# .NET 8.0
  IP: 192.168.1.11:8080
  │  Polling cada 500ms | Anti-spam 5s
  │
  │  POST /check_tag_access  (HTTPS)
  ▼
[Cloud Function: rfid-gateway]           ← Python 3.12 / GCP us-central1
  URL: https://rfid-gateway-6psjv5t2ka-uc.a.run.app
  │
  │  Query whitelist/blacklist
  ▼
[Firestore: neos-tech]                   ← Firebase / Google Cloud
  │
  │  Respuesta: ALLOW / DENY
  └──────────────────────────────────────►[Gateway]
                                            │
                                            ▼
                                       Activa/Bloquea Relay
                                       (abre/cierra portón)

[Dashboard Web: index.html]              ← Firebase Hosting
  https://neos-tech.web.app
  │  Firebase SDK v8.10.1
  ├──► Lee/escribe Firestore en tiempo real
  ├──► Gestiona residentes, tags, eventos
  ├──► Emite alertas de emergencia
  └──► Confirma notificaciones push recibidas

[Cloud Function: sendEmergencyPush]      ← Python / FCM API V1
  │
  ├──► FCM Push → App móvil / PWA
  ├──► SMS → Twilio
  └──► Email → SendGrid
```

---

## 3. Componentes Principales por Responsabilidad

### 🔌 Hardware / Edge
| Componente | Archivo/Ubicación | Rol |
|---|---|---|
| Lectora RFID THY | Hardware físico | Detecta tags UHF |
| Gateway C# | Gateway | Puente hardware↔nube, activa relay |
| lectora.config.json | lectora.config.json | Config IP/puerto de lectora |

### 🖥️ Frontend / Dashboard
| Componente | Archivo/Ubicación | Rol |
|---|---|---|
| Dashboard principal | index.html | UI monolítica (~3,654 líneas) |
| Módulos JS | dashboard-modules.js | Funciones extraídas (~4,751+ líneas) |
| Estilos | design-system.css | Design system CSS con variables |
| Alertas enriquecidas | alert-enhancements.js (root) | Mejoras UI de alertas |

### ☁️ Backend / Cloud
| Componente | Archivo/Ubicación | Rol |
|---|---|---|
| Cloud Function RFID | functions (Python) | Valida tags contra Firestore |
| Cloud Function Alertas | emergency_alerts.py | Push/SMS/Email emergencias |
| Firestore Rules | firestore.rules | Seguridad de base de datos |

### 🔧 Configuración / Infraestructura
| Componente | Archivo | Rol |
|---|---|---|
| Firebase config | firebase.json | Hosting + Functions config |
| Firebase project | .firebaserc | Proyecto `neos-tech` |
| Variables de entorno | .env.example | Template secrets |
| Sonidos emergencia | alert_sounds.json | Config tipos de alerta |
| Dependencias Node | package.json | Scripts y deps web |

### 📜 Scripts de Utilidad
| Componente | Ubicación | Rol |
|---|---|---|
| Scripts Windows | `scripts/windows/*.bat` | Automatización local |
| Scripts deployment | `scripts/deployment/` | CI/CD manual |
| Upload sonidos | upload_alert_sounds.ps1 | Sube WAV a Firebase Storage |
| Generador sonidos | generate_sounds.py | Genera archivos WAV sintéticos |
| Cleanup | cleanup-project.ps1 | Limpieza de proyecto |
| Create admin | create-admin.js (root) | Creación de usuario admin |
| Test push | test-push.html (root) | Prueba notificaciones push |

---

## 4. Dependencias Externas Detectadas

| Servicio | Uso | Credenciales requeridas |
|---|---|---|
| **Firebase / Firestore** | BD en tiempo real, autenticación, hosting | `firebaseConfig` hardcodeado en dashboard-modules.js |
| **Firebase Cloud Messaging (FCM)** | Push notifications móvil/PWA | VAPID Key + Service Account |
| **Google Cloud Run** | Hosting Cloud Functions Python | GCP Service Account |
| **Twilio** | SMS de emergencia | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **SendGrid** | Email de emergencia | `SENDGRID_API_KEY` |
| **Firebase Storage** | Almacenamiento archivos WAV | Firebase project credentials |
| **.NET 8.0 Runtime** | Ejecución Gateway local | Instalado en máquina local |
| **Python 3.12** | Cloud Functions | GCP runtime |

---

## 5. Flujo de Datos End-to-End

### Flujo A — Control de Acceso (crítico)
```
TAG físico → Lectora (HTTP GET) → Gateway C# (polling 500ms)
→ Cloud Function Python (POST check_tag_access)
→ Firestore query (whitelist/blacklist collection)
→ Respuesta ALLOW/DENY → Gateway
→ Activación/bloqueo relay físico
→ Evento escrito en Firestore (log)
→ Dashboard lee evento en tiempo real (Firebase SDK)
```

### Flujo B — Alerta de Emergencia
```
Administrador (Dashboard UI)
→ Crea alerta en Firestore (colección alerts)
→ Cloud Function sendEmergencyPush triggered
→ FCM → App móvil / PWA (push notification + sonido WAV)
→ Twilio → SMS residentes
→ SendGrid → Email residentes
→ Residente confirma recepción → escribe en Firestore
→ Dashboard muestra confirmaciones en tiempo real
```

### Flujo C — Gestión (CRUD)
```
Dashboard UI
→ Firebase SDK v8.10.1
→ Firestore (residents, tags, blocks, departments, access_points)
→ Listener en tiempo real actualiza UI
```

---

## 6. Riesgos Técnicos Estructurales

| # | Riesgo | Severidad |
|---|---|---|
| **R1** | `firebaseConfig` con `apiKey` hardcodeado en dashboard-modules.js (visible en cliente) | 🔴 Alto |
| **R2** | `index.html` de ~3,654 líneas como monolito — punto único de falla del frontend | 🔴 Alto |
| **R3** | Gateway local en red LAN (192.168.1.11) — sin redundancia, sin failover | 🔴 Alto |
| **R4** | Polling cada 500ms desde Gateway hacia Cloud Function — costo y latencia en escala | 🟡 Medio |
| **R5** | dashboard-modules.js de +4,751 líneas — alta complejidad ciclomática, difícil de testear | 🟡 Medio |
| **R6** | Archivos alert-enhancements.js, create-admin.js, test-push.html en root — violación de convenciones propias | 🟡 Medio |
| **R7** | Sin tests automatizados (CI/CD pendiente) — riesgo de regresiones silenciosas | 🟡 Medio |
| **R8** | Dependencia de Twilio/SendGrid sin circuit breaker — falla de proveedor bloquea alertas | 🟡 Medio |
| **R9** | Firebase SDK v8.10.1 (versión legacy compat) — deprecada en favor de SDK v9 modular | 🟢 Bajo |

---

## 7. Inconsistencias y Acoplamientos Fuertes

| Tipo | Descripción |
|---|---|
| **Violación de convenciones** | alert-enhancements.js, create-admin.js, test-push.html, RESUMEN_SISTEMA.txt, RESUMEN-SISTEMA.txt, CLEANUP_REPORT.md, LIMPIEZA-COMPLETADA.md, AGENTS.md, NOTIFICACIONES_PUSH.md, SECURITY-UPDATE.md, ENABLE-AUTH.md están en root, violando CONVENCIONES.md que limita root a ~15 archivos |
| **Duplicación de archivos** | RESUMEN_SISTEMA.txt y RESUMEN-SISTEMA.txt coexisten en root (mismo contenido, nombre diferente) |
| **Config hardcodeada** | `apiKey`, `appId`, `messagingSenderId` en dashboard-modules.js — no usa `.env` |
| **Acoplamiento fuerte Frontend↔Firestore** | El dashboard accede directamente a Firestore sin capa de servicio abstracta — cualquier cambio de esquema rompe UI |
| **Acoplamiento Gateway↔IP fija** | lectora.config.json con IP hardcodeada 192.168.1.200 — no configurable en runtime |
| **Monolito JS** | `index.html` + dashboard-modules.js contienen lógica UI, lógica de negocio, y acceso a datos mezclados |
| **Worktrees huérfanos** | Existen rutas `gracious-nash` y `flamboyant-goldstine` en .claude-worktrees con copias completas del proyecto — riesgo de trabajo en rama incorrecta |
| **Estructura docs vs realidad** | CONVENCIONES.md define cloud para Cloud Functions, pero código parece estar en functions |

---

## 8. Archivos Críticos

### Entry Points
| Archivo | Rol |
|---|---|
| index.html | Entry point del Dashboard web |
| Gateway (`.exe`/`.cs`) | Entry point del Gateway local |
| emergency_alerts.py | Entry point Cloud Function alertas |

### Servicios Core
| Archivo | Rol |
|---|---|
| dashboard-modules.js | Toda la lógica JS del dashboard |
| firestore.rules | Seguridad de toda la base de datos |
| firebase.json | Configuración de deploy Firebase |
| alert_sounds.json | Configuración del sistema de alertas |
| lectora.config.json | Configuración hardware lectora |

### Clientes Externos / Integraciones
| Archivo | Rol |
|---|---|
| .env.example | Template para Twilio, SendGrid, FCM keys |
| .firebaserc | Binding al proyecto GCP `neos-tech` |
| design-system.css | Sistema de diseño visual compartido |

### Documentación de Referencia Arquitectónica
| Archivo | Rol |
|---|---|
| RESUMEN-DEPLOYMENT.md | URLs de producción y configuración deployada |
| CONVENCIONES.md | Reglas de estructura del proyecto |
| SISTEMA-ALERTAS-EMERGENCIA.md | Diseño del sistema de alertas |

---

## 9. Suposiciones Explícitas

| # | Suposición |
|---|---|
| **S1** | El Gateway C# compila y corre como `Rfid_gateway.exe` en Windows — no se pudo verificar el `.csproj` directamente |
| **S2** | La Cloud Function Python está desplegada en Cloud Run (no Firebase Functions estándar) — basado en la URL `*.a.run.app` |
| **S3** | El sistema de alertas de emergencia (FCM/Twilio/SendGrid) está **documentado pero no completamente implementado** — el cronograma en SISTEMA-ALERTAS-EMERGENCIA.md muestra ítems pendientes |
| **S4** | Los archivos WAV en sounds deben ser generados manualmente con `generate_sounds.py` antes del primer deploy |
| **S5** | La autenticación Firebase está habilitada (ver ENABLE-AUTH.md) pero su estado exacto en producción no es verificable sin acceso a Firebase Console |
| **S6** | Multi-tenancy por Client ID está planificado pero no se encontró implementación activa en el código visible |
| **S7** | Los worktrees `gracious-nash` y `flamboyant-goldstine` son ramas de trabajo de Claude — no son parte del branch principal |