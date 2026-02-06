# 🧪 PRUEBAS EN VIVO - SISTEMA RFID

## ✅ SERVICIOS ACTIVOS (28-01-2026 20:53)

```
✅ Dashboard Web:    http://localhost:5000 (ACTIVO)
✅ Gateway C#:       PID 18648 (Uptime: 6 minutos)
✅ Lectora RFID:     192.168.1.200:60000 (Conectada)
```

---

## 🎯 PRUEBA 1: PRIMER TAG RFID (INICIO)

### Objetivo
Detectar el primer tag RFID y verificar el flujo completo

### Pasos

1. **En el Dashboard (ya abierto):**
   - Login: `admin` / `admin123`
   - Ir al tab **"Control"**
   - Sección: **"Tags Detectados en Vivo"**

2. **Preparar observación:**
   - 👀 Observa la terminal del Gateway (debe decir "Acerca un tag RFID al lector...")
   - 👀 Observa el Dashboard (debe mostrar área de tags en vivo)

3. **ACERCAR TAG A LA LECTORA:**
   - 📡 Acerca tu tag RFID a la antena
   - ⏱️ Espera 1-2 segundos

4. **Verificar detección:**
   
   **En la Terminal del Gateway verás:**
   ```
   [TAG] ID: E200341E8311018034000001
   [CLOUD] Enviando a Cloud Function...
   [CLOUD] Respuesta: { ... }
   ```

   **En el Dashboard verás:**
   ```
   🔔 Nuevo tag detectado
   ID: E200341E8311018034000001
   Hora: 20:53:45
   ```

5. **¿Qué debería pasar?**
   - ✅ Gateway detecta el tag
   - ✅ Envía a Cloud Function
   - ✅ Dashboard muestra el tag
   - ✅ Se guarda en Firestore (collection: rfid_tags)

---

## 🎯 PRUEBA 2: AGREGAR TAG A WHITELIST

### Objetivo
Autorizar un tag para que abra el portón

### Pasos

1. **Copiar ID del tag** (del paso anterior)

2. **En Dashboard:**
   - Ir a tab **"Listas"**
   - Sub-tab **"WhiteList"**
   - Click en **"+ Agregar a WhiteList"**

3. **Llenar formulario:**
   ```
   ID del Tag:  E200341E8311018034000001
   Nombre:      Tag de Prueba Admin
   Tipo:        Residente
   Descripción: Tag para pruebas del sistema
   ```

4. **Guardar** y esperar confirmación

5. **Verificar en la lista:**
   - Debe aparecer el tag en la tabla de WhiteList
   - Estado: Activo (verde)

---

## 🎯 PRUEBA 3: ACCESO AUTORIZADO (TAG EN WHITELIST)

### Objetivo
Verificar que un tag autorizado activa el relay

### Pasos

1. **Volver al tab "Control"**

2. **Acercar el tag nuevamente**

3. **Verificar en Terminal del Gateway:**
   ```
   [TAG] ID: E200341E8311018034000001
   [CLOUD] Enviando a Cloud Function...
   [CLOUD] Respuesta: { "status": "allowed", "relay": 1, "duration": 1000 }
   [RELAY] ✅ Activando relay 1 por 1000ms
   [RELAY] ✅ Relay desactivado
   ```

4. **Verificar en Dashboard:**
   ```
   ✅ ACCESO PERMITIDO
   Usuario: Tag de Prueba Admin
   Hora: 20:55:12
   Punto de acceso: Portón Triwe
   ```

5. **¿Qué debería pasar?**
   - ✅ Gateway recibe respuesta "allowed"
   - ✅ Activa relay 1 por 1 segundo
   - ✅ Dashboard muestra mensaje verde "ACCESO PERMITIDO"
   - ✅ Se guarda registro en access_logs
   - 🚪 **EL PORTÓN DEBERÍA ABRIRSE** (si está conectado)

---

## 🎯 PRUEBA 4: ANTI-SPAM (MISMO TAG EN <5 SEGUNDOS)

### Objetivo
Verificar que el sistema ignora lecturas duplicadas rápidas

### Pasos

1. **Acercar el tag a la lectora**
2. **Espera 1 segundo**
3. **Acercar el mismo tag nuevamente**

4. **Verificar en Terminal:**
   ```
   [TAG] ID: E200341E8311018034000001
   [ANTI-SPAM] ⏭️ Ignorado - Leído hace 2 segundos
   ```

5. **Esperar 6 segundos**

6. **Acercar el tag nuevamente**

7. **Verificar que AHORA SÍ se procesa:**
   ```
   [TAG] ID: E200341E8311018034000001
   [CLOUD] Enviando a Cloud Function...
   ```

