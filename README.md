# NeosTech RFID System Pro v6.3

Sistema de control de acceso RFID profesional con Gateway C# .NET 8.0, Dashboard Firebase y Cloud Functions Python.

---

## ⚠️ IMPORTANTE: Convenciones del Proyecto

**ANTES DE CREAR CUALQUIER ARCHIVO, lee:** [CONVENCIONES.md](CONVENCIONES.md)

### Reglas de Oro
1. ✅ **SIEMPRE** crear archivos en el directorio correspondiente
2. ✅ **SIEMPRE** mantener el orden de la estructura
3. ❌ **NUNCA** crear scripts, documentos o tests en root

---

## 📁 Estructura del Proyecto

```
NeosTech-RFID-System-Pro/
├── docs/              # Documentación (guías, API, deployment)
├── scripts/           # Scripts de automatización
│   ├── windows/      # Scripts batch de Windows
│   ├── deployment/   # Scripts de deployment
│   └── testing/      # Scripts de testing
├── src/              # Código fuente
│   ├── Gateway/      # Gateway C# .NET 8.0
│   ├── web/          # Dashboard HTML/JS/Firebase
│   └── functions/    # Cloud Functions Python
├── config/           # Configuraciones del sistema
├── Instalador/       # Paquete de instalación
├── logs/             # Logs de aplicación
└── [15 archivos]     # Solo archivos esenciales de config
```

**Detalles completos:** [LIMPIEZA-COMPLETADA.md](LIMPIEZA-COMPLETADA.md#estructura-final)

---

## 🚀 Inicio Rápido

### Gateway (C#)
```powershell
cd src\Gateway
dotnet build --configuration Release
dotnet run
```

### Dashboard (Firebase)
```bash
firebase serve
# o para deployment
firebase deploy --only hosting
```

### Firestore Rules
```bash
firebase deploy --only firestore:rules
```

---

## 📝 Comandos Principales

| Comando | Descripción |
|---------|-------------|
| `dotnet build src/Gateway` | Compilar Gateway |
| `firebase serve` | Desarrollo local del Dashboard |
| `firebase deploy --only hosting` | Deploy Dashboard |
| `firebase deploy --only firestore:rules` | Deploy Reglas Firestore |
| `.\cleanup-project.ps1` | Limpieza profunda del proyecto |

---

## 📚 Documentación

### Principales
- **[CONVENCIONES.md](CONVENCIONES.md)** - ⚠️ **LEER PRIMERO** - Reglas y estándares del proyecto
- **[LEEME-PRIMERO.md](LEEME-PRIMERO.md)** - Guía de inicio rápido
- **[CHANGELOG.md](CHANGELOG.md)** - Historial de cambios
- **[LIMPIEZA-COMPLETADA.md](LIMPIEZA-COMPLETADA.md)** - Resumen de limpieza y estructura

### Guías Técnicas (en docs/)
- [Instalación Gateway](docs/INSTALACION-COMPLETA-GATEWAY.md)
- [Configuración Lectora](docs/CONFIGURAR-LECTORA-HTTP.md)
- [Deployment GCP](docs/DEPLOYMENT-GCP.md)
- [Testing](docs/TESTING_INSTRUCTIONS.md)

---

## 🏗️ Componentes del Sistema

### 1. Gateway (C# .NET 8.0)
- Recibe tags RFID de lectora THY
- Valida contra Firestore
- Activa relay si autorizado
- HTTP API en puerto 8080

**Ubicación:** `src/Gateway/`

### 2. Dashboard (HTML/JS/Firebase)
- Interfaz web de administración
- Firebase Hosting
- Firestore para datos
- Gestión de whitelist y usuarios

**Ubicación:** `src/web/index.html`

### 3. Lectora RFID THY
- IP: 192.168.1.200:60000
- Firmware 5.3, Hardware 1.6
- Modo HTTP Output al Gateway
- Relay deshabilitado (seguridad)

**Config:** `config/lectora.config.json`

---

## 🔧 Desarrollo

### Antes de Empezar
1. Leer [CONVENCIONES.md](CONVENCIONES.md)
2. Verificar estructura: `tree /F /A`
3. Limpiar archivos temporales: `.\cleanup-project.ps1`

### Crear Nuevo Archivo
```powershell
# ✅ CORRECTO - Documentación
New-Item "docs/guides/MI-NUEVA-GUIA.md"

# ✅ CORRECTO - Script
New-Item "scripts/testing/mi-test.ps1"

# ❌ INCORRECTO - Root
New-Item "MI-NUEVA-GUIA.md"  # ¡NO!
```

### Workflow
1. Crear archivos en lugar correcto
2. Desarrollar funcionalidad
3. Ejecutar tests
4. Limpiar temporales
5. Verificar estructura
6. Commit

---

## ✅ Validación

### Compilar Gateway
```powershell
cd src\Gateway
dotnet build --configuration Release
# Debe compilar sin errores
```

### Verificar Estructura
```powershell
Get-ChildItem -File | Measure-Object
# Debe mostrar ~15 archivos en root
```

### Health Check
```powershell
.\scripts\utilities\project-health-check.ps1
```

---

## 📦 Instalación en Producción

Ver: [Instalador/README.md](Instalador/README.md)

```powershell
# Descomprimir NeosTech-Gateway-Installer.zip
# Ejecutar como Administrador:
.\install.ps1
```

---

## 🔐 Configuración

### Firebase
- Proyecto: `neos-tech`
- Hosting: https://neos-tech.web.app
- Collections: whitelist, rfid_tags, users, access_logs

### Gateway
- Puerto: 8080
- Lectora: 192.168.1.200:60000
- Firestore: Validación en tiempo real

### Cloudflare Tunnel
- HTTPS: https://retreat-said-suggestions-pull.trycloudflare.com
- Evita Mixed Content errors

---

## 🐛 Troubleshooting

Ver documentación en `docs/troubleshooting/`

### Gateway no compila
```powershell
dotnet restore
dotnet build --configuration Release
```

### Dashboard no carga
```powershell
firebase serve
# Verificar en http://localhost:5000
```

### Archivos desorganizados
```powershell
.\cleanup-project.ps1
# Lee el reporte generado
```

---

## 🤝 Contribución

1. Leer [CONVENCIONES.md](CONVENCIONES.md) **OBLIGATORIO**
2. Crear branch para feature
3. Seguir estructura de directorios
4. Mantener código limpio y organizado
5. Actualizar documentación
6. Ejecutar `cleanup-project.ps1` antes de commit
7. Crear Pull Request

---

## 📊 Estado del Proyecto

- ✅ **Gateway v6.3** - Producción Ready
- ✅ **Dashboard v2.4.27-INDEX-FIX** - Desplegado
- ✅ **Instalador** - Completo (1.35 MB)
- ✅ **Documentación** - Consolidada
- ✅ **Estructura** - Profesional y Organizada

**Última limpieza:** 2 de febrero de 2026  
**Espacio liberado:** 376.38 MB

---

## 📄 Licencia

Propietario: NeosTech  
Sistema de Control de Acceso RFID  
Todos los derechos reservados

---

## 📞 Soporte

Ver documentación en `docs/` para guías detalladas.

**Documentos clave:**
- [CONVENCIONES.md](CONVENCIONES.md) - Reglas del proyecto
- [LIMPIEZA-COMPLETADA.md](LIMPIEZA-COMPLETADA.md) - Estructura y organización
- [CHANGELOG.md](CHANGELOG.md) - Historial de cambios
