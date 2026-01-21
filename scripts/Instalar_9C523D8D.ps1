# =============================================
# INSTALADOR RFID GATEWAY CONDOMINIO - PowerShell
# Ejecutar como Administrador
# =============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   INSTALADOR RFID GATEWAY CONDOMINIO   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ ERROR: Debes ejecutar como Administrador" -ForegroundColor Red
    Write-Host ""
    Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "1. Cierra esta ventana"
    Write-Host "2. Haz clic derecho en PowerShell"
    Write-Host "3. Selecciona 'Ejecutar como administrador'"
    Write-Host "4. Vuelve a ejecutar este script"
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Ejecutando como administrador" -ForegroundColor Green
Write-Host ""

# 1. Detener y eliminar servicio existente
Write-Host "[1/5] Verificando servicio existente..." -ForegroundColor Yellow
$serviceName = "RFIDGatewayCondominio"

try {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "   Servicio existente encontrado" -ForegroundColor Gray
        Write-Host "   Deteniendo servicio..." -ForegroundColor Gray
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        Write-Host "   Desinstalando..." -ForegroundColor Gray
        sc.exe delete $serviceName 2>$null
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "   No hay servicio existente" -ForegroundColor Gray
}

# 2. Verificar que RFID_Gateway.exe existe
Write-Host "[2/5] Verificando ejecutable..." -ForegroundColor Yellow
$exePath = ".\RFID_Gateway.exe"
if (-not (Test-Path $exePath)) {
    Write-Host "❌ ERROR: No se encuentra RFID_Gateway.exe" -ForegroundColor Red
    Write-Host "   Este script debe ejecutarse desde la misma carpeta que RFID_Gateway.exe" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "✅ RFID_Gateway.exe encontrado" -ForegroundColor Green

# 3. Instalar servicio
Write-Host "[3/5] Instalando servicio..." -ForegroundColor Yellow
try {
    $installResult = & .\RFID_Gateway.exe install
    if ($LASTEXITCODE -ne 0) {
        throw "Topshelf falló"
    }
    Write-Host "✅ Servicio instalado con Topshelf" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Topshelf falló, usando sc.exe..." -ForegroundColor Yellow
    $fullPath = (Get-Item $exePath).FullName
    $scResult = sc.exe create $serviceName binPath= "$fullPath" start= auto
    if ($LASTEXITCODE -eq 0) {
        sc.exe description $serviceName "RFID Gateway para Condominio - Control de accesos"
        Write-Host "✅ Servicio instalado con sc.exe" -ForegroundColor Green
    } else {
        Write-Host "❌ Error instalando servicio: $scResult" -ForegroundColor Red
        pause
        exit 1
    }
}

# 4. Iniciar servicio
Write-Host "[4/5] Iniciando servicio..." -ForegroundColor Yellow
try {
    & .\RFID_Gateway.exe start
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Intentando con net start..." -ForegroundColor Yellow
        net start $serviceName 2>$null
    }
} catch {
    Write-Host "⚠️  No se pudo iniciar automáticamente" -ForegroundColor Yellow
}

# 5. Verificar instalación
Write-Host "[5/5] Verificando instalación..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✅ INSTALACIÓN EXITOSA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 INFORMACIÓN DEL SERVICIO:" -ForegroundColor White
    Write-Host "   Nombre: $($service.Name)" -ForegroundColor Gray
    Write-Host "   Estado: $($service.Status)" -ForegroundColor Gray
    Write-Host "   Tipo inicio: $($service.StartType)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🌐 ENDPOINTS DISPONIBLES:" -ForegroundColor White
    Write-Host "   • POST http://localhost:60000/         (Recibir tags RFID)" -ForegroundColor Gray
    Write-Host "   • POST http://localhost:60000/open-gate (Abrir portón remoto)" -ForegroundColor Gray
    Write-Host "   • GET  http://localhost:60000/health   (Estado del sistema)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 ENLACES:" -ForegroundColor White
    Write-Host "   • Dashboard: https://neos-tech.web.app" -ForegroundColor Gray
    Write-Host "   • Cloud Function: https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 PARA VERIFICAR:" -ForegroundColor White
    Write-Host "   Abre services.msc y busca 'RFIDGatewayCondominio'" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "   ⚠️  INSTALACIÓN PARCIAL" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "El servicio se instaló pero no está ejecutándose." -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔧 SOLUCIÓN:" -ForegroundColor White
    Write-Host "   1. Abre services.msc" -ForegroundColor Gray
    Write-Host "   2. Busca 'RFIDGatewayCondominio'" -ForegroundColor Gray
    Write-Host "   3. Haz clic derecho → Iniciar" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
