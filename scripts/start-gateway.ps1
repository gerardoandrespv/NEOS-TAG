# Script para iniciar el Gateway RFID
Write-Host "🚀 Iniciando NEOS TECH RFID Gateway..." -ForegroundColor Cyan
Write-Host ""

# Verificar si se está ejecutando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Este script requiere privilegios de administrador" -ForegroundColor Yellow
    Write-Host "   Relanzando como administrador..." -ForegroundColor Gray
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Verificar que el proyecto existe
if (-not (Test-Path "src\Gateway\Rfid_gateway.csproj")) {
    Write-Host "❌ Error: No se encontró el proyecto Gateway" -ForegroundColor Red
    Write-Host "   Ruta esperada: src\Gateway\Rfid_gateway.csproj" -ForegroundColor Yellow
    pause
    exit 1
}

# Verificar configuración
if (Test-Path "src\Gateway\gateway.config.json") {
    Write-Host "✅ Configuración encontrada" -ForegroundColor Green
    $config = Get-Content "src\Gateway\gateway.config.json" | ConvertFrom-Json
    Write-Host "   Puerto: $($config.server.port)" -ForegroundColor Gray
    Write-Host "   Puntos de acceso configurados: $($config.access_points.Count)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "⚠️  Advertencia: No se encontró gateway.config.json" -ForegroundColor Yellow
    Write-Host ""
}

# Mostrar información importante
Write-Host "📋 Información del Gateway:" -ForegroundColor Cyan
Write-Host "   - URL: http://localhost:60000" -ForegroundColor White
Write-Host "   - Health Check: http://localhost:60000/health" -ForegroundColor White
Write-Host "   - Portón Triwe: 192.168.1.200:8080" -ForegroundColor White
Write-Host "   - Portón Principal: 192.168.1.101:8080" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Dashboard disponible en: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el Gateway" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Iniciar Gateway
try {
    dotnet run --project src\Gateway\Rfid_gateway.csproj
} catch {
    Write-Host ""
    Write-Host "❌ Error al iniciar el Gateway: $_" -ForegroundColor Red
    pause
    exit 1
}
