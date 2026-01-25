# Servidor web simple y estable para el dashboard
# Opción 1: Python (más estable y simple)
# Opción 2: Node.js http-server (si Python no está disponible)

Write-Host "`n=== Iniciando servidor web local ===" -ForegroundColor Cyan
Write-Host ""

# Cambiar a directorio del dashboard
Set-Location "C:\NeosTech-RFID-System-Pro\src\web"

# Intentar con Python primero (más estable)
$pythonPath = (Get-Command python -ErrorAction SilentlyContinue)

if ($pythonPath) {
    Write-Host "✅ Python encontrado - Usando servidor HTTP de Python" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Dashboard disponible en: http://localhost:5004" -ForegroundColor Cyan
    Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
    Write-Host ""
    
    # Servidor HTTP de Python en puerto 5004
    python -m http.server 5004
}
else {
    Write-Host "⚠️ Python no encontrado - Intentando con Node.js..." -ForegroundColor Yellow
    
    # Verificar si http-server está instalado
    $httpServer = (Get-Command http-server -ErrorAction SilentlyContinue)
    
    if ($httpServer) {
        Write-Host "✅ http-server encontrado" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Dashboard disponible en: http://localhost:5004" -ForegroundColor Cyan
        Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
        Write-Host ""
        
        http-server -p 5004 -c-1
    }
    else {
        Write-Host "❌ http-server no está instalado" -ForegroundColor Red
        Write-Host ""
        Write-Host "Instalando http-server..." -ForegroundColor Yellow
        npm install -g http-server
        
        Write-Host ""
        Write-Host "🌐 Dashboard disponible en: http://localhost:5004" -ForegroundColor Cyan
        Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
        Write-Host ""
        
        http-server -p 5004 -c-1
    }
}
