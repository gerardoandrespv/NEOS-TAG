# 📋 Plan de Implementación: Whitelist Local y Gestión de Configuración

## 🎯 Objetivo

Permitir que el Gateway funcione **100% offline** con whitelist local en memoria, y proporcionar una interfaz web para:
1. Leer/escribir configuración HTTP de la lectora
2. Ver y gestionar whitelist local
3. Sincronizar whitelist entre Firestore y Gateway

## ✅ Implementado hasta ahora

### 1. Cache Local de Whitelist (`Program.cs`)
```csharp
// Variables agregadas
private static HashSet<string> whitelistCache = new HashSet<string>();
private static DateTime whitelistLastSync = DateTime.MinValue;
private static int whitelistSyncIntervalMinutes = 5;
```

### 2. Sincronización Automática
- `SyncWhitelistFromFirestore()` - Descarga tags desde Firestore
- `CheckWhitelistCache()` - Verifica si tag está en cache
- `GetWhitelistCache()` - Obtiene lista completa
- Sincroniza al inicio del Gateway
- Re-sincroniza cada 5 minutos automáticamente

### 3. Modo Offline-First en `CheckTagAccess()`
```
1. Verifica cache local primero (rápido)
2. Intenta consultar Cloud Function (si hay internet)
3. Si falla la nube, usa cache local
4. Si tag está en cache → ACCESO PERMITIDO (modo offline)
5. Si tag NO está en cache → ACCESO DENEGADO (modo offline)
```

## 🚧 Falta Implementar

### 1. Endpoints HTTP para Whitelist
Agregar a `ProcessRequest()` en `Program.cs`:

```csharp
// GET /api/whitelist - Obtener whitelist local
else if (context.Request.Url.PathAndQuery == "/api/whitelist" && context.Request.HttpMethod == "GET")
{
    var whitelist = GetWhitelistCache();
    await SendJsonResponse(response, new {
        status = "success",
        count = whitelist.Count,
        last_sync = whitelistLastSync,
        tags = whitelist
    });
}

// POST /api/whitelist/sync - Forzar sincronización
else if (context.Request.Url.PathAndQuery == "/api/whitelist/sync" && context.Request.HttpMethod == "POST")
{
    await SyncWhitelistFromFirestore();
    var whitelist = GetWhitelistCache();
    await SendJsonResponse(response, new {
        status = "success",
        message = "Whitelist sincronizada",
        count = whitelist.Count,
        last_sync = whitelistLastSync
    });
}
```

### 2. Funciones en `THYReaderAPI.cs` para Configuración HTTP

**LIMITACIÓN:** Las lectoras THY NO tienen funciones para configurar HTTP Output via SDK.  
La configuración HTTP solo se puede hacer mediante el software THY_Software_V5.4.

**Alternativa:**
- Usar `SWNet_ReadDeviceOneParam()` para leer parámetros básicos
- Usar `SWNet_SetDeviceOneParam()` para escribir parámetros básicos
- Los parámetros HTTP NO están expuestos en el SDK

### 3. Panel de Administración en Dashboard

Agregar a `src/web/index.html`:

```html
<!-- Sección: Whitelist Local -->
<div id="whitelist-section" class="section">
    <h2>🔒 Whitelist Local del Gateway</h2>
    <div class="info-box">
        <p>Tags en cache: <strong id="whitelist-count">0</strong></p>
        <p>Última sincronización: <strong id="whitelist-last-sync">Nunca</strong></p>
        <button onclick="syncWhitelist()">🔄 Sincronizar Ahora</button>
    </div>
    
    <h3>Tags en Cache:</h3>
    <div id="whitelist-tags" style="max-height: 300px; overflow-y: auto;">
        <!-- Lista de tags -->
    </div>
</div>

<script>
async function loadWhitelist() {
    try {
        const response = await fetch('http://192.168.1.11:8080/api/whitelist');
        const data = await response.json();
        
        document.getElementById('whitelist-count').textContent = data.count;
        document.getElementById('whitelist-last-sync').textContent = 
            new Date(data.last_sync).toLocaleString();
        
        const container = document.getElementById('whitelist-tags');
        container.innerHTML = data.tags.map(tag => 
            `<div class="tag-item">${tag}</div>`
        ).join('');
    } catch (error) {
        console.error('Error cargando whitelist:', error);
    }
}

async function syncWhitelist() {
    try {
        const response = await fetch('http://192.168.1.11:8080/api/whitelist/sync', {
            method: 'POST'
        });
        const data = await response.json();
        alert(`Whitelist sincronizada: ${data.count} tags`);
        loadWhitelist();
    } catch (error) {
        alert('Error sincronizando whitelist');
    }
}

// Cargar al inicio
loadWhitelist();

// Actualizar cada 30 segundos
setInterval(loadWhitelist, 30000);
</script>
```

