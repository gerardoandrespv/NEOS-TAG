# Convenciones y Estándares del Proyecto
## NeosTech RFID System Pro

Este documento establece las reglas y convenciones que **DEBEN** seguirse en todo momento para mantener la calidad, organización y mantenibilidad del proyecto.

---

## 🎯 Regla de Oro: Orden y Organización

> **SIEMPRE crear los archivos en el lugar correspondiente según su tipo y función.**
> **SIEMPRE mantener el orden de la estructura del proyecto.**

---

## 📁 Estructura de Directorios (OBLIGATORIA)

```
NeosTech-RFID-System-Pro/
├── .archive/              # Backups y archivos históricos
├── .firebase/             # Cache de Firebase CLI (NO versionar)
├── .github/               # Configuraciones de GitHub
├── cloud/                 # Cloud Functions (Python)
├── config/                # Configuraciones del sistema
├── docs/                  # TODA la documentación del proyecto
│   ├── guides/           # Guías de usuario y desarrollo
│   ├── api/              # Documentación de APIs
│   └── deployment/       # Instrucciones de deployment
├── frontend/              # Assets del frontend
│   ├── assets/
│   ├── css/
│   └── js/
├── Instalador/            # Paquete de instalación del Gateway
├── logs/                  # Logs de aplicación (NO versionar archivos .log)
├── node_modules/          # Dependencias Node.js (NO versionar)
├── scripts/               # Scripts de utilidad y automatización
│   ├── windows/          # Scripts específicos de Windows (.bat)
│   ├── deployment/       # Scripts de deployment
│   └── testing/          # Scripts de testing
├── src/                   # CÓDIGO FUENTE PRINCIPAL
│   ├── Gateway/          # Gateway C# .NET 8.0
│   ├── functions/        # Cloud Functions Python
│   └── web/              # Dashboard HTML/JS/Firebase
└── [archivos config]      # Solo archivos esenciales de configuración
```

---

## 📋 Reglas de Colocación de Archivos

### ✅ HACER

#### Documentación
- **Guías técnicas** → `docs/guides/`
- **Documentación de API** → `docs/api/`
- **Instrucciones de deployment** → `docs/deployment/`
- **Referencias de configuración** → `docs/configuration/`
- **Troubleshooting** → `docs/troubleshooting/`

#### Scripts
- **Scripts PowerShell (.ps1)** → `scripts/`
  - Deployment → `scripts/deployment/`
  - Testing → `scripts/testing/`
  - Utilities → `scripts/utilities/`
- **Scripts Batch (.bat)** → `scripts/windows/`
- **Scripts Python (.py)** → `scripts/python/`

#### Código Fuente
- **Gateway C#** → `src/Gateway/`
- **Dashboard HTML/JS** → `src/web/`
- **Cloud Functions** → `src/functions/`
- **Utilidades compartidas** → `src/shared/`

#### Archivos de Testing
- **Tests unitarios** → `tests/unit/`
- **Tests de integración** → `tests/integration/`
- **Fixtures y mocks** → `tests/fixtures/`
- **HTML de prueba temporal** → `tests/manual/` (temporal, eliminar después)

#### Configuraciones
- **Configs de Firebase** → root (`firebase.json`, `firestore.rules`, `.firebaserc`)
- **Configs de lectora RFID** → `config/lectora.config.json`
- **Configs de entorno** → `config/` o `.env` (root)
- **Configs de IDE** → root (`.gitignore`, `.editorconfig`)

#### Archivos Temporales
- **Logs activos** → `logs/` (mantener solo `gateway.log`, `gateway_process.log`)
- **Archivos de procesamiento** → **NO CREAR** (usar memoria o eliminar inmediatamente)
- **Backups** → `.archive/` con fecha en nombre

### ❌ NO HACER

- ❌ **NO crear archivos .md de documentación en root** (excepto README.md, CHANGELOG.md, LEEME-PRIMERO.md)
- ❌ **NO crear scripts .ps1 o .bat en root**
- ❌ **NO crear archivos HTML de testing en root**
- ❌ **NO crear archivos temporales sin eliminar después**
- ❌ **NO duplicar archivos de configuración**
- ❌ **NO versionar logs, node_modules, binarios compilados**

---

## 📝 Convenciones de Nomenclatura

### Archivos
- **Documentación**: `NOMBRE-DESCRIPTIVO.md` (UPPERCASE con guiones)
  - Ejemplo: `INSTALACION-GATEWAY.md`, `API-REFERENCE.md`
- **Scripts PowerShell**: `nombre-descriptivo.ps1` (lowercase con guiones)
  - Ejemplo: `deploy-dashboard.ps1`, `test-system.ps1`
- **Scripts Batch**: `nombre-descriptivo.bat` (lowercase con guiones)
  - Ejemplo: `install-service.bat`, `restart-gateway.bat`
- **Código C#**: `PascalCase.cs`
  - Ejemplo: `Program.cs`, `AccessPointConfig.cs`
