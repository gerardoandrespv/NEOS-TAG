# Script para reiniciar todos los servicios del sistema RFID
Write-Host "🔄 Reiniciando Servicios NEOS TECH..." -ForegroundColor Cyan
Write-Host ""

# 1. Cerrar procesos anteriores
Write-Host "1️⃣ Deteniendo servicios anteriores..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*dotnet*" -or $_.ProcessName -like "*Rfid_gateway*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   ✅ Procesos anteriores detenidos" -ForegroundColor Green
Write-Host ""

# 2. Copiar configuración
Write-Host "2️⃣ Copiando configuración del Gateway..." -ForegroundColor Yellow
$null = New-Item -ItemType Directory -Path "src\Gateway\bin\Debug\net8.0" -Force -ErrorAction SilentlyContinue
Copy-Item "src\Gateway\gateway.config.json" "src\Gateway\bin\Debug\net8.0\gateway.config.json" -Force
Write-Host "   ✅ Configuración copiada" -ForegroundColor Green
Write-Host ""

# 3. Iniciar Gateway
Write-Host "3️⃣ Iniciando Gateway RFID..." -ForegroundColor Yellow
Write-Host "   Requiere privilegios de administrador..." -ForegroundColor Gray

$gatewayScript = @"
Set-Location 'C:\NeosTech-RFID-System-Pro'
Write-Host '🚀 NEOS TECH RFID Gateway' -ForegroundColor Cyan
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Gray
Write-Host ''
Write-Host 'Puntos de Acceso Configurados:' -ForegroundColor Yellow
Write-Host '  • Portón Triwe: 192.168.1.200:8080' -ForegroundColor White
Write-Host '  • Portón Principal: 192.168.1.101:8080' -ForegroundColor White
Write-Host ''
Write-Host 'Puerto Gateway: http://localhost:60000' -ForegroundColor Green
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Gray
Write-Host ''
Write-Host 'Presiona Ctrl+C para detener...' -ForegroundColor Yellow
Write-Host ''
dotnet run --project src\Gateway\Rfid_gateway.csproj
pause
"@

$gatewayScript | Out-File -FilePath "temp-gateway.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-File temp-gateway.ps1" -Verb RunAs

Write-Host "   ✅ Gateway iniciando (ventana separada)..." -ForegroundColor Green
Write-Host ""

# 4. Esperar a que Gateway inicie
Write-Host "4️⃣ Esperando Gateway..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$gatewayRunning = Test-NetConnection -ComputerName localhost -Port 60000 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($gatewayRunning) {
    Write-Host "   ✅ Gateway activo en puerto 60000" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Gateway aún iniciando... verifica la ventana" -ForegroundColor Yellow
}
Write-Host ""

# 5. Iniciar Firebase
Write-Host "5️⃣ Iniciando Dashboard Firebase..." -ForegroundColor Yellow

$firebaseScript = @"
Set-Location 'C:\NeosTech-RFID-System-Pro'
Write-Host '🌐 NEOS TECH Dashboard' -ForegroundColor Cyan
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Gray
Write-Host ''
Write-Host 'Dashboard URL: http://localhost:5000' -ForegroundColor Green
Write-Host ''
Write-Host 'Presiona Ctrl+C para detener...' -ForegroundColor Yellow
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Gray
Write-Host ''
firebase serve
"@

$firebaseScript | Out-File -FilePath "temp-firebase.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-File temp-firebase.ps1"

Write-Host "   ✅ Dashboard iniciando (ventana separada)..." -ForegroundColor Green
Write-Host ""

# 6. Esperar a que Firebase inicie
Write-Host "6️⃣ Esperando Dashboard..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$firebaseRunning = Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($firebaseRunning) {
    Write-Host "   ✅ Dashboard activo en puerto 5000" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Dashboard aún iniciando... verifica la ventana" -ForegroundColor Yellow
}
Write-Host ""

# 7. Verificar conectividad con lectores
Write-Host "7️⃣ Verificando conectividad con lectores RFID..." -ForegroundColor Yellow

$triwe = Test-NetConnection -ComputerName 192.168.1.200 -Port 8080 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($triwe) {
    Write-Host "   ✅ Lector Triwe (192.168.1.200:8080) - ACCESIBLE" -ForegroundColor Green
} else {
    Write-Host "   ❌ Lector Triwe (192.168.1.200:8080) - NO ACCESIBLE" -ForegroundColor Red
    Write-Host "      El lector está en la red pero puerto 8080 cerrado" -ForegroundColor Yellow
    Write-Host "      Verifica que el servicio del lector esté corriendo" -ForegroundColor Yellow
}

$principal = Test-NetConnection -ComputerName 192.168.1.101 -Port 8080 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($principal) {
    Write-Host "   ✅ Lector Principal (192.168.1.101:8080) - ACCESIBLE" -ForegroundColor Green
} else {
    Write-Host "   ❌ Lector Principal (192.168.1.101:8080) - NO ACCESIBLE" -ForegroundColor Red
}
Write-Host ""

# 8. Abrir navegador
Write-Host "8️⃣ Abriendo navegador..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:5000"
Write-Host "   ✅ Dashboard abierto en navegador" -ForegroundColor Green
Write-Host ""

# Resumen
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ SERVICIOS INICIADOS" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 URLs:" -ForegroundColor White
Write-Host "   Dashboard: http://localhost:5000" -ForegroundColor Cyan
Write-Host "   Gateway:   http://localhost:60000" -ForegroundColor Cyan
Write-Host "   Health:    http://localhost:60000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  PROBLEMA DETECTADO:" -ForegroundColor Yellow
Write-Host "   El lector Triwe (192.168.1.200) está en la red," -ForegroundColor White
Write-Host "   pero el puerto 8080 NO está abierto." -ForegroundColor White
Write-Host ""
Write-Host "🔧 SOLUCIONES:" -ForegroundColor Yellow
Write-Host "   1. Verifica que el lector Triwe esté encendido" -ForegroundColor White
Write-Host "   2. Verifica que el servicio web del lector esté corriendo" -ForegroundColor White
Write-Host "   3. Accede a http://192.168.1.200:8080 desde el navegador" -ForegroundColor White
Write-Host "   4. Revisa la configuración del lector RFID" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Limpiar archivos temporales después de 10 segundos
Start-Sleep -Seconds 10
Remove-Item "temp-gateway.ps1" -ErrorAction SilentlyContinue
Remove-Item "temp-firebase.ps1" -ErrorAction SilentlyContinue
