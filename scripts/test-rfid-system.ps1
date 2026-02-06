# ============================================
# SCRIPT DE PRUEBAS RFID SYSTEM - NeosTech
# ============================================
# Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS SISTEMA RFID NEOTECH v6.0" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$dashboardUrl = "http://localhost:5000"
$gatewayPort = 60000
$gatewayHealthUrl = "http://localhost:$gatewayPort/health"
$firebaseProject = "neos-tech"

# ============================================
# 1. VERIFICAR SERVIDOR WEB (Dashboard)
# ============================================
Write-Host "[1/6] Verificando Dashboard..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $dashboardUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Dashboard respondiendo en $dashboardUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Dashboard NO accesible en $dashboardUrl" -ForegroundColor Red
    Write-Host "  💡 Ejecuta: firebase serve --only hosting" -ForegroundColor Yellow
}

# ============================================
# 2. VERIFICAR GATEWAY C#
# ============================================
Write-Host "`n[2/6] Verificando Gateway C#..." -ForegroundColor Yellow
$gatewayProcess = Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue

if ($gatewayProcess) {
    Write-Host "  ✅ Gateway ejecutándose (PID: $($gatewayProcess.Id))" -ForegroundColor Green
    
    # Verificar health endpoint
    try {
        $healthResponse = Invoke-RestMethod -Uri $gatewayHealthUrl -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  ✅ Health endpoint respondiendo" -ForegroundColor Green
        Write-Host "  📊 Estado: $($healthResponse.status)" -ForegroundColor Cyan
    } catch {
        Write-Host "  ⚠️  Gateway corriendo pero health endpoint no responde" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Gateway NO está ejecutándose" -ForegroundColor Red
    Write-Host "  💡 Ejecuta: dotnet run --project src/Gateway/Rfid_gateway.csproj" -ForegroundColor Yellow
}

# ============================================
# 3. VERIFICAR CONFIGURACIÓN
# ============================================
Write-Host "`n[3/6] Verificando configuración..." -ForegroundColor Yellow
$configPath = "src\Gateway\gateway.config.json"

if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    Write-Host "  ✅ Archivo de configuración encontrado" -ForegroundColor Green
    Write-Host "  📌 Client ID: $($config.client_id)" -ForegroundColor Cyan
    Write-Host "  📌 Puntos de acceso configurados: $($config.access_points.Count)" -ForegroundColor Cyan
    
    foreach ($ap in $config.access_points) {
        Write-Host "     - $($ap.name) ($($ap.id))" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ Archivo de configuración NO encontrado" -ForegroundColor Red
}

# ============================================
# 4. VERIFICAR FIRESTORE
# ============================================
Write-Host "`n[4/6] Verificando Firestore..." -ForegroundColor Yellow
Write-Host "  📊 Proyecto Firebase: $firebaseProject" -ForegroundColor Cyan
Write-Host "  🌐 Colecciones esperadas:" -ForegroundColor Cyan
Write-Host "     - users (Residentes)" -ForegroundColor Gray
Write-Host "     - whitelist (Tags autorizados)" -ForegroundColor Gray
Write-Host "     - blacklist (Tags bloqueados)" -ForegroundColor Gray
Write-Host "     - access_logs (Registros de acceso)" -ForegroundColor Gray
Write-Host "     - rfid_tags (Tags detectados)" -ForegroundColor Gray

# ============================================
# 5. VERIFICAR LECTORA RFID
# ============================================
Write-Host "`n[5/6] Verificando Lectora RFID..." -ForegroundColor Yellow

# Verificar si hay DLL del SDK
$sdkDll = "src\Gateway\SWNetApi.dll"
if (Test-Path $sdkDll) {
    Write-Host "  ✅ SDK de lectora encontrado (SWNetApi.dll)" -ForegroundColor Green
} else {
    Write-Host "  ❌ SDK de lectora NO encontrado" -ForegroundColor Red
}

# Verificar si el Gateway tiene acceso a THYReaderAPI
$apiFile = "src\Gateway\THYReaderAPI.cs"
if (Test-Path $apiFile) {
    Write-Host "  ✅ THYReaderAPI.cs encontrado" -ForegroundColor Green
} else {
    Write-Host "  ❌ THYReaderAPI.cs NO encontrado" -ForegroundColor Red
}

# ============================================
# 6. INSTRUCCIONES DE PRUEBA
# ============================================
Write-Host "`n[6/6] Instrucciones para pruebas manuales:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📋 PRUEBAS A REALIZAR:" -ForegroundColor Cyan
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "  1️⃣  DASHBOARD (Navegador)" -ForegroundColor White
Write-Host "     • Abrir: $dashboardUrl" -ForegroundColor Gray
Write-Host "     • Login como: admin / admin123" -ForegroundColor Gray
Write-Host "     • Verificar conexión a Firestore" -ForegroundColor Gray
Write-Host ""
Write-Host "  2️⃣  LECTORA RFID" -ForegroundColor White
Write-Host "     • Acercar un tag RFID a la lectora" -ForegroundColor Gray
Write-Host "     • Verificar LED de la lectora (debe parpadear)" -ForegroundColor Gray
Write-Host "     • Observar consola del Gateway (debe mostrar lectura)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3️⃣  DASHBOARD - MONITOREO EN TIEMPO REAL" -ForegroundColor White
Write-Host "     • Ir a tab 'Control'" -ForegroundColor Gray
Write-Host "     • Sección 'Tags Detectados en Vivo'" -ForegroundColor Gray
Write-Host "     • Debe aparecer el tag leído en tiempo real" -ForegroundColor Gray
Write-Host ""
Write-Host "  4️⃣  VERIFICAR WHITELIST/BLACKLIST" -ForegroundColor White
Write-Host "     • Ir a tab 'Listas'" -ForegroundColor Gray
Write-Host "     • Verificar si el tag está en WhiteList" -ForegroundColor Gray
Write-Host "     • Si no está, agregarlo a WhiteList" -ForegroundColor Gray
Write-Host ""
Write-Host "  5️⃣  PRUEBA DE ACCESO" -ForegroundColor White
Write-Host "     • Acercar nuevamente el tag" -ForegroundColor Gray
Write-Host "     • Debe mostrar 'Acceso Permitido' (verde)" -ForegroundColor Gray
Write-Host "     • Verificar en 'Registros' que se guardó el acceso" -ForegroundColor Gray
Write-Host ""
Write-Host "  6️⃣  GRÁFICOS Y REPORTES" -ForegroundColor White
Write-Host "     • Ir a tab 'Gráficos'" -ForegroundColor Gray
Write-Host "     • Verificar que aparezcan las estadísticas" -ForegroundColor Gray
Write-Host "     • Exportar reporte en Excel/PDF" -ForegroundColor Gray
Write-Host ""

# ============================================
# COMANDOS ÚTILES
# ============================================
Write-Host "  🛠️  COMANDOS ÚTILES:" -ForegroundColor Cyan
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "  Iniciar Dashboard:" -ForegroundColor White
Write-Host "    firebase serve --only hosting" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Iniciar Gateway:" -ForegroundColor White
Write-Host "    dotnet run --project src\Gateway\Rfid_gateway.csproj" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Ver logs del Gateway:" -ForegroundColor White
Write-Host "    Get-Content logs\gateway\gateway.log -Tail 20 -Wait" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Verificar lectora USB:" -ForegroundColor White
Write-Host "    Get-PnpDevice | Where-Object FriendlyName -like '*RFID*'" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Abrir consola de Firestore:" -ForegroundColor White
Write-Host "    Start-Process https://console.firebase.google.com/project/neos-tech/firestore" -ForegroundColor Yellow
Write-Host ""

# ============================================
# RESUMEN
# ============================================
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE ESTADO" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$dashboardOk = $response.StatusCode -eq 200
$gatewayOk = $null -ne $gatewayProcess
$configOk = Test-Path $configPath
$sdkOk = Test-Path $sdkDll

Write-Host ""
if ($dashboardOk -and $gatewayOk -and $configOk -and $sdkOk) {
    Write-Host "  ✅ Sistema listo para pruebas" -ForegroundColor Green
    Write-Host "  🚀 Puedes comenzar a probar la lectora RFID" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Algunos componentes necesitan atención:" -ForegroundColor Yellow
    if (-not $dashboardOk) { Write-Host "     ❌ Dashboard" -ForegroundColor Red }
    if (-not $gatewayOk) { Write-Host "     ❌ Gateway" -ForegroundColor Red }
    if (-not $configOk) { Write-Host "     ❌ Configuración" -ForegroundColor Red }
    if (-not $sdkOk) { Write-Host "     ❌ SDK Lectora" -ForegroundColor Red }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
