# ============================================
# SCRIPT DE LIMPIEZA PROFUNDA - NeosTech RFID
# Version: 1.0
# Fecha: 2026-02-02
# ============================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "     LIMPIEZA PROFUNDA - NeosTech RFID System Pro          " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Contadores
$filesDeleted = 0
$bytesFreed = 0
$directoriesDeleted = 0

# Array para el reporte
$deletionReport = @()

# Funcion para agregar al reporte
function Add-DeletionRecord {
    param($Path, $Reason, $Size = 0)
    
    $script:deletionReport += [PSCustomObject]@{
        Path = $Path
        Reason = $Reason
        Size = $Size
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
}

# Funcion para eliminar archivo con registro
function Remove-FileWithLog {
    param($Path, $Reason)
    
    if (Test-Path $Path) {
        $size = (Get-Item $Path).Length
        Remove-Item $Path -Force -ErrorAction SilentlyContinue
        
        if (-not (Test-Path $Path)) {
            $script:filesDeleted++
            $script:bytesFreed += $size
            Add-DeletionRecord -Path $Path -Reason $Reason -Size $size
            Write-Host "[OK] Eliminado: $Path" -ForegroundColor Green
        }
    }
}

# Funcion para eliminar directorio con registro
function Remove-DirectoryWithLog {
    param($Path, $Reason)
    
    if (Test-Path $Path) {
        $size = (Get-ChildItem $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
        Remove-Item $Path -Recurse -Force -ErrorAction SilentlyContinue
        
        if (-not (Test-Path $Path)) {
            $script:directoriesDeleted++
            $script:bytesFreed += $size
            Add-DeletionRecord -Path $Path -Reason $Reason -Size $size
            Write-Host "[OK] Eliminado: $Path\" -ForegroundColor Green
        }
    }
}

Write-Host "[FASE 1] Eliminando logs temporales y archivos de analisis..." -ForegroundColor Yellow
Write-Host ""

# Logs temporales (mantener solo gateway.log y gateway_process.log actuales)
$logsToDelete = @(
    "logs\Analisis_sistema_neos_tech_*.txt",
    "logs\Test-*.txt",
    "logs\Resumen_sistema_neos_tech*.txt",
    "logs\Authors.txt",
    "logs\Config.txt",
    "logs\Dots.txt",
    "logs\Empty.txt",
    "logs\Help.txt",
    "logs\Hidden*.txt",
    "logs\License*.txt",
    "logs\Logo.txt",
    "logs\Mit-license.txt",
    "logs\Name*.txt",
    "logs\Nums.txt",
    "logs\Options.txt",
    "logs\Publishoutputs*.txt",
    "logs\Requirements*.txt",
    "logs\Rfid_gatewaycsprojfilelistabsolute*.txt",
    "logs\Some-thing.txt",
    "logs\Thirdpartynoticetext.txt",
    "logs\Topics.txt",
    "logs\Usage.txt",
    "logs\Whoami.txt",
    "logs\100.txt"
)

foreach ($pattern in $logsToDelete) {
    Get-ChildItem $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-FileWithLog -Path $_.FullName -Reason "Log temporal/archivo de documentacion de dependencias"
    }
}

Write-Host ""
Write-Host "[FASE 2] Eliminando ejemplos de SDK THY (crear backup primero)..." -ForegroundColor Yellow
Write-Host ""

# Crear backup de ejemplos SDK antes de eliminar
$sdkBackupPath = "C:\NeosTech-RFID-System-Pro\.archive\THY-SDK-Examples-Backup-$(Get-Date -Format 'yyyyMMdd').zip"

if (Test-Path "docs\THY-SDK-Examples") {
    Write-Host "[INFO] Creando backup de ejemplos SDK..." -ForegroundColor Cyan
    
    if (-not (Test-Path "C:\NeosTech-RFID-System-Pro\.archive")) {
        New-Item -ItemType Directory -Path "C:\NeosTech-RFID-System-Pro\.archive" -Force | Out-Null
    }
    
    Compress-Archive -Path "docs\THY-SDK-Examples" -DestinationPath $sdkBackupPath -Force
    Write-Host "[OK] Backup creado: $sdkBackupPath" -ForegroundColor Green
    
    # Ahora eliminar
    Remove-DirectoryWithLog -Path "docs\THY-SDK-Examples" -Reason "Ejemplos de SDK del fabricante (backup creado)"
}

Write-Host ""
Write-Host "[FASE 3] Eliminando archivos de documentacion de node_modules..." -ForegroundColor Yellow
Write-Host ""

# Archivos HTML/JS de testing de librerias
$frontendJunkFiles = @(
    "frontend\assets\js\Standalonetest.js",
    "frontend\assets\js\Standalonetest_7169B9EA.js",
    "frontend\assets\js\Standalonetest_7B1DD9A8.js",
    "frontend\assets\js\Cleanmodifiedsubpaths.js",
    "frontend\assets\js\Version_03C26ABE.js",
    "frontend\assets\js\Version_16D2E3C8.js",
    "frontend\assets\js\Version_A8F479CA.js"
)

foreach ($file in $frontendJunkFiles) {
    Remove-FileWithLog -Path $file -Reason "Archivo de testing de libreria (no usado en produccion)"
}

Write-Host ""
Write-Host "[FASE 4] Eliminando archivos temporales..." -ForegroundColor Yellow
Write-Host ""

# Directorio temp/processing
if (Test-Path "temp\processing") {
    Remove-DirectoryWithLog -Path "temp\processing" -Reason "Archivos temporales de procesamiento"
}

# Archivos .user y .filters de Visual Studio
Get-ChildItem -Recurse -Filter "*.user" | ForEach-Object {
    Remove-FileWithLog -Path $_.FullName -Reason "Archivo de configuracion personal de Visual Studio"
}

Get-ChildItem -Recurse -Filter "*.vcxproj.filters" | ForEach-Object {
    Remove-FileWithLog -Path $_.FullName -Reason "Archivo de filtros de Visual Studio C++"
}

Write-Host ""
Write-Host "[FASE 5] Eliminando archivos de documentacion duplicados..." -ForegroundColor Yellow
Write-Host ""

# Scripts de deployment redundantes (mantener solo los principales)
$redundantScripts = @(
    "cleanup-and-install.ps1",
    "deploy-cloudfunction-fix.ps1",
    "disable-auto-relay.ps1",
    "disable-buzzer.ps1",
    "limpiar-archivos-ts.ps1",
    "restart-gateway-filtro.ps1",
    "restart-gateway-optimized.ps1",
    "test-config-read.ps1",
    "test-endpoint.ps1",
    "test-lectora-endpoints.ps1",
    "test-simple.ps1",
    "verify-quick.ps1"
)

foreach ($script in $redundantScripts) {
    Remove-FileWithLog -Path $script -Reason "Script de testing/deployment redundante"
}

# Archivos HTML de testing
$testingHtmlFiles = @(
    "check-database.html",
    "limpiar-eventos.html",
    "test-mixed-content.html"
)

foreach ($html in $testingHtmlFiles) {
    Remove-FileWithLog -Path $html -Reason "Archivo HTML de testing temporal"
}

# Archivos JS de testing
$testingJsFiles = @(
    "check-eventos.js",
    "populate-database.js",
    "setup-tags-whitelist.js",
    "test-syntax.js",
    "test.js"
)

foreach ($js in $testingJsFiles) {
    Remove-FileWithLog -Path $js -Reason "Script de testing temporal"
}

Write-Host ""
Write-Host "[FASE 6] Consolidando documentacion..." -ForegroundColor Yellow
Write-Host ""

# Documentos de releases antiguos (mantener solo CHANGELOG.md)
$oldReleases = @(
    "RELEASE_v2.4.14.md",
    "RELEASE_v2.4.16.md",
    "RESUMEN-FINAL-29-01.md",
    "RESUMEN-SESION-29-01.md"
)

foreach ($doc in $oldReleases) {
    Remove-FileWithLog -Path $doc -Reason "Documentacion de release antigua (consolidada en CHANGELOG.md)"
}

# Documentos de diagnostico antiguos
$oldDiagnostics = @(
    "DIAGNOSTICO-GATEWAY.md",
    "DIAGNOSTICO-SISTEMA-COMPLETO.md",
    "ESTADO-FINAL.md"
)

foreach ($doc in $oldDiagnostics) {
    Remove-FileWithLog -Path $doc -Reason "Documentacion de diagnostico antigua"
}

Write-Host ""
Write-Host "[FASE 7] Limpiando binarios de Gateway antiguos..." -ForegroundColor Yellow
Write-Host ""

# Mantener solo bin/Release/net8.0 y eliminar binarios antiguos
if (Test-Path "src\Gateway\Binaries") {
    Remove-DirectoryWithLog -Path "src\Gateway\Binaries" -Reason "Binarios antiguos de compilaciones anteriores"
}

if (Test-Path "src\Gateway\obj") {
    Remove-DirectoryWithLog -Path "src\Gateway\obj" -Reason "Archivos intermedios de compilacion (.obj)"
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Green
Write-Host "          LIMPIEZA COMPLETADA                              " -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "  Archivos eliminados: $filesDeleted" -ForegroundColor White
Write-Host "  Directorios eliminados: $directoriesDeleted" -ForegroundColor White
Write-Host "  Espacio liberado: $([math]::Round($bytesFreed / 1MB, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "REPORTE DETALLADO:" -ForegroundColor Cyan
Write-Host "  Generando CLEANUP_REPORT.md..." -ForegroundColor Yellow

# Generar reporte Markdown
$reportContent = @"
# Reporte de Limpieza - NeosTech RFID System Pro
**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Version del script:** 1.0

## Resumen Ejecutivo
- **Archivos eliminados:** $filesDeleted
- **Directorios eliminados:** $directoriesDeleted
- **Espacio liberado:** $([math]::Round($bytesFreed / 1MB, 2)) MB

## Categorias de Limpieza

### 1. Logs Temporales
Eliminados archivos de log antiguos y archivos de documentacion de dependencias que se versionaron por error.

### 2. Ejemplos de SDK THY
Creado backup en: ```.archive/THY-SDK-Examples-Backup-$(Get-Date -Format 'yyyyMMdd').zip```
Los ejemplos del fabricante no son necesarios para el proyecto en produccion.

### 3. Archivos de Testing
Eliminados scripts de prueba temporales y archivos HTML de diagnostico.

### 4. Documentacion Redundante
Consolidada documentacion de releases en CHANGELOG.md

### 5. Binarios Antiguos
Eliminados archivos intermedios de compilacion y binarios de versiones anteriores.

## Detalle de Archivos Eliminados

| Archivo | Razon | Tamano |
|---------|-------|--------|
"@

foreach ($record in $deletionReport) {
    $sizeMB = [math]::Round($record.Size / 1MB, 3)
    $reportContent += "| ``$($record.Path)`` | $($record.Reason) | $sizeMB MB |`n"
}

$reportContent += @"

## Estructura Final del Proyecto

``````
NeosTech-RFID-System-Pro/
├── .archive/               # Backups de archivos eliminados
├── config/                 # Configuraciones del sistema
├── docs/                   # Documentacion principal
│   ├── THY-HTTP/          # Documentacion de protocolo HTTP
│   └── *.md               # Guias y referencias
├── Instalador/            # Paquete de instalacion del Gateway
├── logs/                  # Logs activos (gateway.log, gateway_process.log)
├── src/
│   ├── Gateway/           # Codigo fuente del Gateway C#
│   ├── functions/         # Cloud Functions (Python)
│   └── web/               # Dashboard (HTML/JS/Firebase)
├── scripts/               # Scripts de utilidad
├── CHANGELOG.md           # Historial de cambios
├── README.md              # Documentacion principal
└── firestore.rules        # Reglas de seguridad de Firebase
``````

## Proximos Pasos Recomendados

### 1. Modularizacion del Dashboard
Extraer funciones JavaScript de ``src/web/index.html`` a modulos separados:
- ``src/web/js/utils/data-extractor.js``
- ``src/web/js/utils/validators.js``
- ``src/web/js/services/firebase-service.js``

### 2. Implementar Tests Unitarios
Crear suite de tests para componentes criticos:
- Firestore Rules (``tests/firestore.rules.test.js``)
- Funciones de extraccion de datos
- Validadores de tags RFID

### 3. Configurar CI/CD
Implementar GitHub Actions para:
- Ejecutar tests automaticamente
- Validar reglas de Firestore
- Desplegar a Firebase Hosting

### 4. Documentacion de API
Generar documentacion con JSDoc/TypeScript para:
- Interfaces de datos
- Funciones publicas del Dashboard
- Endpoints de la Cloud Function

## Archivos Importantes Preservados

✅ **Configuraciones:**
- ``firebase.json``
- ``firestore.rules``
- ``.firebaserc``
- ``package.json``
- ``lectora.config.json``

✅ **Documentacion Principal:**
- ``README.md``
- ``CHANGELOG.md``
- ``LEEME-PRIMERO.md``
- ``docs/*.md``

✅ **Codigo Fuente:**
- ``src/Gateway/`` (completo)
- ``src/functions/`` (completo)
- ``src/web/`` (completo)

✅ **Instalador:**
- ``Instalador/install.ps1``
- ``Instalador/README.md``

## Notas Adicionales

- Se creo backup de ejemplos SDK antes de eliminar
- Logs activos (gateway.log, gateway_process.log) se mantuvieron
- Archivos de configuracion de IDE (.gitignore, .editorconfig) se preservaron
- No se modifico codigo funcional, solo limpieza de archivos

---
**Generado automaticamente por:** ``cleanup-project.ps1``
"@

# Guardar reporte
$reportContent | Out-File -FilePath "CLEANUP_REPORT.md" -Encoding UTF8

Write-Host "[OK] Reporte generado: CLEANUP_REPORT.md" -ForegroundColor Green
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host "  Revisa CLEANUP_REPORT.md para ver el detalle completo" -ForegroundColor White
Write-Host "  Ejecuta: git status  para ver los cambios" -ForegroundColor White
Write-Host ""
