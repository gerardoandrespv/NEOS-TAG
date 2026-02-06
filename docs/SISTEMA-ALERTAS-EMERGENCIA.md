# Sistema de Alertas de Emergencias - NeosTech Building Alert System

**Versión:** 1.0  
**Fecha:** 2 de febrero de 2026  
**Estado:** En Desarrollo

---

## 🎯 Objetivo

Implementar un sistema profesional de alertas de emergencias para edificios, completamente **legal y diferenciado de sistemas gubernamentales**, integrado con la plataforma NeosTech RFID existente.

---

## ⚖️ Cumplimiento Legal

### ✅ Sistema LEGAL - NO Replica SHOA

| Aspecto | ❌ PROHIBIDO (SHOA) | ✅ PERMITIDO (NeosTech) |
|---------|---------------------|-------------------------|
| **Color corporativo** | Rojo intenso oficial | Naranja/Amarillo corporativo |
| **Nomenclatura** | "ALERTA OFICIAL SHOA" | "ALERTA EDIFICIO - EMERGENCIA" |
| **Tono de audio** | Tono oficial SHOA | Tono distintivo propio |
| **Logo** | Escudo Armada/SHOA | Logo NeosTech + Edificio |
| **Autoridad** | Sistema gubernamental | Sistema privado de edificio |

### Declaración de Responsabilidad

Este sistema es **exclusivamente para uso interno del edificio** y **NO pretende suplantar autoridades gubernamentales**. Las alertas son emitidas por la administración del edificio y claramente identificadas como tales.

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────┐
│                  SISTEMA DE ALERTAS                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   Panel de   │───▶│   Firebase   │◀───│  App      │ │
│  │   Control    │    │   Firestore  │    │  Móvil    │ │
│  │  (Dashboard) │    │              │    │           │ │
│  └──────────────┘    └──────┬───────┘    └───────────┘ │
│                             │                           │
│                             ▼                           │
│                    ┌─────────────────┐                  │
│                    │  Cloud Function │                  │
│                    │  Alert Service  │                  │
│                    └────────┬────────┘                  │
│                             │                           │
│              ┌──────────────┼──────────────┐            │
│              ▼              ▼              ▼            │
│         ┌────────┐    ┌─────────┐    ┌────────┐       │
│         │  FCM   │    │   SMS   │    │ Email  │       │
│         │  Push  │    │ Twilio  │    │SendGrid│       │
│         └────────┘    └─────────┘    └────────┘       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Base de Datos Firestore

### Colección: `emergency_alerts`

