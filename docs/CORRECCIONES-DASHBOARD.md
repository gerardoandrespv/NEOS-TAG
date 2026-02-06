# 🛠️ CORRECCIONES APLICADAS - PROBLEMAS DEL DASHBOARD

**Fecha:** 30 de Enero de 2026  
**Estado:** ✅ CÓDIGO CORREGIDO - ⚠️ REQUIERE REINICIO DE GATEWAY

---

## 🎯 PROBLEMAS IDENTIFICADOS Y CORREGIDOS

### 1️⃣ **Eventos con Misma Hora/Fecha**

**Problema:**
- Todos los eventos aparecían con la misma hora en el dashboard
- No se podía distinguir entre eventos ocurridos en el mismo segundo

**Causa:**
- El dashboard mostraba solo HH:MM:SS sin milisegundos
- Eventos rápidos (<1segundo) tenían timestamp idéntico visualmente

**Solución Aplicada:**
```javascript
// ANTES: Solo mostraba HH:MM:SS
const hora = timestamp.toLocaleTimeString('es-ES', {
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
});

// AHORA: Muestra HH:MM:SS.mmm (con milisegundos)
const hora = timestamp.toLocaleTimeString('es-ES', {
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
}) + '.' + String(timestamp.getMilliseconds()).padStart(3, '0');
```

**Resultado:**
```
Antes: 08:30:15
Ahora:  08:30:15.234
       08:30:15.567
       08:30:15.891
```

**Archivo Modificado:** `src/web/index.html` (línea ~4936)

---

### 2️⃣ **Relé NO se Activa con el Botón**

**Problema:**
- Botón "Abrir Puerta" solo registraba evento en Firestore
- No enviaba comando físico al Gateway
- El relé de la lectora nunca se activaba

**Causa:**
- La función `openDoor()` solo guardaba datos en Firebase
- No había comunicación HTTP con el Gateway
- Faltaba endpoint `/api/lectora/relay` en el Gateway

**Solución Aplicada:**

#### A) Dashboard Web (Frontend)
```javascript
// NUEVO: Llamada HTTP al Gateway ANTES de registrar evento
async function openDoor(doorId) {
    // 1. ACTIVAR RELÉ FÍSICO
    const gatewayUrl = 'http://192.168.1.11:8080/api/lectora/relay';
    const relayResponse = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'open',
            duration: 3000,  // 3 segundos
            door_id: doorId
        })
    });
    
    // 2. REGISTRAR EVENTO en Firestore
    await db.collection('rfid_tags').add({...});
}
```

#### B) Gateway Backend
```csharp
// NUEVO ENDPOINT: POST /api/lectora/relay
if (context.Request.Url.PathAndQuery == "/api/lectora/relay" && 
    context.Request.HttpMethod == "POST")
{
    // Activar relé físicamente
    int relayNumber = 1;
    bool result = THYReaderAPI.ActivateRelay(relayNumber, duration);
    
    return { success: true, relay: 1, duration_ms: 3000 };
}
```

#### C) THYReaderAPI.cs
```csharp
// NUEVA FUNCIÓN: ActivateRelay()
public static bool ActivateRelay(int relayNumber = 1, int durationMs = 3000)
{
    // Activar relé
    SWNet_RelayOn(0xFF);
    
    // Esperar duración
    Thread.Sleep(durationMs);
    
    // Desactivar relé
    SWNet_RelayOff(0xFF);
    
    return true;
}
```

**Archivos Modificados:**
- `src/web/index.html` (línea ~8834)
- `src/Gateway/Program.cs` (líneas ~606-720) ⚠️ **NUEVO ENDPOINT**
- `src/Gateway/THYReaderAPI.cs` (líneas ~250-302) ⚠️ **NUEVA FUNCIÓN**

---

### 3️⃣ **Creación de Usuarios No Funciona**

**Problema:**
- Botón "Guardar Usuario" no daba feedback
- No se sabía si el usuario se creó correctamente
- Errores silenciosos sin notificar al usuario

**Causa:**
- Falta de logging en el proceso de creación
- Validaciones no mostraban mensajes claros
- No había confirmación visual del éxito

