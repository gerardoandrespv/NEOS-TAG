# ========================================
# GUÍA DE PRUEBAS - SISTEMA RFID NEOTECH
# ========================================

## ✅ ESTADO DEL SISTEMA

### 1. Dashboard Web
- ✅ **Corriendo en:** http://localhost:5000
- ✅ **Estado:** Activo
- 📊 **Credenciales de prueba:**
  - Usuario: `admin`
  - Password: `admin123`

### 2. Gateway C# (.NET 8.0)
- ✅ **Corriendo en:** localhost:8080
- ✅ **Estado:** Activo y conectado
- 📡 **Lectoras configuradas:**
  - Portón Triwe: 192.168.1.200:60000
  - Portón Principal: 192.168.1.101:60000
- ⏱️ **Anti-spam:** 5 segundos
- 🔄 **Modo:** Polling cada 500ms

### 3. Cloud Function
- 🌐 **URL:** https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway
- 📦 **Función:** Procesar tags y validar accesos

### 4. Base de Datos
- 🔥 **Firestore:** neos-tech
- 📁 **Colecciones activas:** 9
  - users (residentes)
  - whitelist (tags autorizados)
  - blacklist (tags bloqueados)
  - access_logs (registros)
  - rfid_tags (tags detectados)
  - vehicles
  - blocks
  - access_points
  - login_logs

---

## 🧪 PRUEBAS A REALIZAR

### PRUEBA 1: Verificar Dashboard
**Objetivo:** Confirmar que el panel web está funcional

1. Abrir navegador en: http://localhost:5000
2. Hacer login:
   - Usuario: `admin`
   - Password: `admin123`
3. Verificar que carga correctamente
4. ✅ **Resultado esperado:** Dashboard carga sin errores

---

### PRUEBA 2: Lectura de Tag RFID
**Objetivo:** Confirmar que la lectora detecta tags

1. En el Dashboard, ir al tab **"Control"**
2. Buscar la sección **"Tags Detectados en Vivo"**
3. **Acercar un tag RFID a la lectora**
4. Observar en la consola del Gateway que se registra
5. ✅ **Resultado esperado:** 
   - Gateway muestra: `[TAG] ID: XXXXXXXXXXXXXXXX`
   - Dashboard muestra el tag en tiempo real

---

### PRUEBA 3: WhiteList - Acceso Permitido
**Objetivo:** Verificar que tags autorizados abren el portón

**PASO 1: Agregar tag a WhiteList**
1. En Dashboard, ir a tab **"Listas"**
2. Pestaña **"WhiteList"**
3. Click en **"Agregar a WhiteList"**
4. Ingresar:
   - ID del Tag: (el que detectaste antes)
   - Nombre: "Tag de Prueba"
   - Tipo: "Residente"
5. Guardar

**PASO 2: Probar acceso**
1. Volver al tab **"Control"**
2. Acercar el tag nuevamente
3. ✅ **Resultado esperado:**
   - Dashboard muestra: **"✅ Acceso Permitido"** (fondo verde)
   - Gateway muestra: `[ACCESO] ✅ Permitido`
   - Console de Gateway: `[CLOUD] Respuesta: { "status": "allowed" }`

---

### PRUEBA 4: BlackList - Acceso Denegado
**Objetivo:** Verificar que tags bloqueados no abren el portón

**PASO 1: Mover tag a BlackList**
1. En tab **"Listas"**, pestaña **"WhiteList"**
2. Buscar el tag de prueba
3. Click en **"Mover a BlackList"**
4. Confirmar

**PASO 2: Probar acceso**
1. Volver al tab **"Control"**
2. Acercar el tag
3. ✅ **Resultado esperado:**
   - Dashboard muestra: **"🚫 Acceso Denegado"** (fondo rojo)
   - Gateway muestra: `[ACCESO] ❌ Denegado - En BlackList`

---

### PRUEBA 5: Tag Desconocido
**Objetivo:** Verificar comportamiento con tags no registrados

