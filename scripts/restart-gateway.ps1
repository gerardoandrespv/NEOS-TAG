# Script para detener Gateway antiguo, compilar y reiniciar
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REINICIANDO GATEWAY CON NUEVA CONFIG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Detener Gateway antiguo (PID 23024)
Write-Host "[1/4] Deteniendo Gateway antiguo..." -ForegroundColor Yellow
$gatewayProcess = Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue
if ($gatewayProcess) {
    Write-Host "      Encontrado PID: $($gatewayProcess.Id)" -ForegroundColor Gray
    try {
        # Intentar detener amablemente primero
        Stop-Process -Name "Rfid_gateway" -Force -ErrorAction Stop
        Write-Host "      ✓ Gateway detenido correctamente" -ForegroundColor Green
    } catch {
        Write-Host "      ⚠ No se pudo detener (requiere Admin): $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "SOLUCIÓN: Ve a la ventana donde corre el Gateway y presiona Ctrl+C" -ForegroundColor Yellow
        Write-Host "          Luego ejecuta este script nuevamente." -ForegroundColor Yellow
        Read-Host "Presiona Enter para salir"
        exit 1
    }
} else {
    Write-Host "      ✓ No hay Gateway corriendo" -ForegroundColor Green
}

# Esperar a que el archivo se desbloquee
Start-Sleep -Seconds 3

# Paso 2: Compilar nuevo código
Write-Host ""
Write-Host "[2/4] Compilando Gateway con nuevos endpoints..." -ForegroundColor Yellow
Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway"
$buildResult = dotnet build --no-restore 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "      ✓ Compilación exitosa" -ForegroundColor Green
} else {
    Write-Host "      ✗ Error en compilación:" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Paso 3: Desplegar dashboard actualizado a Firebase
Write-Host ""
Write-Host "[3/4] Desplegando dashboard con panel de config lectora..." -ForegroundColor Yellow
Set-Location "C:\NeosTech-RFID-System-Pro"
Copy-Item "src\web\index.html" "firebase-hosting\index.html" -Force
Write-Host "      ✓ Archivo copiado a firebase-hosting/" -ForegroundColor Green

# Paso 4: Iniciar Gateway con nuevo código
Write-Host ""
Write-Host "[4/4] Iniciando Gateway..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GATEWAY LISTO CON NUEVOS ENDPOINTS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GET  /api/lectora/config           → Obtener configuración" -ForegroundColor White
Write-Host "  POST /api/lectora/config           → Actualizar configuración" -ForegroundColor White
Write-Host "  POST /api/lectora/config/refresh   → Sincronizar desde lectora" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando Gateway en modo Administrador..." -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detenerlo" -ForegroundColor Yellow
Write-Host ""

Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway"
dotnet run