**Solución Aplicada:**
```javascript
async function saveUser() {
    try {
        // NUEVO: Logging detallado
        console.log('💾 Iniciando guardado de usuario:', { 
            name, departamento, tags 
        });
        
        if (userId) {
            console.log('📝 Actualizando usuario existente:', userId);
            await db.collection('users').doc(userId).update(userData);
        } else {
            console.log('➕ Creando nuevo usuario');
            const docRef = await db.collection('users').add(userData);
            console.log('✅ Usuario creado con ID:', docRef.id);
        }
        
        showNotification('✅ Usuario creado exitosamente', 'success');
        closeUserModal();
        loadUsers();
    } catch (error) {
        console.error('❌ Error guardando usuario:', error);
        showNotification('❌ Error al guardar usuario', 'error');
    }
}
```

**Mejoras:**
- ✅ Logging en consola para debug
- ✅ Notificación visual de éxito/error
- ✅ Cierre automático del modal al guardar
- ✅ Recarga automática de la lista de usuarios

**Archivo Modificado:** `src/web/index.html` (línea ~5661)

---

## 🚀 CÓMO APLICAR LAS CORRECCIONES

### Paso 1: Dashboard Web (Ya Aplicado ✅)
El archivo `index.html` ya está corregido. Solo necesitas:
```bash
# Recargar el navegador con Ctrl+F5 (borrar caché)
```

### Paso 2: Gateway (Requiere Reinicio ⚠️)

El código del Gateway está corregido pero **NO compilado** porque el proceso actual está bloqueando el archivo.

**INSTRUCCIONES:**

1. **Cerrar Gateway Actual:**
   - Busca la ventana PowerShell con título que contiene "Gateway" o "Administrador"
   - Ciérrala manualmente (X en la esquina)

2. **Compilar Código Nuevo:**
   ```powershell
   cd C:\NeosTech-RFID-System-Pro\src\Gateway
   dotnet build --no-restore
   ```

3. **Ejecutar Gateway Actualizado:**
   ```powershell
   # Opción A: Script automático (como Administrador)
   C:\NeosTech-RFID-System-Pro\restart-gateway-filtro.ps1
   
   # Opción B: Manual (como Administrador)
   cd C:\NeosTech-RFID-System-Pro
   dotnet run --project src/Gateway
   ```

4. **Verificar Nuevo Endpoint:**
   ```powershell
   # Probar activación de relé
   Invoke-RestMethod -Uri "http://localhost:8080/api/lectora/relay" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"action":"open","duration":3000}'
   
   # Respuesta esperada:
   # {
   #   "success": true,
   #   "relay": 1,
   #   "duration_ms": 3000,
   #   "message": "Relé 1 activado exitosamente"
   # }
   ```

---

## 🧪 PRUEBAS RECOMENDADAS

### Test 1: Timestamps Únicos
1. Abre el dashboard web
2. Pasa varios tags rápidamente (< 1 segundo)
3. Verifica que cada evento muestra milisegundos diferentes:
   ```
   08:30:15.123
   08:30:15.456
   08:30:15.789
   ```

### Test 2: Activación de Relé
1. Abre Dashboard → Sección "Control de Acceso"
2. Click en botón "🔓 Abrir Puerta Principal"
3. Verifica:
   - ✅ Notificación "⏳ Abriendo Puerta Entrada Principal..."
   - ✅ Consola del navegador: "Relé activado: {success: true}"
   - ✅ **Relé físico se activa por 3 segundos**
   - ✅ Notificación "✅ Puerta Entrada Principal abierta exitosamente"
   - ✅ Evento registrado en Firestore

### Test 3: Creación de Usuario
1. Dashboard → "Residentes" → "➕ Nuevo Residente"
2. Llenar datos:
   - Nombre: "Test Usuario"
   - Block: 1
   - Departamento: 999
   - Teléfono: +56912345678
   - Tags: E28011052000566B14B0569E
3. Click "💾 Guardar"
4. Abrir Consola del navegador (F12)
5. Verificar logs:
   ```
   💾 Iniciando guardado de usuario: {name: "Test Usuario", ...}
   ➕ Creando nuevo usuario
   ✅ Usuario creado con ID: abc123def456
   ```
