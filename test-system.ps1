# Test RFID System - NeosTech
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICO SISTEMA RFID" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Dashboard
Write-Host "[1/5] Dashboard..." -ForegroundColor Yellow
try {
    $test = Invoke-WebRequest -Uri "http://localhost:5000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "  OK - Dashboard corriendo" -ForegroundColor Green
} catch {
    Write-Host "  FALTA - Dashboard no responde" -ForegroundColor Red
    Write-Host "  -> Ejecuta: firebase serve --only hosting" -ForegroundColor Yellow
}

# Test 2: Gateway Process
Write-Host "`n[2/5] Gateway C#..." -ForegroundColor Yellow
$gw = Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue
if ($gw) {
    Write-Host "  OK - Gateway ejecutandose (PID: $($gw.Id))" -ForegroundColor Green
} else {
    Write-Host "  FALTA - Gateway no esta corriendo" -ForegroundColor Red
    Write-Host "  -> Ejecuta: dotnet run --project src\Gateway\Rfid_gateway.csproj" -ForegroundColor Yellow
}

# Test 3: Config
Write-Host "`n[3/5] Configuracion..." -ForegroundColor Yellow
if (Test-Path "src\Gateway\gateway.config.json") {
    $cfg = Get-Content "src\Gateway\gateway.config.json" -Raw | ConvertFrom-Json
    Write-Host "  OK - Config encontrado" -ForegroundColor Green
    Write-Host "  -> Client: $($cfg.client_id)" -ForegroundColor Cyan
    Write-Host "  -> Puntos: $($cfg.access_points.Count)" -ForegroundColor Cyan
} else {
    Write-Host "  FALTA - Config no encontrado" -ForegroundColor Red
}

# Test 4: SDK
Write-Host "`n[4/5] SDK Lectora..." -ForegroundColor Yellow
if (Test-Path "src\Gateway\SWNetApi.dll") {
    Write-Host "  OK - SDK encontrado" -ForegroundColor Green
} else {
    Write-Host "  FALTA - SDK no encontrado" -ForegroundColor Red
}

# Test 5: RFID Reader (USB)
Write-Host "`n[5/5] Lectora RFID..." -ForegroundColor Yellow
$rfidDevices = Get-PnpDevice | Where-Object { $_.FriendlyName -like "*RFID*" -or $_.FriendlyName -like "*THY*" }
if ($rfidDevices) {
    Write-Host "  OK - Lectora detectada:" -ForegroundColor Green
    foreach ($dev in $rfidDevices) {
        Write-Host "  -> $($dev.FriendlyName) [$($dev.Status)]" -ForegroundColor Cyan
    }
} else {
    Write-Host "  FALTA - No se detecto lectora USB" -ForegroundColor Yellow
    Write-Host "  -> Verifica conexion USB" -ForegroundColor Yellow
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES DE PRUEBA" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abrir Dashboard: http://localhost:5000" -ForegroundColor White
Write-Host "2. Login: admin / admin123" -ForegroundColor White
Write-Host "3. Ir a tab 'Control'" -ForegroundColor White
Write-Host "4. Acercar tag RFID a la lectora" -ForegroundColor White
Write-Host "5. Verificar que aparezca en 'Tags Detectados en Vivo'" -ForegroundColor White
Write-Host ""
