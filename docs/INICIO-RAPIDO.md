# 🚀 Inicio Rápido del Sistema RFID NeosTech

## Inicio Completo (Recomendado)

Ejecuta este script para iniciar Gateway + Dashboard automáticamente:

```powershell
.\start-system.ps1
```

Esto iniciará:
- ✅ Gateway RFID en `http://localhost:8080`
- ✅ Dashboard Web en `http://localhost:5000`
- ✅ Abrirá el navegador automáticamente

---

## Detener Todo

```powershell
.\stop-all-services.ps1
```

---

## Reiniciar Solo el Gateway (después de cambios en código)

```powershell
.\restart-gateway-cors.ps1
```

---

## Puertos del Sistema

| Servicio | Puerto | URL |
|----------|--------|-----|
| Gateway API | 8080 | http://localhost:8080 |
| Dashboard | 5000 | http://localhost:5000 |
| Lector RFID | 60000 | 192.168.1.200:60000 |

---

## Verificación de Salud

```powershell
# Verificar Gateway
Invoke-RestMethod http://localhost:8080/health

# Verificar Dashboard
Invoke-WebRequest http://localhost:5000 -UseBasicParsing
```

---

## Probar Apertura Manual del Relay

```powershell
$body = @{ access_point = 'porton_triwe' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8080/api/open' -Method POST -Body $body -ContentType 'application/json'
```

---

## Solución de Problemas

### Gateway no inicia
1. Verifica que no haya procesos anteriores: `Get-Process *Rfid* | Stop-Process -Force`
2. Recompila: `dotnet build src\Gateway\Rfid_gateway.csproj -c Release`
3. Verifica DLL: `Test-Path src\Gateway\bin\Release\net8.0\SWNetApi.dll`

### Puerto 8080 en uso
```powershell
# Ver qué está usando el puerto
netstat -ano | Select-String ":8080"

# Detener proceso por PID (reemplaza 1234 con el PID real)
Stop-Process -Id 1234 -Force
```

### Lectora no se encuentra (cambio de red)
1. Ejecuta: `.\setup-network.ps1`
2. Verifica IP del lector: debería ser `192.168.1.200`
3. Ping: `Test-NetConnection 192.168.1.200 -Port 60000`

### Dashboard no carga
1. Verifica Firebase CLI: `firebase --version`
2. Si no está instalado: `npm install -g firebase-tools`
3. Login: `firebase login`

---

## Configuración de Red

El Gateway detecta automáticamente la IP local y se conecta al lector en:
- IP Local: Automática (ej: 192.168.1.2)
- IP Lector: `192.168.1.200:60000`

Para cambios de red, el sistema se adapta automáticamente.

---

## Lectura Automática de Tags

El sistema lee tags automáticamente cada **500ms** con:
- Anti-spam: **5 segundos** (mismo tag ignorado)
- Modo: Polling directo al lector
- Envío: Cloud Function + Firestore

Para ver tags detectados:
1. Abre Dashboard: http://localhost:5000
2. Ve a: **📊 Lectura en Tiempo Real**
3. Acerca un tag RFID al lector

---

## Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `start-system.ps1` | Inicio completo del sistema |
| `stop-all-services.ps1` | Detener todos los servicios |
| `restart-gateway-cors.ps1` | Reiniciar solo Gateway |
| `setup-network.ps1` | Configurar red automáticamente |
| `src/Gateway/gateway.config.json` | Configuración de puntos de acceso |
| `src/web/index.html` | Dashboard principal |

---

## Próximos Pasos

1. ✅ **Sistema Activo** - Gateway y Dashboard corriendo
2. ✅ **Apertura Manual** - Probada exitosamente
3. 🔄 **Lectura Automática** - Listo para tags RFID
4. 📝 **Configuración** - Accede desde el Dashboard

Para configurar lectores, visita: http://localhost:5000 → 🔧 Lector RFID
