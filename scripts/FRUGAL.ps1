# Reorganizacion Frugal - NeosTech RFID v6.0
# Solo lo esencial, cero redundancia

$ErrorActionPreference = "Stop"

Write-Host "`nREORGANIZACION FRUGAL - Iniciando...`n" -ForegroundColor Cyan

# Crear estructura base
$dirs = @("src/web", "src/gateway", "src/functions", "config", "scripts", "docs", "dist", ".archive")
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path $d -Force -ErrorAction SilentlyContinue | Out-Null
}

# Copiar archivos esenciales
Write-Host "Copiando archivos esenciales..." -ForegroundColor Yellow

# Web (Dashboard)
if (Test-Path "public/index.html") {
    Copy-Item "public/index.html" -Destination "src/web/index.html" -Force
    Write-Host "  OK src/web/index.html" -ForegroundColor Green
}
if (Test-Path "public/style.css") {
    Copy-Item "public/style.css" -Destination "src/web/style.css" -Force
    Write-Host "  OK src/web/style.css" -ForegroundColor Green
}
if (Test-Path "public/firebase-config.js") {
    Copy-Item "public/firebase-config.js" -Destination "src/web/firebase-config.js" -Force
    Write-Host "  OK src/web/firebase-config.js" -ForegroundColor Green
}

# Gateway
if (Test-Path "src/Gateway/CSharp-Service/Program.cs") {
    Copy-Item "src/Gateway/CSharp-Service/Program.cs" -Destination "src/gateway/Program.cs" -Force
    Write-Host "  OK src/gateway/Program.cs" -ForegroundColor Green
}
if (Test-Path "src/Gateway/CSharp-Service/Rfid_gateway.csproj") {
    Copy-Item "src/Gateway/CSharp-Service/Rfid_gateway.csproj" -Destination "src/gateway/Rfid_gateway.csproj" -Force
    Write-Host "  OK src/gateway/Rfid_gateway.csproj" -ForegroundColor Green
}
if (Test-Path "src/Gateway/CSharp-Service/gateway.config.json") {
    Copy-Item "src/Gateway/CSharp-Service/gateway.config.json" -Destination "src/gateway/gateway.config.json" -Force
    Write-Host "  OK src/gateway/gateway.config.json" -ForegroundColor Green
}

# Functions
if (Test-Path "cloud/functions/Main-v2.py") {
    Copy-Item "cloud/functions/Main-v2.py" -Destination "src/functions/main.py" -Force
    Write-Host "  OK src/functions/main.py" -ForegroundColor Green
}
if (Test-Path "cloud/functions/requirements.txt") {
    Copy-Item "cloud/functions/requirements.txt" -Destination "src/functions/requirements.txt" -Force
    Write-Host "  OK src/functions/requirements.txt" -ForegroundColor Green
}

# Config
if (Test-Path "firebase.json") {
    Copy-Item "firebase.json" -Destination "config/firebase.json" -Force
    Write-Host "  OK config/firebase.json" -ForegroundColor Green
}
if (Test-Path "firestore.rules") {
    Copy-Item "firestore.rules" -Destination "config/firestore.rules" -Force
    Write-Host "  OK config/firestore.rules" -ForegroundColor Green
}
if (Test-Path ".firebaserc") {
    Copy-Item ".firebaserc" -Destination "config/.firebaserc" -Force
    Write-Host "  OK config/.firebaserc" -ForegroundColor Green
}

# Scripts
if (Test-Path "scripts/Build-Production.ps1") {
    Copy-Item "scripts/Build-Production.ps1" -Destination "scripts/build.ps1" -Force
    Write-Host "  OK scripts/build.ps1" -ForegroundColor Green
}
if (Test-Path "scripts/Deploy-Production.ps1") {
    Copy-Item "scripts/Deploy-Production.ps1" -Destination "scripts/deploy.ps1" -Force
    Write-Host "  OK scripts/deploy.ps1" -ForegroundColor Green
}

# Docs (solo 4 esenciales)
$docMap = @{
    "README.md" = "docs/README.md"
    "docs/ESTRUCTURA_PROYECTO.md" = "docs/ESTRUCTURA.md"
    "docs/GUIA_DEPLOYMENT.md" = "docs/DEPLOYMENT.md"
    "docs/ENTREGA_SISTEMA_v6.0.md" = "docs/DELIVERY.md"
}
foreach ($src in $docMap.Keys) {
    if (Test-Path $src) {
        Copy-Item $src -Destination $docMap[$src] -Force
        Write-Host "  OK $($docMap[$src])" -ForegroundColor Green
    }
}

# Archivar carpetas antiguas
Write-Host "`nArchivando estructura antigua..." -ForegroundColor Yellow
$oldFolders = @("frontend", "backend", "public", "temp", "logs", "deployment", "installer", "backups", "build", "tests")
foreach ($f in $oldFolders) {
    if (Test-Path $f) {
        Move-Item $f -Destination ".archive/$f" -Force -ErrorAction SilentlyContinue
        Write-Host "  Archivado: $f" -ForegroundColor DarkGray
    }
}

