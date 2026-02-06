# 📦 INSTALADOR COMPLETO GATEWAY RFID - COMPUTADOR DE PRODUCCIÓN

**Fecha:** 29 de enero de 2026  
**Versión:** 2.0 con Configuración de Lectora THY  
**Para:** Computador Gateway Windows (192.168.1.11)

---

## 🎯 LO QUE INSTALA

Este instalador configura el Gateway RFID como **servicio de Windows** que:

- ✅ Se inicia automáticamente con el sistema
- ✅ Corre en background (sin ventanas visibles)
- ✅ Se reinicia automáticamente si falla
- ✅ Escucha en `http://192.168.1.11:8080`
- ✅ Incluye endpoints de configuración de lectora THY
- ✅ Sistema de whitelist offline-first

---

## 📋 REQUISITOS PREVIOS

### 1. Software Necesario

- ✅ **Windows 10/11** (64-bit)
- ✅ **.NET 8.0 Runtime** → https://dotnet.microsoft.com/download/dotnet/8.0
- ✅ **Git** (opcional, para clonar repo) → https://git-scm.com/
- ✅ **Permisos de Administrador**

### 2. Configuración de Red

- IP estática: `192.168.1.11`
- Puerto: `8080` (abierto en firewall)
- Lectora THY: `192.168.1.200:60000`

### 3. Credenciales Firebase

Archivo `serviceAccountKey.json` en:
```
C:\NeosTech-RFID-System-Pro\src\Gateway\serviceAccountKey.json
```

---

## 🚀 INSTALACIÓN PASO A PASO

### PASO 1: Descargar Proyecto

**Opción A: Con Git**
```powershell
cd C:\
git clone https://github.com/tuusuario/NeosTech-RFID-System-Pro.git
cd NeosTech-RFID-System-Pro
```

**Opción B: Sin Git (ZIP)**
1. Descargar ZIP del repositorio
2. Extraer en `C:\NeosTech-RFID-System-Pro`
3. Abrir PowerShell como Administrador
4. `cd C:\NeosTech-RFID-System-Pro`

### PASO 2: Copiar Credenciales Firebase

```powershell
# Copiar archivo serviceAccountKey.json a:
Copy-Item "ruta\origen\serviceAccountKey.json" "C:\NeosTech-RFID-System-Pro\src\Gateway\serviceAccountKey.json"
```

### PASO 3: Verificar .NET Instalado

```powershell
dotnet --version
# Debe mostrar: 8.0.x
```

Si no está instalado:
1. Descargar: https://dotnet.microsoft.com/download/dotnet/8.0
2. Instalar: "ASP.NET Core Runtime 8.0.x - Windows Hosting Bundle"
3. Reiniciar terminal

### PASO 4: Ejecutar Instalador Completo

```powershell
# Abrir PowerShell como Administrador
cd C:\NeosTech-RFID-System-Pro

# Ejecutar instalador
.\setup-gateway-complete.ps1
```

El script hará:
1. ✅ Limpiar servicios antiguos (RFIDGateway*)
2. ✅ Terminar procesos Gateway antiguos
3. ✅ Compilar Gateway en modo Release
4. ✅ Crear servicio Windows "NeosTech-RFID-Gateway"
5. ✅ Configurar inicio automático
6. ✅ Iniciar servicio
7. ✅ Probar endpoints

### PASO 5: Verificar Instalación

**1. Verificar servicio:**
```powershell
Get-Service -Name "NeosTech-RFID-Gateway"
# Estado debe ser: Running
```

**2. Verificar proceso:**
```powershell
Get-Process -Name "Rfid_gateway"
# Debe mostrar el proceso corriendo
```

**3. Probar endpoints:**
```powershell
# Endpoint básico
Invoke-WebRequest -Uri "http://192.168.1.11:8080/readerid?id=TEST"

# Endpoint configuración lectora (NUEVO)
Invoke-RestMethod -Uri "http://192.168.1.11:8080/api/lectora/config"
```

**4. Abrir en navegador:**
```
http://192.168.1.11:8080/readerid?id=TEST&heart=1
```
Debe responder: `{"status":"ok"}`

