# Script de limpieza e instalación completa
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LIMPIEZA E INSTALACIÓN GATEWAY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Solicitando permisos de Administrador..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "[1/5] Buscando servicios antiguos..." -ForegroundColor Yellow
$oldServices = Get-Service | Where-Object { 
    $_.Name -like "*RFID*" -or 
    $_.Name -like "*Gateway*" -or 
    $_.DisplayName -like "*RFID*" -or 
    $_.DisplayName -like "*Gateway*"
}

if ($oldServices) {
    Write-Host "      Servicios encontrados:" -ForegroundColor Gray
    $oldServices | ForEach-Object { Write-Host "        - $($_.Name) ($($_.DisplayName))" -ForegroundColor White }
    
    Write-Host ""
    Write-Host "      Deteniendo servicios..." -ForegroundColor Gray
    $oldServices | ForEach-Object {
        if ($_.Status -eq 'Running') {
            Stop-Service -Name $_.Name -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 3
    
    Write-Host "      Eliminando servicios..." -ForegroundColor Gray
    $oldServices | ForEach-Object {
        sc.exe delete $_.Name | Out-Null
    }
    Start-Sleep -Seconds 2
    
    Write-Host "      ✓ Servicios antiguos eliminados" -ForegroundColor Green
} else {
    Write-Host "      ✓ No hay servicios antiguos" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/5] Buscando procesos Gateway antiguos..." -ForegroundColor Yellow
$oldProcesses = Get-Process -Name "Rfid_gateway","dotnet" -ErrorAction SilentlyContinue
if ($oldProcesses) {
    Write-Host "      Procesos encontrados:" -ForegroundColor Gray
    $oldProcesses | ForEach-Object { Write-Host "        - $($_.Name) (PID: $($_.Id))" -ForegroundColor White }
    
    Write-Host "      Terminando procesos..." -ForegroundColor Gray
    $oldProcesses | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    
    Write-Host "      ✓ Procesos terminados" -ForegroundColor Green
} else {
    Write-Host "      ✓ No hay procesos antiguos" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/5] Compilando Gateway en modo Release..." -ForegroundColor Yellow
Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway"
$buildOutput = dotnet build --configuration Release --no-restore 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✓ Compilación exitosa" -ForegroundColor Green
} else {
    Write-Host "      ✗ Error en compilación:" -ForegroundColor Red
    Write-Host $buildOutput -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "[4/5] Instalando servicio Windows..." -ForegroundColor Yellow

$ServiceName = "NeosTech-RFID-Gateway"
$ServiceDisplayName = "NeosTech RFID Gateway"
$ServiceDescription = "Gateway para sistema de control de acceso RFID con lectoras THY"
$DllPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.dll"
$dotnetPath = (Get-Command dotnet).Path

if (-not (Test-Path $DllPath)) {
    Write-Host "      ✗ No se encontró DLL compilado: $DllPath" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

$binPath = "`"$dotnetPath`" `"$DllPath`""

Write-Host "      Creando servicio..." -ForegroundColor Gray
sc.exe create $ServiceName binPath= $binPath DisplayName= $ServiceDisplayName start= auto obj= "LocalSystem" | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "      ✗ Error creando servicio" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

sc.exe description $ServiceName $ServiceDescription | Out-Null
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null

Write-Host "      ✓ Servicio instalado" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Iniciando servicio..." -ForegroundColor Yellow
Start-Service -Name $ServiceName
Start-Sleep -Seconds 5

$service = Get-Service -Name $ServiceName
if ($service.Status -eq 'Running') {
    Write-Host "      ✓ Servicio iniciado correctamente" -ForegroundColor Green
    
    # Mostrar info del proceso
    $process = Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host ""
        Write-Host "Información del servicio:" -ForegroundColor Cyan
        Write-Host "  Nombre: $ServiceDisplayName" -ForegroundColor White
        Write-Host "  Estado: Running ✓" -ForegroundColor Green
        Write-Host "  PID: $($process.Id)" -ForegroundColor White
        Write-Host "  Memoria: $([math]::Round($process.WS/1MB, 2)) MB" -ForegroundColor White
        Write-Host "  Inicio automático: Sí" -ForegroundColor White
    }
    
    # Probar endpoint
    Write-Host ""
    Write-Host "Probando endpoints..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "http://192.168.1.11:8080/api/lectora/config" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ GET /api/lectora/config: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠ Endpoint aún no responde (normal, puede tardar unos segundos)" -ForegroundColor Yellow
    }
} else {
    Write-Host "      ✗ El servicio no pudo iniciarse" -ForegroundColor Red
    Write-Host "      Estado: $($service.Status)" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  INSTALACIÓN COMPLETA" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "El servicio está configurado para:" -ForegroundColor White
Write-Host "  • Iniciar automáticamente con Windows" -ForegroundColor Gray
Write-Host "  • Correr en background (sin ventanas)" -ForegroundColor Gray
Write-Host "  • Reiniciarse automáticamente si falla" -ForegroundColor Gray
Write-Host "  • Escuchar en http://192.168.1.11:8080" -ForegroundColor Gray
Write-Host ""
Write-Host "Gestionar servicio:" -ForegroundColor Cyan
Write-Host "  services.msc -> Buscar 'NeosTech RFID Gateway'" -ForegroundColor White
Write-Host "  o ejecuta: net start $ServiceName" -ForegroundColor White
Write-Host "  o ejecuta: net stop $ServiceName" -ForegroundColor White
Write-Host ""
Write-Host "Dashboard: https://neos-tech.web.app" -ForegroundColor Cyan
Write-Host ""
Read-Host "Presiona Enter para salir"
