# ============================================
# INICIAR GATEWAY COMO ADMINISTRADOR
# ============================================

# Verificar si ya se ejecuta como administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  No tienes permisos de Administrador" -ForegroundColor Yellow
    Write-Host "🔄 Solicitando permisos de Administrador..." -ForegroundColor Cyan
    Write-Host ""
    
    # Auto-elevar permisos
    try {
        $scriptPath = $MyInvocation.MyCommand.Path
        Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -Verb RunAs
        exit
    }
    catch {
        Write-Host "❌ No se pudo solicitar permisos de Administrador" -ForegroundColor Red
        Write-Host "💡 Haz clic derecho en PowerShell y selecciona 'Ejecutar como administrador'" -ForegroundColor Yellow
        Write-Host "   Luego ejecuta: .\start-gateway-admin.ps1" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Presiona Enter para salir"
        exit 1
    }
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  GATEWAY RFID - MODO ADMINISTRADOR" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Detener procesos Gateway existentes
Write-Host "🔄 Deteniendo Gateway anterior..." -ForegroundColor Yellow
Get-Process -Name dotnet -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*Gateway*"
} | ForEach-Object {
    Write-Host "  Deteniendo PID: $($_.Id)" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🚀 Iniciando Gateway con permisos de Administrador..." -ForegroundColor Green
Write-Host ""
Write-Host "📡 MODO HÍBRIDO ACTIVO:" -ForegroundColor Cyan
Write-Host "  • Lectora standalone: ✅ Funcionará independientemente" -ForegroundColor White
Write-Host "  • Lectora conectada:  ✅ Enviará tags al Gateway vía HTTP" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Gateway escuchará en TODAS las interfaces de red" -ForegroundColor Yellow
Write-Host "  • http://192.168.1.X:8080/readerid" -ForegroundColor Gray
Write-Host "  • La lectora podrá enviar tags automáticamente" -ForegroundColor Gray
Write-Host ""

# Cambiar a directorio del Gateway
$gatewayPath = Join-Path $PSScriptRoot "src\Gateway"
Set-Location -Path $gatewayPath

# Iniciar Gateway
dotnet run
