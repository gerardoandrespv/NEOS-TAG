#!/usr/bin/env pwsh
# Script de despliegue rápido del Dashboard Web a Firebase Hosting
# Autor: NeosTech RFID System
# Fecha: 2026-01-30

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "║        🚀 DESPLIEGUE DASHBOARD WEB A FIREBASE            ║" -ForegroundColor Cyan
Write-Host "║                                                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n"

# Verificar que estamos en el directorio correcto
$projectRoot = "C:\NeosTech-RFID-System-Pro"
if (-not (Test-Path "$projectRoot\firebase.json")) {
    Write-Host "❌ ERROR: No se encontró firebase.json" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en el directorio del proyecto" -ForegroundColor Yellow
    exit 1
}

Set-Location $projectRoot

# Verificar que Firebase CLI está instalado
Write-Host "🔍 Verificando Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version
    Write-Host "✓ Firebase CLI instalado: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI no está instalado" -ForegroundColor Red
    Write-Host "   Instala con: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Verificar archivos a desplegar
Write-Host "`n📁 Archivos a desplegar:" -ForegroundColor Yellow
$webFiles = Get-ChildItem -Path "$projectRoot\src\web" -File
Write-Host "   • index.html ($(([math]::Round($((Get-Item "$projectRoot\src\web\index.html").Length / 1KB), 2))) KB)" -ForegroundColor Gray

# Confirmar despliegue
Write-Host "`n⚠️  ¿Deseas continuar con el despliegue?" -ForegroundColor Yellow
$confirmation = Read-Host "   Escribe 'si' para continuar"

if ($confirmation -ne "si") {
    Write-Host "`n❌ Despliegue cancelado" -ForegroundColor Red
    exit 0
}

# Desplegar
Write-Host "`n🚀 Desplegando a Firebase Hosting..." -ForegroundColor Cyan
Write-Host "   Proyecto: neos-tech" -ForegroundColor Gray
Write-Host "   Directorio: src/web" -ForegroundColor Gray
Write-Host "`n"

firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n" -ForegroundColor Green
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                           ║" -ForegroundColor Green
    Write-Host "║              ✅ DESPLIEGUE COMPLETADO                     ║" -ForegroundColor Green
    Write-Host "║                                                           ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host "`n"
    Write-Host "🌐 URL del Dashboard:" -ForegroundColor Cyan
    Write-Host "   https://neos-tech.web.app" -ForegroundColor White
    Write-Host "`n"
    Write-Host "📱 Prueba en tu celular:" -ForegroundColor Yellow
    Write-Host "   1. Abre https://neos-tech.web.app en tu navegador móvil" -ForegroundColor Gray
    Write-Host "   2. Presiona Ctrl+F5 (o limpia caché) para ver cambios" -ForegroundColor Gray
    Write-Host "   3. Verifica que sea responsivo (zoom, rotación)" -ForegroundColor Gray
    Write-Host "`n"
    Write-Host "⏱️  Tiempo de propagación: ~30 segundos" -ForegroundColor Yellow
    Write-Host "`n"
} else {
    Write-Host "`n❌ ERROR EN EL DESPLIEGUE" -ForegroundColor Red
    Write-Host "   Revisa los logs arriba para más detalles" -ForegroundColor Yellow
    exit 1
}