---

## 🔧 GESTIÓN DEL SERVICIO

### Usando PowerShell (Recomendado)

```powershell
# Ver estado
Get-Service -Name "NeosTech-RFID-Gateway"

# Iniciar servicio
Start-Service -Name "NeosTech-RFID-Gateway"

# Detener servicio
Stop-Service -Name "NeosTech-RFID-Gateway"

# Reiniciar servicio
Restart-Service -Name "NeosTech-RFID-Gateway"

# Ver logs en tiempo real
Get-Content "C:\NeosTech-RFID-System-Pro\logs\gateway-*.log" -Wait -Tail 20
```

### Usando Interfaz Gráfica

1. Presiona `Win + R`
2. Escribe: `services.msc`
3. Busca: "NeosTech RFID Gateway"
4. Clic derecho → Iniciar / Detener / Reiniciar

### Usando Scripts (Instalador Avanzado)

```powershell
# Instalar
.\install-gateway-service.ps1

# Iniciar
.\install-gateway-service.ps1 -Start

# Detener
.\install-gateway-service.ps1 -Stop

# Reiniciar
.\install-gateway-service.ps1 -Restart

# Ver estado
.\install-gateway-service.ps1 -Status

# Desinstalar
.\install-gateway-service.ps1 -Uninstall
```

---

## 🌐 CONFIGURAR LECTORA THY DESDE DASHBOARD

### 1. Acceder al Panel

1. Abrir: **https://neos-tech.web.app**
2. Iniciar sesión
3. Ir a pestaña: **"Lector RFID"**
4. Scroll hasta: **"Configuración Lectora THY (Gateway Local)"**

### 2. Cargar Configuración Actual

1. Clic en **"Cargar Config"**
2. Verás todos los parámetros:
   - **HTTP Output Control** (RemoteIP, Port, Path)
   - **Output Control** (Relay, Buzzer, RSSI)
   - **Reading Settings** (WorkMode, Interface, etc.)

### 3. Modificar Parámetros

Edita los valores que necesites:
- `RemoteIP`: `192.168.1.11` (IP del Gateway)
- `RemotePort`: `8080`
- `HttpParam`: `/readerid?`
- `WorkMode`: `ActiveMod` (lectura continua)
- `BuzzerEnabled`: ✅ (activar buzzer)
- `RelayValidTime`: `3` (segundos)

### 4. Guardar Cambios

1. Clic en **"Guardar en Gateway"**
2. Verás: "✅ Configuración guardada en Gateway local"
3. Los cambios se guardan en: `src/Gateway/lectora.config.json`

### 5. Configurar HTTP Output en Lectora

⚠️ **IMPORTANTE:** El SDK de THY NO permite configurar HTTP Output programáticamente.

Debes configurar manualmente en **THY_Software_V5.4**:

1. Abrir software THY
2. Conectar a lectora: `192.168.1.200:60000`
3. Ir a: **Network → HTTP Output**
4. Configurar:
   - ✅ **Protocol Enabled**: Marcar
   - **Protocol**: `4,HTTP`
   - **RemoteIP**: `192.168.1.11`
   - **RemotePort**: `8080`
   - **HttpParam**: `/readerid?`
   - ✅ **Upload All Tags**: Marcar
5. Guardar y reiniciar lectora

---

## 🔍 ENDPOINTS DISPONIBLES

### Endpoints Básicos

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/readerid?id=<EPC>&readsn=<SN>&heart=0` | Recibir tags de lectora |
| POST | `/relay/on` | Activar relay |
| POST | `/relay/off` | Desactivar relay |

### Endpoints Configuración Lectora (NUEVO)

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/lectora/config` | Obtener configuración actual |
| POST | `/api/lectora/config` | Actualizar configuración |
| POST | `/api/lectora/config/refresh` | Sincronizar desde lectora* |