- **Código JavaScript**: `camelCase.js` o `kebab-case.js`
  - Ejemplo: `firebaseService.js`, `data-extractor.js`

### Directorios
- **Lowercase con guiones**: `mi-directorio/`
  - Ejemplo: `docs/`, `scripts/`, `cloud-functions/`
- **Excepción**: Nombres propios o convenciones establecidas
  - Ejemplo: `Gateway/`, `Instalador/`

---

## 🔧 Workflow de Desarrollo

### Antes de Crear un Archivo

1. **Identificar el tipo de archivo**
   - ¿Es documentación? → `docs/`
   - ¿Es un script? → `scripts/`
   - ¿Es código fuente? → `src/`
   - ¿Es un test? → `tests/`

2. **Verificar la subcategoría**
   - Ejemplo: Script de deployment → `scripts/deployment/`
   - Ejemplo: Documentación de API → `docs/api/`

3. **Verificar que el directorio exista**
   ```powershell
   # Si no existe, crear primero
   New-Item -ItemType Directory -Path "ruta/al/directorio" -Force
   ```

4. **Crear el archivo en el lugar correcto**
   ```powershell
   # CORRECTO
   New-Item -ItemType File -Path "docs/guides/MI-GUIA.md"
   
   # INCORRECTO
   New-Item -ItemType File -Path "MI-GUIA.md"
   ```

### Limpieza Regular

- **Diariamente**: Eliminar archivos temporales de testing
- **Semanalmente**: Revisar logs/ y eliminar logs antiguos
- **Mensualmente**: Ejecutar `cleanup-project.ps1` para limpieza profunda

---

## 🚫 Archivos Prohibidos en Root

Solo estos archivos pueden estar en el directorio raíz:

### Archivos de Configuración
- `.env.example`
- `.firebaserc`
- `.gitignore`
- `firebase.json`
- `firestore.rules`
- `lectora.config.json`
- `package.json`
- `package-lock.json`

### Archivos de Documentación Principal
- `README.md`
- `CHANGELOG.md`
- `LEEME-PRIMERO.md`

### Archivos de Proyecto
- `NeosTech-RFID-System-Pro.sln`

### Scripts de Mantenimiento
- `cleanup-project.ps1` (solo este script permitido en root)

**Total máximo: ~15 archivos en root**

Cualquier otro archivo debe ir en su directorio correspondiente.

---

## ✅ Checklist Antes de Commit

- [ ] ¿Los nuevos archivos están en el directorio correcto?
- [ ] ¿Los nombres de archivos siguen las convenciones?
- [ ] ¿Se eliminaron archivos temporales de testing?
- [ ] ¿No se está versionando logs, node_modules, o binarios?
- [ ] ¿La documentación está actualizada?
- [ ] ¿El código compila sin errores?

---

## 🛠️ Herramientas de Verificación

### Script de Validación de Estructura
```powershell
# Ejecutar antes de cada commit
.\scripts\utilities\verify-structure.ps1
```

### Script de Limpieza
```powershell
# Limpiar archivos temporales y reorganizar
.\cleanup-project.ps1
```

### Verificar Archivos en Root
```powershell
# Mostrar archivos en root (debe ser ~15)
Get-ChildItem -File | Measure-Object
```

---

## 🔍 Ejemplos Prácticos

### ❌ INCORRECTO

```powershell
# Crear documentación en root
New-Item "NUEVA-FUNCIONALIDAD.md"

# Crear script en root
New-Item "test-feature.ps1"

# Crear HTML de prueba en root
New-Item "test-dashboard.html"
```

### ✅ CORRECTO

```powershell
# Crear documentación en lugar apropiado
New-Item "docs/guides/NUEVA-FUNCIONALIDAD.md"

# Crear script en lugar apropiado
New-Item "scripts/testing/test-feature.ps1"

# Crear HTML de prueba en lugar apropiado
New-Item "tests/manual/test-dashboard.html"
# Y ELIMINAR después de usar
Remove-Item "tests/manual/test-dashboard.html"
```

---

## 📊 Métricas de Calidad

### Objetivos
- **Archivos en root**: ≤ 15
- **Documentos .md fuera de docs/**: 0
- **Scripts fuera de scripts/**: 0 (excepto cleanup-project.ps1)
- **Tests fuera de tests/**: 0

### Monitoreo
```powershell
# Ejecutar mensualmente
.\scripts\utilities\project-health-check.ps1
```

---

## 📚 Referencias

- [Estructura del Proyecto](LIMPIEZA-COMPLETADA.md#estructura-final)
- [Guía de Limpieza](CLEANUP_REPORT.md)
- [README Principal](README.md)

---

## 🔄 Actualización de Este Documento

Este documento debe actualizarse cuando:
- Se agreguen nuevos tipos de archivos al proyecto
- Se creen nuevos subdirectorios en la estructura
- Se identifiquen nuevos patrones o antipatrones
- Se implementen nuevas herramientas de validación

**Última actualización:** 2 de febrero de 2026  
**Versión:** 1.0