1. Crear un tag nuevo en **"Listas" > "Tags RFID"**
2. **NO agregarlo** a WhiteList ni BlackList
3. Acercar el tag a la lectora
4. ✅ **Resultado esperado:**
   - Dashboard muestra: **"⚠️ Tag No Registrado"** (fondo amarillo)
   - Se guarda en `rfid_tags` collection
   - Aparece en la lista para posterior gestión

---

### PRUEBA 6: Registros de Acceso
**Objetivo:** Confirmar que se guardan todos los accesos

1. En Dashboard, ir a tab **"Registros"**
2. Verificar que aparecen los accesos recientes:
   - Tag permitido (verde)
   - Tag denegado (rojo)
   - Tag desconocido (amarillo)
3. Verificar que se pueden filtrar por:
   - Fecha
   - Tipo de acceso
   - Tag específico
4. ✅ **Resultado esperado:** Todos los eventos se registraron correctamente

---

### PRUEBA 7: Gráficos y Estadísticas
**Objetivo:** Verificar visualización de datos

1. En Dashboard, ir a tab **"Gráficos"**
2. Verificar que se muestran:
   - **Gráfico por Hora:** Accesos en las últimas 24h
   - **Gráfico Semanal:** Accesos por día
   - **Tipo de Acceso:** Permitidos vs Denegados
   - **Top 10 Usuarios:** Más accesos
3. ✅ **Resultado esperado:** Gráficos se actualizan con datos reales

---

### PRUEBA 8: Exportar Reportes
**Objetivo:** Confirmar generación de reportes

1. En tab **"Registros"**, click en **"Exportar"**
2. Probar:
   - **Exportar a Excel**
   - **Exportar a PDF**
3. ✅ **Resultado esperado:** 
   - Archivos se descargan correctamente
   - Contienen los datos de accesos

---

### PRUEBA 9: Gestión de Residentes
**Objetivo:** Vincular tags con usuarios

**PASO 1: Crear residente**
1. En tab **"Residentes y Vehículos"**
2. Click en **"Agregar Residente"**
3. Llenar formulario:
   - Nombre: "Juan Pérez"
   - Email: "juan@example.com"
   - Teléfono: "987654321"
   - Manzana: "A"
   - Lote: "5"
   - Tag RFID: (el que probaste antes)
4. Guardar

**PASO 2: Vincular vehículo**
1. En la lista de residentes, click en "Juan Pérez"
2. Sección **"Vehículos"**
3. Agregar vehículo:
   - Patente: "ABC-123"
   - Marca: "Toyota"
   - Modelo: "Corolla"
   - Color: "Blanco"
   - Tag RFID: (otro tag o el mismo)
4. Guardar

**PASO 3: Probar acceso vinculado**
1. Volver a tab **"Control"**
2. Acercar el tag
3. ✅ **Resultado esperado:**
   - Dashboard muestra: **"✅ Juan Pérez - Mz A Lt 5"**
   - Si es vehículo: **"🚗 Toyota Corolla ABC-123"**

---

### PRUEBA 10: Filtros de Residentes
**Objetivo:** Verificar funcionalidad de filtros

1. En tab **"Residentes y Vehículos"**
2. Probar botones de filtro:
   - **Todos:** Muestra todos los residentes
   - **Con Vehículo:** Solo residentes con vehículos registrados
   - **Sin Vehículo:** Solo residentes sin vehículos
   - **Activos:** Solo residentes activos
   - **Inactivos:** Solo residentes inactivos
3. ✅ **Resultado esperado:** Filtros funcionan correctamente

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### ❌ Tag no detectado
**Posibles causas:**
1. **Lectora no conectada**
   - Verificar en consola del Gateway: debe decir "✅ Conectado al lector"
   - Si dice "❌ Error de conexión", revisar IP de la lectora
2. **Tag fuera de alcance**
   - Acercar más el tag a la antena
   - Verificar LED de la lectora (debe parpadear)
