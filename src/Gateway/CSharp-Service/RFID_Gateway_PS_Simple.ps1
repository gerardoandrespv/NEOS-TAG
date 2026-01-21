# RFID_Gateway_PS_Simple.ps1 - Gateway RFID 100% PowerShell
# Versión: 1.0 - Compatible con PowerShell 5.1 y 7+
# Condominio Neos Tech

param(
    [string]$Action = "run"
)

# ===== CONFIGURACIÓN =====
$Config = @{
    Port = 60000
    CloudFunctionURL = "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway"
    LogFile = "C:\NeosTech-RFID-System-Pro\logs\gateway.log"
    GatewayName = "RFID Gateway PowerShell"
    Version = "1.0-PS"
}

# ===== FUNCIONES =====
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    # Asegurar que existe la carpeta de logs
    $logDir = Split-Path $Config.LogFile -Parent
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force }
    Add-Content -Path $Config.LogFile -Value $logEntry -ErrorAction SilentlyContinue
}

function Send-ToCloud {
    param([string]$JsonData)
    try {
        Write-Log "📤 Enviando a Cloud Function..."
        $response = Invoke-RestMethod -Uri $Config.CloudFunctionURL -Method Post -Body $JsonData -ContentType "application/json" -TimeoutSec 10
        Write-Log "✅ Cloud Function respondió"
        return $response
    } catch {
        Write-Log "❌ ERROR Cloud Function: $($_.Exception.Message)"
        return @{error = "Cloud function failed"; details = $_.Exception.Message; status = "error"}
    }
}

function Start-HTTPListener {
    Write-Log "🚀 Iniciando Gateway RFID en puerto $($Config.Port)"
    Write-Log "📡 URL: http://localhost:$($Config.Port)/"
    Write-Log "☁️  Cloud Function: $($Config.CloudFunctionURL)"
    
    try {
        # Crear listener HTTP
        $listener = New-Object System.Net.HttpListener
        
        # Agregar prefijo - IMPORTANTE: usar + para todas las IPs
        $listener.Prefixes.Add("http://+:$($Config.Port)/")
        
        # Configurar permisos (ejecutar como Admin una vez)
        try {
            netsh http add urlacl url=http://+:$($Config.Port)/ user=Everyone
            Write-Log "✅ Permisos URL configurados"
        } catch {
            Write-Log "⚠️  Permisos URL pueden ya existir: $_"
        }
        
        # Agregar regla firewall
        try {
            netsh advfirewall firewall add rule name="RFID Gateway $($Config.Port)" dir=in action=allow protocol=TCP localport=$($Config.Port)
            Write-Log "✅ Regla firewall agregada"
        } catch {
            Write-Log "⚠️  Regla firewall puede ya existir"
        }
        
        $listener.Start()
        Write-Log "✅ Gateway LISTO. Esperando lecturas RFID..."
        
        while ($listener.IsListening) {
            try {
                # Esperar conexión
                $context = $listener.GetContext()
                $request = $context.Request
                $response = $context.Response
                
                # Leer cuerpo
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                Write-Log "📥 Solicitud recibida: $($request.Url.LocalPath) - Método: $($request.HttpMethod)"
                
                # ===== RUTAS =====
                # 1. Health Check
                if ($request.Url.LocalPath -eq "/health" -or $request.Url.LocalPath -eq "/") {
                    $healthResponse = @{
                        status = "online"
                        gateway = $Config.GatewayName
                        version = $Config.Version
                        port = $Config.Port
                        cloud_function = "connected"
                        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
                    } | ConvertTo-Json
                    
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($healthResponse)
                    $response.ContentType = "application/json"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    $response.Close()
                    Write-Log "💚 Health Check respondido"
                    continue
                }
                
                # 2. Procesar tag RFID
                if ($request.Url.LocalPath -eq "/process" -or $request.Url.LocalPath -eq "/readerid") {
                    if ($request.HttpMethod -eq "POST") {
                        Write-Log "🏷️  Tag RFID recibido: $body"
                        
                        # Validar JSON
                        try {
                            $jsonData = $body | ConvertFrom-Json
                            
                            # Asegurar que tenga el campo necesario para Cloud Function
                            if (-not $jsonData.PSObject.Properties["id"] -and 
                                -not $jsonData.PSObject.Properties["tag_id"] -and 
                                -not $jsonData.PSObject.Properties["epc"]) {
                                
                                # Agregar campo id si falta
                                $jsonData | Add-Member -MemberType NoteProperty -Name "id" -Value "UNKNOWN_$(Get-Date -Format 'HHmmss')" -Force
                            }
                            
                            # Enviar a Cloud Function
                            $jsonToSend = $jsonData | ConvertTo-Json -Compress
                            $cloudResult = Send-ToCloud -JsonData $jsonToSend
                            
                            # Preparar respuesta
                            $jsonResponse = $cloudResult | ConvertTo-Json -Compress
                        } catch {
                            Write-Log "❌ JSON inválido: $_"
                            $jsonResponse = @{error = "JSON inválido"; message = $_} | ConvertTo-Json -Compress
                        }
                        
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResponse)
                        $response.ContentType = "application/json"
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        $response.Close()
                        
                        Write-Log "📤 Respuesta enviada"
                        continue
                    }
                }
                
                # 3. Ruta no encontrada
                $errorResponse = @{error = "Ruta no encontrada"; path = $request.Url.LocalPath} | ConvertTo-Json
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorResponse)
                $response.StatusCode = 404
                $response.ContentType = "application/json"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                Write-Log "⚠️  Ruta no encontrada: $($request.Url.LocalPath)"
                
            } catch {
                Write-Log "❌ Error en listener: $($_.Exception.Message)"
                if ($response) {
                    try {
                        $errorJson = @{error = "Error interno del servidor"; message = $_.Exception.Message} | ConvertTo-Json
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorJson)
                        $response.StatusCode = 500
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        $response.Close()
                    } catch {}
                }
            }
        }
        
    } catch {
        Write-Log "❌ ERROR CRÍTICO: No se pudo iniciar listener: $_"
        throw $_
    }
}

