# Script para iniciar Gateway en segundo plano
# Este script inicia el Gateway como proceso oculto en background

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  INICIANDO GATEWAY EN BACKGROUND" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Cerrar procesos existentes
Write-Host "[1/3] Cerrando instancias anteriores..." -ForegroundColor Yellow
$existing = Get-Process dotnet -ErrorAction SilentlyContinue | Where-Object {
    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    $cmdLine -like "*Rfid_gateway.dll*"
}

if ($existing) {
    $existing | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "      OK Instancias cerradas" -ForegroundColor Green
} else {
    Write-Host "      OK No hay instancias previas" -ForegroundColor Green
}

# Compilar
Write-Host ""
Write-Host "[2/3] Compilando Gateway..." -ForegroundColor Yellow
Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway"
$buildResult = dotnet build --configuration Release --no-restore 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "      OK Compilacion exitosa" -ForegroundColor Green
} else {
    Write-Host "      ERROR en compilacion" -ForegroundColor Red
    Write-Host $buildResult
    Read-Host "Enter para salir"
    exit 1
}

# Iniciar en background
Write-Host ""
Write-Host "[3/3] Iniciando Gateway en background..." -ForegroundColor Yellow

$DllPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.dll"
$WorkingDir = "C:\NeosTech-RFID-System-Pro\src\Gateway"

# Crear proceso oculto
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "dotnet"
$psi.Arguments = """$DllPath"""
$psi.WorkingDirectory = $WorkingDir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

$process = [System.Diagnostics.Process]::Start($psi)

Write-Host "      OK Gateway iniciado" -ForegroundColor Green
Write-Host "      PID: $($process.Id)" -ForegroundColor Gray

# Esperar y verificar
Write-Host ""
Write-Host "Verificando inicio..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

$proc = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "  OK Proceso corriendo - PID: $($proc.Id)" -ForegroundColor Green
    Write-Host "  Memoria: $([math]::Round($proc.WS/1MB, 2)) MB" -ForegroundColor Gray
    
    # Probar endpoint
    Write-Host ""
    Write-Host "Probando endpoint..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    try {
        $config = Invoke-RestMethod -Uri "http://192.168.1.11:8080/api/lectora/config" -TimeoutSec 10
        Write-Host "  OK Endpoint responde!" -ForegroundColor Green
        Write-Host "    RemoteIP: $($config.RemoteIP):$($config.RemotePort)" -ForegroundColor Gray
        Write-Host "    WorkMode: $($config.WorkMode)" -ForegroundColor Gray
    } catch {
        Write-Host "  ADVERTENCIA: Endpoint aun no responde" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "  ERROR: Proceso termino inesperadamente" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GATEWAY EN EJECUCION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "El Gateway esta corriendo en segundo plano" -ForegroundColor White
Write-Host ""
Write-Host "Para detenerlo:" -ForegroundColor Cyan
Write-Host "  Get-Process dotnet | Stop-Process -Force" -ForegroundColor White
Write-Host ""
Write-Host "Para ver procesos:" -ForegroundColor Cyan
Write-Host "  Get-Process dotnet" -ForegroundColor White
Write-Host ""
Write-Host "Dashboard: https://neos-tech.web.app" -ForegroundColor Cyan
Write-Host ""
