# ============================================
# INSTALADOR DE SERVICIO GATEWAY RFID
# ============================================
# Convierte el Gateway en un servicio de Windows que:
# - Se inicia automáticamente con el sistema
# - Corre en background (sin ventana)
# - Se reinicia automáticamente si falla
# - Tiene logging automático
# ============================================

param(
    [switch]$Uninstall,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Status
)

$ErrorActionPreference = "Stop"
$ServiceName = "NeosTech-RFID-Gateway"
$ServiceDisplayName = "NeosTech RFID Gateway"
$ServiceDescription = "Gateway para sistema de control de acceso RFID con lectoras THY. Procesa tags y sincroniza con Firebase."
$ProjectPath = "C:\NeosTech-RFID-System-Pro"
$GatewayPath = "$ProjectPath\src\Gateway"
$DllPath = "$GatewayPath\bin\Debug\net8.0\Rfid_gateway.dll"
$LogPath = "$ProjectPath\logs"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR SERVICIO GATEWAY RFID" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Este script requiere permisos de Administrador" -ForegroundColor Red
    Write-Host "Ejecuta: Start-Process powershell -Verb RunAs -ArgumentList '-File $PSCommandPath'" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Crear carpeta de logs
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

# Función: Verificar si el servicio existe
function Test-ServiceExists {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    return $null -ne $service
}

# Función: Mostrar estado del servicio
function Show-ServiceStatus {
    Write-Host "[STATUS] Verificando servicio..." -ForegroundColor Yellow
    
    if (Test-ServiceExists) {
        $service = Get-Service -Name $ServiceName
        $process = Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue
        
        Write-Host ""
        Write-Host "Servicio: $ServiceDisplayName" -ForegroundColor White
        Write-Host "  Estado: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') { 'Green' } else { 'Yellow' })
        Write-Host "  Inicio: $($service.StartType)" -ForegroundColor Gray
        
        if ($process) {
            Write-Host "  PID: $($process.Id)" -ForegroundColor Gray
            Write-Host "  Memoria: $([math]::Round($process.WS/1MB, 2)) MB" -ForegroundColor Gray
            Write-Host "  Inicio: $($process.StartTime)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "Logs: $LogPath" -ForegroundColor Cyan
        
        # Mostrar últimas líneas del log
        $logFile = Get-ChildItem $LogPath -Filter "gateway-*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($logFile) {
            Write-Host "Último log: $($logFile.Name)" -ForegroundColor Gray
            Write-Host "Últimas 10 líneas:" -ForegroundColor Yellow
            Get-Content $logFile.FullName -Tail 10 -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "El servicio NO está instalado" -ForegroundColor Red
    }
}

# Función: Compilar Gateway
function Build-Gateway {
    Write-Host "[BUILD] Compilando Gateway..." -ForegroundColor Yellow
    
    Set-Location $GatewayPath
    $buildOutput = dotnet build --configuration Release 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Falló la compilación" -ForegroundColor Red
        Write-Host $buildOutput
        return $false
    }
    
    # Actualizar ruta al DLL Release
    $script:DllPath = "$GatewayPath\bin\Release\net8.0\Rfid_gateway.dll"
    
    if (-not (Test-Path $DllPath)) {
        Write-Host "ERROR: No se encontró el DLL compilado en: $DllPath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "  ✓ Compilación exitosa" -ForegroundColor Green
    Write-Host "  DLL: $DllPath" -ForegroundColor Gray
    return $true
}

# Función: Desinstalar servicio
function Uninstall-GatewayService {
    Write-Host "[UNINSTALL] Desinstalando servicio..." -ForegroundColor Yellow
    
    if (Test-ServiceExists) {
        # Detener servicio si está corriendo
        $service = Get-Service -Name $ServiceName
        if ($service.Status -eq 'Running') {
            Write-Host "  Deteniendo servicio..." -ForegroundColor Gray
            Stop-Service -Name $ServiceName -Force
            Start-Sleep -Seconds 3
        }
        
        # Eliminar servicio
        Write-Host "  Eliminando servicio..." -ForegroundColor Gray
        sc.exe delete $ServiceName | Out-Null
        Start-Sleep -Seconds 2
        
        Write-Host "  ✓ Servicio desinstalado" -ForegroundColor Green
    } else {
        Write-Host "  El servicio no está instalado" -ForegroundColor Yellow
    }
}

# Función: Instalar servicio
function Install-GatewayService {
    Write-Host "[INSTALL] Instalando servicio..." -ForegroundColor Yellow
    
    # Desinstalar si ya existe
    if (Test-ServiceExists) {
        Write-Host "  Servicio existente detectado, desinstalando primero..." -ForegroundColor Yellow
        Uninstall-GatewayService
    }
    
    # Compilar
    if (-not (Build-Gateway)) {
        return $false
    }
    
    # Crear servicio usando sc.exe (más confiable que New-Service para .NET)
    Write-Host "  Creando servicio Windows..." -ForegroundColor Gray
    
    $dotnetPath = (Get-Command dotnet).Path
    $binPath = "`"$dotnetPath`" `"$DllPath`""
    
    $createResult = sc.exe create $ServiceName `
        binPath= $binPath `
        DisplayName= $ServiceDisplayName `
        start= auto `
        obj= "LocalSystem"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Falló la creación del servicio" -ForegroundColor Red
        Write-Host $createResult
        return $false
    }
    
    # Configurar descripción
    sc.exe description $ServiceName $ServiceDescription | Out-Null
    
    # Configurar reinicio automático en caso de falla
    sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null
    
    Write-Host "  ✓ Servicio instalado correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuración:" -ForegroundColor Cyan
    Write-Host "  Nombre: $ServiceName" -ForegroundColor White
    Write-Host "  Modo: Inicio automático" -ForegroundColor White
    Write-Host "  Usuario: Sistema Local" -ForegroundColor White
    Write-Host "  Reinicio automático: Sí (en caso de fallo)" -ForegroundColor White
    
    return $true
}

