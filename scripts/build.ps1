#Requires -Version 5.1
<#
.SYNOPSIS
    Prepara el sistema RFID para producción
.DESCRIPTION
    Compila, verifica y empaqueta todo para instalación en cualquier PC
#>

param(
    [string]$OutputPath = "C:\NeosTech-RFID-System-Pro\deployment\ready",
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

Write-Host @"
╔══════════════════════════════════════════════════════════╗
║   BUILD & PACKAGE - RFID GATEWAY NEOSTECH v6.0         ║
║   Preparando sistema para producción                     ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# ============================================
# 1. COMPILAR PROYECTO C#
# ============================================
Write-Host "`n[1/6] Compilando Gateway C#..." -ForegroundColor Yellow

$projectPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\CSharp-Service\Rfid_gateway.csproj"

if (-not (Test-Path $projectPath)) {
    Write-Host "❌ No se encontró el proyecto: $projectPath" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "   Limpiando builds anteriores..." -ForegroundColor Gray
    dotnet clean $projectPath --configuration Release | Out-Null
    
    Write-Host "   Compilando en modo Release..." -ForegroundColor Gray
    $buildOutput = dotnet publish $projectPath `
        --configuration Release `
        --output "$OutputPath\gateway" `
        --self-contained false `
        --runtime win-x64 `
        2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error en compilación:" -ForegroundColor Red
        Write-Host $buildOutput
        exit 1
    }
    
    Write-Host "   ✅ Compilación exitosa" -ForegroundColor Green
} catch {
    Write-Host "❌ Error compilando: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================
# 2. COPIAR CONFIGURACIONES
# ============================================
Write-Host "`n[2/6] Copiando archivos de configuración..." -ForegroundColor Yellow

$configFiles = @{
    "C:\NeosTech-RFID-System-Pro\src\Gateway\CSharp-Service\readers.config.json" = "$OutputPath\gateway\readers.config.json"
    "C:\NeosTech-RFID-System-Pro\src\Gateway\CSharp-Service\gateway.config.json" = "$OutputPath\gateway\gateway.config.json"
}

foreach ($source in $configFiles.Keys) {
    $dest = $configFiles[$source]
    if (Test-Path $source) {
        Copy-Item $source -Destination $dest -Force
        Write-Host "   ✅ Copiado: $(Split-Path $source -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No encontrado: $source" -ForegroundColor Yellow
    }
}

# ============================================
# 3. COPIAR SCRIPTS DE INSTALACIÓN
# ============================================
Write-Host "`n[3/6] Preparando instalador..." -ForegroundColor Yellow

$installerPath = "$OutputPath\installer"
if (-not (Test-Path $installerPath)) {
    New-Item -ItemType Directory -Path $installerPath -Force | Out-Null
}

$installerFiles = @(
    "C:\NeosTech-RFID-System-Pro\installer\Install-RFIDGateway.ps1",
    "C:\NeosTech-RFID-System-Pro\installer\Diagnose-RFIDSystem.ps1",
    "C:\NeosTech-RFID-System-Pro\installer\README.md"
)

foreach ($file in $installerFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $installerPath -Force
        Write-Host "   ✅ Copiado: $(Split-Path $file -Leaf)" -ForegroundColor Green
    }
}

# ============================================
# 4. COPIAR FRONTEND (Dashboard)
# ============================================
Write-Host "`n[4/6] Copiando dashboard web..." -ForegroundColor Yellow

$frontendPath = "$OutputPath\dashboard"
if (-not (Test-Path $frontendPath)) {
    New-Item -ItemType Directory -Path $frontendPath -Force | Out-Null
}

$dashboardFiles = @(
    "C:\NeosTech-RFID-System-Pro\frontend\dashboard\Index.html",
    "C:\NeosTech-RFID-System-Pro\frontend\dashboard\dashboard_corrected.js",
    "C:\NeosTech-RFID-System-Pro\frontend\dashboard\style.css",
    "C:\NeosTech-RFID-System-Pro\frontend\dashboard\firebase-config.js"
)

foreach ($file in $dashboardFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $frontendPath -Force
        Write-Host "   ✅ $(Split-Path $file -Leaf)" -ForegroundColor Green
    }
}

# ============================================
# 5. COPIAR CLOUD FUNCTIONS
# ============================================
Write-Host "`n[5/6] Copiando Cloud Functions..." -ForegroundColor Yellow

$cloudPath = "$OutputPath\cloud-functions"
if (-not (Test-Path $cloudPath)) {
    New-Item -ItemType Directory -Path $cloudPath -Force | Out-Null
}

$cloudFiles = @(
    "C:\NeosTech-RFID-System-Pro\cloud\functions\Main-v2.py",
    "C:\NeosTech-RFID-System-Pro\cloud\functions\Main-v2-testing.py",
    "C:\NeosTech-RFID-System-Pro\cloud\functions\requirements.txt"
)

foreach ($file in $cloudFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $cloudPath -Force
        Write-Host "   ✅ $(Split-Path $file -Leaf)" -ForegroundColor Green
    }
}

