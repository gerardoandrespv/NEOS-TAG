# 📦 NeosTech RFID Gateway - Paquete de Instalación

## 📋 Contenido del Paquete

```
NeosTech-Gateway-Installer/
├── install.ps1              # Script de instalación automática
├── README.md                # Este archivo
├── Gateway/                 # Archivos del Gateway
│   ├── Rfid_gateway.exe     # Ejecutable principal
│   ├── gateway.config.json  # Configuración Firebase
│   ├── lectora.config.json  # Configuración lectora RFID
│   ├── Newtonsoft.Json.dll
│   ├── SWNetApi.dll
│   ├── System.*.dll
│   └── runtimes/
└── cloudflared.exe          # (Opcional) Túnel Cloudflare
```

---

## ⚡ Instalación Rápida (RECOMENDADO)

### **Opción 1: Instalación Automática**

1. **Descarga el paquete completo**
2. **Descomprime** en cualquier ubicación
3. **Clic derecho** en `install.ps1` → **Ejecutar como Administrador**
4. Sigue las instrucciones en pantalla

✅ **El instalador hará automáticamente:**
- Instalar .NET 8.0 Runtime (si no está)
- Copiar archivos a `C:\NeosTech-Gateway`
- Configurar Firewall (puerto 8080)
- Crear servicio de Windows
- Iniciar el Gateway

---

## 🛠️ Instalación Manual

### **Requisitos Previos**

1. **Windows 10/11** (64-bit)
2. **.NET 8.0 Runtime**
   - Descarga: https://dotnet.microsoft.com/download/dotnet/8.0
   - Versión: ASP.NET Core Runtime 8.0.x

### **Pasos Manuales**

1. **Copiar archivos:**
   ```powershell
   Copy-Item -Path "Gateway" -Destination "C:\NeosTech-Gateway" -Recurse
   ```

2. **Configurar Firewall:**
   ```powershell
   New-NetFirewallRule -DisplayName "NeosTech Gateway" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
   ```

3. **Crear servicio:**
   ```powershell
   sc.exe create NeosTechGateway binPath= "C:\NeosTech-Gateway\Rfid_gateway.exe" start= auto
   ```

4. **Iniciar servicio:**
   ```powershell
   Start-Service NeosTechGateway
   ```

---

## ⚙️ Configuración

### **1. Configurar Lectora RFID**

Edita `C:\NeosTech-Gateway\lectora.config.json`:

```json
{
  "RemoteIP": "192.168.1.11",     // IP de esta PC (Gateway)
  "RemotePort": 8080,              // Puerto HTTP del Gateway
  "RelayEnabled": false,           // ⚠️ DESACTIVAR para seguridad
  "RelayValidTime": 3,             // Segundos que el relé permanece activo
  "BuzzerEnabled": true,           // Sonido al leer tag
  "FilterTime": 0                  // Filtro de tiempo entre lecturas (0 = sin cooldown)
}
```

### **2. Configurar Firebase**

Edita `C:\NeosTech-Gateway\gateway.config.json`:

```json
{
  "firebase_project": "neos-tech",
  "firebase_credentials_path": "./firebase-credentials.json",
  "access_points": [
    {
      "id": "porton_triwe",
      "name": "Portón Triwe",
      "reader_ip": "192.168.1.200",
      "reader_port": 60000,
      "relay_channel": 255,
      "open_duration_ms": 3000,
      "TagCooldownSeconds": 10
    }
  ]
}
```

### **3. Configurar Red de la Lectora**

**En el software THY Reader (desde otra PC en la red):**

1. Conectar lectora por USB
2. Abrir THY Reader Software
3. Ir a **Network Settings**:
   - IP Address: `192.168.1.200`
   - Subnet: `255.255.255.0`
   - Gateway: `192.168.1.1`
   - Port: `60000`
4. Ir a **HTTP Output**:
   - Enable: ✅
   - Remote IP: `192.168.1.11` (IP del Gateway)
   - Remote Port: `8080`
5. Aplicar y reiniciar lectora

---

## 🌐 Configurar Cloudflare Tunnel (Acceso Remoto)

### **¿Por qué Cloudflare Tunnel?**
- Dashboard accede al Gateway por HTTPS (evita Mixed Content)
- No necesitas abrir puertos en el router
- Acceso remoto seguro sin VPN

### **Instalación:**

1. **Abrir PowerShell como Administrador:**
   ```powershell
   cd C:\NeosTech-Gateway
   ```

2. **Iniciar túnel:**
   ```powershell
   .\cloudflared.exe tunnel --url http://localhost:8080
   ```

3. **Copiar URL generada:**
   ```
   https://xxxxx-xxxx-xxxxxx-xxxx.trycloudflare.com
   ```

4. **Actualizar Dashboard:**
   - Editar `src/web/index.html`
   - Buscar línea ~3484:
     ```javascript
     const response = await fetch('https://TU-NUEVA-URL.trycloudflare.com/api/open', {
     ```

### **Ejecutar Cloudflare como Servicio (Opcional):**

```powershell
# Crear archivo de configuración
New-Item -ItemType File -Path "C:\NeosTech-Gateway\cloudflared-config.yml"

# Editar cloudflared-config.yml:
# tunnel: <TUNNEL-ID>
# credentials-file: C:\NeosTech-Gateway\cloudflared-credentials.json

# Instalar como servicio
.\cloudflared.exe service install
```