---

## 🎯 PRUEBA 5: MOVER TAG A BLACKLIST

### Objetivo
Bloquear un tag para denegar acceso

### Pasos

1. **En Dashboard, tab "Listas" > "WhiteList"**

2. **Buscar el tag de prueba**

3. **Click en el botón "Mover a BlackList"**

4. **Confirmar el movimiento**

5. **Ir a sub-tab "BlackList"**
   - Verificar que el tag ahora está aquí

6. **Volver a tab "Control"**

7. **Acercar el tag a la lectora**

8. **Verificar en Terminal:**
   ```
   [TAG] ID: E200341E8311018034000001
   [CLOUD] Respuesta: { "status": "denied", "reason": "blacklist" }
   [ACCESO] ❌ DENEGADO - Tag en BlackList
   ```

9. **Verificar en Dashboard:**
   ```
   🚫 ACCESO DENEGADO
   Razón: Tag bloqueado
   Hora: 20:58:34
   ```

10. **¿Qué debería pasar?**
    - ✅ Gateway NO activa el relay
    - ✅ Dashboard muestra mensaje rojo "ACCESO DENEGADO"
    - ✅ Se guarda registro con status "denied"
    - 🚪 **EL PORTÓN NO SE ABRE**

---

## 🎯 PRUEBA 6: TAG DESCONOCIDO

### Objetivo
Verificar comportamiento con tags no registrados

### Pasos

1. **Usar un tag diferente** (no registrado en WhiteList ni BlackList)
   - O eliminar el tag de prueba de BlackList

2. **Acercar el tag desconocido**

3. **Verificar en Terminal:**
   ```
   [TAG] ID: NUEVO123456789
   [CLOUD] Respuesta: { "status": "unknown" }
   [ACCESO] ⚠️ Tag no registrado
   ```

4. **Verificar en Dashboard:**
   ```
   ⚠️ TAG NO REGISTRADO
   ID: NUEVO123456789
   Hora: 21:00:15
   → Click aquí para agregar a WhiteList
   ```

5. **¿Qué debería pasar?**
   - ✅ Gateway NO activa el relay
   - ✅ Dashboard muestra mensaje amarillo "TAG NO REGISTRADO"
   - ✅ Se guarda en rfid_tags para gestión posterior
   - ✅ Opción rápida para agregar a WhiteList

---

## 🎯 PRUEBA 7: VERIFICAR REGISTROS

### Objetivo
Confirmar que todos los accesos se guardaron

### Pasos

1. **En Dashboard, ir a tab "Registros"**

2. **Verificar que aparecen:**
   - ✅ Primer acceso (desconocido/unknown)
   - ✅ Segundo acceso (permitido/allowed)
   - ✅ Acceso ignorado por anti-spam (no debería aparecer)
   - ✅ Acceso denegado (denied)
   - ✅ Tag desconocido (unknown)

3. **Verificar datos de cada registro:**
   - Fecha y hora correcta
   - ID del tag
   - Estado (allowed/denied/unknown)
   - Punto de acceso (Portón Triwe)

4. **Probar filtros:**
   - Filtrar solo "Permitidos" (verde)
   - Filtrar solo "Denegados" (rojo)
   - Filtrar solo "Desconocidos" (amarillo)
   - Filtrar por fecha (hoy)

---

## 🎯 PRUEBA 8: VINCULAR TAG CON RESIDENTE

### Objetivo
Asociar un tag a un usuario del condominio

### Pasos

1. **En Dashboard, tab "Residentes y Vehículos"**

2. **Click en "+ Agregar Residente"**

3. **Llenar formulario:**
   ```
   Nombre:     Juan Pérez
   Email:      juan.perez@email.com
   Teléfono:   987654321
   Manzana:    A
   Lote:       15
   Tag RFID:   E200341E8311018034000001
   Estado:     Activo
   ```

4. **Guardar**

5. **Volver a tab "Control"**

6. **Acercar el tag a la lectora**

7. **Verificar en Dashboard:**
   ```
   ✅ ACCESO PERMITIDO
   👤 Juan Pérez
   📍 Manzana A - Lote 15
   Hora: 21:05:42
   ```

8. **¿Qué debería pasar?**
   - ✅ Dashboard muestra nombre del residente (no solo el ID)
   - ✅ Muestra ubicación (Mz A Lt 15)
   - ✅ Registro en access_logs incluye user_id

---

## 🎯 PRUEBA 9: AGREGAR VEHÍCULO

### Objetivo
Vincular un vehículo a un residente con tag RFID