# ===== MANEJO DE ACCIONES =====
switch ($Action.ToLower()) {
    "run" {
        Write-Host "`n" -NoNewline
        Write-Host "🚀 RFID GATEWAY - CONDOMINIO NEOS TECH" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor DarkCyan
        Write-Host "📡 Puerto: $($Config.Port)" -ForegroundColor Yellow
        Write-Host "☁️  Cloud: $($Config.CloudFunctionURL)" -ForegroundColor Yellow
        Write-Host "📁 Logs: $($Config.LogFile)" -ForegroundColor Yellow
        Write-Host "🛑 Presiona Ctrl+C para detener" -ForegroundColor Red
        Write-Host "`n"
        
        try {
            Start-HTTPListener
        } catch {
            Write-Host "❌ Error fatal: $_" -ForegroundColor Red
            Write-Host "💡 Solución: Ejecutar como Administrador para configurar permisos" -ForegroundColor Yellow
        }
    }
    
    "install-service" {
        Write-Host "🔧 Instalando como servicio Windows..." -ForegroundColor Cyan
        
        # Requiere ejecutar como Administrador
        if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
            Write-Host "❌ Este comando requiere ejecutar como Administrador" -ForegroundColor Red
            Write-Host "💡 Por favor, ejecuta PowerShell como Administrador" -ForegroundColor Yellow
            return
        }
        
        # Detener servicio si existe
        $service = Get-Service -Name "RFIDGateway" -ErrorAction SilentlyContinue
        if ($service) {
            Write-Host "⏹️  Deteniendo servicio existente..." -ForegroundColor Yellow
            Stop-Service RFIDGateway -Force -ErrorAction SilentlyContinue
            sc.exe delete RFIDGateway 2>$null
            Start-Sleep -Seconds 2
        }
        
        # Crear servicio
        $scriptPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\CSharp-Service\RFID_Gateway_PS_Simple.ps1"
        $serviceCommand = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" run"
        
        Write-Host "📝 Creando servicio..." -ForegroundColor Yellow
        sc.exe create RFIDGateway `
            binPath= "$serviceCommand" `
            DisplayName= "RFID Gateway Service" `
            start= auto `
            obj= "LocalSystem" `
            password= ""
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Servicio creado" -ForegroundColor Green
            
            # Configurar recuperación automática
            sc.exe failure RFIDGateway reset= 86400 actions= restart/5000/restart/5000/restart/5000
            
            # Iniciar servicio
            Start-Service RFIDGateway -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            
            $service = Get-Service RFIDGateway -ErrorAction SilentlyContinue
            if ($service.Status -eq "Running") {
                Write-Host "✅ Servicio iniciado correctamente" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Servicio creado pero no iniciado. Intentando iniciar..." -ForegroundColor Yellow
                Start-Service RFIDGateway
            }
            
            Write-Host "`n📊 Comandos útiles:" -ForegroundColor Cyan
            Write-Host "   Ver estado: Get-Service RFIDGateway" -ForegroundColor Gray
            Write-Host "   Iniciar: Start-Service RFIDGateway" -ForegroundColor Gray
            Write-Host "   Detener: Stop-Service RFIDGateway" -ForegroundColor Gray
            Write-Host "   Ver logs: Get-EventLog -LogName Application -Source RFIDGateway -Newest 10" -ForegroundColor Gray
            
        } else {
            Write-Host "❌ Error creando servicio" -ForegroundColor Red
        }
    }
    
    "test" {
        Write-Host "🧪 Modo prueba - Gateway temporal" -ForegroundColor Cyan
        
        # Iniciar en segundo plano
        $job = Start-Job -ScriptBlock {
            param($path)
            & $path run
        } -ArgumentList $MyInvocation.MyCommand.Path
        
        Write-Host "⏳ Esperando 3 segundos para inicialización..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        # Prueba 1: Health Check
        Write-Host "`n🔍 Prueba 1: Health Check..." -ForegroundColor Yellow
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:$($Config.Port)/health" -TimeoutSec 2
            Write-Host "✅ Health Check: $($health.status)" -ForegroundColor Green
            Write-Host "   Gateway: $($health.gateway)" -ForegroundColor Gray
            Write-Host "   Puerto: $($health.port)" -ForegroundColor Gray
        } catch {
            Write-Host "❌ Health Check falló: $_" -ForegroundColor Red
        }
        
        # Prueba 2: Envío de tag
        Write-Host "`n🔍 Prueba 2: Envío de tag RFID..." -ForegroundColor Yellow
        try {
            $testData = @{
                epc = "TEST_PS_$(Get-Random -Minimum 100000 -Maximum 999999)"
                reader_sn = "READER_PS_01"
                gateway_version = "condominio_powershell_1.0"
                timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fff")
            } | ConvertTo-Json
            
            Write-Host "📤 Enviando: $testData" -ForegroundColor Gray
            
            $response = Invoke-RestMethod -Uri "http://localhost:$($Config.Port)/process" `
                -Method Post `
                -Body $testData `
                -ContentType "application/json" `
                -TimeoutSec 5
                
            Write-Host "✅ Tag procesado:" -ForegroundColor Green
            $response | ConvertTo-Json | Write-Host -ForegroundColor Green
        } catch {
            Write-Host "❌ Envío de tag falló: $_" -ForegroundColor Red
        }
        
        # Prueba 3: Ruta incorrecta
        Write-Host "`n🔍 Prueba 3: Ruta incorrecta..." -ForegroundColor Yellow
        try {
            $badResponse = Invoke-RestMethod -Uri "http://localhost:$($Config.Port)/badroute" -TimeoutSec 2
        } catch {
            Write-Host "✅ Correcto: Ruta no existe (404)" -ForegroundColor Green
        }
        
        # Detener job
        Stop-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job -Force -ErrorAction SilentlyContinue
        Write-Host "`n🧪 Pruebas completadas" -ForegroundColor Cyan
    }
    
    "status" {
        Write-Host "📊 Estado del Gateway RFID" -ForegroundColor Cyan
        Write-Host "==============================" -ForegroundColor DarkCyan
        
        # Servicio
        $service = Get-Service -Name "RFIDGateway" -ErrorAction SilentlyContinue
        if ($service) {
            Write-Host "🛠️  Servicio:" -NoNewline
            if ($service.Status -eq "Running") {
                Write-Host " $($service.Status)" -ForegroundColor Green -NoNewline
            } else {
                Write-Host " $($service.Status)" -ForegroundColor Red -NoNewline
            }
            Write-Host " (Inicio: $($service.StartType))" -ForegroundColor Gray
        } else {
            Write-Host "🛠️  Servicio: No instalado" -ForegroundColor Yellow
        }
        
        # Puerto
        Write-Host "`n📡 Puerto $($Config.Port):" -NoNewline
        $portTest = Test-NetConnection -ComputerName localhost -Port $Config.Port -WarningAction SilentlyContinue 2>$null
        if ($portTest.TcpTestSucceeded) {
            Write-Host " ABIERTO" -ForegroundColor Green
        } else {
            Write-Host " CERRADO" -ForegroundColor Red
        }
        
        # Logs
        Write-Host "`n📁 Logs:" -NoNewline
        if (Test-Path $Config.LogFile) {
            $logSize = (Get-Item $Config.LogFile).Length / 1KB
            Write-Host " $($Config.LogFile)" -ForegroundColor Gray
            Write-Host "   Tamaño: $([math]::Round($logSize,2)) KB" -ForegroundColor Gray
            # Mostrar últimas 3 líneas
            $lastLines = Get-Content $Config.LogFile -Tail 3 -ErrorAction SilentlyContinue
            if ($lastLines) {
                Write-Host "   Últimas líneas:" -ForegroundColor Gray
                $lastLines | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
            }
        } else {
            Write-Host " No existen logs aún" -ForegroundColor Yellow
        }
        
        # Cloud Function
        Write-Host "`n☁️  Cloud Function:" -NoNewline
        try {
            $test = @{id="HEALTH_CHECK_$(Get-Date -Format 'HHmmss')"; reader_sn="STATUS_CHECK"} | ConvertTo-Json
            $cfResponse = Invoke-RestMethod -Uri $Config.CloudFunctionURL -Method Post -Body $test -TimeoutSec 3
            Write-Host " RESPONDE" -ForegroundColor Green -NoNewline
            Write-Host " ($($cfResponse.status))" -ForegroundColor Gray
        } catch {
            Write-Host " NO RESPONDE" -ForegroundColor Red
            Write-Host "   Error: $_" -ForegroundColor DarkRed
        }
        
        # Dashboard
        Write-Host "`n📊 Dashboard:" -NoNewline
        $dashboardPath = "C:\NeosTech-RFID-System-Pro\frontend\dashboard\index.html"
        if (Test-Path $dashboardPath) {
            Write-Host " Disponible" -ForegroundColor Green
            Write-Host "   Ruta: $dashboardPath" -ForegroundColor Gray
        } else {
            Write-Host " No encontrado" -ForegroundColor Yellow
        }
    }
    
    "help" {
        Write-Host "🎯 RFID Gateway PowerShell - Condominio Neos Tech" -ForegroundColor Cyan
        Write-Host "==================================================" -ForegroundColor DarkCyan
        Write-Host ""
        Write-Host "Comandos disponibles:" -ForegroundColor Yellow
        Write-Host "  run           - Ejecutar gateway en consola (Ctrl+C para detener)" -ForegroundColor White
        Write-Host "  install-service - Instalar como servicio Windows (requiere Admin)" -ForegroundColor White
        Write-Host "  test          - Probar funcionalidad completa" -ForegroundColor White
        Write-Host "  status        - Ver estado del sistema" -ForegroundColor White
        Write-Host "  help          - Mostrar esta ayuda" -ForegroundColor White
        Write-Host ""
        Write-Host "📌 Ejemplos:" -ForegroundColor Gray
        Write-Host "  .\RFID_Gateway_PS_Simple.ps1 run" -ForegroundColor DarkGray
        Write-Host "  .\RFID_Gateway_PS_Simple.ps1 install-service" -ForegroundColor DarkGray
        Write-Host "  .\RFID_Gateway_PS_Simple.ps1 test" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "📁 Logs: $($Config.LogFile)" -ForegroundColor Gray
        Write-Host "📡 Puerto: $($Config.Port)" -ForegroundColor Gray
        Write-Host "☁️  Cloud: $($Config.CloudFunctionURL)" -ForegroundColor Gray
    }
    
    default {
        Write-Host "❌ Acción desconocida: $Action" -ForegroundColor Red
        Write-Host "💡 Usa: .\$($MyInvocation.MyCommand.Name) help" -ForegroundColor Yellow
    }
}
