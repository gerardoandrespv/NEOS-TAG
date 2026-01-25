# Reiniciar Gateway limpiando conexiones al lector
Write-Host "`n=== Reiniciando Gateway RFID ===" -ForegroundColor Cyan
Write-Host ""

# 1. Detener todos los procesos que puedan estar usando el lector
Write-Host "1. Deteniendo procesos que usan el lector..." -ForegroundColor Yellow

# Detener test-reader scripts
Get-Process | Where-Object { $_.MainWindowTitle -like "*TEST*" -or $_.ProcessName -eq "powershell" } | ForEach-Object {
    if ($_.MainWindowTitle -like "*RFID*") {
        Write-Host "   Deteniendo: $($_.MainWindowTitle)" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}

# Detener Gateway actual
Get-Process | Where-Object { $_.ProcessName -eq "Rfid_gateway" } | ForEach-Object {
    Write-Host "   Deteniendo Gateway (PID: $($_.Id))" -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "2. Esperando 3 segundos para liberar recursos..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "3. Iniciando Gateway como Administrador..." -ForegroundColor Yellow

# Iniciar Gateway en nueva ventana como Admin
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", @"
Write-Host '=== RFID Gateway - Modo Administrador ===' -ForegroundColor Green
Write-Host ''
cd 'C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0'
.\Rfid_gateway.exe
"@

Write-Host ""
Write-Host "✅ Gateway iniciado en ventana separada" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora acerca un tag al lector y observa la ventana del Gateway" -ForegroundColor Cyan
Write-Host "Deberías ver mensajes como:" -ForegroundColor Yellow
Write-Host "  🏷️ TAG DETECTADO: E280..." -ForegroundColor Gray
Write-Host "  🔍 Verificando acceso..." -ForegroundColor Gray
Write-Host "  ✅ ACCESO PERMITIDO" -ForegroundColor Gray
Write-Host ""
