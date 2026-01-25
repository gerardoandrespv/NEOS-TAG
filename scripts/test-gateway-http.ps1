Write-Host "=== DIAGNOSTICO GATEWAY HTTP ===" -ForegroundColor Cyan
Write-Host ""

# 1. Detener procesos anteriores
Write-Host "[1] Deteniendo procesos anteriores..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*Rfid*" -or $_.ProcessName -like "*dotnet*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Verificar archivos
Write-Host "[2] Verificando archivos..." -ForegroundColor Yellow
$exePath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.exe"
$configPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\gateway.config.json"

if (Test-Path $exePath) {
    Write-Host "   OK - Ejecutable encontrado" -ForegroundColor Green
} else {
    Write-Host "   ERROR - Ejecutable NO encontrado" -ForegroundColor Red
    exit 1
}

if (Test-Path $configPath) {
    Write-Host "   OK - Configuracion encontrada" -ForegroundColor Green
} else {
    Write-Host "   ERROR - Configuracion NO encontrada" -ForegroundColor Red
    exit 1
}

# 3. Ejecutar Gateway
Write-Host "[3] Iniciando Gateway..." -ForegroundColor Yellow
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

cd C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0

# Ejecutar y mostrar todo el output
& .\Rfid_gateway.exe
