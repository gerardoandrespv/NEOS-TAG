# Control de Gateway RFID Neos Tech

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "status", "restart")]
    [string]$Action = "status"
)

$gatewayProcessName = "RFID_Gateway_Process"
$gatewayScriptPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\CSharp-Service\RFID_Gateway_Process.ps1"
$gatewayLogPath = "C:\NeosTech-RFID-System-Pro\logs\gateway_process.log"

# Función para obtener el proceso del gateway
function Get-GatewayProcess {
    return Get-Process -Name "powershell" -ErrorAction SilentlyContinue | 
           Where-Object { $_.MainWindowTitle -like "*RFID*" -or 
                          ($_.CommandLine -like "*RFID_Gateway_Process*" -and $_.CommandLine -notlike "*Control*") }
}

switch ($Action) {
    "start" {
        $existingProcess = Get-GatewayProcess
        if ($existingProcess) {
            Write-Host "⚠️  Gateway ya está ejecutándose (PID: $($existingProcess.Id))" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "🚀 Iniciando Gateway RFID..." -ForegroundColor Cyan
        
        # Iniciar como proceso independiente
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "powershell.exe"
        $psi.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$gatewayScriptPath`""
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $psi.RedirectStandardOutput = $false
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        $process.Start() | Out-Null
        
        Start-Sleep -Seconds 3
        
        # Verificar
        $gatewayProcess = Get-GatewayProcess
        if ($gatewayProcess) {
            Write-Host "✅ Gateway iniciado (PID: $($gatewayProcess.Id))" -ForegroundColor Green
            
            # Verificar health check
            try {
                $health = Invoke-WebRequest -Uri "http://localhost:60000/health" -TimeoutSec 5
                Write-Host "🌐 Health Check: $($health.StatusCode) OK" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Health Check no responde aún" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ No se pudo iniciar el gateway" -ForegroundColor Red
        }
    }
    
    "stop" {
        Write-Host "🛑 Deteniendo Gateway RFID..." -ForegroundColor Cyan
        
        $processes = Get-GatewayProcess
        if ($processes) {
            $processes | ForEach-Object {
                Write-Host "  Deteniendo proceso PID: $($_.Id)" -ForegroundColor Gray
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
            Write-Host "✅ Gateway detenido" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Gateway no estaba ejecutándose" -ForegroundColor Yellow
        }
    }
    
    "restart" {
        & "$PSCommandPath" stop
        Start-Sleep -Seconds 2
        & "$PSCommandPath" start
    }
    
    "status" {
        $processes = Get-GatewayProcess
        
        Write-Host "📊 ESTADO DEL GATEWAY RFID" -ForegroundColor Cyan
        Write-Host "=" * 40
        
        if ($processes) {
            Write-Host "✅ Gateway EN EJECUCIÓN" -ForegroundColor Green
            
            foreach ($process in $processes) {
                Write-Host "  PID: $($process.Id)" -ForegroundColor White
                Write-Host "  Iniciado: $($process.StartTime)" -ForegroundColor Gray
                Write-Host "  Memoria: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Gray
            }
            
            # Probar health check
            try {
                $health = Invoke-WebRequest -Uri "http://localhost:60000/health" -TimeoutSec 3
                Write-Host "  🌐 Health Check: $($health.StatusCode) OK" -ForegroundColor Green
                Write-Host "  📋 Respuesta: $($health.Content)" -ForegroundColor DarkGray
            } catch {
                Write-Host "  ❌ Health Check falló: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Gateway DETENIDO" -ForegroundColor Red
            
            # Verificar si hay algo escuchando en el puerto
            $portCheck = netstat -ano | findstr ":60000" | findstr "LISTENING"
            if ($portCheck) {
                Write-Host "  ⚠️  Puerto 60000 está en uso por otro proceso" -ForegroundColor Yellow
                Write-Host "  $portCheck" -ForegroundColor Gray
            }
        }
        
        # Mostrar logs recientes si existen
        if (Test-Path $gatewayLogPath) {
            Write-Host "`n📝 ÚLTIMOS LOGS:" -ForegroundColor Cyan
            Get-Content $gatewayLogPath -Tail 5 | ForEach-Object {
                Write-Host "  $_" -ForegroundColor DarkGray
            }
        }
    }
}