*Limitado por SDK THY

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
C:\NeosTech-RFID-System-Pro\
├── src/
│   └── Gateway/
│       ├── Program.cs                    # Gateway principal con endpoints
│       ├── Rfid_gateway.dll              # Compilado Release
│       ├── gateway.config.json           # Puntos de acceso
│       ├── lectora.config.json           # Config lectora THY (NUEVO)
│       └── serviceAccountKey.json        # Credenciales Firebase
├── logs/
│   └── gateway-YYYY-MM-DD.log            # Logs diarios
├── setup-gateway-complete.ps1            # Instalador completo
├── install-gateway-service.ps1           # Gestor de servicio
└── RUN-ADMIN.ps1                         # Iniciar manual (desarrollo)
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema 1: Servicio no inicia

**Síntoma:** `Get-Service` muestra "Stopped"

**Solución:**
```powershell
# Ver logs del sistema
Get-EventLog -LogName Application -Source "NeosTech-RFID-Gateway" -Newest 10

# Verificar DLL existe
Test-Path "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.dll"

# Recompilar
cd C:\NeosTech-RFID-System-Pro\src\Gateway
dotnet build --configuration Release

# Reinstalar servicio
.\install-gateway-service.ps1 -Uninstall
.\install-gateway-service.ps1
```

### Problema 2: Endpoint no responde

**Síntoma:** `Invoke-WebRequest` falla con timeout

**Solución:**
```powershell
# Verificar firewall
netsh advfirewall firewall add rule name="RFID Gateway" dir=in action=allow protocol=TCP localport=8080

# Verificar IP estática
ipconfig
# Debe mostrar: 192.168.1.11

# Probar localhost primero
Invoke-WebRequest -Uri "http://localhost:8080/readerid?id=TEST"
```

### Problema 3: Tags no llegan desde lectora

**Síntoma:** Gateway corre pero no recibe tags

**Solución:**
1. Verificar lectora envía HTTP:
   - Abrir **THY_Software_V5.4**
   - Verificar **HTTP Output** habilitado
   - Verificar IP: `192.168.1.11`, Port: `8080`

2. Probar manualmente:
```powershell
Invoke-WebRequest -Uri "http://192.168.1.11:8080/readerid?id=E2806894500050436E22FC13&readsn=TEST&heart=0"
```

3. Ver logs Gateway:
```powershell
Get-Content "C:\NeosTech-RFID-System-Pro\logs\gateway-$(Get-Date -Format 'yyyy-MM-dd').log" -Wait
```

### Problema 4: Configuración lectora no guarda

**Síntoma:** Dashboard muestra error al guardar

**Solución:**
1. Verificar Gateway corriendo:
```powershell
Get-Service -Name "NeosTech-RFID-Gateway"
```

2. Probar endpoint manualmente:
```powershell
$config = @{
    RemoteIP = "192.168.1.11"
    RemotePort = 8080
    HttpParam = "/readerid?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://192.168.1.11:8080/api/lectora/config" -Method Post -Body $config -ContentType "application/json"
```

3. Verificar archivo generado:
```powershell
Get-Content "C:\NeosTech-RFID-System-Pro\src\Gateway\lectora.config.json"
```

---

## 🔄 ACTUALIZAR GATEWAY

### Actualización Simple (sin cambios de código)

```powershell
cd C:\NeosTech-RFID-System-Pro
git pull

# Reiniciar servicio
Restart-Service -Name "NeosTech-RFID-Gateway"
```

### Actualización Completa (con cambios de código)

```powershell
# Detener servicio
Stop-Service -Name "NeosTech-RFID-Gateway"

# Actualizar código
cd C:\NeosTech-RFID-System-Pro
git pull

# Recompilar
cd src\Gateway
dotnet build --configuration Release

# Iniciar servicio
Start-Service -Name "NeosTech-RFID-Gateway"
```

### Reinstalación Completa

```powershell
# Desinstalar servicio anterior
.\install-gateway-service.ps1 -Uninstall

# Ejecutar instalador completo
.\setup-gateway-complete.ps1
```

---

## 📊 MONITOREO

### Ver Logs en Tiempo Real

