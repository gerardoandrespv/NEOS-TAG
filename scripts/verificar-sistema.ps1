#!/usr/bin/env pwsh
# Script de verificación rápida del sistema desplegado

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VERIFICACIÓN DEL SISTEMA EN PRODUCCIÓN" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# URLs del sistema
$dashboardUrl = "https://neos-tech.web.app"
$cloudFunctionUrl = "https://rfid-gateway-6psjv5t2ka-uc.a.run.app"
$gatewayLocalUrl = "http://192.168.1.11:8080/readerid"

$allOk = $true

# 1. Verificar Dashboard
Write-Host "1. Dashboard (Firebase Hosting)" -ForegroundColor Yellow
Write-Host "   URL: $dashboardUrl" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $dashboardUrl -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Dashboard accesible (200 OK)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Dashboard no responde: $($_.Exception.Message)" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# 2. Verificar Cloud Function
Write-Host "2. Cloud Function (GCP)" -ForegroundColor Yellow
Write-Host "   URL: $cloudFunctionUrl" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $cloudFunctionUrl -Method OPTIONS -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 204) {
        Write-Host "   ✅ Cloud Function activa (CORS OK)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Cloud Function: $($_.Exception.Message)" -ForegroundColor Yellow
    # OPTIONS puede dar error pero la función estar activa
}

# Probar con POST real
try {
    $body = @{
        tag_id = "TEST12345"
        reader_id = "test"
        client_id = "condominio-neos"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri $cloudFunctionUrl -Method POST -Body $body -ContentType "application/json" -Headers @{"X-Client-ID"="condominio-neos"} -TimeoutSec 10
    Write-Host "   ✅ Cloud Function responde a peticiones POST" -ForegroundColor Green
    Write-Host "   📋 Respuesta: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Cloud Function no responde a POST: $($_.Exception.Message)" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# 3. Verificar Gateway Local
Write-Host "3. Gateway Local (C# .NET)" -ForegroundColor Yellow
Write-Host "   URL: $gatewayLocalUrl" -ForegroundColor Gray
try {
    $testUrl = $gatewayLocalUrl + "?id=TEST12345" + [char]38 + "heart=0" + [char]38 + "readsn=VERIFY"
    $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   [OK] Gateway local accesible" -ForegroundColor Green
        Write-Host "   Respuesta: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [ERROR] Gateway local no responde" -ForegroundColor Red
    Write-Host "   Ejecuta: RUN-ADMIN.ps1" -ForegroundColor Yellow
    $allOk = $false
}
Write-Host ""

# 4. Verificar conectividad de red
Write-Host "4. Conectividad de Red" -ForegroundColor Yellow
$gatewayIp = "192.168.1.11"
$gatewayPort = 8080
$result = Test-NetConnection -ComputerName $gatewayIp -Port $gatewayPort -WarningAction SilentlyContinue
if ($result.TcpTestSucceeded) {
    Write-Host "   ✅ Puerto $gatewayPort en $gatewayIp accesible" -ForegroundColor Green
} else {
    Write-Host "   ❌ Puerto $gatewayPort en $gatewayIp NO accesible" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# 5. Verificar Git
Write-Host "5. Repositorio GitHub" -ForegroundColor Yellow
try {
    $branch = git rev-parse --abbrev-ref HEAD
    $commit = git rev-parse --short HEAD
    Write-Host "   📍 Rama: $branch" -ForegroundColor Gray
    Write-Host "   📍 Commit: $commit" -ForegroundColor Gray
    
    # Verificar si hay cambios sin commit
    $status = git status --porcelain
    if ($status) {
        Write-Host "   ⚠️  Hay cambios sin commit" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Todo en sync con GitHub" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Error al verificar Git: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Resumen final
Write-Host "============================================" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "  [OK] SISTEMA OPERATIVO" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[ACCESOS] URLs del sistema:" -ForegroundColor Cyan
    Write-Host "   Dashboard:      $dashboardUrl" -ForegroundColor White
    Write-Host "   Cloud Function: $cloudFunctionUrl" -ForegroundColor White
    Write-Host "   Gateway Local:  $gatewayLocalUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "[SIGUIENTE PASO]" -ForegroundColor Yellow
    Write-Host "   Configura la lectora para enviar HTTP a: $gatewayLocalUrl" -ForegroundColor White
    Write-Host "   Ver: CONFIGURAR-LECTORA-HTTP.md" -ForegroundColor Gray
} else {
    Write-Host "  [ATENCION] ALGUNOS COMPONENTES NECESITAN REVISION" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[DOCS] Revisa la documentacion:" -ForegroundColor Yellow
    Write-Host "   - DEPLOYMENT-GCP.md (deployment)" -ForegroundColor Gray
    Write-Host "   - RESUMEN-DEPLOYMENT.md (overview)" -ForegroundColor Gray
    Write-Host "   - CONFIGURAR-LECTORA-HTTP.md (setup lectora)" -ForegroundColor Gray
}
Write-Host ""
