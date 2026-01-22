# Activación de Relays - Sistema RFID NeosTech

## Resumen

El Gateway ahora implementa la **activación real de relays físicos** mediante comunicación HTTP con las lectoras RFID.

## ¿Qué se implementó?

### 1. Comunicación HTTP con Lectoras RFID

El Gateway envía peticiones HTTP GET a las lectoras RFID para activar los relays:

```
http://192.168.1.200:8080/relay?ch=1&time=5000
```

Parámetros:
- `ch`: Canal del relay (1-4 dependiendo del modelo de lectora)
- `time`: Duración de activación en milisegundos (5000 = 5 segundos)

### 2. Configuración de Puntos de Acceso

Archivo: `src/Gateway/gateway.config.json`

```json
{
  "access_points": [
    {
      "id": "porton_triwe",
      "name": "Portón Triwe",
      "reader_ip": "192.168.1.200",
      "reader_port": 8080,
      "relay_channel": 1,
      "open_duration_ms": 5000
    },
    {
      "id": "porton_principal",
      "name": "Portón Principal",
      "reader_ip": "192.168.1.101",
      "reader_port": 8080,
      "relay_channel": 1,
      "open_duration_ms": 5000
    }
  ]
}
```

### 3. Código de Activación

Función `ActivateRelay()` en `Program.cs`:

```csharp
private static async Task<bool> ActivateRelay(AccessPointConfig ap)
{
    try
    {
        using (var client = new HttpClient())
        {
            client.Timeout = TimeSpan.FromSeconds(5);
            string url = $"http://{ap.reader_ip}:{ap.reader_port}/relay?ch={ap.relay_channel}&time={ap.open_duration_ms}";
            
            Console.WriteLine($"[{DateTime.Now}] Activando relay: {url}");
            
            var response = await client.GetAsync(url);
            string content = await response.Content.ReadAsStringAsync();
            
            Console.WriteLine($"[{DateTime.Now}] Respuesta lectora [{response.StatusCode}]: {content}");
            
            return response.IsSuccessStatusCode;
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[{DateTime.Now}] ERROR activando relay: {ex.Message}");
        return false;
    }
}
```

## Flujo de Activación

1. Usuario hace clic en "Abrir Portón Triwe" en el dashboard
2. Dashboard envía POST a `http://localhost:60000/api/open` con:
   ```json
   {
     "access_point": "porton_triwe"
   }
   ```
3. Gateway busca la configuración del access point
4. Gateway envía HTTP GET a la lectora RFID: `http://192.168.1.200:8080/relay?ch=1&time=5000`
5. Lectora RFID activa el relay físico durante 5 segundos
6. Gateway retorna respuesta al dashboard
7. Dashboard muestra confirmación o error

## Ejecución del Gateway

### Requisitos
- Ejecutar PowerShell como Administrador (necesario para HttpListener en Windows)
- .NET 8.0 SDK instalado
- Lectoras RFID configuradas en la red local

### Paso 1: Dar permisos al puerto 60000

```powershell
netsh http add urlacl url=http://localhost:60000/ user=Everyone
```

### Paso 2: Compilar y ejecutar

```powershell
cd c:\NeosTech-RFID-System-Pro\src\Gateway
dotnet build -c Release
dotnet run -c Release
```

### Salida esperada:

```
[22-01-2026 0:12:38] Cargado: Portón Triwe @ 192.168.1.200:8080
[22-01-2026 0:12:38] Cargado: Portón Principal @ 192.168.1.101:8080
[22-01-2026 0:12:38] RFID Gateway iniciado
[22-01-2026 0:12:38] Client ID: condominio-neos
[22-01-2026 0:12:38] Puntos de acceso cargados: 2
[22-01-2026 0:12:38] Servidor HTTP en puerto 60000
[22-01-2026 0:12:38] Presiona Ctrl+C para salir
```

## Pruebas

### Test 1: Verificar que el Gateway está corriendo

```powershell
Invoke-RestMethod -Uri "http://localhost:60000/health"
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "client_id": "condominio-neos",
  "timestamp": "2026-01-22T00:12:38Z",
  "version": "6.0-relay-control"
}
```

### Test 2: Activar relay del Portón Triwe

```powershell
Invoke-RestMethod -Uri "http://localhost:60000/api/open" -Method POST -ContentType "application/json" -Body '{"access_point":"porton_triwe"}'
```

Respuesta exitosa:
```json
{
  "status": "success",
  "access_point": "porton_triwe",
  "name": "Portón Triwe",
  "message": "Relay activado correctamente"
}
```

Respuesta con error (lectora no disponible):
```json
{
  "error": "Error activando relay"
}
```

### Test 3: Usar el script de prueba

```powershell
cd c:\NeosTech-RFID-System-Pro\scripts
.\test-relay.ps1
```

## Configuración de Lectoras RFID

### Verificar IP de las lectoras

1. Conecta la lectora RFID a la red
2. Encuentra su IP usando el software del fabricante o:
   ```powershell
   arp -a
   ```
3. Actualiza la IP en `gateway.config.json`

### Verificar el endpoint del relay

Cada modelo de lectora puede tener un endpoint diferente. Verifica en el manual:

