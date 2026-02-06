# 🎯 MANUAL DE OPERACIÓN - SISTEMA DE ALERTAS DE EMERGENCIA

**Sistema:** NeosTech Building Alert System  
**Para:** Administradores, Porteros, Personal de Seguridad  
**Versión:** 1.0  
**Fecha:** Febrero 2026  

---

## 📋 ÍNDICE

1. [Introducción al Sistema](#introducción-al-sistema)
2. [Roles y Permisos](#roles-y-permisos)
3. [Acceso al Panel de Control](#acceso-al-panel-de-control)
4. [Cómo Emitir una Alerta](#cómo-emitir-una-alerta)
5. [Tipos de Alertas y Cuándo Usarlas](#tipos-de-alertas-y-cuándo-usarlas)
6. [Procedimiento de Cancelación](#procedimiento-de-cancelación)
7. [Verificación de Confirmaciones](#verificación-de-confirmaciones)
8. [Mejores Prácticas](#mejores-prácticas)
9. [Protocolo de Emergencia por Tipo](#protocolo-de-emergencia-por-tipo)
10. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🎯 INTRODUCCIÓN AL SISTEMA

### ¿Qué es el Sistema de Alertas?

El **Sistema de Alertas de Emergencia NeosTech** permite enviar notificaciones **inmediatas** a todos los residentes del edificio en caso de emergencia.

### Componentes del Sistema

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  👨‍💼 ADMINISTRADOR                                   │
│     │                                               │
│     ├─→ 🖥️  Dashboard Web (index.html)            │
│     │       │                                       │
│     │       ├─→ Crea alertas                       │
│     │       ├─→ Cancela alertas                    │
│     │       └─→ Verifica confirmaciones            │
│     │                                               │
│     └─→ ☁️  Cloud Function (Backend)               │
│             │                                       │
│             ├─→ Envía notificaciones push (FCM)    │
│             ├─→ Envía SMS (Twilio)                 │
│             └─→ Envía emails (SendGrid)            │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📱 RESIDENTES                                      │
│     │                                               │
│     ├─→ Reciben notificación en celular            │
│     ├─→ Suena alarma + vibración                   │
│     ├─→ Leen instrucciones                         │
│     └─→ Confirman "ESTOY A SALVO"                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Capacidades Principales

✅ **Notificación masiva instantánea** (5-10 segundos)  
✅ **6 tipos de alertas** (Incendio, Evacuación, Inundación, etc.)  
✅ **4 niveles de severidad** (Crítica, Alta, Media, Baja)  
✅ **Selección por zonas/pisos** (Enviar solo a pisos afectados)  
✅ **Tracking en tiempo real** (Ver quién confirmó estar a salvo)  
✅ **Historial completo** (Auditoría de todas las alertas enviadas)  

---

## 👥 ROLES Y PERMISOS

El sistema tiene 3 niveles de acceso:

### 🔴 NIVEL 1: ADMINISTRADOR

**Quién:** Gerente de Edificio, Director de Operaciones

**Puede:**
- ✅ Emitir **TODAS** las alertas (incluyendo CRÍTICAS)
- ✅ Cancelar cualquier alerta activa
- ✅ Ver historial completo
- ✅ Gestionar usuarios del sistema
- ✅ Cambiar configuraciones

**No puede:**
- ❌ Eliminar alertas del historial (auditoría permanente)

---

### 🟠 NIVEL 2: OPERADOR

**Quién:** Jefe de Portería, Encargado de Seguridad

**Puede:**
- ✅ Emitir alertas de severidad **MEDIA** y **BAJA**
- ✅ Cancelar alertas que ellos mismos emitieron
- ✅ Ver alertas activas y confirmaciones
- ⚠️ Emitir alertas **CRÍTICAS** solo con doble autorización

**No puede:**
- ❌ Emitir alertas CRÍTICAS sin aprobación
- ❌ Cancelar alertas emitidas por otros
- ❌ Modificar configuraciones del sistema

---

### 🟢 NIVEL 3: PORTERO

**Quién:** Porteros, Personal de turno

**Puede:**
- ✅ Ver alertas activas
- ✅ Ver confirmaciones de residentes
- ⚠️ **Solicitar** emisión de alerta (requiere aprobación de Operador/Admin)

**No puede:**
- ❌ Emitir alertas directamente
- ❌ Cancelar alertas
- ❌ Ver historial completo

---

## 🖥️ ACCESO AL PANEL DE CONTROL

### Paso 1: Abrir el Dashboard

**Opción A: Acceso Local**

1. En el computador de portería/administración
2. Abre Chrome o Edge
3. Navega a:
   ```
   file:///C:/NeosTech-RFID-System-Pro/src/web/index.html
   ```
   O haz doble clic en el archivo directamente

**Opción B: Acceso Web**

1. Navega a:
   ```
   https://neos-tech.web.app/dashboard
   ```

2. Inicia sesión:
   ```
   Usuario: admin@edificio.cl
   Contraseña: [Tu contraseña segura]
   ```

---

### Paso 2: Ir a la Pestaña "Alertas"

1. En el dashboard, verás varias pestañas en la parte superior
2. Haz clic en **"🚨 Alertas"**
3. Verás el panel principal de alertas con:
   - 📊 **Estadísticas** (alertas activas, total enviadas, etc.)
   - 🔴 **Alertas activas** (si hay alguna en este momento)
   - 🆕 **Botón "NUEVA ALERTA"** (naranja, grande)

---

## 🚨 CÓMO EMITIR UNA ALERTA

### ⚠️ ANTES DE EMITIR

**PREGÚNTATE:**

1. ¿Es una **emergencia real**?
2. ¿Los residentes necesitan **actuar inmediatamente**?
3. ¿Tengo la **autoridad** para enviar este tipo de alerta?
4. ¿He **verificado** la información?

**SI NO ESTÁS SEGURO → NO ENVÍES LA ALERTA**

**En caso de duda:**
- Llama al administrador
- Llama a bomberos/carabineros primero
- Usa el teléfono convencional para verificar

---

### Paso 1: Abrir el Formulario

1. En el panel de Alertas, haz clic en **"🆕 NUEVA ALERTA"**
2. Se abrirá un modal (ventana emergente) con el formulario

---

### Paso 2: Seleccionar Tipo de Alerta

**Verás 6 opciones:**

| Tipo | Ícono | Cuándo Usar |
|------|-------|-------------|
| **Incendio** | 🔥 | Fuego confirmado, humo denso |
| **Evacuación** | 🚨 | Evacuación total del edificio |
| **Inundación** | 💧 | Fuga grave, rotura de cañería |
| **Corte de Energía** | ⚡ | Apagón prolongado (>1 hora) |
| **Falla de Sistema** | 🛠️ | Ascensores atascados, falla general |
| **General** | 📢 | Otras situaciones importantes |

**Haz clic en el tipo que corresponda.**

**💡 Tip:** Al seleccionar, se auto-completará un mensaje predeterminado.

---

### Paso 3: Seleccionar Severidad

**Verás 4 opciones en forma de botones:**

#### 🔴 **CRÍTICA** - Riesgo de vida

**Ejemplos:**
- Incendio activo en varios pisos
- Evacuación total inmediata
- Fuga de gas
- Colapso estructural

**Efecto:**
- 🔊 Volumen máximo
- 📳 Vibración fuerte
- 🚨 Notificación de emergencia (omite "No Molestar")
- ⚠️ **Requiere doble autorización** (Admin confirma)

---

#### 🟠 **ALTA** - Urgente

**Ejemplos:**
- Inundación en un sector
- Falla de ascensores con personas atrapadas
- Corte de agua prolongado

**Efecto:**
- 🔊 Volumen alto
- 📳 Vibración moderada
- 📢 Notificación prioritaria

---

#### 🟡 **MEDIA** - Importante

**Ejemplos:**
- Corte de energía programado
- Mantenimiento de emergencia
- Cierre temporal de áreas comunes

**Efecto:**
- 🔊 Volumen normal
- 📳 Vibración ligera
- 📱 Notificación estándar

---

#### 🟢 **BAJA** - Informativa

**Ejemplos:**
- Prueba del sistema
- Recordatorios importantes
- Comunicados generales

**Efecto:**
- 🔊 Volumen bajo
- 📳 Sin vibración
- 📱 Notificación silenciosa

**Haz clic en el nivel de severidad apropiado.**

---

### Paso 4: Seleccionar Zona Afectada

**Campo:** "Zona Afectada"

**Opciones:**

- **TODO EL EDIFICIO** - Todos los residentes
- **TORRE A** - Solo Torre A
- **TORRE B** - Solo Torre B
- **PISOS ESPECÍFICOS** - Selecciona pisos (ver Paso 5)

**Selecciona del menú desplegable.**

---

### Paso 5: Seleccionar Pisos (Opcional)

Si la alerta afecta solo algunos pisos:

1. Verás una **cuadrícula de pisos** (P1 a P20, Subsuelo, etc.)
2. **Haz clic** en cada piso afectado
3. Los pisos seleccionados se marcarán en **naranja**
4. Para deseleccionar, haz clic nuevamente

**Ejemplo:**
- Inundación solo en Piso 5 → Selecciona solo "P5"
- Incendio en pisos 10-12 → Selecciona "P10", "P11", "P12"

**💡 Tip:** Si seleccionaste "TODO EL EDIFICIO", no necesitas seleccionar pisos.

---

### Paso 6: Título de la Alerta

**Campo:** "Título de la Alerta"

**Texto auto-completado** (puedes editarlo):

```
🔥 INCENDIO DETECTADO
```

**Recomendaciones:**
- ✅ Usa MAYÚSCULAS para urgencia
- ✅ Sé directo y claro
- ✅ Máximo 50 caracteres
- ❌ No uses abreviaturas confusas
- ❌ No uses lenguaje técnico

**Ejemplos buenos:**
- `🔥 INCENDIO EN PISO 10 - EVACUEN`
- `🚨 EVACUACIÓN INMEDIATA - SALGAN AHORA`
- `💧 INUNDACIÓN PISO 5 - EVITEN ÁREA`

**Ejemplos malos:**
- `Inc P10` ← Muy abreviado
- `Situación en desarrollo` ← No dice qué hacer
- `Posible problema detectado` ← Ambiguo

---

### Paso 7: Mensaje Detallado

**Campo:** "Mensaje" (área de texto grande)

**Texto auto-completado** (ejemplo para incendio):

```
Se ha detectado un incendio en el edificio.

ACCIONES INMEDIATAS:
1. Mantenga la calma
2. Evacue por las escaleras de emergencia
3. NO use ascensores
4. Diríjase al punto de encuentro en el estacionamiento exterior

Bomberos ha sido contactado.
```

**Edita según la situación específica:**

```
🔥 INCENDIO CONFIRMADO EN PISO 10

RESIDENTES DE PISOS 8 AL 12:
- Evacuen INMEDIATAMENTE por escalera de emergencia SUR
- NO usen escalera NORTE (bloqueada por humo)
- NO usen ascensores

RESTO DEL EDIFICIO:
- Permanezcan en sus departamentos
- Cierren puertas y ventanas
- Estén atentos a nuevas instrucciones

PUNTO DE ENCUENTRO:
- Estacionamiento exterior, sector A

Bomberos en camino (ETA: 5 minutos)
```

**Estructura recomendada:**

1. **QUÉ está pasando** (1 línea)
2. **QUIÉN debe actuar** (pisos/áreas específicas)
3. **QUÉ hacer** (pasos numerados)
4. **QUÉ NO hacer** (prohibiciones)
5. **DÓNDE ir** (punto de encuentro)
6. **Estado actual** (bomberos notificados, etc.)

---

### Paso 8: Punto de Encuentro

**Campo:** "Punto de Encuentro"

**Opciones predefinidas:**
- Estacionamiento exterior - Sector A
- Plaza principal del edificio
- Acera frente al edificio (Calle Principal)
- Otro: [especificar]

**Selecciona del menú desplegable.**

**⚠️ Importante:** Asegúrate que el punto de encuentro:
- ✅ Esté **lejos** del edificio (mínimo 50 metros)
- ✅ Sea **accesible** para todos (ancianos, niños, discapacitados)
- ✅ Tenga **espacio** suficiente para todos los residentes
- ❌ NO esté en la dirección del viento (si hay humo)

---

### Paso 9: Canales de Notificación

**Checkboxes:**

- ☑️ **Notificación Push** (Celulares) - **SIEMPRE ACTIVADO**
- ☑️ **SMS** - Recomendado para CRÍTICAS
- ☑️ **Email** - Opcional (para registro)

**Recomendaciones por severidad:**

| Severidad | Push | SMS | Email |
|-----------|------|-----|-------|
| CRÍTICA | ✅ | ✅ | ✅ |
| ALTA | ✅ | ✅ | ⚠️ |
| MEDIA | ✅ | ⚠️ | ❌ |
| BAJA | ✅ | ❌ | ❌ |

**⚠️ Nota:** SMS tiene costo. Úsalo solo cuando sea necesario.

---

### Paso 10: Revisión y Confirmación

**Si la severidad es CRÍTICA:**

Verás un **mensaje de advertencia** en rojo:

```
⚠️ ALERTA CRÍTICA REQUIERE DOBLE AUTORIZACIÓN

Esta alerta:
- Se enviará a XXX residentes
- Sonará a volumen máximo
- Omitirá modo "No Molestar"
- Generará registro permanente

¿Estás seguro de que deseas emitir esta alerta?

[ ] Confirmo que verifiqué la emergencia
[ ] Confirmo que es necesario alertar a todos
```

**Marca ambos checkboxes.**

---

### Paso 11: Vista Previa (Opcional)

1. Haz clic en **"👁️ VISTA PREVIA"**
2. Verás cómo se verá la notificación en el celular
3. Revisa que todo esté correcto
4. Cierra la vista previa

---

### Paso 12: Emitir Alerta

1. Haz clic en **"🚨 EMITIR ALERTA"** (botón naranja grande)
2. Aparecerá un último diálogo de confirmación:

   ```
   ¿EMITIR ALERTA AHORA?
   
   Se notificará a 247 residentes
   
   [CANCELAR]  [SÍ, EMITIR AHORA]
   ```

3. Haz clic en **"SÍ, EMITIR AHORA"**

---

### ✅ Confirmación de Envío

Verás un mensaje de éxito:

```
✅ ALERTA EMITIDA EXITOSAMENTE

ID: ALERT-2026-02-02-001
Tipo: INCENDIO
Severidad: CRÍTICA
Enviada a: 247 residentes
Canales: Push, SMS, Email

Estado: Activa
Confirmaciones: 0/247 (0%)

[VER DETALLES]  [CERRAR]
```

**La alerta está ahora activa y visible en "Alertas Activas".**

---

## 📊 TIPOS DE ALERTAS Y CUÁNDO USARLAS

### 🔥 ALERTA DE INCENDIO

**Cuándo emitir:**
- ✅ Fuego confirmado visualmente
- ✅ Humo denso saliendo de un departamento
- ✅ Alarma de incendios activada + confirmación visual
- ✅ Bomberos en camino

**Cuándo NO emitir:**
- ❌ Humo ligero de cocina
- ❌ Olor a quemado sin llamas
- ❌ Alarma de incendios falsa (sin confirmación)

**Severidad recomendada:** CRÍTICA

**Procedimiento:**
1. Llamar a Bomberos (132) **PRIMERO**
2. Emitir alerta de incendio
3. Iniciar evacuación manual (tocar puertas)
4. Verificar que escaleras estén despejadas
5. Registrar confirmaciones

**Mensaje tipo:**
```
🔥 INCENDIO CONFIRMADO EN [UBICACIÓN]

EVACUACIÓN INMEDIATA:
1. Salgan AHORA por escaleras de emergencia
2. NO usen ascensores
3. Cierren puertas al salir (no con llave)
4. Si hay humo: agáchense, respiren por tela húmeda

PUNTO DE ENCUENTRO: Estacionamiento exterior

Bomberos notificados - ETA: X minutos
```

---

### 🚨 ALERTA DE EVACUACIÓN

**Cuándo emitir:**
- ✅ Amenaza de bomba (después de llamar a carabineros)
- ✅ Riesgo de colapso estructural
- ✅ Fuga de gas masiva
- ✅ Terremoto fuerte (después del sismo)
- ✅ Orden de bomberos/carabineros de evacuar

**Cuándo NO emitir:**
- ❌ Simulacros sin previo aviso
- ❌ Evacuaciones parciales (usa otro tipo)

**Severidad recomendada:** CRÍTICA

**Mensaje tipo:**
```
🚨 EVACUACIÓN TOTAL DEL EDIFICIO

RAZÓN: [Especificar: amenaza, riesgo estructural, etc.]

TODOS LOS RESIDENTES:
1. Salgan INMEDIATAMENTE
2. Tomen lo esencial (llaves, celular, documentos)
3. NO se demoren buscando mascotas/objetos
4. Usen escaleras, NO ascensores
5. Ayuden a ancianos y niños

PUNTO DE ENCUENTRO: [Ubicación]

NO RE-INGRESEN hasta recibir autorización
```

---

### 💧 ALERTA DE INUNDACIÓN

**Cuándo emitir:**
- ✅ Rotura de cañería matriz
- ✅ Fuga importante que afecta varios departamentos
- ✅ Inundación desde el techo/terraza
- ✅ Riesgo de corto circuito por agua

**Cuándo NO emitir:**
- ❌ Fuga menor de un departamento
- ❌ Gotera reparable
- ❌ Inundación ya controlada

**Severidad recomendada:** ALTA o MEDIA

**Mensaje tipo:**
```
💧 INUNDACIÓN EN PISOS [X-Y]

CAUSA: Rotura de cañería en [ubicación]

RESIDENTES AFECTADOS (Pisos X-Y):
- Corten electricidad de sus departamentos
- Muevan objetos de valor a zonas altas
- Eviten contacto con agua (riesgo eléctrico)
- Reporten filtraciones al 📞 [teléfono]

RESTO DEL EDIFICIO:
- Eviten usar agua en exceso
- Corten agua si ven filtraciones

Plomero de emergencia en camino
Agua principal cortada
```

---

### ⚡ ALERTA DE CORTE DE ENERGÍA

**Cuándo emitir:**
- ✅ Apagón prolongado (>1 hora estimada)
- ✅ Falla del generador de emergencia
- ✅ Ascensores detenidos con personas atrapadas

**Cuándo NO emitir:**
- ❌ Cortes programados ya avisados
- ❌ Cortes breves (<15 minutos)

**Severidad recomendada:** MEDIA

**Mensaje tipo:**
```
⚡ CORTE DE ENERGÍA PROLONGADO

DURACIÓN ESTIMADA: [X] horas
CAUSA: [Falla técnica / Corte de compañía]

MEDIDAS:
- Generador activado (solo áreas comunes)
- Ascensores fuera de servicio
- Use escaleras
- Conserve batería de celular
- Abra refrigerador solo si es necesario

GENERADOR ALIMENTA:
✅ Luces de pasillos
✅ Bombas de agua
❌ Departamentos (sin energía)

Estimamos reestablecimiento a las [HH:MM]
```

---

### 🛠️ ALERTA DE FALLA DE SISTEMA

**Cuándo emitir:**
- ✅ Ascensores atascados con personas
- ✅ Falla de bomba de agua (sin agua en pisos altos)
- ✅ Falla de calefacción en invierno
- ✅ Portón de estacionamiento atascado

**Severidad recomendada:** MEDIA o BAJA

**Mensaje tipo:**
```
🛠️ FALLA EN SISTEMA DE [ASCENSORES/AGUA/etc.]

SITUACIÓN:
- [Descripción breve del problema]
- [Afectación: quiénes están afectados]

SOLUCIÓN TEMPORAL:
- [Alternativa: usar escaleras, etc.]

ESTADO:
- Técnico notificado
- ETA reparación: [X] horas
- Prioridad: [Alta/Media/Baja]

Actualizaremos cuando esté resuelto
```

---

### 📢 ALERTA GENERAL

**Cuándo emitir:**
- ✅ Comunicados importantes no-emergencia
- ✅ Pruebas del sistema (con aviso previo)
- ✅ Reuniones de emergencia
- ✅ Cierre de áreas comunes por seguridad

**Severidad recomendada:** BAJA

**Mensaje tipo:**
```
📢 COMUNICADO IMPORTANTE

[Título del comunicado]

[Descripción del asunto]

[Acciones requeridas o información relevante]

[Contacto para consultas]

Gracias por su atención.
```

---

## ❌ PROCEDIMIENTO DE CANCELACIÓN

### Cuándo Cancelar una Alerta

**Cancela INMEDIATAMENTE si:**
- ✅ La emergencia fue **falsa alarma**
- ✅ La situación fue **resuelta/controlada**
- ✅ La información era **incorrecta**
- ✅ Se emitió **por error**

**NO canceles si:**
- ❌ La emergencia sigue activa (aunque esté controlándose)
- ❌ Solo una parte fue resuelta
- ❌ Quedan residentes sin confirmar seguridad

---

### Paso 1: Localizar la Alerta Activa

1. En el panel de Alertas, busca la sección **"🔴 Alertas Activas"**
2. Verás una tarjeta con:
   ```
   🔥 INCENDIO DETECTADO
   Piso 10 - CRÍTICA
   Emitida: hace 5 min
   Confirmaciones: 45/247 (18%)
   
   [CANCELAR]  [VER DETALLES]
   ```

---

### Paso 2: Iniciar Cancelación

1. Haz clic en **"CANCELAR"**
2. Aparecerá un diálogo:

   ```
   ⚠️ CANCELAR ALERTA
   
   ¿Estás seguro de cancelar esta alerta?
   
   Razón de cancelación (obligatorio):
   
   [ ] Falsa alarma
   [ ] Emergencia controlada
   [ ] Error de emisión
   [ ] Otra: _______________
   
   Explica brevemente:
   [___________________________________]
   [___________________________________]
   
   [VOLVER]  [CONFIRMAR CANCELACIÓN]
   ```

---

### Paso 3: Indicar Razón

1. **Selecciona una razón** del checkbox
2. **Escribe una explicación** breve (50-200 caracteres)

**Ejemplos:**

**Falsa alarma:**
```
Alarma de incendios activada por vapor de cocina. 
Bomberos verificaron - sin fuego real. Edificio seguro.
```

**Emergencia controlada:**
```
Incendio extinguido por bomberos. Piso 10 seguro. 
Residentes pueden retornar. Ventilen el área.
```

**Error de emisión:**
```
Alerta enviada por error durante prueba del sistema. 
No hay emergencia. Disculpen las molestias.
```

---

### Paso 4: Confirmar Cancelación

1. Haz clic en **"CONFIRMAR CANCELACIÓN"**
2. El sistema enviará una **notificación de cancelación** a todos:

   ```
   ✅ ALERTA CANCELADA
   
   La alerta anterior ha sido cancelada.
   
   Razón: Falsa alarma - Alarma de incendios 
          activada por vapor de cocina
   
   NO hay emergencia.
   Pueden retornar a sus actividades normales.
   
   Disculpen las molestias.
   ```

3. Todos los celulares recibirán:
   - 🔊 Sonido de cancelación (tonos descendentes, 3 seg)
   - 📳 Vibración corta
   - 💬 Notificación verde con el mensaje

---

### ✅ Confirmación de Cancelación

Verás:

```
✅ ALERTA CANCELADA

ID: ALERT-2026-02-02-001
Cancelada: 02/02/2026 15:45
Duración total: 8 minutos

Confirmaciones finales: 89/247 (36%)
Notificación de cancelación enviada a todos

[CERRAR]
```

La alerta desaparece de "Alertas Activas" y pasa al historial.

---

## ✅ VERIFICACIÓN DE CONFIRMACIONES

### ¿Por qué es importante?

Después de una emergencia, necesitas saber:
- ¿Cuántas personas están a salvo?
- ¿Quién NO ha confirmado?
- ¿Necesitas enviar ayuda a alguien?

---

### Paso 1: Acceder a Confirmaciones

**Durante una alerta activa:**

1. En "Alertas Activas", haz clic en **"VER DETALLES"** de la alerta
2. Se abrirá un panel con pestañas:
   - 📊 **Resumen**
   - ✅ **Confirmaciones**
   - 📍 **Por Piso**
   - 📈 **Estadísticas**

---

### Paso 2: Ver Confirmaciones en Tiempo Real

**Pestaña "Confirmaciones":**

Verás una lista en tiempo real:

```
✅ CONFIRMADOS (89)                    ⏱️ PENDIENTES (158)
─────────────────────────            ─────────────────────
✅ Juan Pérez (P12-1205)              ⏱️ María González (P10-1002)
   Hace 2 min                            Sin confirmar
   
✅ Ana López (P11-1103)               ⏱️ Pedro Ramírez (P10-1005)
   Hace 5 min                            Sin confirmar
   
✅ Carlos Díaz (P12-1208)             ⏱️ Sofía Muñoz (P9-901)
   Hace 1 min                            Sin confirmar
   
[... 84 más]                          [... 155 más]
```

**Información mostrada:**
- ✅ Confirmado / ⏱️ Pendiente
- Nombre del residente
- Ubicación (Piso - Dpto)
- Tiempo desde confirmación / "Sin confirmar"

---

### Paso 3: Filtrar por Piso

**Pestaña "Por Piso":**

```
PISO 12 (Crítico) - 15/18 confirmados (83%)
─────────────────────────────────────────────
✅ 1201 - Juan Pérez         (Hace 2 min)
✅ 1203 - Ana López          (Hace 5 min)
⏱️ 1202 - María García       (SIN CONFIRMAR) ⚠️
✅ 1204 - Pedro Díaz         (Hace 3 min)
⏱️ 1205 - [VACÍO]
...

PISO 11 (Afectado) - 12/16 confirmados (75%)
─────────────────────────────────────────────
...

PISO 10 (Crítico) - 8/20 confirmados (40%) ⚠️⚠️
─────────────────────────────────────────────
⏱️ 1001 - Carlos Muñoz      (SIN CONFIRMAR) ⚠️
⏱️ 1002 - Sofía Ramírez     (SIN CONFIRMAR) ⚠️
✅ 1003 - Luis Torres        (Hace 8 min)
⏱️ 1004 - [DESCONOCIDO]      (NO REGISTRADO)
...
```

**Prioriza:**
- 🔴 Pisos con % bajo de confirmación
- ⚠️ Residentes marcados "SIN CONFIRMAR" por >10 min
- ❓ Departamentos "DESCONOCIDO" (sin info de residentes)

---

### Paso 4: Acciones de Seguimiento

**Si hay residentes sin confirmar >15 minutos:**

1. **Llamar por teléfono**
   - Haz clic en el nombre → Verás teléfono
   - Llama para verificar que estén bien

2. **Enviar a personal**
   - Si no contesta, envía a portero/seguridad
   - Tocar puerta, verificar presencia

3. **Notificar a bomberos**
   - Si no puedes contactar, informa a bomberos
   - Proporciona lista de dptos sin confirmar

**Exportar lista de pendientes:**

1. Click en **"📥 EXPORTAR PENDIENTES"**
2. Se descarga `pendientes-alert-001.csv`
3. Úsalo para coordinación con bomberos/rescate

---

### Paso 5: Estadísticas

**Pestaña "Estadísticas":**

```
📊 MÉTRICAS DE LA ALERTA

Tiempo transcurrido:        12 minutos
Tasa de confirmación:       36% (89/247)
Tiempo promedio respuesta:  4.2 minutos
Respuesta más rápida:       15 segundos
Respuesta más lenta:        11 minutos

CONFIRMACIONES POR MINUTO:
Min 1:  ████████████████ 42 (17%)
Min 2:  ████████ 18 (7%)
Min 3:  ████ 9 (4%)
Min 4:  ██ 6 (2%)
Min 5:  ██ 5 (2%)
...

CONFIRMACIONES POR PISO:
P12: ████████████████ 83%
P11: ████████████ 75%
P10: ██████ 40% ⚠️
P9:  ████████████████ 85%
...
```

Usa esto para:
- Identificar pisos problemáticos
- Ver tendencias de respuesta
- Generar reportes post-emergencia

---

## 💡 MEJORES PRÁCTICAS

### ✅ HACER

1. **Verificar antes de emitir**
   - Confirma visualmente la emergencia
   - Llama a servicios de emergencia PRIMERO
   - Verifica que no haya otro admin enviando alerta

2. **Ser claro y directo**
   - Usa lenguaje simple
   - Instrucciones numeradas
   - Especifica QUÉ hacer, no solo QUÉ está pasando

3. **Mantener la calma**
   - No uses lenguaje alarmista innecesario
   - Sé autoritativo pero no agresivo
   - Proporciona información tranquilizadora cuando sea apropiado

4. **Seguimiento constante**
   - Monitorea confirmaciones cada 2-3 minutos
   - Actualiza si la situación cambia
   - Cancela cuando sea seguro

5. **Documentar todo**
   - Toma notas de acciones tomadas
   - Guarda screenshots de confirmaciones
   - Genera reporte post-emergencia

---

### ❌ NO HACER

1. **NO envíes alertas de prueba sin previo aviso**
   - Avisa 24-48 horas antes
   - Usa severidad BAJA
   - Incluye "ESTO ES UN SIMULACRO" en el título

2. **NO uses el sistema para comunicados regulares**
   - NO es para avisos de asambleas
   - NO es para cobros de gastos comunes
   - NO es para quejas vecinales
   - Solo para emergencias y asuntos críticos

3. **NO canceles prematuramente**
   - Espera confirmación oficial (bomberos, etc.)
   - Verifica que todos estén informados
   - Asegúrate que sea seguro

4. **NO ignores confirmaciones pendientes**
   - Después de 10 min, contacta a residentes
   - Después de 20 min, envía personal
   - Después de 30 min, notifica a bomberos

5. **NO edites una alerta activa**
   - Si la información cambió, cancela y envía nueva
   - Evita confusión con mensajes contradictorios

---

## 🚒 PROTOCOLO DE EMERGENCIA POR TIPO

### Protocolo: INCENDIO 🔥

**ANTES de emitir alerta:**

```
┌─────────────────────────────────────┐
│ 1. Llamar Bomberos (132)           │
│ 2. Verificar ubicación del fuego   │
│ 3. Activar alarma del edificio     │
│ 4. Enviar personal a verificar     │
│ 5. Despejar escaleras emergencia   │
└─────────────────────────────────────┘
```

**DURANTE:**

1. **00:00** - Emitir alerta (Severidad: CRÍTICA)
2. **00:30** - Tocar puertas pisos afectados
3. **02:00** - Verificar confirmaciones
4. **05:00** - Reportar a bomberos residentes sin confirmar
5. **Cada 5 min** - Actualizar status si cambia

**DESPUÉS:**

1. Esperar autorización de bomberos para re-ingreso
2. Enviar alerta de cancelación cuando sea seguro
3. Generar reporte de incidente
4. Reunión con administración (72 horas)
5. Actualizar protocolo según aprendizajes

---

### Protocolo: EVACUACIÓN 🚨

**ANTES:**

```
┌─────────────────────────────────────┐
│ 1. Confirmar RAZÓN de evacuación   │
│ 2. Llamar Carabineros (133) si     │
│    aplica (amenaza, delito)        │
│ 3. Coordinar punto de encuentro    │
│ 4. Despejar rutas de escape        │
│ 5. Preparar lista de residentes    │
└─────────────────────────────────────┘
```

**DURANTE:**

1. **00:00** - Emitir alerta (Severidad: CRÍTICA)
2. **00:00** - Personal al punto de encuentro
3. **00:30** - Tocar todas las puertas
4. **02:00** - Contar residentes en punto de encuentro
5. **05:00** - Cruzar con lista de confirmaciones app
6. **10:00** - Reportar faltantes a autoridades

**DESPUÉS:**

1. Esperar "todo despejado" de autoridades
2. Verificar edificio antes de re-ingreso
3. Enviar alerta de cancelación
4. Reunión informativa con residentes
5. Evaluar protocolo

---

### Protocolo: INUNDACIÓN 💧

**ANTES:**

```
┌─────────────────────────────────────┐
│ 1. Cortar agua principal           │
│ 2. Llamar plomero de emergencia    │
│ 3. Cortar electricidad si necesario│
│ 4. Evaluar extensión del daño      │
│ 5. Preparar equipos (baldes, etc.) │
└─────────────────────────────────────┘
```

**DURANTE:**

1. **00:00** - Cortar agua/electricidad
2. **00:00** - Emitir alerta (Severidad: ALTA)
3. **00:15** - Personal a pisos afectados
4. **00:30** - Evaluar daños
5. **Cada hora** - Actualizar progreso de reparación

**DESPUÉS:**

1. Verificar reparación completa
2. Verificar electricidad segura (sin cortos)
3. Restaurar servicios gradualmente
4. Enviar alerta de resolución
5. Coordinar reparaciones de daños

---

## ❓ PREGUNTAS FRECUENTES

### ¿Puedo probar el sistema?

**Sí**, pero siguiendo este protocolo:

1. **Avisar con 48 horas de anticipación**
   - Email a todos los residentes
   - Carteles en lobby
   - Mensaje en grupos de WhatsApp

2. **Usar severidad BAJA**

3. **Incluir en el título:**
   ```
   🧪 PRUEBA DEL SISTEMA - NO ES EMERGENCIA REAL
   ```

4. **Horario apropiado:**
   - Lunes a Viernes
   - 10:00 - 17:00 (horario laboral)
   - NUNCA de noche (22:00-07:00)

---

### ¿Qué hago si envío una alerta por error?

**CANCELA INMEDIATAMENTE:**

1. Haz clic en CANCELAR (Paso 1-4 de Cancelación)
2. Razón: "Error de emisión"
3. Mensaje:
   ```
   Alerta enviada por error durante [explicar situación].
   NO hay emergencia real.
   Disculpen las molestias.
   ```

4. Llama a la administración para reportar
5. Documenta el incidente

---

### ¿Cuántas alertas puedo enviar simultáneamente?

**Una sola alerta activa a la vez.**

Si hay múltiples emergencias:
1. Prioriza la más crítica
2. Envía primera alerta
3. Menciona brevemente la segunda emergencia en el mensaje
4. Cuando la primera se resuelva, envía alerta de la segunda

**Ejemplo:**
```
🔥 INCENDIO EN PISO 10

[Instrucciones de evacuación]

NOTA: También hay corte de energía. Esto será 
abordado después de controlar el incendio.
```

---

### ¿Funcionará si hay corte de internet?

**Parcialmente.**

- ❌ Notificaciones push NO llegarán sin internet
- ✅ SMS llegará si Twilio está configurado
- ✅ Alarmas de edificio (físicas) funcionan independientemente

**Recomendación:**
- Mantén plan de respaldo tradicional (alarmas, megáfono, tocar puertas)
- No dependas 100% del sistema digital

---

### ¿Los residentes pueden silenciar las alertas?

**Depende del tipo:**

- 🔴 **CRÍTICAS:** Pueden, pero NO se recomienda. Configúralas para omitir "No Molestar"
- 🟠 **ALTAS:** Sí, si tienen "No Molestar" activo
- 🟡 **MEDIAS:** Sí
- 🟢 **BAJAS:** Sí

**Educación a residentes:**
- Explica la importancia de mantener notificaciones activas
- Incluye en guía de instalación
- Recuerda en asambleas

---

### ¿Qué hago con residentes que no tienen smartphone?

**Alternativas:**

1. **SMS a teléfono básico** (si tienen)
2. **Teléfono fijo registrado** (llamada manual)
3. **Vecinos** (pide a vecinos que avisen)
4. **Tocar puerta** (personal del edificio)
5. **Carteles en puertas** (post-emergencia)

**Mantén una lista de residentes sin smartphone para contacto manual.**

---

## 📞 CONTACTOS DE EMERGENCIA

### Chile - Números Nacionales

- 🚒 **Bomberos:** 132
- 👮 **Carabineros:** 133
- 🚑 **SAMU (Ambulancia):** 131
- ⚠️ **Emergencias General:** 911
- 🏥 **Información Salud:** 600 360 7777

### Contactos del Edificio

- 🏢 **Administración:** +56 9 XXXX XXXX
- 🚪 **Portería:** Interno XXX
- 🔧 **Mantenimiento 24/7:** +56 9 XXXX XXXX
- 💧 **Plomero Emergencia:** +56 9 XXXX XXXX
- ⚡ **Electricista Emergencia:** +56 9 XXXX XXXX

### Soporte Técnico del Sistema

- 📧 **Email:** soporte@neos-tech.cl
- 📱 **WhatsApp:** +56 9 XXXX XXXX
- ⏰ **Horario:** 24/7 para emergencias

---

## 📚 DOCUMENTOS RELACIONADOS

- [Guía de Instalación para Residentes](GUIA-INSTALACION-APP-RESIDENTES.md)
- [Protocolo de Emergencias Completo](PROTOCOLO-EMERGENCIAS.md)
- [Documentación Técnica del Sistema](SISTEMA-ALERTAS-EMERGENCIA.md)
- [Especificación de Sonidos](SONIDOS-EMERGENCIA.md)

---

## ✅ CHECKLIST DE PREPARACIÓN

Antes de tu primer turno usando el sistema:

- [ ] Leí este manual completamente
- [ ] Practiqué acceder al dashboard
- [ ] Sé cómo emitir una alerta de prueba
- [ ] Conozco los 6 tipos de alertas
- [ ] Sé cuándo usar cada severidad
- [ ] Practiqué cancelar una alerta
- [ ] Sé cómo ver confirmaciones
- [ ] Tengo números de emergencia a mano
- [ ] Sé a quién contactar en caso de duda
- [ ] Entiendo mis responsabilidades

**Si todos los items están ✅, estás listo para operar el sistema.**

---

**Preparado por:** Equipo Técnico NeosTech  
**Versión:** 1.0  
**Última actualización:** Febrero 2026  

**La seguridad de los residentes está en tus manos. Usa el sistema responsablemente.** 🟠
