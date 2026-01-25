# Script para desplegar Cloud Functions a Firebase
# Ejecutar desde: C:\NeosTech-RFID-System-Pro

Write-Host "🚀 Desplegando Cloud Functions a Firebase..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
$currentDir = Get-Location
if (-not (Test-Path ".\src\functions\main.py")) {
    Write-Host "❌ Error: Debes ejecutar este script desde C:\NeosTech-RFID-System-Pro" -ForegroundColor Red
    exit 1
}

# Cambiar al directorio de funciones
Set-Location ".\src\functions"

Write-Host "📋 Funciones a desplegar:" -ForegroundColor Yellow
Write-Host "   1. rfid-gateway (procesar tags)" -ForegroundColor White
Write-Host "   2. check-tag-access (verificar whitelist/blacklist)" -ForegroundColor White
Write-Host ""

# Verificar que Firebase CLI esté instalado
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCmd) {
    Write-Host "❌ Firebase CLI no está instalado" -ForegroundColor Red
    Write-Host "   Instálalo con: npm install -g firebase-tools" -ForegroundColor Yellow
    Set-Location $currentDir
    exit 1
}

Write-Host "✓ Firebase CLI encontrado" -ForegroundColor Green
Write-Host ""

# Login a Firebase (si es necesario)
Write-Host "🔐 Verificando autenticación..." -ForegroundColor Cyan
firebase login --no-localhost

Write-Host ""
Write-Host "📦 Desplegando funciones..." -ForegroundColor Cyan
Write-Host ""

# Desplegar ambas funciones
firebase deploy --only functions:rfid-gateway,functions:check-tag-access --project neos-tech

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Cloud Functions desplegadas exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 URLs de las funciones:" -ForegroundColor Cyan
    Write-Host "   rfid-gateway:       https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway" -ForegroundColor White
    Write-Host "   check-tag-access:   https://us-central1-neos-tech.cloudfunctions.net/check-tag-access" -ForegroundColor White
    Write-Host ""
    Write-Host "🔍 Verifica en Firebase Console:" -ForegroundColor Yellow
    Write-Host "   https://console.firebase.google.com/project/neos-tech/functions" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Error al desplegar funciones" -ForegroundColor Red
    Write-Host "   Revisa los errores arriba" -ForegroundColor Yellow
}

Write-Host ""
Set-Location $currentDir