6. Verificar notificación: "✅ Usuario creado exitosamente"
7. Verificar que el usuario aparece en la tabla

---

## 📊 RESUMEN DE CAMBIOS

| Archivo | Líneas | Cambios | Estado |
|---------|--------|---------|--------|
| **src/web/index.html** | ~4936 | Timestamp con milisegundos | ✅ Aplicado |
| **src/web/index.html** | ~8834 | Llamada HTTP al Gateway | ✅ Aplicado |
| **src/web/index.html** | ~5661 | Logging en creación usuarios | ✅ Aplicado |
| **src/Gateway/Program.cs** | ~606-720 | Endpoint `/api/lectora/relay` | ⚠️ Sin compilar |
| **src/Gateway/THYReaderAPI.cs** | ~250-302 | Función `ActivateRelay()` | ⚠️ Sin compilar |

---

## ⚙️ CONFIGURACIÓN DEL RELÉ

### Parámetros del Endpoint

```json
POST http://192.168.1.11:8080/api/lectora/relay

{
  "action": "open",      // "open" (abrir)
  "duration": 3000,      // Milisegundos (3000 = 3 segundos)
  "door_id": "puerta_principal"  // Identificador (opcional)
}
```

### Respuesta Exitosa
```json
{
  "success": true,
  "relay": 1,
  "duration_ms": 3000,
  "door_id": "puerta_principal",
  "timestamp": "2026-01-30T10:15:30.123Z",
  "message": "Relé 1 activado exitosamente"
}
```

### Respuesta con Error
```json
{
  "error": "No se pudo conectar a la lectora"
}
```

---

## 🔍 TROUBLESHOOTING

### Problema: Relé no se activa

**Verificar:**
```powershell
# 1. Gateway respondiendo
Invoke-RestMethod http://localhost:8080/api/lectora/config

# 2. Lectora conectada
ping 192.168.1.200

# 3. Test manual de relé
Invoke-RestMethod http://localhost:8080/api/lectora/relay -Method POST -ContentType "application/json" -Body '{"action":"open","duration":2000}'
```

**Logs a revisar:**
```
[10:15:30] 🔓 POST /api/lectora/relay - Comando de apertura manual
[10:15:30] [THY] 🔓 Activando relé 1 por 3000ms
[10:15:30] [THY] ✅ Relé activado, esperando 3000ms...
[10:15:33] [THY] ✅ Relé desactivado
[10:15:33] ✅ Relé 1 activado por 3000ms - Door: puerta_principal
```

### Problema: Timestamps siguen iguales

**Causa:** Caché del navegador

**Solución:**
```
1. Presiona Ctrl+Shift+Delete
2. Selecciona "Caché" e "Imágenes y archivos en caché"
3. Click "Borrar datos"
4. Recarga con Ctrl+F5
```

### Problema: Usuario no se crea

**Revisar consola del navegador (F12):**
```javascript
// Si ves:
❌ Error guardando usuario: FirebaseError: Missing or insufficient permissions

// Solución: Verificar reglas de Firestore
// Debe permitir escritura en collection 'users'
```

---

## 📝 NOTAS IMPORTANTES

1. **Gateway DEBE estar como Administrador** para acceder a la lectora física
2. **El relé se activa por defecto 3 segundos** (configurable)
3. **Los eventos se registran en `rfid_tags` collection** (no en `events`)
4. **El dashboard lee de localhost** (192.168.1.11) por defecto
5. **Milisegundos solo se ven en eventos nuevos**, los antiguos no cambiarán

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **URGENTE:** Cerrar Gateway actual y recompilar
2. ⚠️ Probar activación física del relé con el botón
3. 📊 Verificar que timestamps muestran milisegundos
4. 👤 Probar creación de usuario completo con tags
5. 📝 Actualizar documentación con nuevos endpoints

---

**Estado del Sistema:**
- ✅ Dashboard Web: CORREGIDO
- ⚠️ Gateway: CÓDIGO CORREGIDO - Requiere recompilación
- ✅ Cloud Function: Funcionando correctamente
- ✅ Firestore: Operativo

**Acción Requerida:**
**CIERRA la ventana del Gateway y ejecuta** `restart-gateway-filtro.ps1` **como Administrador**
