# Script para iniciar Gateway v6.0 con Sistema de Debouncing
# Ejecutar como ADMINISTRADOR

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Cyan
Write-Host "       GATEWAY v6.0 - DEBOUNCING RFID INTELIGENTE       " -ForegroundColor White -BackgroundColor DarkCyan
Write-Host "" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si estamos en modo Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ADVERTENCIA: REQUIERE PERMISOS DE ADMINISTRADOR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Click derecho en este archivo y selecciona:" -ForegroundColor Yellow
    Write-Host "'Ejecutar con PowerShell como administrador'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O ejecuta desde PowerShell como Admin:" -ForegroundColor Yellow
    Write-Host "   cd C:\NeosTech-RFID-System-Pro" -ForegroundColor White
    Write-Host "   .\start-gateway-debouncing.ps1" -ForegroundColor White
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Cambiar al directorio del Gateway
Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway"

Write-Host "Directorio: $PWD" -ForegroundColor Gray
Write-Host ""

# Verificar si hay un Gateway corriendo
$existing = Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "ADVERTENCIA: Gateway ya esta corriendo (PID: $($existing.Id))" -ForegroundColor Yellow
    $respuesta = Read-Host "¿Detenerlo y reiniciar? (S/N)"
    if ($respuesta -eq "S" -or $respuesta -eq "s") {
        Write-Host "Deteniendo Gateway anterior..." -ForegroundColor Yellow
        Stop-Process -Id $existing.Id -Force
        Start-Sleep 3
        Write-Host "Gateway detenido" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "Cancelado - Gateway anterior sigue corriendo" -ForegroundColor Yellow
        Read-Host "Presiona Enter para salir"
        exit 0
    }
}

Write-Host "Configuracion cargada:" -ForegroundColor Cyan
$config = Get-Content "gateway.config.json" -Raw | ConvertFrom-Json
Write-Host "   Cooldown global:     $($config.rfid.tag_cooldown_seconds)s" -ForegroundColor White
Write-Host "   Estadisticas:        $($config.rfid.show_duplicate_stats)" -ForegroundColor White
Write-Host ""

Write-Host "Iniciando Gateway con Debouncing..." -ForegroundColor Green
Write-Host ""
Write-Host "=============================================================" -ForegroundColor DarkGray
Write-Host "BUSCA ESTOS MENSAJES PARA CONFIRMAR QUE FUNCIONA:" -ForegroundColor Yellow
Write-Host "=============================================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   Cooldown global: 10s" -ForegroundColor Gray
Write-Host "   Cargado: Porton Triwe @ 192.168.1.200:60000 (cooldown: 15s)" -ForegroundColor Gray  
Write-Host "   Cargado: Porton Principal @ 192.168.1.101:60000 (cooldown: 30s)" -ForegroundColor Gray
Write-Host ""
Write-Host "CUANDO DETECTE DUPLICADOS VERAS:" -ForegroundColor Yellow
Write-Host "   Duplicados filtrados: 10/12 (83.3 porciento) - Ultimos 2.5s" -ForegroundColor Gray
Write-Host ""
Write-Host "=============================================================" -ForegroundColor DarkGray
Write-Host ""
Start-Sleep 2

# Iniciar Gateway
dotnet run

# Si dotnet run termina, esperar
Write-Host ""
Write-Host "Gateway detenido" -ForegroundColor Yellow
Read-Host "Presiona Enter para cerrar"
