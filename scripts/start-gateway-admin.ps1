# Iniciar Gateway como Administrador (necesario para recibir tags HTTP de la lectora)

Write-Host "=== Iniciando Gateway RFID como ADMINISTRADOR ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Puerto HTTP: 60000 (recibe tags de lectora 192.168.1.200)" -ForegroundColor Yellow
Write-Host "Endpoint: /readerid?TagId=XXXX" -ForegroundColor Yellow
Write-Host ""

# Verificar si ya corre como admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  No se está ejecutando como Administrador" -ForegroundColor Yellow
    Write-Host "🔄 Reiniciando como Administrador..." -ForegroundColor Cyan
    
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $scriptPath
    exit
}

Write-Host "✅ Ejecutando como Administrador" -ForegroundColor Green
Write-Host ""

# Detener procesos anteriores
Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*Gateway*" } | Stop-Process -Force

# Compilar
Write-Host "📦 Compilando Gateway..." -ForegroundColor Cyan
cd C:\NeosTech-RFID-System-Pro
dotnet build src\Gateway\Rfid_gateway.csproj -c Release --nologo -v q

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error de compilación" -ForegroundColor Red
    pause
    exit
}

Write-Host "✅ Compilación exitosa" -ForegroundColor Green
Write-Host ""

# Iniciar Gateway
Write-Host "🚀 Iniciando Gateway..." -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

cd src\Gateway\bin\Release\net8.0
.\Rfid_gateway.exe
