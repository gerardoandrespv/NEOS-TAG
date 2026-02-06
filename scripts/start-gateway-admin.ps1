#Requires -RunAsAdministrator

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAR E INICIAR GATEWAY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Cerrar procesos existentes
Write-Host "[1/4] Cerrando procesos Gateway..." -ForegroundColor Yellow
$existing = Get-Process dotnet -ErrorAction SilentlyContinue
if ($existing) {
    $existing | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "      OK Procesos cerrados" -ForegroundColor Green
} else {
    Write-Host "      OK No hay procesos previos" -ForegroundColor Green
}

# Paso 2: Configurar permisos de red
Write-Host ""
Write-Host "[2/4] Configurando permisos de red..." -ForegroundColor Yellow

# Eliminar reserva anterior si existe
netsh http delete urlacl url=http://+:8080/ 2>$null | Out-Null

# Agregar reserva para Todos los usuarios
$result = netsh http add urlacl url=http://+:8080/ sddl=D:(A;;GX;;;WD) 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "      OK Permisos configurados (todas las IPs)" -ForegroundColor Green
} else {
    Write-Host "      Advertencia: $result" -ForegroundColor Yellow
}

# Paso 3: Configurar firewall
Write-Host ""
Write-Host "[3/4] Configurando firewall..." -ForegroundColor Yellow

# Eliminar regla anterior si existe
Remove-NetFirewallRule -DisplayName "RFID Gateway Port 8080" -ErrorAction SilentlyContinue | Out-Null

# Crear regla
New-NetFirewallRule -DisplayName "RFID Gateway Port 8080" `
                    -Direction Inbound `
                    -LocalPort 8080 `
                    -Protocol TCP `
                    -Action Allow `
                    -ErrorAction SilentlyContinue | Out-Null

if ($?) {
    Write-Host "      OK Regla de firewall creada" -ForegroundColor Green
} else {
    Write-Host "      Advertencia: Regla de firewall no creada" -ForegroundColor Yellow
}

# Paso 4: Compilar Gateway
Write-Host ""
Write-Host "[4/4] Compilando y ejecutando Gateway..." -ForegroundColor Yellow
Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway"

$buildResult = dotnet build --configuration Release --no-restore 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR en compilacion" -ForegroundColor Red
    Write-Host $buildResult
    Read-Host "Enter para salir"
    exit 1
}
Write-Host "      OK Compilacion exitosa" -ForegroundColor Green

# Iniciar en background
$DllPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.dll"
$WorkingDir = "C:\NeosTech-RFID-System-Pro\src\Gateway"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "dotnet"
$psi.Arguments = """$DllPath"""
$psi.WorkingDirectory = $WorkingDir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

$process = [System.Diagnostics.Process]::Start($psi)
Write-Host "      OK Gateway iniciado en background" -ForegroundColor Green
Write-Host "         PID: $($process.Id)" -ForegroundColor Gray

# Verificar
Write-Host ""
Write-Host "Verificando inicio..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

$proc = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "  OK Proceso corriendo - PID: $($proc.Id)" -ForegroundColor Green
    Write-Host "  Memoria: $([math]::Round($proc.WS/1MB, 2)) MB" -ForegroundColor Gray
    
    # Probar endpoint en localhost
    Write-Host ""
    Write-Host "Probando endpoints..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    $tests = @(
        @{Name="localhost"; Url="http://localhost:8080/api/lectora/config"},
        @{Name="192.168.1.11"; Url="http://192.168.1.11:8080/api/lectora/config"}
    )
    
    foreach ($test in $tests) {
        try {
            $config = Invoke-RestMethod -Uri $test.Url -TimeoutSec 5 -ErrorAction Stop
            Write-Host "  OK $($test.Name): Responde correctamente" -ForegroundColor Green
            if ($test.Name -eq "192.168.1.11") {
                Write-Host "     RemoteIP: $($config.RemoteIP):$($config.RemotePort)" -ForegroundColor Gray
                Write-Host "     WorkMode: $($config.WorkMode)" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  ADVERTENCIA $($test.Name): No responde" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ERROR: Proceso termino inesperadamente" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GATEWAY CONFIGURADO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Estado:" -ForegroundColor White
Write-Host "  - Gateway corriendo en background" -ForegroundColor Gray
Write-Host "  - Escuchando en todas las interfaces (http://+:8080/)" -ForegroundColor Gray
Write-Host "  - Firewall configurado" -ForegroundColor Gray
Write-Host ""
Write-Host "Acceso:" -ForegroundColor Cyan
Write-Host "  - Local: http://localhost:8080" -ForegroundColor White
Write-Host "  - Red: http://192.168.1.11:8080" -ForegroundColor White
Write-Host "  - Dashboard: https://neos-tech.web.app" -ForegroundColor White
Write-Host ""
Write-Host "Gestionar Gateway:" -ForegroundColor Cyan
Write-Host "  - Ver proceso: Get-Process dotnet" -ForegroundColor White
Write-Host "  - Detener: Get-Process dotnet | Stop-Process -Force" -ForegroundColor White
Write-Host "  - Reiniciar: Ejecutar este script nuevamente" -ForegroundColor White
Write-Host ""
Read-Host "Presiona Enter para salir"