```javascript
{
  id: "alert_2026020215301234",
  type: "FIRE" | "EVACUATION" | "FLOOD" | "POWER_OUTAGE" | "SYSTEM_FAILURE" | "GENERAL",
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  title: "Incendio detectado - Piso 3",
  message: "Se ha detectado humo en el piso 3. Proceda a evacuar por escaleras de emergencia.",
  building_zone: "Piso 3 - Ala Este",
  affected_floors: [3, 4],
  
  // Control de emisión
  issued_at: Timestamp,
  issued_by: "admin_user_id",
  expires_at: Timestamp,
  cancelled_at: Timestamp | null,
  status: "ACTIVE" | "CANCELLED" | "EXPIRED",
  
  // Configuración de envío
  send_push: true,
  send_sms: true,
  send_email: false,
  priority: "HIGH",
  
  // Confirmaciones
  total_recipients: 156,
  delivered_count: 154,
  read_count: 89,
  confirmed_safe_count: 45,
  
  // Metadatos
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Colección: `alert_recipients`

```javascript
{
  id: "recipient_uuid",
  alert_id: "alert_2026020215301234",
  user_id: "user_123",
  
  // Información del destinatario
  name: "Juan Pérez",
  apartment: "301",
  floor: 3,
  phone: "+56912345678",
  email: "juan@example.com",
  
  // Dispositivos
  devices: [
    {
      token: "fcm_token_android",
      platform: "android",
      model: "Samsung Galaxy S21"
    },
    {
      token: "fcm_token_ios",
      platform: "ios",
      model: "iPhone 13"
    }
  ],
  
  // Estado de entrega
  push_delivered: true,
  push_delivered_at: Timestamp,
  sms_delivered: true,
  sms_delivered_at: Timestamp,
  email_delivered: false,
  
  // Confirmaciones del usuario
  read_at: Timestamp | null,
  confirmed_safe: false,
  confirmed_safe_at: Timestamp | null,
  location_shared: false,
  
  // Metadatos
  created_at: Timestamp
}
```

### Colección: `alert_templates`

```javascript
{
  id: "template_fire",
  type: "FIRE",
  name: "Incendio en Edificio",
  
  // Plantilla del mensaje
  title_template: "🔥 INCENDIO DETECTADO - {zone}",
  message_template: `
Se ha detectado un incendio en {zone}.

INSTRUCCIONES:
1. Mantenga la calma
2. No use ascensores
3. Diríjase a la escalera de emergencia más cercana
4. Siga instrucciones del personal de seguridad
5. Una vez en lugar seguro, confirme que está a salvo

Punto de encuentro: {meeting_point}
  `,
  
  // Configuración de sonido/vibración
  sound_file: "emergency_alarm_fire.mp3",
  vibration_pattern: [500, 200, 500, 200, 500],
  
  // Configuración de pantalla
  color_scheme: "orange", // Naranja corporativo
  icon: "fire",
  priority: "HIGH",
  
  // Variables disponibles
  variables: ["zone", "meeting_point", "contact_number"],
  
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### Colección: `alert_logs`

```javascript
{
  id: "log_uuid",
  alert_id: "alert_2026020215301234",
  
  // Auditoría
  action: "CREATED" | "SENT" | "DELIVERED" | "READ" | "CONFIRMED" | "CANCELLED",
  actor_id: "user_id",
  actor_name: "Admin Name",
  actor_role: "admin" | "guard" | "supervisor",
  
  // Detalles
  details: {
    recipient_count: 156,
    push_sent: 154,
    sms_sent: 156,
    errors: []
  },
  
  // IP y dispositivo del emisor
  ip_address: "192.168.1.100",
  user_agent: "Mozilla/5.0...",
  
  timestamp: Timestamp
}
```

---

## 🎨 Diseño Visual (Identidad NeosTech)

### Paleta de Colores

```css
/* Colores de Alertas - NO USAR ROJO SHOA */
--alert-critical: #FF6B00;    /* Naranja intenso */
--alert-high: #FFA500;         /* Naranja medio */
--alert-medium: #FFD700;       /* Amarillo dorado */
--alert-low: #4A90E2;          /* Azul información */

/* Colores de fondo */
--alert-bg-critical: #FF6B00;
--alert-bg-overlay: rgba(255, 107, 0, 0.95);

/* Textos */
--alert-text-primary: #FFFFFF;
--alert-text-secondary: #FFF8DC;
```

### Tipografía

```css
/* NO usar tipografía oficial gubernamental */
--alert-font-title: 'Roboto', 'Arial', sans-serif;
--alert-font-body: 'Open Sans', 'Helvetica', sans-serif;
--alert-font-size-title: 28px;
--alert-font-size-body: 18px;
```

### Iconografía

- 🔥 Incendio
- 🚨 Evacuación
- 💧 Inundación/Fuga
- ⚡ Falla Eléctrica
- 🔧 Falla de Sistemas
- 📢 Anuncio General

---

## 📱 App Móvil (Especificaciones)

### Tecnología Propuesta

**Opción 1: Progressive Web App (PWA)**
- Más rápida de implementar
- No requiere instalación en tiendas
- Funciona en iOS y Android
- Notificaciones web push

**Opción 2: React Native**
- Experiencia nativa completa
- Mejor acceso a APIs del dispositivo
- Publicación en App Store y Play Store

### Funcionalidades Principales

1. **Recepción de Alertas**
   - Notificación push de alta prioridad
   - Pantalla de alerta en fullscreen
   - Sonido distintivo (no réplica SHOA)
   - Vibración configurable

2. **Confirmación de Estado**
   - Botón "Estoy a salvo"
   - Botón "Necesito ayuda"
   - Compartir ubicación (opcional)

3. **Historial de Alertas**
   - Ver alertas pasadas
   - Estado de cada alerta
   - Instrucciones de seguridad

4. **Perfil de Usuario**
   - Nombre y departamento
   - Contactos de emergencia
   - Información médica (opcional)
   - Preferencias de notificación

---

## 🔊 Sistema de Audio

### Tonos de Alerta (Propios)

**NO usar tonos oficiales SHOA**

Crear tonos distintivos propios:

```
tonos/
├── emergency_alarm_fire.mp3        # Tono incendio (beep rápido)
├── emergency_alarm_evacuation.mp3  # Tono evacuación (sirena lenta)
├── emergency_alarm_flood.mp3       # Tono inundación (onda)
├── emergency_alarm_general.mp3     # Tono general (triple beep)
└── emergency_alarm_cancel.mp3      # Tono cancelación (melodía descendente)
```

### Especificaciones de Audio

- **Formato:** MP3, 192kbps
- **Duración:** 5-10 segundos (loop automático)
- **Frecuencia:** Audible pero no estridentes
- **Volumen:** Configurable por usuario (respetando preferencias)

### Mensaje de Voz (TTS)

```javascript
// Usar Text-to-Speech para mensajes dinámicos
const voiceMessage = {
  lang: 'es-CL',
  voice: 'female',
  rate: 0.9, // Ligeramente más lento para claridad
  text: `Alerta de emergencia. ${alertType}. ${instructions}`
};
```

---

## 🔐 Seguridad y Permisos

### Roles de Usuario

| Rol | Permisos |
|-----|----------|
| **Super Admin** | Emitir cualquier alerta, cancelar alertas, ver logs completos |
| **Admin** | Emitir alertas de severidad MEDIUM/LOW, ver logs propios |
| **Guardia** | Emitir alertas pre-aprobadas, confirmar recepciones |
| **Residente** | Recibir alertas, confirmar estado, ver historial |

### Autenticación de Doble Factor

Para emitir alertas **CRITICAL**:
```javascript
// Requiere confirmación de 2 usuarios autorizados
const criticalAlertRequires = {
  primary_admin: true,
  secondary_supervisor: true,
  timeout: 60 // segundos para confirmar
};
```

### Registro de Auditoría

Cada acción debe registrarse:
- Quién emitió la alerta
- Cuándo se emitió
- A quiénes se envió
- Motivo de la alerta
- Cancelaciones y modificaciones

---

## 📡 Canales de Comunicación

### 1. Firebase Cloud Messaging (FCM)

**Notificaciones Push de Alta Prioridad**

```javascript
// Configuración Android
const androidConfig = {
  priority: 'high',
  notification: {
    channelId: 'emergency_alerts',
    priority: 'max',
    sound: 'emergency_alarm_fire',
    vibrationPattern: [500, 200, 500, 200, 500],
    visibility: 'public', // Muestra en lockscreen
    importance: 'max'
  }
};

// Configuración iOS
const apnsConfig = {
  headers: {
    'apns-priority': '10', // Máxima prioridad
    'apns-push-type': 'alert'
  },
  payload: {
    aps: {
      alert: {
        title: alertTitle,
        body: alertBody
      },
      sound: 'emergency_alarm_fire.caf',
      'content-available': 1,
      badge: 1,
      'interruption-level': 'critical' // iOS 15+
    }
  }
};
```

### 2. SMS (Twilio)

**Mensajes de texto como backup**

```javascript
const smsConfig = {
  provider: 'twilio',
  from: '+56912345678', // Número del edificio
  template: `
[ALERTA EDIFICIO ${buildingName}]
${alertType}
${message}

Confirma recepción en: ${appUrl}
  `,
  maxLength: 160 // Standard SMS
};
```

### 3. Email (SendGrid)

**Emails detallados para residentes**

```html
<!-- Template de email -->
<html>
  <body style="background: #FFF8DC;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px;">
      <div style="background: #FF6B00; color: white; padding: 20px; text-align: center;">
        <h1>🚨 ALERTA DE EMERGENCIA</h1>
        <h2>{{alertType}}</h2>
      </div>
      
      <div style="padding: 20px;">
        <p><strong>Emitida:</strong> {{issuedAt}}</p>
        <p><strong>Zona afectada:</strong> {{zone}}</p>
        
        <div style="background: #FFF3CD; padding: 15px; margin: 20px 0; border-left: 4px solid #FF6B00;">
          <h3>INSTRUCCIONES:</h3>
          <p>{{instructions}}</p>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
          <a href="{{confirmUrl}}" style="background: #FF6B00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
            CONFIRMAR QUE ESTOY A SALVO
          </a>
        </p>
      </div>
      
      <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>Edificio {{buildingName}} - Administración</p>
        <p>Teléfono emergencias: {{emergencyPhone}}</p>
      </div>
    </div>
  </body>
</html>
```

---

## 🖥️ Panel de Control (Dashboard)

### Pantalla Principal de Alertas

```
┌─────────────────────────────────────────────────────────────┐
│  🚨 SISTEMA DE ALERTAS DE EMERGENCIA                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   ACTIVAS    │  │  HISTORIAL   │  │   PLANTILLAS │      │
│  │      2       │  │     156      │  │      8       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🔥 Incendio Piso 3                    [ACTIVA]       │ │
│  │     Emitida: 15:30  |  Confirmados: 45/67            │ │
│  │     [Ver Detalles] [Actualizar] [Cancelar]           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ⚡ Corte de Energía                   [ACTIVA]       │ │
│  │     Emitida: 14:15  |  Confirmados: 120/156          │ │
│  │     [Ver Detalles] [Actualizar] [Cancelar]           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              [+ NUEVA ALERTA]                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Formulario de Nueva Alerta

```
┌─────────────────────────────────────────────────────────────┐
│  EMITIR NUEVA ALERTA DE EMERGENCIA                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tipo de Alerta: *                                          │
│  [🔥 Incendio ▼]                                            │
│                                                              │
│  Severidad: *                                               │
│  ○ Crítica  ● Alta  ○ Media  ○ Baja                        │
│                                                              │
│  Zona Afectada: *                                           │
│  [Piso 3 - Ala Este                          ]              │
│                                                              │
│  Pisos afectados:                                           │
│  ☑ Piso 3  ☑ Piso 4  ☐ Piso 5  ☐ Todo el edificio         │
│                                                              │
│  Mensaje: *                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Se ha detectado humo en el piso 3.                     │ │
│  │ Proceda a evacuar por escaleras de emergencia.        │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Canales de envío:                                          │
│  ☑ Notificación Push  ☑ SMS  ☐ Email                       │
│                                                              │
│  Punto de encuentro:                                        │
│  [Plaza principal - Calle Los Aromos                      ]  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ⚠️  ALERTA CRÍTICA REQUIERE DOBLE AUTORIZACIÓN       │ │
│  │                                                         │ │
│  │  Usuario principal: Admin (tú)          ✓             │ │
│  │  Supervisor:        [Seleccionar ▼]     ⏳            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Destinatarios: 156 residentes                              │
│                                                              │
│  [Cancelar]              [Vista Previa]   [🚨 EMITIR ALERTA]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Operación

### Emisión de Alerta

```
1. Admin accede a Panel de Control
   ↓
2. Selecciona "Nueva Alerta"
   ↓
3. Completa formulario:
   - Tipo de emergencia
   - Zona afectada
   - Mensaje personalizado
   ↓
4. [Si es CRÍTICA] → Requiere aprobación de supervisor
   ↓
5. Sistema valida permisos
   ↓
6. Se crea registro en Firestore (emergency_alerts)
   ↓
7. Cloud Function procesa:
   ├─ Obtiene lista de destinatarios
   ├─ Envía notificaciones FCM
   ├─ Envía SMS (si configurado)
   └─ Envía emails (si configurado)
   ↓
8. Se registran entregas en alert_recipients
   ↓
9. Dashboard muestra estado en tiempo real
```

### Recepción por Residente

```
1. Dispositivo recibe notificación FCM
   ↓
2. Suena alarma (incluso en silencio si configurado)
   ↓
3. App abre pantalla de alerta fullscreen:
   
   ┌─────────────────────────────────┐
   │  🚨 ALERTA DE EMERGENCIA       │
   │                                 │
   │  INCENDIO DETECTADO             │
   │  Piso 3 - Ala Este              │
   │                                 │
   │  INSTRUCCIONES:                 │
   │  • No use ascensores            │
   │  • Use escalera de emergencia   │
   │  • Mantenga la calma            │
   │                                 │
   │  Punto de encuentro:            │
   │  Plaza principal                │
   │                                 │
   │  [ESTOY A SALVO] [NECESITO AYUDA]│
   └─────────────────────────────────┘
   ↓
4. Usuario presiona "ESTOY A SALVO"
   ↓
5. Se actualiza Firestore (confirmed_safe: true)
   ↓
6. Dashboard actualiza contador de confirmaciones
```

### Cancelación de Alerta

```
1. Admin accede a alerta activa
   ↓
2. Presiona "Cancelar Alerta"
   ↓
3. Ingresa motivo de cancelación
   ↓
4. Sistema actualiza status: "CANCELLED"
   ↓
5. Envía notificación a todos:
   "ALERTA CANCELADA - [motivo]"
   ↓
6. Suena tono de cancelación (descendente)
   ↓
7. Se registra en logs de auditoría
```

---

## 📋 Plantillas Pre-configuradas

### Plantilla 1: Incendio

```yaml
type: FIRE
title: "🔥 INCENDIO DETECTADO - {zone}"
message: |
  Se ha detectado un incendio en {zone}.
  
  INSTRUCCIONES INMEDIATAS:
  1. Mantenga la calma
  2. NO use ascensores
  3. Diríjase a la escalera de emergencia más cercana
  4. Cierre puertas tras de sí
  5. Siga instrucciones del personal de seguridad
  
  Punto de encuentro: {meeting_point}
  
  Una vez en lugar seguro, confirme su estado en la app.

severity: CRITICAL
sound: emergency_alarm_fire.mp3
color: "#FF6B00"
vibration: [500, 200, 500, 200, 500]
send_push: true
send_sms: true
```

### Plantilla 2: Evacuación General

```yaml
type: EVACUATION
title: "🚨 EVACUACIÓN INMEDIATA - {reason}"
message: |
  Se requiere evacuación inmediata del edificio.
  Motivo: {reason}
  
  INSTRUCCIONES:
  1. Tome solo artículos esenciales
  2. NO use ascensores
  3. Use escalera de emergencia
  4. Ayude a personas con movilidad reducida
  5. Diríjase al punto de encuentro
  
  Punto de encuentro: {meeting_point}
  Contacto emergencias: {emergency_phone}

severity: CRITICAL
sound: emergency_alarm_evacuation.mp3
color: "#FF8C00"
```

### Plantilla 3: Corte de Energía

```yaml
type: POWER_OUTAGE
title: "⚡ CORTE DE ENERGÍA - {duration}"
message: |
  Se informa corte de energía eléctrica en el edificio.
  Duración estimada: {duration}
  
  INFORMACIÓN:
  - Generador de emergencia activado
  - Iluminación de emergencia operativa
  - Ascensores fuera de servicio
  
  Evite uso de:
  - Ascensores
  - Equipos de alto consumo
  
  Se notificará cuando se restablezca el servicio.

severity: MEDIUM
sound: emergency_alarm_general.mp3
color: "#FFD700"
send_push: true
send_sms: false
```

### Plantilla 4: Inundación/Fuga

```yaml
type: FLOOD
title: "💧 FUGA DE AGUA - {zone}"
message: |
  Se ha detectado fuga de agua en {zone}.
  
  INSTRUCCIONES:
  1. Evite la zona afectada
  2. No use sistemas eléctricos cercanos
  3. Reporte filtraciones a administración
  
  Personal de mantención está trabajando en la solución.
  
  Teléfono emergencias: {emergency_phone}

severity: HIGH
sound: emergency_alarm_flood.mp3
color: "#4A90E2"
```

---

## 🧪 Plan de Pruebas

### Fase 1: Pruebas Internas (Días 1-2)

**Objetivo:** Validar funcionalidad básica

1. **Prueba de Envío**
   - Enviar alerta de prueba a 5 dispositivos
   - Verificar recepción en Android/iOS
   - Medir tiempo de entrega

2. **Prueba de Sonido**
   - Verificar reproducción en modo silencio
   - Validar volumen adecuado
   - Confirmar patrón de vibración

3. **Prueba de Confirmación**
   - Usuario presiona "Estoy a salvo"
   - Verificar actualización en dashboard
   - Validar registro en base de datos

### Fase 2: Pruebas con Voluntarios (Días 3-4)

**Objetivo:** Validar experiencia de usuario

1. Reclutar 20 residentes voluntarios
2. Instalar app/configurar notificaciones
3. Enviar alerta de prueba programada
4. Recopilar feedback:
   - ¿Recibió la alerta?
   - ¿Fue clara la información?
   - ¿El sonido fue adecuado?
   - Sugerencias de mejora

### Fase 3: Simulacro Completo (Día 5)

**Objetivo:** Simular emergencia real

1. Planificar simulacro con administración
2. Notificar a todos los residentes
3. Emitir alerta de "Simulacro de Evacuación"
4. Medir:
   - Tasa de entrega: ____%
   - Tasa de confirmación: ____%
   - Tiempo promedio de respuesta: ___ min
   - Problemas técnicos encontrados

5. Reunión post-simulacro para ajustes

---

## 📈 Métricas de Éxito

### KPIs Operacionales

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| **Tasa de entrega** | ≥ 98% | Notificaciones entregadas / Enviadas |
| **Tiempo de entrega** | ≤ 5 segundos | Desde emisión hasta recepción |
| **Tasa de confirmación** | ≥ 80% | Usuarios que confirman / Total |
| **Tiempo de confirmación** | ≤ 2 minutos | Desde recepción hasta confirmación |
| **Disponibilidad del sistema** | ≥ 99.9% | Uptime mensual |

### Reportes Mensuales

- Total de alertas emitidas
- Tipos de alerta más frecuentes
- Tasa de confirmación por tipo
- Dispositivos activos
- Errores de entrega y causas

---

## 🔧 Implementación Técnica

### Tecnologías Utilizadas

**Backend:**
- Firebase Cloud Functions (Node.js 18)
- Firebase Firestore
- Firebase Cloud Messaging (FCM)

**Servicios Externos:**
- Twilio (SMS)
- SendGrid (Email)

**Frontend:**
- React para Panel de Control
- Integración con Dashboard existente

**App Móvil:**
- Progressive Web App (PWA) o
- React Native

---

## 📅 Cronograma de Implementación

### Semana 1: Fundación
- ✅ Documentación técnica
- [ ] Diseño de base de datos
- [ ] Configuración de Firebase
- [ ] Creación de plantillas

### Semana 2: Backend
- [ ] Cloud Function de alertas
- [ ] Integración FCM
- [ ] Integración Twilio/SendGrid
- [ ] Sistema de logs

### Semana 3: Frontend
- [ ] Panel de control en dashboard
- [ ] Formulario de nueva alerta
- [ ] Vista de alertas activas
- [ ] Historial de alertas

### Semana 4: App Móvil
- [ ] PWA/React Native setup
- [ ] Pantalla de alerta
- [ ] Sistema de confirmación
- [ ] Perfil de usuario

### Semana 5: Testing
- [ ] Pruebas internas
- [ ] Pruebas con voluntarios
- [ ] Ajustes y optimizaciones
- [ ] Simulacro completo

### Semana 6: Deployment
- [ ] Capacitación a guardias
- [ ] Comunicación a residentes
- [ ] Instalación app en dispositivos
- [ ] Go-live

---

## 📞 Soporte y Mantenimiento

### Documentación Requerida

1. **Manual de Operación** → `docs/MANUAL-ALERTAS-OPERACION.md`
2. **Guía de Instalación App** → `docs/GUIA-INSTALACION-APP.md`
3. **Protocolo de Emergencias** → `docs/PROTOCOLO-EMERGENCIAS.md`
4. **FAQ Residentes** → `docs/FAQ-ALERTAS.md`

### Contactos de Emergencia

- **Soporte Técnico:** [email/teléfono]
- **Administración:** [email/teléfono]
- **Bomberos:** 132
- **Ambulancia:** 131
- **Carabineros:** 133

---

## ⚠️ Consideraciones Finales

### Responsabilidad Legal

- Sistema para uso **exclusivo interno del edificio**
- NO suplanta autoridades gubernamentales
- Claramente identificado como "Sistema del Edificio"
- Registro completo de todas las acciones

### Privacidad de Datos

- Cumplimiento con Ley 19.628 (Protección Datos Personales - Chile)
- Consentimiento explícito para recibir alertas
- Opción de opt-out para alertas no críticas
- Datos encriptados en tránsito y reposo

### Uso Ético

- **SOLO para emergencias reales**
- Penalizaciones por uso indebido
- Auditoría de cada alerta emitida
- Capacitación obligatoria para operadores

---

**Versión:** 1.0  
**Última actualización:** 2 de febrero de 2026  
**Responsable:** Equipo NeosTech
