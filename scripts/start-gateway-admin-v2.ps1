# Script para iniciar el Gateway como Administrador
# Esto permite que la lectora envíe tags vía HTTP

Write-Host "`n🚀 INICIANDO GATEWAY COMO ADMINISTRADOR..." -ForegroundColor Cyan

$gatewayPath = "C:\NeosTech-RFID-System-Pro\src\Gateway"

# Verificar si ya está corriendo
$running = Get-Process | Where-Object { $_.ProcessName -eq 'Rfid_gateway' -or ($_.ProcessName -eq 'dotnet' -and $_.Path -match 'Gateway') }
if ($running) {
    Write-Host "⚠️  Gateway ya está corriendo. Deteniendo..." -ForegroundColor Yellow
    $running | Stop-Process -Force
    Start-Sleep -Seconds 2
}

Write-Host "📂 Cambiando a directorio del Gateway..." -ForegroundColor Gray
Set-Location $gatewayPath

Write-Host "🔨 Compilando Gateway..." -ForegroundColor Yellow
dotnet build --no-restore

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Compilación exitosa" -ForegroundColor Green
    Write-Host "`n🔐 Iniciando como Administrador..." -ForegroundColor Cyan
    Write-Host "ℹ️  Esto permitirá recibir tags vía HTTP desde la lectora" -ForegroundColor Gray
    Write-Host ""
    
    # Ejecutar como administrador
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd '$gatewayPath'; dotnet run"
    
    Write-Host "✅ Gateway iniciado en nueva ventana de administrador" -ForegroundColor Green
    Write-Host "`n📋 INSTRUCCIONES:" -ForegroundColor Cyan
    Write-Host "  1. El Gateway está corriendo en una ventana separada" -ForegroundColor White
    Write-Host "  2. Ahora la lectora PUEDE enviar tags vía HTTP" -ForegroundColor White
    Write-Host "  3. Para detenerlo, cierra la ventana o presiona Ctrl+C" -ForegroundColor White
} else {
    Write-Host "❌ Error en compilación" -ForegroundColor Red
    Write-Host "Revisa los errores arriba" -ForegroundColor Yellow
    pause
}
