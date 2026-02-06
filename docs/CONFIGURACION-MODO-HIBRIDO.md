# 🔧 CONFIGURACIÓN LECTORA THY - MODO HÍBRIDO

## 📋 Objetivo

Configurar la lectora RFID THY para que funcione en **MODO DUAL**:

1. **Standalone (Autónomo)**: La lectora activa el relay automáticamente cuando detecta un tag autorizado (funciona sin Gateway)
2. **Conectada**: Envía tags al Gateway para registro centralizado en Firestore

---

## 🌐 ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                    LECTORA THY RFID                         │
│  IP: 192.168.1.200:60000                                    │
│                                                              │
│  MODO HÍBRIDO:                                              │
│  ├─ Whitelist local (standalone)                           │
│  ├─ Activa relay automáticamente                           │
│  └─ Envía tags vía HTTP al Gateway (si está disponible)    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP POST: /readerid?id=TAG
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    GATEWAY C# (.NET 8.0)                    │
│  IP: 192.168.1.XXX:8080                                     │
│                                                              │
│  Recibe tags y:                                             │
│  ├─ Registra en Firestore (access_logs)                    │
│  ├─ Actualiza Dashboard en tiempo real                     │
│  └─ Puede activar relay adicional (opcional)               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              FIRESTORE + DASHBOARD WEB                      │
│  • Registro histórico de accesos                           │
│  • Gestión de residentes y vehículos                       │
│  • Estadísticas y reportes                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ PASO 1: CONFIGURAR LECTORA THY

### Opción A: Configuración vía Software THY

1. **Conectar a la lectora** usando el software oficial THY
   - IP: `192.168.1.200`
   - Puerto: `60000`

2. **Configurar Work Mode**:
   - Ir a `Configuración > Work Mode`
   - Seleccionar: **"Active Mode" o "HTTP Output Mode"**
   - ✅ Esto permite que la lectora envíe tags automáticamente

3. **Configurar Salida HTTP**:
   - Ir a `Configuración > Network > HTTP Output`
   - **HTTP Server IP**: `192.168.1.XXX` (IP de la PC donde corre el Gateway)
   - **HTTP Server Port**: `8080`
   - **HTTP Path**: `/readerid`
   - **Método**: `GET`
   - ✅ Guardar configuración

4. **Configurar Relay (Modo Standalone)**:
   - Ir a `Configuración > Relay`
   - **Modo**: `Whitelist Automático`
   - **Duración**: `1000ms` (1 segundo)
   - **Canal**: `1` (Relay 1)
   - ✅ Esto permite que la lectora active el relay SIN necesitar el Gateway

5. **Cargar Whitelist Local** (para modo standalone):
   - Ir a `Configuración > Tag Management`
   - Importar lista de tags autorizados
   - La lectora activará el relay cuando detecte estos tags
   - Funciona incluso si el Gateway está apagado

### Opción B: Configuración vía Gateway API

Ejecutar desde PowerShell (el Gateway debe estar corriendo):

```powershell
# 1. Obtener configuración actual
$config = Invoke-RestMethod -Uri "http://localhost:8080/api/reader/config?access_point=porton_triwe"
$config | ConvertTo-Json

# 2. Configurar Work Mode a Active
Invoke-RestMethod -Uri "http://localhost:8080/api/reader/config" -Method POST -Body (@{
    access_point = "porton_triwe"
    config = @{
        WorkMode = "ActiveMode"
        BeepEnable = "On"
        RFPower = 30
        FilterTime = 50
    }
} | ConvertTo-Json) -ContentType "application/json"
```

---

## 🚀 PASO 2: INICIAR GATEWAY CON PERMISOS ADMIN

El Gateway **DEBE** ejecutarse como **Administrador** para escuchar en todas las interfaces de red y recibir tags HTTP de la lectora.

### En PowerShell (como Administrador):

```powershell
# Opción 1: Usar script automático
.\start-gateway-admin.ps1

# Opción 2: Manual
cd src\Gateway
dotnet run
```

**Verificar que dice:**
```
✅ Servidor HTTP activo en puerto 8080
📡 Accesible desde:
   - http://localhost:8080
   - http://192.168.1.XXX:8080
```

Si dice `⚠️ ADVERTENCIA: La lectora NO podrá enviar tags`, **NO** estás ejecutando como Administrador.

---

## 🧪 PASO 3: PROBAR FUNCIONAMIENTO HÍBRIDO

### Prueba 1: Modo Standalone (Sin Gateway)

1. **Detener el Gateway** (Ctrl+C en su terminal)
2. **Acercar un tag autorizado** a la lectora
3. **Resultado esperado:**
   - ✅ Buzzer suena
   - ✅ Relay se activa (portón abre)
   - ❌ NO se registra en Firestore (Gateway apagado)

### Prueba 2: Modo Conectado (Con Gateway)

1. **Iniciar Gateway como Administrador**
2. **Verificar** que el Gateway muestra:
   ```
   🌐 Servidor HTTP activo en puerto 8080
   📡 Accesible desde http://192.168.1.XXX:8080
   ```