# Archivar carpetas cloud y src viejas
if (Test-Path "cloud") {
    Move-Item "cloud" -Destination ".archive/cloud-old" -Force -ErrorAction SilentlyContinue
    Write-Host "  Archivado: cloud" -ForegroundColor DarkGray
}
if (Test-Path "src/Gateway") {
    Move-Item "src/Gateway" -Destination ".archive/Gateway-old" -Force -ErrorAction SilentlyContinue
    Write-Host "  Archivado: src/Gateway" -ForegroundColor DarkGray
}

# Limpiar docs antiguos
if (Test-Path "docs") {
    Get-ChildItem "docs/*.md" | Where-Object {
        $_.Name -ne "ESTRUCTURA.md" -and 
        $_.Name -ne "DEPLOYMENT.md" -and 
        $_.Name -ne "DELIVERY.md" -and
        $_.Name -ne "README.md"
    } | Move-Item -Destination ".archive/docs-old/" -Force -ErrorAction SilentlyContinue
}

# Limpiar raiz
Write-Host "`nLimpiando raiz del proyecto..." -ForegroundColor Yellow
$keepRoot = @("README.md", "firebase.json", "firestore.rules", ".firebaserc", ".gitignore", ".env.example", "package.json", "NeosTech-RFID-System-Pro.sln")
Get-ChildItem -Path "." -File | Where-Object {
    $keepRoot -notcontains $_.Name -and 
    $_.Extension -ne ".ps1"
} | ForEach-Object {
    New-Item -ItemType Directory -Path ".archive/root-old" -Force -ErrorAction SilentlyContinue | Out-Null
    Move-Item $_.FullName -Destination ".archive/root-old/" -Force -ErrorAction SilentlyContinue
}

# Crear archivos de config
Write-Host "`nCreando configuracion..." -ForegroundColor Yellow

# .gitignore
Set-Content -Path ".gitignore" -Value @"
dist/
bin/
obj/
.env
*.local
.vs/
.vscode/
.archive/
.firebase/
firebase-debug.log
*.log
"@ -Encoding UTF8

# package.json
Set-Content -Path "package.json" -Value @"
{
  "name": "neos-rfid-system",
  "version": "6.0.0",
  "scripts": {
    "dev": "firebase serve",
    "deploy": "firebase deploy --only hosting",
    "build": "dotnet publish src/gateway/Rfid_gateway.csproj -c Release -o dist/gateway"
  }
}
"@ -Encoding UTF8

# README.md
Set-Content -Path "README.md" -Value @"
# NeosTech RFID System v6.0

Sistema de control de acceso RFID multi-tenant.

## Estructura

/
├── src/
│   ├── web/          # Dashboard (HTML/CSS/JS)
│   ├── gateway/      # Gateway C# (.NET 8.0)
│   └── functions/    # Cloud Functions (Python)
├── config/           # Firebase config
├── docs/             # Documentacion
├── scripts/          # Build y deploy
└── dist/             # Build outputs

## Comandos

npm run dev       # Desarrollo local
npm run deploy    # Deploy a Firebase
npm run build     # Compilar gateway

## Docs

- [Estructura](docs/ESTRUCTURA.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Entrega](docs/DELIVERY.md)
"@ -Encoding UTF8

# firebase.json actualizado
Set-Content -Path "firebase.json" -Value @"
{
  "hosting": {
    "public": "src/web",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  },
  "firestore": {
    "rules": "config/firestore.rules"
  }
}
"@ -Encoding UTF8

# Reporte final
Write-Host "`nRESULTADO FINAL:" -ForegroundColor Cyan
Write-Host ""
$srcCount = (Get-ChildItem "src" -File -Recurse -ErrorAction SilentlyContinue).Count
$configCount = (Get-ChildItem "config" -File -ErrorAction SilentlyContinue).Count
$docsCount = (Get-ChildItem "docs" -File -ErrorAction SilentlyContinue).Count
$scriptsCount = (Get-ChildItem "scripts" -File -ErrorAction SilentlyContinue).Count
$rootCount = (Get-ChildItem "." -File -Depth 0 -ErrorAction SilentlyContinue).Count

Write-Host "src/        $srcCount archivos" -ForegroundColor Green
Write-Host "config/     $configCount archivos" -ForegroundColor Green
Write-Host "docs/       $docsCount archivos" -ForegroundColor Green
Write-Host "scripts/    $scriptsCount archivos" -ForegroundColor Green
Write-Host "raiz/       $rootCount archivos" -ForegroundColor Green

if (Test-Path ".archive") {
    $archivedCount = (Get-ChildItem ".archive" -Recurse -File -ErrorAction SilentlyContinue).Count
    Write-Host ".archive/   $archivedCount archivos (backup)" -ForegroundColor DarkGray
}

Write-Host "`nREORGANIZACION COMPLETADA" -ForegroundColor Green
Write-Host "Estructura minimalista - Solo lo esencial" -ForegroundColor Green
Write-Host "`nSi todo funciona OK, eliminar .archive/" -ForegroundColor Yellow
Write-Host ""