---

## 🔧 Administración del Servicio

### **Ver Estado:**
```powershell
Get-Service NeosTechGateway
```

### **Iniciar:**
```powershell
Start-Service NeosTechGateway
```

### **Detener:**
```powershell
Stop-Service NeosTechGateway
```

### **Reiniciar:**
```powershell
Restart-Service NeosTechGateway
```

### **Ver Logs en Vivo:**
```powershell
Get-Content "C:\NeosTech-Gateway\logs\gateway.log" -Wait -Tail 50
```

### **Desinstalar Servicio:**
```powershell
Stop-Service NeosTechGateway
sc.exe delete NeosTechGateway
```

---

## 🐛 Solución de Problemas

### **El servicio no inicia:**

1. **Verificar .NET 8.0:**
   ```powershell
   dotnet --list-runtimes
   ```
   Debe aparecer: `Microsoft.NETCore.App 8.0.x`

2. **Ejecutar manualmente para ver errores:**
   ```powershell
   cd C:\NeosTech-Gateway
   .\Rfid_gateway.exe
   ```

3. **Ver logs de Windows:**
   ```powershell
   Get-EventLog -LogName Application -Source NeosTechGateway -Newest 20
   ```

### **La lectora no se conecta:**

1. **Ping a la lectora:**
   ```powershell
   ping 192.168.1.200
   ```

2. **Verificar puerto TCP:**
   ```powershell
   Test-NetConnection -ComputerName 192.168.1.200 -Port 60000
   ```

3. **Verificar HTTP Output en THY Reader Software**

### **Firewall bloquea conexiones:**

```powershell
# Ver reglas existentes
Get-NetFirewallRule -DisplayName "*NeosTech*"

# Crear regla manualmente
New-NetFirewallRule -DisplayName "NeosTech Gateway HTTP" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

### **Firebase no conecta:**

1. **Verificar credenciales:**
   ```powershell
   Test-Path "C:\NeosTech-Gateway\firebase-credentials.json"
   ```

2. **Probar conexión:**
   ```powershell
   Invoke-WebRequest -Uri "https://neos-tech.firebaseio.com/.json" -UseBasicParsing
   ```

---

## 📊 Monitoreo

### **Ver tags en tiempo real:**
```powershell
# Abrir navegador en:
http://localhost:8080/status
```

### **Test de API:**
```powershell
# Abrir portón manualmente:
Invoke-RestMethod -Uri "http://localhost:8080/api/open" -Method POST -ContentType "application/json" -Body '{"access_point":"porton_triwe"}'
```

---

## 🔐 Seguridad

### **Recomendaciones:**

1. ✅ **DESACTIVAR** `RelayEnabled` en la lectora (THY Reader Software)
2. ✅ **Firewall** activo solo en puerto 8080
3. ✅ **Cloudflare Tunnel** en lugar de abrir puertos en router
4. ✅ **Firebase Security Rules** configuradas correctamente
5. ⚠️ **NO exponer** puerto 8080 a Internet directamente

### **Firebase Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /whitelist/{tagId} {
      allow read, write: if request.auth != null;
    }
    match /rfid_tags/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📞 Soporte

**Logs del Gateway:**
```powershell
C:\NeosTech-Gateway\logs\
```

**Información del sistema:**
```powershell
# Versión de Windows
winver

# Hardware
systeminfo | findstr /C:"Memoria" /C:"Procesador"

# Red
ipconfig /all
```

---

## 🔄 Actualización

1. **Detener servicio:**
   ```powershell
   Stop-Service NeosTechGateway
   ```

2. **Respaldar configuración:**
   ```powershell
   Copy-Item "C:\NeosTech-Gateway\*.config.json" -Destination "C:\Backup\"
   ```

3. **Reemplazar archivos:**
   ```powershell
   Copy-Item -Path "Gateway\*" -Destination "C:\NeosTech-Gateway\" -Force
   ```

4. **Restaurar configuración:**
   ```powershell
   Copy-Item "C:\Backup\*.config.json" -Destination "C:\NeosTech-Gateway\" -Force
   ```

5. **Iniciar servicio:**
   ```powershell
   Start-Service NeosTechGateway
   ```

---

## 📝 Notas Importantes

- ⚠️ **IP Lectora:** Debe estar en la misma red que el Gateway
- ⚠️ **Puerto 8080:** No debe estar en uso por otra aplicación
- ⚠️ **Firewall:** Windows Firewall debe permitir puerto 8080
- ⚠️ **Antivirus:** Puede bloquear el servicio, agregar excepción si es necesario

---

## ✅ Checklist de Instalación

- [ ] .NET 8.0 Runtime instalado
- [ ] Gateway copiado a `C:\NeosTech-Gateway`
- [ ] Firewall configurado (puerto 8080)
- [ ] Servicio creado e iniciado
- [ ] Lectora configurada (IP: 192.168.1.200)
- [ ] HTTP Output habilitado en lectora
- [ ] Firebase credentials configuradas
- [ ] Cloudflare Tunnel iniciado (opcional)
- [ ] Dashboard actualizado con nueva URL Cloudflare

---

**Versión del instalador:** 1.0  
**Última actualización:** Febrero 2026
