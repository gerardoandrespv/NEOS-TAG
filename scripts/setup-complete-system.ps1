# Script de configuración completa del sistema
# Ejecutar: .\scripts\setup-complete-system.ps1

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🏢 NEOS TECH - Configuración Completa del Sistema" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$currentDir = Get-Location

# Paso 1: Configurar tags en Firestore
Write-Host "📋 PASO 1: Configurar tags de prueba en Firestore" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

if (Test-Path ".\scripts\setup-tags-firestore.js") {
    Write-Host "Ejecutando script de configuración de tags..." -ForegroundColor White
    node .\scripts\setup-tags-firestore.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Tags configurados correctamente" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Hubo problemas al configurar tags" -ForegroundColor Yellow
        Write-Host "    Puedes agregarlos manualmente en Firebase Console" -ForegroundColor DarkGray
    }
} else {
    Write-Host "⚠️  Script setup-tags-firestore.js no encontrado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona Enter para continuar..." -ForegroundColor DarkGray
Read-Host

# Paso 2: Desplegar Cloud Functions
Write-Host ""
Write-Host "☁️  PASO 2: Desplegar Cloud Functions" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

$deployFunctions = Read-Host "¿Desplegar Cloud Functions a Firebase? (s/n)"

if ($deployFunctions -eq 's' -or $deployFunctions -eq 'S') {
    if (Test-Path ".\scripts\deploy-functions.ps1") {
        & .\scripts\deploy-functions.ps1
    } else {
        Write-Host "⚠️  Script deploy-functions.ps1 no encontrado" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Saltando despliegue de Cloud Functions" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Presiona Enter para continuar..." -ForegroundColor DarkGray
Read-Host

# Paso 3: Compilar Gateway
Write-Host ""
Write-Host "🔧 PASO 3: Compilar Gateway con sistema de whitelist" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Compilando Gateway..." -ForegroundColor White
dotnet build .\src\Gateway\Rfid_gateway.csproj -c Release --nologo -v q

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Gateway compilado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error compilando Gateway" -ForegroundColor Red
    Write-Host "   Revisa los errores arriba" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona Enter para continuar..." -ForegroundColor DarkGray
Read-Host

# Paso 4: Iniciar servicios
Write-Host ""
Write-Host "🚀 PASO 4: Iniciar servicios" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

$startServices = Read-Host "¿Iniciar Gateway y Dashboard ahora? (s/n)"

if ($startServices -eq 's' -or $startServices -eq 'S') {
    Write-Host ""
    Write-Host "Iniciando Dashboard (Firebase)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; firebase serve --only hosting --port 5000"
    Start-Sleep -Seconds 2
    
    Write-Host "Iniciando Gateway (como Administrador)..." -ForegroundColor Cyan
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd '$currentDir\src\Gateway\bin\Release\net8.0'; Write-Host '=== GATEWAY RFID - v2.0 ===' -ForegroundColor Green; Write-Host 'Sistema de Control de Acceso con Whitelist/Blacklist' -ForegroundColor Yellow; Write-Host ''; .\Rfid_gateway.exe"
    
    Write-Host ""
    Write-Host "✅ Servicios iniciados" -ForegroundColor Green
} else {
    Write-Host "⏭️  No se iniciaron servicios" -ForegroundColor DarkGray
}

# Resumen
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 SISTEMA CONFIGURADO:" -ForegroundColor Yellow
Write-Host "   ✓ Tags de prueba en Firestore" -ForegroundColor Green
Write-Host "   ✓ Gateway compilado" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 ACCESOS:" -ForegroundColor Yellow
Write-Host "   Dashboard:  http://localhost:5000" -ForegroundColor White
Write-Host "   Gateway:    http://192.168.1.2:8080" -ForegroundColor White
Write-Host ""
Write-Host "🏷️  TAGS DE PRUEBA:" -ForegroundColor Yellow
Write-Host "   ✅ E28069150000402009073E7F - Tag de Prueba 1 (WHITELIST)" -ForegroundColor Green
Write-Host "   ✅ E280691500004020090AAAAA - Juan Pérez (WHITELIST)" -ForegroundColor Green
Write-Host "   ❌ E280691500004020090BBBBB - Tag Bloqueado (BLACKLIST)" -ForegroundColor Red
Write-Host "   ✅ E280691500004020090CCCCC - María García (WHITELIST)" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 PRUEBAS:" -ForegroundColor Yellow
Write-Host "   1. Acerca el tag E28069150000402009073E7F" -ForegroundColor White
Write-Host "      → Debería ABRIR el relé ✅" -ForegroundColor Green
Write-Host ""
Write-Host "   2. Si tienes el tag E280691500004020090BBBBB (blacklist)" -ForegroundColor White
Write-Host "      → NO debe abrir el relé ❌" -ForegroundColor Red
Write-Host ""
Write-Host "   3. Cualquier tag no registrado" -ForegroundColor White
Write-Host "      → NO debe abrir el relé ⚠️" -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