# ============================================
# 6. TESTS (Opcional)
# ============================================
if (-not $SkipTests) {
    Write-Host "`n[6/6] Ejecutando tests..." -ForegroundColor Yellow
    
    # Test 1: Verificar que el ejecutable existe
    $exePath = "$OutputPath\gateway\Rfid_gateway.exe"
    if (Test-Path $exePath) {
        Write-Host "   ✅ Ejecutable generado correctamente" -ForegroundColor Green
    } else {
        Write-Host "   ❌ No se generó el ejecutable" -ForegroundColor Red
        exit 1
    }
    
    # Test 2: Verificar que las DLLs están presentes
    $requiredDlls = @("Rfid_gateway.dll", "Newtonsoft.Json.dll")
    foreach ($dll in $requiredDlls) {
        if (Test-Path "$OutputPath\gateway\$dll") {
            Write-Host "   ✅ $dll presente" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $dll no encontrada" -ForegroundColor Yellow
        }
    }
    
    # Test 3: Verificar configuraciones
    if (Test-Path "$OutputPath\gateway\readers.config.json") {
        $config = Get-Content "$OutputPath\gateway\readers.config.json" | ConvertFrom-Json
        Write-Host "   ✅ readers.config.json válido ($($config.readers.Count) lectoras)" -ForegroundColor Green
    }
    
} else {
    Write-Host "`n[6/6] Tests omitidos (-SkipTests)" -ForegroundColor Gray
}

# ============================================
# CREAR README DE INSTALACIÓN
# ============================================
Write-Host "`nCreando README de instalación..." -ForegroundColor Yellow

$readmeContent = @"
# RFID GATEWAY NEOSTECH v6.0 - PAQUETE DE INSTALACIÓN

## Contenido del paquete

- **gateway/**: Ejecutable y DLLs del gateway RFID
- **installer/**: Scripts de instalación automatizada
- **dashboard/**: Archivos del dashboard web (para Firebase Hosting)
- **cloud-functions/**: Cloud Functions de Python (para GCP)
- **docs/**: Documentación completa

## Instalación Rápida

1. Copiar este directorio completo al PC destino
2. Abrir PowerShell como Administrador
3. Ejecutar:
   ``````powershell
   cd installer
   .\Install-RFIDGateway.ps1
   ``````

## Verificación

Después de instalar:
``````powershell
# Test health
Invoke-RestMethod http://localhost:60000/health

# Diagnóstico completo
cd installer
.\Diagnose-RFIDSystem.ps1
``````

## Despliegue de Componentes Cloud

### Dashboard (Firebase Hosting)
``````bash
cd dashboard
firebase deploy --only hosting
``````

### Cloud Function (GCP)
``````bash
cd cloud-functions

# Producción (con validación whitelist)
gcloud functions deploy rfid-gateway \
  --runtime python39 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point process_tag \
  --source . \
  --region us-central1

# Testing (sin validación)
gcloud functions deploy rfid-gateway-testing \
  --runtime python39 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point process_tag \
  --source Main-v2-testing.py \
  --region us-central1
``````

## Configuración Post-Instalación

1. Editar `C:\NeosTech-RFID\config\readers.config.json`
2. Agregar lectoras RFID con sus IPs
3. Reiniciar servicio: `Restart-Service RFIDGatewayNeosTech`
4. Sincronizar whitelist desde dashboard

## Soporte

Ver documentación completa en `installer\README.md`

---
Generado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
NeosTech RFID System v6.0
"@

$readmeContent | Out-File -FilePath "$OutputPath\README.txt" -Encoding UTF8
Write-Host "   ✅ README.txt creado" -ForegroundColor Green

# ============================================
# CREAR PAQUETE ZIP (Opcional)
# ============================================
Write-Host "`nCreando paquete ZIP..." -ForegroundColor Yellow

$zipPath = "$OutputPath\..\\NeosTech-RFID-v6.0-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"

try {
    Compress-Archive -Path "$OutputPath\*" -DestinationPath $zipPath -Force
    Write-Host "   ✅ Paquete creado: $zipPath" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  No se pudo crear ZIP: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host @"

╔══════════════════════════════════════════════════════════╗
║             ✅ BUILD COMPLETADO ✅                       ║
╚══════════════════════════════════════════════════════════╝

📦 Paquete listo en: $OutputPath

📋 Contenido:
   ├── gateway/          (Ejecutable + DLLs)
   ├── installer/        (Scripts de instalación)
   ├── dashboard/        (Frontend web)
   ├── cloud-functions/  (Backend GCP)
   └── README.txt

🚀 Próximos pasos:
   1. Copiar carpeta completa al PC destino
   2. Ejecutar installer\Install-RFIDGateway.ps1
   3. Configurar lectoras RFID
   4. Desplegar dashboard y Cloud Function

📊 Archivos generados:
"@ -ForegroundColor Green

Get-ChildItem -Path $OutputPath -Recurse -File | 
    Measure-Object -Property Length -Sum |
    ForEach-Object {
        Write-Host "   Total: $($_.Count) archivos, $([math]::Round($_.Sum/1MB, 2)) MB" -ForegroundColor Gray
    }

Write-Host "`n✨ Listo para producción!" -ForegroundColor Cyan
Write-Host "   Ruta: $OutputPath" -ForegroundColor White
Write-Host ""
