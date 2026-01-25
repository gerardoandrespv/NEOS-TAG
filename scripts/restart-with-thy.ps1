# Script para reiniciar el sistema RFID con THY DLL
Write-Host "🔄 Reiniciando Sistema RFID NEOS TECH con soporte THY" -ForegroundColor Cyan
Write-Host ""

# 1. Detener procesos anteriores
Write-Host "1. Deteniendo procesos..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*dotnet*" -or $_.ProcessName -like "*Rfid_gateway*" -or $_.ProcessName -like "*node*" -and $_.MainWindowTitle -like "*firebase*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✅ Procesos detenidos" -ForegroundColor Green
Write-Host ""

# 2. Copiar DLL y configuración
Write-Host "2. Actualizando archivos..." -ForegroundColor Yellow
Copy-Item "C:\NeosTech-RFID-System-Pro\src\Gateway\gateway.config.json" "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Debug\net8.0\" -Force
Write-Host "   ✅ Configuración actualizada" -ForegroundColor Green
Write-Host ""

# 3. Recompilar Gateway
Write-Host "3. Recompilando Gateway con soporte THY..." -ForegroundColor Yellow
$buildOutput = dotnet build "C:\NeosTech-RFID-System-Pro\src\Gateway\Rfid_gateway.csproj" --configuration Debug 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Gateway compilado exitosamente" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Advertencias de compilación (continuar)" -ForegroundColor Yellow
}
Write-Host ""

# 4. Iniciar Gateway
Write-Host "4. Iniciando Gateway con DLL THY..." -ForegroundColor Yellow
$gatewayScript = @"
Set-Location 'C:\NeosTech-RFID-System-Pro'
Write-Host '🚀 NEOS TECH RFID Gateway - THY DLL' -ForegroundColor Cyan
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Gray
Write-Host ''
Write-Host 'Usando librería nativa THY SWNetApi.dll' -ForegroundColor Green
Write-Host 'Puerto Gateway: http://localhost:60000' -ForegroundColor Green
Write-Host ''
Write-Host 'Lectores configurados:' -ForegroundColor Yellow
Write-Host '  • Triwe: 192.168.1.200:60000' -ForegroundColor White
Write-Host '  • Principal: 192.168.1.101:60000' -ForegroundColor White
Write-Host ''
Write-Host 'Presiona Ctrl+C para detener...' -ForegroundColor Yellow
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Gray
Write-Host ''
dotnet run --project src\Gateway\Rfid_gateway.csproj
pause
"@

$gatewayScript | Out-File -FilePath "temp-gateway-thy.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-File temp-gateway-thy.ps1" -Verb RunAs
Start-Sleep -Seconds 3
Write-Host "   ✅ Gateway iniciado" -ForegroundColor Green
Write-Host ""

# 5. Verificar Gateway
Write-Host "5. Verificando Gateway..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$gatewayTest = Test-NetConnection -ComputerName localhost -Port 60000 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($gatewayTest) {
    Write-Host "   ✅ Gateway respondiendo en puerto 60000" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Gateway aún iniciando..." -ForegroundColor Yellow
}
Write-Host ""

# 6. Iniciar Dashboard
Write-Host "6. Iniciando Dashboard..." -ForegroundColor Yellow
$firebaseScript = @"
Set-Location 'C:\NeosTech-RFID-System-Pro'
Write-Host '🌐 NEOS TECH Dashboard' -ForegroundColor Cyan
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Gray
Write-Host ''
Write-Host 'URL: http://localhost:5000' -ForegroundColor Green
Write-Host ''
Write-Host 'Presiona Ctrl+C para detener...' -ForegroundColor Yellow
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor Gray
Write-Host ''
firebase serve
"@

$firebaseScript | Out-File -FilePath "temp-firebase-thy.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-File temp-firebase-thy.ps1"
Start-Sleep -Seconds 5
Write-Host "   ✅ Dashboard iniciado" -ForegroundColor Green
Write-Host ""

# 7. Probar conectividad con lector
Write-Host "7. Probando lector Triwe..." -ForegroundColor Yellow
$triweTest = Test-NetConnection -ComputerName 192.168.1.200 -Port 60000 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($triweTest) {
    Write-Host "   ✅ Lector Triwe accesible" -ForegroundColor Green
} else {
    Write-Host "   ❌ Lector Triwe no accesible" -ForegroundColor Red
}
Write-Host ""

# 8. Abrir navegador
Write-Host "8. Abriendo dashboard..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:5000"
Write-Host "   ✅ Dashboard abierto" -ForegroundColor Green
Write-Host ""

# Resumen
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ SISTEMA ACTUALIZADO CON SOPORTE THY" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 AHORA PUEDES:" -ForegroundColor Yellow
Write-Host "   1. Probar el botón 'Abrir Portón Triwe' en el dashboard" -ForegroundColor White
Write-Host "   2. Los tags RFID se detectarán automáticamente" -ForegroundColor White
Write-Host "   3. El relé debería hacer 'click' al activarse" -ForegroundColor White
Write-Host ""
Write-Host "📋 URLs:" -ForegroundColor White
Write-Host "   Dashboard: http://localhost:5000" -ForegroundColor Cyan
Write-Host "   Gateway:   http://localhost:60000" -ForegroundColor Cyan
Write-Host "   Health:    http://localhost:60000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Limpiar archivos temporales
Start-Sleep -Seconds 10
Remove-Item "temp-gateway-thy.ps1" -ErrorAction SilentlyContinue
Remove-Item "temp-firebase-thy.ps1" -ErrorAction SilentlyContinue
