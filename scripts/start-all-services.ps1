# ============================================
# NeosTech RFID System - Iniciar Todos los Servicios
# ============================================

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   NEOS TECH - RFID SYSTEM PRO                ║" -ForegroundColor Cyan
Write-Host "║   Iniciando Servicios...                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# 1. Iniciar Gateway RFID
Write-Host "[1/2] Iniciando Gateway RFID..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location 'C:\NeosTech-RFID-System-Pro'; .\restart-gateway-cors.ps1"
) -WindowStyle Normal

Start-Sleep -Seconds 3

# 2. Iniciar Dashboard Firebase
Write-Host "[2/2] Iniciando Dashboard Firebase..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location 'C:\NeosTech-RFID-System-Pro'; firebase serve --port 5000"
) -WindowStyle Normal

Start-Sleep -Seconds 5

# Verificar servicios
Write-Host "`nVerificando servicios..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

$gateway = Test-NetConnection localhost -Port 60000 -WarningAction SilentlyContinue -InformationLevel Quiet
$dashboard = Test-NetConnection localhost -Port 5000 -WarningAction SilentlyContinue -InformationLevel Quiet

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ESTADO DE SERVICIOS                        ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════════════╣" -ForegroundColor Cyan

if ($gateway) {
    Write-Host "║ ✓ Gateway RFID:     http://localhost:60000    ║" -ForegroundColor Green
} else {
    Write-Host "║ ✗ Gateway RFID:     INICIANDO...              ║" -ForegroundColor Yellow
}

if ($dashboard) {
    Write-Host "║ ✓ Dashboard:        http://localhost:5000     ║" -ForegroundColor Green
} else {
    Write-Host "║ ✗ Dashboard:        INICIANDO...              ║" -ForegroundColor Yellow
}

Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Abrir dashboard en navegador
if ($dashboard) {
    Write-Host "Abriendo dashboard en navegador..." -ForegroundColor Green
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5000"
} else {
    Write-Host "Esperando que los servicios terminen de iniciar..." -ForegroundColor Yellow
    Write-Host "El dashboard se abrirá automáticamente en unos segundos." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:5000"
}

Write-Host "`n✓ Servicios iniciados correctamente" -ForegroundColor Green
Write-Host "  - Las ventanas de PowerShell permanecerán abiertas para monitorear logs" -ForegroundColor Gray
Write-Host "  - Para detener los servicios, cierra las ventanas de PowerShell`n" -ForegroundColor Gray