# Función: Iniciar servicio
function Start-GatewayService {
    Write-Host "[START] Iniciando servicio..." -ForegroundColor Yellow
    
    if (-not (Test-ServiceExists)) {
        Write-Host "ERROR: El servicio no está instalado" -ForegroundColor Red
        Write-Host "Ejecuta: .\install-gateway-service.ps1" -ForegroundColor Yellow
        return
    }
    
    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq 'Running') {
        Write-Host "  El servicio ya está corriendo" -ForegroundColor Yellow
        return
    }
    
    Start-Service -Name $ServiceName
    Start-Sleep -Seconds 3
    
    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq 'Running') {
        Write-Host "  ✓ Servicio iniciado correctamente" -ForegroundColor Green
        Show-ServiceStatus
    } else {
        Write-Host "  ERROR: El servicio no pudo iniciarse" -ForegroundColor Red
        Write-Host "  Revisa logs en: $LogPath" -ForegroundColor Yellow
    }
}

# Función: Detener servicio
function Stop-GatewayService {
    Write-Host "[STOP] Deteniendo servicio..." -ForegroundColor Yellow
    
    if (-not (Test-ServiceExists)) {
        Write-Host "ERROR: El servicio no está instalado" -ForegroundColor Red
        return
    }
    
    $service = Get-Service -Name $ServiceName
    if ($service.Status -ne 'Running') {
        Write-Host "  El servicio ya está detenido" -ForegroundColor Yellow
        return
    }
    
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 3
    
    Write-Host "  ✓ Servicio detenido" -ForegroundColor Green
}

# MAIN: Procesar comandos
if ($Uninstall) {
    Uninstall-GatewayService
}
elseif ($Start) {
    Start-GatewayService
}
elseif ($Stop) {
    Stop-GatewayService
}
elseif ($Restart) {
    Stop-GatewayService
    Start-Sleep -Seconds 2
    Start-GatewayService
}
elseif ($Status) {
    Show-ServiceStatus
}
else {
    # Instalación completa por defecto
    if (Install-GatewayService) {
        Write-Host ""
        Write-Host "¿Deseas iniciar el servicio ahora? (S/N)" -ForegroundColor Cyan
        $response = Read-Host
        
        if ($response -eq 'S' -or $response -eq 's') {
            Start-GatewayService
        }
    }
}

Write-Host ""
Write-Host "COMANDOS DISPONIBLES:" -ForegroundColor Cyan
Write-Host "  .\install-gateway-service.ps1           → Instalar servicio" -ForegroundColor White
Write-Host "  .\install-gateway-service.ps1 -Start    → Iniciar servicio" -ForegroundColor White
Write-Host "  .\install-gateway-service.ps1 -Stop     → Detener servicio" -ForegroundColor White
Write-Host "  .\install-gateway-service.ps1 -Restart  → Reiniciar servicio" -ForegroundColor White
Write-Host "  .\install-gateway-service.ps1 -Status   → Ver estado" -ForegroundColor White
Write-Host "  .\install-gateway-service.ps1 -Uninstall → Desinstalar servicio" -ForegroundColor White
Write-Host ""
Write-Host "O usa services.msc para gestionar el servicio visualmente" -ForegroundColor Gray
Write-Host ""
