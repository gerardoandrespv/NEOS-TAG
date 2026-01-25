# NeosTech RFID System - Configuracion Automatica de Red

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   CONFIGURACION AUTOMATICA DE RED" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# 1. Detectar IP local
Write-Host "[1/4] Detectando configuracion de red..." -ForegroundColor Yellow
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*"
}).IPAddress | Select-Object -First 1

if ($localIP) {
    Write-Host "OK IP Local detectada: $localIP" -ForegroundColor Green
    $networkSegment = $localIP -replace '\.\d+$', ''
    Write-Host "OK Segmento de red: $networkSegment.x" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA No se detecto IP local" -ForegroundColor Yellow
    $localIP = "127.0.0.1"
}

# 2. Buscar lector RFID
Write-Host "`n[2/4] Buscando lector RFID..." -ForegroundColor Yellow
$readerIPs = @("192.168.1.200", "192.168.1.101")
$foundReaders = @()

foreach ($ip in $readerIPs) {
    Write-Host "   Probando $ip... " -NoNewline -ForegroundColor Gray
    $ping = Test-NetConnection $ip -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($ping) {
        Write-Host "OK ACCESIBLE" -ForegroundColor Green
        $foundReaders += $ip
    } else {
        Write-Host "X No responde" -ForegroundColor Red
    }
}

if ($foundReaders.Count -gt 0) {
    Write-Host "OK Se encontraron $($foundReaders.Count) lector(es)" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA No se encontraron lectores RFID" -ForegroundColor Yellow
}

# 3. Configurar permisos HTTP
Write-Host "`n[3/4] Configurando permisos del servidor HTTP..." -ForegroundColor Yellow

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    try {
        $existingAcl = netsh http show urlacl url=http://+:60000/ 2>&1
        
        if ($existingAcl -like "*Reserved URL*") {
            Write-Host "OK Permisos ya configurados" -ForegroundColor Green
        } else {
            netsh http add urlacl url=http://+:60000/ user=Everyone | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "OK Permisos HTTP configurados" -ForegroundColor Green
            } else {
                Write-Host "ADVERTENCIA No se pudieron configurar permisos" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "ADVERTENCIA Error configurando permisos" -ForegroundColor Yellow
    }
} else {
    Write-Host "ADVERTENCIA No tienes permisos de Administrador" -ForegroundColor Yellow
    Write-Host "   El Gateway solo sera accesible desde localhost" -ForegroundColor Gray
}

# 4. Guardar configuracion
Write-Host "`n[4/4] Configuracion completada..." -ForegroundColor Yellow
Write-Host "OK Listo" -ForegroundColor Green

# Resumen
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   RESUMEN" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " IP Local:              $localIP" -ForegroundColor White
Write-Host " Lectores encontrados:  $($foundReaders.Count)" -ForegroundColor White
foreach ($reader in $foundReaders) {
    Write-Host "   - $reader" -ForegroundColor Green
}
if ($isAdmin) { 
    Write-Host " Permisos HTTP:         Configurados" -ForegroundColor Green
} else { 
    Write-Host " Permisos HTTP:         Solo localhost" -ForegroundColor Yellow
}
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "Ahora puedes iniciar el Gateway con:" -ForegroundColor White
Write-Host "  .\restart-gateway-cors.ps1`n" -ForegroundColor Cyan