### 4. Configuración de Lectora (Manual)

Como el SDK NO permite configurar HTTP Output, crear documento con instrucciones:

**CONFIGURAR-LECTORA-HTTP-DETALLADO.md:**

```markdown
# Configuración HTTP Output en Lectora THY

## Paso 1: Abrir Software THY_Software_V5.4

1. Conectar a lectora: 192.168.1.200:60000
2. Ir a pestaña "Network" o "Red"

## Paso 2: Configurar HTTP Upload

Buscar sección "HTTP Upload" y configurar:

| Parámetro | Valor |
|-----------|-------|
| Enable HTTP Upload | ☑ Marcado |
| Server IP | 192.168.1.11 |
| Server Port | 8080 |
| Upload Path | /readerid |
| Upload Method | GET |
| Upload Format | ?id={EPC}&readsn={SN}&heart=0 |
| Upload All Tags | ☑ Marcado (NO solo nuevos) |
| Upload Interval | 0 segundos |
| Heartbeat | ☐ Desmarcado |

## Paso 3: Guardar y Reiniciar

1. Click "Save" o "Guardar"
2. Click "Restart Device" o "Reiniciar Dispositivo"
3. Esperar 10 segundos
4. Verificar conexión

## Paso 4: Probar

1. Escanear un tag
2. Verificar en Gateway: debe aparecer `📨 HTTP GET /readerid?id=...`
3. Verificar en Dashboard: debe aparecer en "Registros"
```

## 📊 Flujo Completo de Funcionamiento

```
┌─────────────┐       HTTP GET          ┌──────────────┐
│  Lectora    │ ───────────────────────>│   Gateway    │
│192.168.1.200│  /readerid?id=TAG123   │192.168.1.11  │
└─────────────┘                         └──────────────┘
                                             │
                                             │ 1. Verifica cache local
                                             ▼
                                        ┌──────────────┐
                                        │ whitelistCache│
                                        │ (HashSet)    │
                                        └──────────────┘
                                             │
                                             │ 2. Si no hay internet
                                             ▼
                                        TAG en cache? 
                                        ✅ SÍ → RELAY ON
                                        ❌ NO → ACCESO DENEGADO
                                             │
                                             │ 3. Si hay internet
                                             ▼
                                        ┌──────────────┐
                                        │ Cloud Function│
                                        │  Firestore   │
                                        └──────────────┘
                                             │
                                             ▼
                                        Validación final
                                        → RELAY ON/OFF
                                        → Log en Firestore
                                             │
                                             ▼
                                        ┌──────────────┐
                                        │  Dashboard   │
                                        │(Tiempo Real) │
                                        └──────────────┘
```

## ⏱️ Tiempo Estimado de Implementación

| Tarea | Tiempo | Estado |
|-------|--------|--------|
| Cache de whitelist | 1h | ✅ HECHO |
| Sincronización automática | 1h | ✅ HECHO |
| Modo offline-first | 1h | ✅ HECHO |
| Endpoints HTTP whitelist | 30min | ⏳ PENDIENTE |
| Panel en dashboard | 2h | ⏳ PENDIENTE |
| Pruebas completas | 1h | ⏳ PENDIENTE |
| **TOTAL** | **6.5 horas** | **50% COMPLETO** |

## 🚀 Próximos Pasos Inmediatos

1. **Compilar Gateway con cambios actuales**
   ```bash
   cd C:\NeosTech-RFID-System-Pro\src\Gateway
   dotnet build
   ```

2. **Probar modo offline**
   - Desconectar internet
   - Escanear tag que esté en Firestore
   - Debería permitir acceso usando cache

3. **Agregar endpoints whitelist** (código arriba)

4. **Actualizar dashboard** con panel de whitelist

5. **Documentar configuración** de lectora

## ⚠️ Limitaciones Identificadas

1. **SDK THY no permite configurar HTTP Output programáticamente**
   - Solución: Manual via software THY_Software_V5.4
   
2. **Lectora no tiene whitelist local integrada**
   - Solución: Gateway mantiene cache en memoria
   
3. **Cache se pierde al reiniciar Gateway**
   - Solución: Auto-sincroniza al arrancar (ya implementado)

4. **Lectora envía solo tags nuevos (configurable)**
   - Solución: Marcar "Upload All Tags" en config HTTP

## 📖 Documentación a Generar

1. `WHITELIST-LOCAL.md` - Cómo funciona el sistema de cache
2. `MODO-OFFLINE.md` - Funcionamiento sin internet
3. `API-GATEWAY.md` - Endpoints disponibles
4. `CONFIGURAR-LECTORA-HTTP-DETALLADO.md` - Paso a paso visual

---

**Última actualización:** 29-01-2026  
**Estado:** Cache implementado, falta interfaz web y endpoints HTTP