### Pasos

1. **En la lista de residentes, buscar "Juan Pérez"**

2. **Click en el residente**

3. **En sección "Vehículos", click "+ Agregar Vehículo"**

4. **Llenar formulario:**
   ```
   Patente:    ABC-123
   Marca:      Toyota
   Modelo:     Corolla
   Color:      Blanco
   Año:        2024
   Tag RFID:   VEHICULO123456789
   ```

5. **Guardar**

6. **Acercar el tag del vehículo a la lectora**

7. **Verificar en Dashboard:**
   ```
   ✅ ACCESO PERMITIDO
   🚗 Toyota Corolla ABC-123
   👤 Propietario: Juan Pérez (Mz A Lt 15)
   Hora: 21:08:20
   ```

---

## 🎯 PRUEBA 10: GRÁFICOS Y ESTADÍSTICAS

### Objetivo
Verificar visualización de datos

### Pasos

1. **En Dashboard, tab "Gráficos"**

2. **Verificar que se muestran:**
   - 📊 **Accesos por Hora** (últimas 24h)
   - 📊 **Accesos por Día** (última semana)
   - 📊 **Tipo de Acceso** (Permitidos vs Denegados)
   - 📊 **Top 10 Usuarios** (más accesos)

3. **Verificar datos:**
   - Deben reflejar las pruebas realizadas
   - Gráfico por hora debe mostrar pico en la hora actual
   - Tipo de acceso debe mostrar permitidos y denegados

4. **Probar exportación:**
   - Click en "Exportar a Excel"
   - Click en "Exportar a PDF"
   - Verificar que se descargan los archivos

---

## 📊 RESULTADOS ESPERADOS

| Prueba | Componente | Estado Esperado |
|--------|-----------|-----------------|
| 1. Detección básica | Gateway + Dashboard | ✅ Tag detectado |
| 2. Agregar a WhiteList | Dashboard + Firestore | ✅ Tag autorizado |
| 3. Acceso autorizado | Gateway + Relay | ✅ Portón abre |
| 4. Anti-spam | Gateway | ✅ Duplicados ignorados |
| 5. BlackList | Gateway + Dashboard | 🚫 Acceso denegado |
| 6. Tag desconocido | Sistema completo | ⚠️ Detectado y guardado |
| 7. Registros | Firestore + Dashboard | ✅ Todos guardados |
| 8. Vinculación residente | Dashboard | ✅ Muestra nombre |
| 9. Vehículo | Dashboard | ✅ Muestra vehículo |
| 10. Gráficos | Dashboard | ✅ Estadísticas visuales |

---

## 🐛 SI ALGO FALLA

### Tag no se detecta
```powershell
# Verificar lectora
Test-NetConnection 192.168.1.200 -Port 60000

# Ver logs del Gateway (debe estar corriendo)
# Buscar mensaje: "💡 Acerca un tag RFID al lector..."
```

### Dashboard no muestra tag
```
1. Presiona F12 en el navegador
2. Ve a tab "Console"
3. Busca errores en rojo
4. Verifica conexión a Firestore
```

### Relay no activa
```
1. Verificar que el tag está en WhiteList
2. Ver logs del Gateway: debe decir "[RELAY] Activando..."
3. Verificar conexión física del relay
4. Revisar configuración en gateway.config.json
```

### Cloud Function no responde
```
1. Verificar URL en gateway.config.json
2. Ver logs: firebase functions:log --only rfid-gateway
3. Revisar permisos de Firestore
```

---

## ✅ CHECKLIST DE PRUEBAS

- [ ] Dashboard carga correctamente
- [ ] Login funciona
- [ ] Gateway detecta tag RFID
- [ ] Tag aparece en Dashboard en tiempo real
- [ ] Tag se puede agregar a WhiteList
- [ ] Tag autorizado activa relay
- [ ] Anti-spam funciona (ignora duplicados <5s)
- [ ] Tag en BlackList es denegado
- [ ] Tag desconocido se detecta y guarda
- [ ] Registros se guardan en Firestore
- [ ] Residente se puede crear y vincular
- [ ] Vehículo se puede agregar con tag
- [ ] Gráficos muestran estadísticas
- [ ] Exportar Excel funciona
- [ ] Exportar PDF funciona

---

**Fecha de pruebas:** 28-01-2026  
**Gateway PID:** 18648  
**Dashboard:** http://localhost:5000  
**Lectora:** Portón Triwe (192.168.1.200:60000)

---

🚀 **¡COMIENZA LAS PRUEBAS!**

Empieza con la **PRUEBA 1** y avanza secuencialmente.