```powershell
# Logs Gateway
Get-Content "C:\NeosTech-RFID-System-Pro\logs\gateway-$(Get-Date -Format 'yyyy-MM-dd').log" -Wait -Tail 50

# Logs Windows (eventos del servicio)
Get-EventLog -LogName Application -Source "NeosTech-RFID-Gateway" -Newest 20 | Format-Table -AutoSize
```

### Monitoreo de Performance

```powershell
# Uso de CPU y Memoria
Get-Process -Name "Rfid_gateway" | Select-Object CPU, @{N='Memory(MB)';E={[math]::Round($_.WS/1MB,2)}}

# Conexiones de red activas
netstat -ano | findstr :8080
```

### Dashboard de Monitoreo

- **URL:** https://neos-tech.web.app
- **Pestaña:** "Panel de Control" → Ver tags en tiempo real
- **Estadísticas:** Accesos hoy, tags procesados, errores

---

## 🔐 SEGURIDAD

### Firewall Windows

```powershell
# Permitir puerto 8080
New-NetFirewallRule -DisplayName "RFID Gateway" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow

# Ver regla
Get-NetFirewallRule -DisplayName "RFID Gateway"
```

### Permisos de Archivo

El servicio corre como "LocalSystem" y tiene acceso completo a:
- `C:\NeosTech-RFID-System-Pro\`
- Logs en `C:\NeosTech-RFID-System-Pro\logs\`
- Configuraciones en `src\Gateway\*.json`

### Credenciales Firebase

⚠️ **IMPORTANTE:** Proteger `serviceAccountKey.json`

```powershell
# Verificar permisos (solo Administradores y SYSTEM)
icacls "C:\NeosTech-RFID-System-Pro\src\Gateway\serviceAccountKey.json"

# Restringir permisos
icacls "C:\NeosTech-RFID-System-Pro\src\Gateway\serviceAccountKey.json" /inheritance:r /grant:r "Administrators:F" /grant:r "SYSTEM:F"
```

---

## 📞 SOPORTE

### Contactos

- **Desarrollador:** [Tu Nombre]
- **Email:** [tu@email.com]
- **Repositorio:** https://github.com/tuusuario/NeosTech-RFID-System-Pro

### Logs para Soporte

Si reportas un problema, incluye:

1. **Log del Gateway:**
```powershell
Get-Content "C:\NeosTech-RFID-System-Pro\logs\gateway-$(Get-Date -Format 'yyyy-MM-dd').log" | Out-File problema.txt
```

2. **Estado del servicio:**
```powershell
Get-Service -Name "NeosTech-RFID-Gateway" | Format-List * | Out-File servicio.txt
```

3. **Configuración actual:**
```powershell
Get-Content "C:\NeosTech-RFID-System-Pro\src\Gateway\gateway.config.json" | Out-File config.txt
Get-Content "C:\NeosTech-RFID-System-Pro\src\Gateway\lectora.config.json" | Out-File lectora-config.txt
```

---

## ✅ CHECKLIST FINAL

Antes de dar por terminada la instalación:

- [ ] Servicio "NeosTech-RFID-Gateway" corriendo
- [ ] Estado del servicio: `Running`
- [ ] Inicio automático: `Automatic`
- [ ] Endpoint responde: `http://192.168.1.11:8080/readerid?id=TEST`
- [ ] Endpoint config responde: `http://192.168.1.11:8080/api/lectora/config`
- [ ] Dashboard carga: https://neos-tech.web.app
- [ ] Panel "Configuración Lectora THY" visible en dashboard
- [ ] HTTP Output configurado en THY_Software_V5.4
- [ ] Lectora envía tags (aparecen en logs)
- [ ] Relay se activa con tags autorizados
- [ ] Whitelist sincronizada desde Firestore
- [ ] Logs generándose en `C:\NeosTech-RFID-System-Pro\logs\`

---

**Última actualización:** 29 de enero de 2026  
**Versión documento:** 2.0  
**Características nuevas:**
- ✨ Panel configuración lectora THY en dashboard
- ✨ Endpoints `/api/lectora/config` 
- ✨ Sistema whitelist offline-first
- ✨ Instalador como servicio de Windows
