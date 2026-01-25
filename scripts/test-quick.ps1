# Validacion rapida del sistema
Write-Host "=== VALIDACION DEL SISTEMA ===" -ForegroundColor Cyan
Write-Host ""

# 1. Gateway
Write-Host "[1] Gateway..." -ForegroundColor Yellow
try {
    $h = Invoke-RestMethod -Uri "http://localhost:8080/health" -TimeoutSec 2
    Write-Host "    OK - Gateway respondiendo (Cliente: $($h.client_id))" -ForegroundColor Green
} catch {
    Write-Host "    ERROR - Gateway NO responde" -ForegroundColor Red
}

# 2. Dashboard
Write-Host "[2] Dashboard..." -ForegroundColor Yellow
try {
    $d = Invoke-WebRequest -Uri "http://localhost:5000" -TimeoutSec 2 -UseBasicParsing
    Write-Host "    OK - Dashboard accesible" -ForegroundColor Green
} catch {
    Write-Host "    ERROR - Dashboard NO accesible" -ForegroundColor Red
}

# 3. Lector
Write-Host "[3] Lector RFID..." -ForegroundColor Yellow
$ping = Test-NetConnection -ComputerName "192.168.1.200" -Port 60000 -WarningAction SilentlyContinue
if ($ping.TcpTestSucceeded) {
    Write-Host "    OK - Lector accesible en 192.168.1.200:60000" -ForegroundColor Green
} else {
    Write-Host "    ERROR - Lector NO accesible" -ForegroundColor Red
}

# 4. Relay
Write-Host "[4] Probando relay..." -ForegroundColor Yellow
try {
    $body = @{ access_point = 'porton_triwe' } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri 'http://localhost:8080/api/open' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 10
    Write-Host "    OK - Relay activado: $($result.status)" -ForegroundColor Green
} catch {
    Write-Host "    ERROR - Relay NO funciona" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== VALIDACION COMPLETA ===" -ForegroundColor Cyan
Read-Host "Presiona Enter"
