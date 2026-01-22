# Script de Prueba de Relays - NeosTech RFID
# Fecha: 21 de Enero de 2026

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  PRUEBA DE RELAYS - PORTONES NEOS" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

$gatewayUrl = "http://localhost:60000"

function Test-GatewayHealth {
    Write-Host "Verificando Gateway..." -ForegroundColor Cyan
    
    try {
        $health = Invoke-RestMethod -Uri "$gatewayUrl/health" -Method GET -TimeoutSec 3
        Write-Host "  OK Gateway operativo" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ERROR Gateway no responde" -ForegroundColor Red
        return $false
    }
}

function Test-GateRelay {
    param(
        [string]$AccessPointId,
        [string]$AccessPointName
    )
    
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Probando: $AccessPointName" -ForegroundColor Yellow
    
    try {
        $body = @{ access_point = $AccessPointId } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$gatewayUrl/api/open" `
                                       -Method POST `
                                       -ContentType "application/json" `
                                       -Body $body `
                                       -TimeoutSec 5
        
        Write-Host "  OK Relay activado correctamente" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Inicio de pruebas
Write-Host "Iniciando pruebas de relays...`n" -ForegroundColor White

$gatewayRunning = Test-GatewayHealth

if (-not $gatewayRunning) {
    Write-Host "`nGateway no disponible - Inicia el Gateway primero`n" -ForegroundColor Yellow
    Write-Host "  Comando: cd src/Gateway ; dotnet run`n" -ForegroundColor Gray
    exit 1
}

Write-Host "`nEjecutando pruebas con Gateway real...`n" -ForegroundColor Green

# Prueba 1: Porton Triwe
Write-Host "`n--- PRUEBA 1: PORTON TRIWE ---" -ForegroundColor Cyan
$test1 = Test-GateRelay -AccessPointId "porton_triwe" -AccessPointName "Porton Triwe"
Start-Sleep -Seconds 2

# Prueba 2: Porton Principal
Write-Host "`n--- PRUEBA 2: PORTON PRINCIPAL ---" -ForegroundColor Cyan
$test2 = Test-GateRelay -AccessPointId "porton_principal" -AccessPointName "Porton Principal"

# Resumen
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "   RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if ($test1) {
    Write-Host "  OK Porton Triwe: OPERATIVO" -ForegroundColor Green
} else {
    Write-Host "  ERROR Porton Triwe: FALLO" -ForegroundColor Red
}

if ($test2) {
    Write-Host "  OK Porton Principal: OPERATIVO" -ForegroundColor Green
} else {
    Write-Host "  ERROR Porton Principal: FALLO" -ForegroundColor Red
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "   PRUEBAS COMPLETADAS" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Verifica los logs del Gateway" -ForegroundColor White
Write-Host "  2. Revisa Firestore Console (access_events)" -ForegroundColor White
Write-Host "  3. Prueba desde el Dashboard Web`n" -ForegroundColor White