3. **Tag dañado**
   - Probar con otro tag conocido

### ❌ Gateway no se conecta a la lectora
**Solución:**
1. Verificar que la lectora esté encendida
2. Comprobar IP en [gateway.config.json](src/Gateway/gateway.config.json):
   ```json
   "reader_ip": "192.168.1.200",
   "reader_port": 60000
   ```
3. Hacer ping a la lectora:
   ```powershell
   Test-NetConnection 192.168.1.200 -Port 60000
   ```
4. Si no responde, revisar conexión de red

### ❌ Dashboard no carga
**Solución:**
1. Verificar que Firebase serve esté corriendo:
   ```powershell
   firebase serve --only hosting
   ```
2. Abrir http://localhost:5000
3. Revisar consola del navegador (F12) para errores

### ❌ Tags no se guardan en Firestore
**Posibles causas:**
1. **Cloud Function no responde**
   - Verificar URL en [gateway.config.json](src/Gateway/gateway.config.json)
   - Ver logs en Firebase Console
2. **Permisos de Firestore**
   - Verificar que las reglas permitan escritura
   - Revisar que el usuario esté autenticado

---

## 📊 MONITOREO EN TIEMPO REAL

### Ver logs del Gateway
```powershell
# En la consola donde corre el Gateway, observa mensajes como:
[28-01-2026 20:48:32] 💡 Acerca un tag RFID al lector...
[TAG] ID: E200341E8311018034000001
[CLOUD] Enviando a Cloud Function...
[CLOUD] Respuesta: { "status": "allowed", "relay": 1, "duration": 1000 }
[RELAY] Activando relay 1 por 1000ms
```

### Ver logs de Firebase
```powershell
# En otra terminal:
firebase functions:log --only rfid-gateway
```

### Ver logs del navegador
1. Abrir Dashboard (http://localhost:5000)
2. Presionar **F12** para abrir DevTools
3. Tab **"Console"**
4. Observar mensajes de detección de tags en tiempo real

---

## 🎯 CHECKLIST FINAL

- [ ] Dashboard carga correctamente
- [ ] Login funciona (admin/admin123)
- [ ] Gateway detecta tags RFID
- [ ] Tags autorizados abren portón (WhiteList)
- [ ] Tags bloqueados NO abren portón (BlackList)
- [ ] Tags desconocidos se registran
- [ ] Registros se guardan en Firestore
- [ ] Gráficos muestran estadísticas
- [ ] Exportar a Excel/PDF funciona
- [ ] Residentes se pueden crear/editar
- [ ] Vehículos se pueden vincular
- [ ] Filtros de residentes funcionan
- [ ] Sistema responde en menos de 1 segundo

---

## 🚀 COMANDOS ÚTILES

### Iniciar sistema completo
```powershell
# Terminal 1: Dashboard
firebase serve --only hosting

# Terminal 2: Gateway
cd src\Gateway
dotnet run
```

### Verificar estado
```powershell
.\test-system.ps1
```

### Ver dispositivos RFID USB
```powershell
Get-PnpDevice | Where-Object { $_.FriendlyName -like "*RFID*" -or $_.FriendlyName -like "*THY*" }
```

### Reiniciar Gateway
```powershell
# Ctrl+C en terminal del Gateway, luego:
dotnet run
```

### Ver configuración actual
```powershell
Get-Content src\Gateway\gateway.config.json | ConvertFrom-Json | Format-List
```

---

## 📝 NOTAS IMPORTANTES

1. **Anti-spam:** El sistema ignora el mismo tag si se lee en menos de 5 segundos
2. **Timeout:** Si la lectora no responde en 10s, se intenta reconectar
3. **Logs:** Se guardan en `logs/gateway/gateway.log`
4. **Puerto:** Gateway corre en localhost:8080 (solo localhost por permisos)
5. **Relay:** Duración configurable en gateway.config.json (default: 1000ms)

---

✅ **Sistema listo para producción**
📅 **Última actualización:** 28-01-2026 20:48:32
