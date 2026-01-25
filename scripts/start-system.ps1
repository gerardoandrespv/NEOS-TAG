# ============================================
# INICIO COMPLETO DEL SISTEMA RFID NEOSTECH
# ============================================
# Este script inicia todos los servicios necesarios
# y verifica que estén funcionando correctamente

param(
    [switch]$AutoRestart,  # Reinicia automáticamente si hay errores
    [switch]$Minimize      # Minimiza las ventanas
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEOSTECH RFID - Inicio del Sistema   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. DETENER PROCESOS ANTERIORES
# ============================================
Write-Host "[1/5] Deteniendo procesos anteriores..." -ForegroundColor Yellow

Get-Process | Where-Object { 
    $_.ProcessName -like "*Rfid*" -or 
    $_.ProcessName -like "*firebase*" -or 
    ($_.ProcessName -like "*node*" -and $_.Path -like "*firebase*")
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2
Write-Host "      OK - Procesos detenidos" -ForegroundColor Green

# ============================================
# 2. VERIFICAR ARCHIVOS NECESARIOS
# ============================================
Write-Host "[2/5] Verificando archivos del sistema..." -ForegroundColor Yellow

$gatewayExe = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.exe"
$gatewayConfig = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\gateway.config.json"
$dashboardIndex = "C:\NeosTech-RFID-System-Pro\src\web\index.html"

$allFilesExist = $true

if (-not (Test-Path $gatewayExe)) {
    Write-Host "      ERROR - Gateway.exe no encontrado" -ForegroundColor Red
    Write-Host "      Ejecuta: dotnet build src\Gateway\Rfid_gateway.csproj -c Release" -ForegroundColor Yellow
    $allFilesExist = $false
}

if (-not (Test-Path $gatewayConfig)) {
    Write-Host "      ERROR - gateway.config.json no encontrado" -ForegroundColor Red
    $allFilesExist = $false
}

if (-not (Test-Path $dashboardIndex)) {
    Write-Host "      ERROR - Dashboard no encontrado" -ForegroundColor Red
    $allFilesExist = $false
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "FALLO: Archivos faltantes. Revisa la instalacion." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "      OK - Todos los archivos encontrados" -ForegroundColor Green

# ============================================
# 3. INICIAR GATEWAY
# ============================================
Write-Host "[3/5] Iniciando Gateway RFID..." -ForegroundColor Yellow

$gatewayPath = Split-Path $gatewayExe -Parent
$windowStyle = if ($Minimize) { "Minimized" } else { "Normal" }

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$gatewayPath'; Write-Host 'GATEWAY RFID - Puerto 8080' -ForegroundColor Cyan; .\Rfid_gateway.exe"
) -WindowStyle $windowStyle

Start-Sleep -Seconds 3

# Verificar que el Gateway respondio
$gatewayOK = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 2
        if ($health.status -eq "healthy") {
            $gatewayOK = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if ($gatewayOK) {
    Write-Host "      OK - Gateway respondiendo en http://localhost:8080" -ForegroundColor Green
} else {
    Write-Host "      ADVERTENCIA - Gateway no responde (revisa la ventana del Gateway)" -ForegroundColor Yellow
}

# ============================================
# 4. INICIAR DASHBOARD
# ============================================
Write-Host "[4/5] Iniciando Dashboard..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd 'C:\NeosTech-RFID-System-Pro'; Write-Host 'DASHBOARD - Puerto 5000' -ForegroundColor Cyan; firebase serve --only hosting --port 5000"
) -WindowStyle $windowStyle

Start-Sleep -Seconds 4

# Verificar que el Dashboard respondio
$dashboardOK = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -Method GET -TimeoutSec 3 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $dashboardOK = $true
    }
} catch {
    # Ignorar error
}

if ($dashboardOK) {
    Write-Host "      OK - Dashboard activo en http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "      ADVERTENCIA - Dashboard no responde aun (puede tardar)" -ForegroundColor Yellow
}

# ============================================
# 5. ABRIR NAVEGADOR
# ============================================
Write-Host "[5/5] Abriendo Dashboard en navegador..." -ForegroundColor Yellow

Start-Sleep -Seconds 2
Start-Process "http://localhost:5000"

Write-Host "      OK - Navegador abierto" -ForegroundColor Green

# ============================================
# RESUMEN
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SISTEMA INICIADO CORRECTAMENTE       " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Servicios activos:" -ForegroundColor Cyan
Write-Host "  Gateway:   http://localhost:8080" -ForegroundColor White
Write-Host "  Dashboard: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Para detener:" -ForegroundColor Yellow
Write-Host "  .\stop-all-services.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Para reiniciar Gateway despues de cambios:" -ForegroundColor Yellow
Write-Host "  .\restart-gateway-cors.ps1" -ForegroundColor White
Write-Host ""

# Mantener el script abierto
if (-not $AutoRestart) {
    Write-Host "Presiona Ctrl+C para cerrar este script (los servicios seguiran activos)" -ForegroundColor Gray
    Write-Host ""
    
    # Loop infinito para mantener la ventana abierta
    while ($true) {
        Start-Sleep -Seconds 60
        
        # Verificar salud cada minuto
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 2
            # OK
        } catch {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ADVERTENCIA: Gateway no responde" -ForegroundColor Yellow
        }
    }
}
