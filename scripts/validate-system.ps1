# Script de Validacion del Sistema RFID
# Verifica que todo este configurado correctamente

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VALIDACION DEL SISTEMA RFID          " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOK = $true

# 1. Verificar archivos
Write-Host "[1] Verificando archivos del sistema..." -ForegroundColor Yellow

$files = @{
    "Gateway.exe" = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.exe"
    "Gateway Config" = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\gateway.config.json"
    "Gateway DLL" = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\SWNetApi.dll"
    "Dashboard" = "C:\NeosTech-RFID-System-Pro\src\web\index.html"
}

foreach ($item in $files.GetEnumerator()) {
    if (Test-Path $item.Value) {
        Write-Host "    OK - $($item.Key)" -ForegroundColor Green
    } else {
        Write-Host "    ERROR - $($item.Key) no encontrado" -ForegroundColor Red
        Write-Host "           $($item.Value)" -ForegroundColor Gray
        $allOK = $false
    }
}

# 2. Verificar Gateway corriendo
Write-Host ""
Write-Host "[2] Verificando servicios activos..." -ForegroundColor Yellow

$gatewayProcess = Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue
if ($gatewayProcess) {
    Write-Host "    OK - Gateway proceso activo (PID: $($gatewayProcess.Id))" -ForegroundColor Green
    
    # Verificar API
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 2
        if ($health.status -eq "healthy") {
            Write-Host "    OK - Gateway API respondiendo (Puerto 8080)" -ForegroundColor Green
            Write-Host "         Client: $($health.client_id)" -ForegroundColor Gray
            Write-Host "         Version: $($health.version)" -ForegroundColor Gray
        } else {
            Write-Host "    ERROR - Gateway API estado invalido" -ForegroundColor Red
            $allOK = $false
        }
    } catch {
        Write-Host "    ERROR - Gateway API no responde en puerto 8080" -ForegroundColor Red
        $allOK = $false
    }
} else {
    Write-Host "    ADVERTENCIA - Gateway no esta corriendo" -ForegroundColor Yellow
    Write-Host "                  Ejecuta: .\start-system.ps1" -ForegroundColor Gray
}

# 3. Verificar Dashboard
$nodeProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*firebase*" }
if ($nodeProcess) {
    Write-Host "    OK - Dashboard proceso activo" -ForegroundColor Green
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000" -Method GET -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "    OK - Dashboard accesible (Puerto 5000)" -ForegroundColor Green
        }
    } catch {
        Write-Host "    ERROR - Dashboard no responde en puerto 5000" -ForegroundColor Red
        $allOK = $false
    }
} else {
    Write-Host "    ADVERTENCIA - Dashboard no esta corriendo" -ForegroundColor Yellow
    Write-Host "                  Ejecuta: .\start-system.ps1" -ForegroundColor Gray
}

# 4. Verificar red
Write-Host ""
Write-Host "[3] Verificando conectividad de red..." -ForegroundColor Yellow

# Obtener IP local
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" 
} | Select-Object -First 1).IPAddress

if ($localIP) {
    Write-Host "    OK - IP Local: $localIP" -ForegroundColor Green
} else {
    Write-Host "    ADVERTENCIA - No se detecto IP local" -ForegroundColor Yellow
}

# Verificar lector RFID
$readerIP = "192.168.1.200"
$readerPort = 60000

$pingResult = Test-NetConnection -ComputerName $readerIP -Port $readerPort -WarningAction SilentlyContinue

if ($pingResult.TcpTestSucceeded) {
    Write-Host "    OK - Lector RFID accesible en $readerIP:$readerPort" -ForegroundColor Green
} else {
    Write-Host "    ERROR - Lector RFID no accesible en $readerIP:$readerPort" -ForegroundColor Red
    Write-Host "            Verifica que el lector este encendido y en la misma red" -ForegroundColor Gray
    $allOK = $false
}

# 5. Verificar configuracion
Write-Host ""
Write-Host "[4] Verificando configuracion..." -ForegroundColor Yellow

$configPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\gateway.config.json"
if (Test-Path $configPath) {
    try {
        $config = Get-Content $configPath | ConvertFrom-Json
        $apCount = $config.access_points.Count
        Write-Host "    OK - Configuracion cargada" -ForegroundColor Green
        Write-Host "         Puntos de acceso: $apCount" -ForegroundColor Gray
        
        foreach ($ap in $config.access_points) {
            Write-Host "         - $($ap.name): $($ap.reader_ip):$($ap.reader_port)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "    ERROR - Configuracion invalida" -ForegroundColor Red
        $allOK = $false
    }
}

# 6. Test de relay
Write-Host ""
Write-Host "[5] Probando activacion de relay..." -ForegroundColor Yellow

if ($gatewayProcess) {
    try {
        $body = @{ access_point = 'porton_triwe' } | ConvertTo-Json
        $result = Invoke-RestMethod -Uri 'http://localhost:8080/api/open' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 10
        
        if ($result.status -eq "success") {
            Write-Host "    OK - Relay activado correctamente" -ForegroundColor Green
            Write-Host "         $($result.message)" -ForegroundColor Gray
        } else {
            Write-Host "    ERROR - Relay no se pudo activar" -ForegroundColor Red
            $allOK = $false
        }
    } catch {
        Write-Host "    ERROR - Fallo al probar relay: $_" -ForegroundColor Red
        $allOK = $false
    }
} else {
    Write-Host "    OMITIDO - Gateway no esta activo" -ForegroundColor Yellow
}

# RESUMEN
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allOK) {
    Write-Host "  SISTEMA OK - TODO FUNCIONANDO         " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "El sistema esta listo para usar." -ForegroundColor Green
    Write-Host "Dashboard: http://localhost:5000" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "  ERRORES ENCONTRADOS                    " -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa los errores arriba y ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\start-system.ps1" -ForegroundColor White
    Write-Host ""
}

Read-Host "Presiona Enter para salir"
