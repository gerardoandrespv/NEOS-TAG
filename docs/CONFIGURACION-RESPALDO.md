# 🔒 Protección de Configuración - Sistema RFID

## ✅ Configuración Actual (FUNCIONAL - NO MODIFICAR)

### Gateway RFID
- **IP Lector**: 192.168.1.200
- **Puerto**: 60000
- **Protocolo**: THY SDK (DLL nativa)
- **Duración relay**: 1000ms (1 segundo)
- **DLL**: SWNetApi.dll (x64)

### Puntos de Acceso Configurados

#### 1. Portón Triwe
```json
{
  "id": "porton_triwe",
  "name": "Portón Triwe",
  "type": "gate",
  "reader_ip": "192.168.1.200",
  "reader_port": 60000,
  "relay_channel": 1,
  "open_duration_ms": 1000,
  "test_mode": false,
  "protocol": "THY_SDK"
}
```

#### 2. Portón Principal (No funcional aún)
```json
{
  "id": "porton_principal",
  "name": "Portón Principal",
  "type": "gate",
  "reader_ip": "192.168.1.101",
  "reader_port": 60000,
  "relay_channel": 1,
  "open_duration_ms": 1000,
  "test_mode": false,
  "protocol": "THY_SDK"
}
```

---

## 📦 Scripts de Backup y Restauración

### Crear Backup de Configuración

```powershell
.\scripts\backup-reader-config.ps1
```

**Qué hace:**
- Crea un backup timestamped en `config/backups/`
- Respalda `gateway.config.json`
- Respalda `SWNetApi.dll`
- Muestra resumen de la configuración guardada

**Ejemplo de salida:**
```
=== Backup de Configuracion del Lector RFID ===
Lector: 192.168.1.200:60000
OK - Backup creado: config/backups/reader_config_20260122_204500.json

Resumen de configuracion respaldada:
  Client ID: condominio-neos
  Version: 6.0
  Puntos de acceso: 2
    - Portón Triwe: 192.168.1.200:60000 (relay: 1000ms)
    - Portón Principal: 192.168.1.101:60000 (relay: 1000ms)
```

---

### Restaurar Configuración desde Backup

```powershell
.\scripts\restore-reader-config.ps1
```

**Modo interactivo:**
1. Muestra lista de backups disponibles
2. Selecciona el backup deseado
3. Confirma la restauración
4. Crea backup pre-restauración automático

**Modo directo:**
```powershell
.\scripts\restore-reader-config.ps1 -BackupFile "config/backups/reader_config_20260122_204500.json"
```

---

## 🛠️ Archivos Críticos (NO ELIMINAR)

### Configuración
- `src/Gateway/gateway.config.json` - Configuración principal
- `src/Gateway/SWNetApi.dll` - DLL nativa del lector THY

### Scripts Esenciales
- `restart-gateway-cors.ps1` - Reiniciar Gateway con CORS
- `scripts/backup-reader-config.ps1` - Crear backup
- `scripts/restore-reader-config.ps1` - Restaurar backup

### Código del Gateway
- `src/Gateway/Program.cs` - Lógica principal con CORS
- `src/Gateway/THYReaderAPI.cs` - Wrapper de la DLL THY
- `src/Gateway/Rfid_gateway.csproj` - Proyecto (copia automática de archivos)

---

## 🚀 Cómo Iniciar el Sistema

### 1. Dashboard (Firebase)
```powershell
cd C:\NeosTech-RFID-System-Pro
firebase serve
```
Acceso: http://localhost:5000

### 2. Gateway RFID
```powershell
C:\NeosTech-RFID-System-Pro\restart-gateway-cors.ps1
```
Servidor: http://localhost:60000

**IMPORTANTE:** El Gateway debe ejecutarse como **Administrador**

---

## ✅ Verificación de Configuración Correcta

Cuando el Gateway inicia correctamente, debes ver:

```
=== Iniciando Gateway ===
Servidor HTTP en http://localhost:60000
CORS habilitado para dashboard

[...] Buscando configuración en: ...\gateway.config.json
[...] Archivo de configuración encontrado y parseado
[...] Cargado: Portón Triwe @ 192.168.1.200:60000
[...] Cargado: Portón Principal @ 192.168.1.101:60000
[...] RFID Gateway iniciado
[...] Client ID: condominio-neos
[...] Puntos de acceso cargados: 2
[...] Servidor HTTP en puerto 60000
```

**Indicadores clave:**
- ✅ `Puntos de acceso cargados: 2`
- ✅ `Cargado: Portón Triwe @ 192.168.1.200:60000`
- ✅ `CORS habilitado`

---

## 🔧 Solución de Problemas

### Problema: "Puntos de acceso cargados: 0"

**Solución:**
```powershell
# Copiar configuración manualmente
Copy-Item "src\Gateway\gateway.config.json" "src\Gateway\bin\Release\net8.0\" -Force

# Reiniciar Gateway
C:\NeosTech-RFID-System-Pro\restart-gateway-cors.ps1
```

### Problema: "Error 404" al presionar botón Triwe

**Causa:** Gateway no tiene puntos de acceso cargados

**Solución:**
1. Verificar que el Gateway muestre "Puntos de acceso cargados: 2"
2. Si muestra 0, restaurar desde backup:
   ```powershell
   .\scripts\restore-reader-config.ps1
   ```

### Problema: "CORS error" en dashboard

**Causa:** Gateway no tiene CORS habilitado

**Solución:**
1. Asegurar que Program.cs tenga los headers CORS (ya incluidos)
2. Reiniciar Gateway con el script correcto:
   ```powershell
   C:\NeosTech-RFID-System-Pro\restart-gateway-cors.ps1
   ```

---

## 📋 Configuración del Proyecto (.csproj)

El archivo `Rfid_gateway.csproj` está configurado para copiar automáticamente:

```xml
<ItemGroup>
  <None Update="gateway.config.json">
    <CopyToOutputDirectory>Always</CopyToOutputDirectory>
  </None>
  <None Update="SWNetApi.dll">
    <CopyToOutputDirectory>Always</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

Esto garantiza que al compilar, siempre se copien los archivos necesarios.

---

## 🎯 Configuración del Lector (Hardware)

### Parámetros THY SDK
- **Dirección dispositivo**: 0xFF (broadcast)
- **Función relay ON**: `SWNet_RelayOn(0xFF)`
- **Función relay OFF**: `SWNet_RelayOff(0xFF)`
- **Duración**: Controlada por software (1000ms)

### Red
- **IP estática**: 192.168.1.200
- **Puerto TCP**: 60000
- **Protocolo**: TCP/IP con DLL nativa

---

## 📝 Notas Importantes

1. **Siempre hacer backup antes de cambios**: `.\scripts\backup-reader-config.ps1`
2. **No modificar el puerto 60000**: Es el puerto estándar del lector THY
3. **No cambiar la duración del relay sin pruebas**: 1000ms está probado y funciona
4. **CORS es esencial**: Sin CORS, el dashboard no puede comunicarse con el Gateway
5. **La DLL debe estar en el mismo directorio que el .exe**: Configurado automáticamente en .csproj

---

**Última actualización:** 22 Enero 2026
**Estado:** ✅ FUNCIONAL - Relay operativo con 1 segundo de apertura
**Versión Gateway:** 6.0
**Protocolo:** THY SDK con SWNetApi.dll (x64)