3. **Acercar tag autorizado**
4. **Resultado esperado:**
   - ✅ Buzzer suena
   - ✅ Relay se activa (lectora lo hace en modo standalone)
   - ✅ Gateway recibe tag vía HTTP
   - ✅ Aparece en terminal: `🏷️ TAG HTTP: E200341E8311...`
   - ✅ Se registra en Firestore
   - ✅ Dashboard se actualiza en tiempo real

### Prueba 3: Heartbeat

Cada 30 segundos, la lectora envía un heartbeat al Gateway:

```
💓 Heartbeat de lectora XXXXXXXXXXXX
```

Esto confirma que la conexión HTTP está activa.

---

## 📡 CONFIGURACIÓN DE RED

### Configuración actual (gateway.config.json):

```json
{
  "client_id": "condominio-neos",
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "cloud": {
    "function_url": "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway"
  },
  "access_points": [
    {
      "id": "porton_triwe",
      "name": "Portón Triwe",
      "reader_ip": "192.168.1.200",
      "reader_port": 60000,
      "relay_channel": 1,
      "open_duration_ms": 1000
    }
  ]
}
```

### IP del Gateway (donde corre dotnet):

Obtener la IP de tu PC:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}
```

**Ejemplo**: Si tu PC tiene IP `192.168.1.50`, entonces configura la lectora para enviar a `192.168.1.50:8080`.

---

## 🔍 DIAGNÓSTICO

### Verificar Gateway escuchando en red:

```powershell
Test-NetConnection -ComputerName localhost -Port 8080
```

Debe mostrar: `TcpTestSucceeded : True`

### Verificar lectora alcanzable:

```powershell
Test-NetConnection -ComputerName 192.168.1.200 -Port 60000
```

Debe mostrar: `TcpTestSucceeded : True`

### Ver logs del Gateway:

Los tags HTTP aparecen como:

```
[28-01-2026 21:15:30] 🏷️ TAG HTTP: E200341E8311018034000001
[28-01-2026 21:15:30] 🔍 Verificando acceso...
[28-01-2026 21:15:30] 📋 Estado: whitelist
[28-01-2026 21:15:30] ✅ ACCESO PERMITIDO
```

---

## ⚡ VENTAJAS DEL MODO HÍBRIDO

| Característica | Modo Standalone Solo | Modo Conectado Solo | **Modo Híbrido** |
|----------------|----------------------|---------------------|------------------|
| Funciona sin internet | ✅ | ❌ | ✅ |
| Registra en Firestore | ❌ | ✅ | ✅ |
| Dashboard en tiempo real | ❌ | ✅ | ✅ |
| Gráficos y reportes | ❌ | ✅ | ✅ |
| Tolerancia a fallos | ✅ | ❌ | ✅ |
| Gestión centralizada | ❌ | ✅ | ✅ |

---

## 🛠️ SOLUCIÓN DE PROBLEMAS

### ❌ Gateway no recibe tags HTTP

**Posibles causas:**

1. **No ejecutaste como Administrador**
   - Solución: Cerrar y abrir PowerShell como Admin
   - Ejecutar: `.\start-gateway-admin.ps1`

2. **Firewall bloqueando puerto 8080**
   - Solución:
     ```powershell
     New-NetFirewallRule -DisplayName "RFID Gateway" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
     ```

3. **Lectora no configurada para enviar HTTP**
   - Solución: Verificar configuración HTTP en software THY
   - IP destino: `192.168.1.XXX` (IP del Gateway)
   - Puerto: `8080`
   - Path: `/readerid`

4. **Red diferente**
   - Lectora: `192.168.1.200`
   - PC Gateway: `192.168.1.XXX`
   - Deben estar en la misma red

### ❌ Lectora no activa relay en modo standalone

**Posibles causas:**

1. **Whitelist local vacía**
   - Solución: Cargar tags autorizados en la memoria de la lectora vía software THY

2. **Relay no configurado**
   - Solución: Configurar relay en modo automático en la lectora

3. **Work Mode incorrecto**
   - Solución: Cambiar a "Active Mode" o "Wiegand Mode"

---

## 📞 COMANDOS ÚTILES

### Iniciar Gateway como Admin:

```powershell
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd C:\NeosTech-RFID-System-Pro\src\Gateway; dotnet run"
```

### Abrir puerto en Firewall:

```powershell
New-NetFirewallRule -DisplayName "RFID Gateway HTTP" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### Ver configuración de lectora:

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/reader/config?access_point=porton_triwe" | ConvertTo-Json -Depth 5
```

### Activar relay manualmente:

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/open" -Method POST -Body '{"access_point":"porton_triwe"}' -ContentType "application/json"
```

---

✅ **SISTEMA CONFIGURADO EN MODO HÍBRIDO**

La lectora funcionará **independientemente** (standalone) Y **enviará tags al Gateway** cuando esté disponible para registro centralizado.
