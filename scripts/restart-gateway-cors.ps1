# Script para reiniciar el Gateway despues de cambios de codigo
# Primero deten el Gateway presionando Ctrl+C en su ventana

Write-Host "=== Recompilando Gateway con CORS ===" -ForegroundColor Cyan

# Compilar
dotnet build C:\NeosTech-RFID-System-Pro\src\Gateway\Rfid_gateway.csproj -c Release

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Compilacion exitosa" -ForegroundColor Green
    
    # Copiar DLL y configuracion
    $binPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0"
    
    Write-Host "Copiando archivos necesarios..." -ForegroundColor Yellow
    
    if (Test-Path "C:\NeosTech-RFID-System-Pro\src\Gateway\SWNetApi.dll") {
        Copy-Item "C:\NeosTech-RFID-System-Pro\src\Gateway\SWNetApi.dll" "$binPath\SWNetApi.dll" -Force
        Write-Host "  OK - SWNetApi.dll copiado" -ForegroundColor Green
    }
    
    Copy-Item "C:\NeosTech-RFID-System-Pro\src\Gateway\gateway.config.json" "$binPath\gateway.config.json" -Force
    Write-Host "  OK - gateway.config.json copiado" -ForegroundColor Green
    
    # Verificar que el archivo de configuracion tiene puntos de acceso
    $config = Get-Content "$binPath\gateway.config.json" | ConvertFrom-Json
    $apCount = $config.access_points.Count
    Write-Host "  OK - Configuracion cargada: $apCount puntos de acceso" -ForegroundColor Green
    
    Write-Host "`n=== Iniciando Gateway ===" -ForegroundColor Green
    Write-Host "Servidor HTTP en http://localhost:8080" -ForegroundColor Cyan
    Write-Host "CORS habilitado para dashboard" -ForegroundColor Cyan
    Write-Host "Presiona Ctrl+C para detener`n" -ForegroundColor Yellow
    
    # Cambiar al directorio bin para que encuentre el config
    Set-Location "$binPath"
    
    # Ejecutar
    dotnet C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.dll
} else {
    Write-Host "`n❌ Error en compilacion" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
}

