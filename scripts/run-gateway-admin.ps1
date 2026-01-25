# Script para ejecutar el Gateway con permisos de administrador
# Este script debe ejecutarse como administrador

Write-Host "=== Iniciando Gateway RFID con THY SDK ===" -ForegroundColor Cyan

# Detener instancias anteriores
Write-Host "Deteniendo instancias anteriores..." -ForegroundColor Yellow
Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Navegar al directorio del Gateway
Set-Location "C:\NeosTech-RFID-System-Pro"

# Compilar el Gateway
Write-Host "Compilando Gateway..." -ForegroundColor Yellow
dotnet build src\Gateway\Rfid_gateway.csproj -c Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Compilación fallida" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "Compilación exitosa" -ForegroundColor Green

# Copiar DLL al directorio de salida si no existe
$dllSource = "src\Gateway\SWNetApi.dll"
$dllDest = "src\Gateway\bin\Release\net8.0\SWNetApi.dll"

if (Test-Path $dllSource) {
    if (-not (Test-Path $dllDest)) {
        Write-Host "Copiando SWNetApi.dll al directorio de salida..." -ForegroundColor Yellow
        Copy-Item $dllSource $dllDest -Force
    }
}

# Copiar configuración
$configSource = "src\Gateway\gateway.config.json"
$configDest = "src\Gateway\bin\Release\net8.0\gateway.config.json"

if (Test-Path $configSource) {
    Write-Host "Copiando gateway.config.json..." -ForegroundColor Yellow
    Copy-Item $configSource $configDest -Force
}

Write-Host ""
Write-Host "=== Iniciando Gateway ===" -ForegroundColor Green
Write-Host "Servidor HTTP en http://localhost:60000" -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

# Ejecutar el Gateway
dotnet run --project src\Gateway\Rfid_gateway.csproj -c Release
