# Inicio Manual del Gateway - Diagnostico

Write-Host "=== DIAGNOSTICO Y INICIO DEL GATEWAY ===" -ForegroundColor Cyan

# 1. Verificar compilacion
Write-Host "`n[1] Verificando compilacion..." -ForegroundColor Yellow
$exePath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.exe"
$dllPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\SWNetApi.dll"
$configPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\gateway.config.json"

if (Test-Path $exePath) {
    Write-Host "OK Ejecutable encontrado" -ForegroundColor Green
} else {
    Write-Host "ERROR Ejecutable no encontrado" -ForegroundColor Red
    Write-Host "Compilando..." -ForegroundColor Yellow
    dotnet build "C:\NeosTech-RFID-System-Pro\src\Gateway\Rfid_gateway.csproj" --configuration Release
}

if (Test-Path $dllPath) {
    Write-Host "OK DLL del lector encontrado" -ForegroundColor Green
} else {
    Write-Host "ERROR SWNetApi.dll no encontrado" -ForegroundColor Red
}

if (Test-Path $configPath) {
    Write-Host "OK Archivo de configuracion encontrado" -ForegroundColor Green
} else {
    Write-Host "ERROR gateway.config.json no encontrado" -ForegroundColor Red
}

# 2. Detener procesos anteriores
Write-Host "`n[2] Deteniendo procesos anteriores..." -ForegroundColor Yellow
Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "OK Procesos detenidos" -ForegroundColor Green

# 3. Iniciar Gateway
Write-Host "`n[3] Iniciando Gateway..." -ForegroundColor Yellow
Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0"

Write-Host "Ejecutando: .\Rfid_gateway.exe" -ForegroundColor Gray
Write-Host "Los logs apareceran a continuacion..." -ForegroundColor Gray
Write-Host "Presiona Ctrl+C para detener`n" -ForegroundColor Gray

.\Rfid_gateway.exe