- **Formato común 1**: `/relay?ch=1&time=5000`
- **Formato común 2**: `/open?channel=1&duration=5000`
- **Formato común 3**: `/api/relay` con POST body

Si tu lectora usa un formato diferente, modifica la línea de URL en `ActivateRelay()`:

```csharp
string url = $"http://{ap.reader_ip}:{ap.reader_port}/relay?ch={ap.relay_channel}&time={ap.open_duration_ms}";
```

### Probar la lectora directamente

Abre un navegador y visita:
```
http://192.168.1.100:8080/relay?ch=1&time=5000
```

Si el relay se activa, la configuración es correcta.

## Logs del Gateway

Cuando se activa un relay, verás en la consola del Gateway:

```
[22-01-2026 0:13:45] APERTURA MANUAL: Portón Triwe
[22-01-2026 0:13:45] Activando relay: http://192.168.1.200:8080/relay?ch=1&time=5000
[22-01-2026 0:13:45] Respuesta lectora [200]: {"status":"ok","relay":1}
```

Si hay error:

```
[22-01-2026 0:13:45] APERTURA MANUAL: Portón Triwe
[22-01-2026 0:13:45] Activando relay: http://192.168.1.200:8080/relay?ch=1&time=5000
[22-01-2026 0:13:50] ERROR activando relay: No se puede establecer una conexión...
```

## Troubleshooting

### Error: "Acceso denegado" al iniciar Gateway

**Solución**: Ejecutar PowerShell como Administrador

```powershell
# Dar permisos al puerto
netsh http add urlacl url=http://localhost:60000/ user=Everyone

# Ejecutar Gateway
cd c:\NeosTech-RFID-System-Pro\src\Gateway
dotnet run -c Release
```

### Error: "No es posible conectar con el servidor remoto"

**Causas**:
1. La lectora RFID no está conectada a la red
2. La IP de la lectora es incorrecta
3. El puerto de la lectora es incorrecto
4. Hay un firewall bloqueando la conexión

**Solución**:

1. Verifica que la lectora esté encendida y en la red:
   ```powershell
   ping 192.168.1.200
   ```

2. Verifica el puerto (usualmente 8080 o 80):
   ```powershell
   Test-NetConnection -ComputerName 192.168.1.200 -Port 8080
   ```

3. Prueba directamente en navegador:
   ```
   http://192.168.1.200:8080/relay?ch=1&time=5000
   ```

### Error: "Gateway no responde en localhost:60000"

**Causas**:
1. Gateway no está corriendo
2. Falta ejecutar como Administrador
3. Puerto 60000 está en uso por otra aplicación

**Solución**:

1. Verifica que el Gateway esté corriendo:
   ```powershell
   Get-NetTCPConnection -LocalPort 60000
   ```

2. Verifica procesos en el puerto:
   ```powershell
   netstat -ano | findstr :60000
   ```

3. Si hay otro proceso usando el puerto, cambia el puerto en:
   - `Program.cs`: Línea `listener.Prefixes.Add("http://localhost:60000/");`
   - `gateway.config.json`: `"port": 60001`
   - Dashboard `index.html`: `http://localhost:60001/api/open`

## Integración con Dashboard

El dashboard (`src/web/index.html`) tiene botones para activar cada portón:

```html
<button class="btn btn-gate-open" onclick="openGate('porton_triwe')">
    🏢 Abrir Portón Triwe
</button>

<button class="btn btn-gate-open" onclick="openGate('porton_principal')">
    🚪 Abrir Portón Principal
</button>
```

La función JavaScript `openGate()` envía la petición POST al Gateway:

```javascript
async function openGate(accessPointId) {
    try {
        const response = await fetch('http://localhost:60000/api/open', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                access_point: accessPointId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`✅ ${accessPointNames[accessPointId]} abierto correctamente`, 'success');
            // Registrar en Firestore...
        } else {
            showNotification(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Error de conexión: ${error.message}`, 'error');
    }
}
```

## Próximos Pasos

1. **Configurar IPs reales**: Actualiza `gateway.config.json` con las IPs de tus lectoras RFID
2. **Verificar endpoint**: Confirma que `/relay?ch=1&time=5000` funciona con tus lectoras
3. **Ajustar tiempos**: Modifica `open_duration_ms` según necesites (5000 = 5 segundos)
4. **Producción**: Compilar y ejecutar como servicio de Windows:
   ```powershell
   dotnet publish -c Release
   sc.exe create RfidGateway binPath="C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.exe"
   sc.exe start RfidGateway
   ```

## Resumen

✅ **Implementado**: 
- Activación real de relays físicos via HTTP
- Configuración de 2 puntos de acceso (Portón Triwe y Principal)
- Endpoint `/api/open` en Gateway
- Botones de control en dashboard
- Logs detallados de todas las operaciones
- Manejo de errores y timeouts

✅ **Funciona**:
- Gateway carga configuración correctamente
- Endpoint responde a peticiones POST
- Envía HTTP GET a las lectoras RFID
- Retorna respuestas JSON al dashboard

⚠️ **Pendiente**:
- Configurar IPs reales de las lectoras
- Verificar formato de endpoint específico del modelo de lectora
- Probar activación física del relay en hardware real
