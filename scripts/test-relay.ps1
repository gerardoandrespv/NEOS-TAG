# Script de prueba para activar el relé del lector RFID THY
Write-Host "🔧 Probando Activación de Relé - Lector THY RFID" -ForegroundColor Cyan
Write-Host ""

# Configuración
$readerIP = "192.168.1.200"
$readerPort = 60000
$relayChannel = 1
$duration = 5000  # 5 segundos

Write-Host "📡 Configuración:" -ForegroundColor Yellow
Write-Host "   IP: $readerIP" -ForegroundColor White
Write-Host "   Puerto: $readerPort" -ForegroundColor White
Write-Host "   Canal Relé: $relayChannel" -ForegroundColor White
Write-Host "   Duración: $($duration)ms" -ForegroundColor White
Write-Host ""

# Verificar conectividad
Write-Host "1️⃣ Verificando conectividad..." -ForegroundColor Yellow
$pingTest = Test-NetConnection -ComputerName $readerIP -Port $readerPort -InformationLevel Quiet -WarningAction SilentlyContinue

if ($pingTest) {
    Write-Host "   ✅ Lector accesible en $readerIP`:$readerPort" -ForegroundColor Green
} else {
    Write-Host "   ❌ No se puede conectar al lector" -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

# Intentar conexión TCP y enviar comando
Write-Host "2️⃣ Conectando al lector..." -ForegroundColor Yellow

try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.ReceiveTimeout = 5000
    $client.SendTimeout = 5000
    $client.Connect($readerIP, $readerPort)
    Write-Host "   ✅ Conexión TCP establecida" -ForegroundColor Green
    
    $stream = $client.GetStream()
    
    Write-Host ""
    Write-Host "3️⃣ Activando relé..." -ForegroundColor Yellow
    
    # Comando SetRelay según protocolo THY:
    # Header: A0
    # Length: 07 (1 cmd + 1 relay + 4 duration = 6, + 1 = 7)
    # Command: 94 (SetRelay)
    # RelayNo: 01
    # Duration: 5 segundos = 1388 hex = 88 13 00 00 (little endian)
    # Checksum: suma de bytes desde Length hasta Duration
    
    $durationBytes = [BitConverter]::GetBytes([uint32]$duration)
    
    # Construir comando manualmente
    [byte[]]$cmd = @(
        0xA0,                    # Header
        0x07,                    # Length
        0x94,                    # Command (SetRelay)
        $relayChannel            # Relay number
    )
    
    # Agregar duración (4 bytes little-endian)
    $cmd += $durationBytes
    
    # Calcular checksum
    $checksum = 0
    for ($i = 1; $i -lt $cmd.Length; $i++) {
        $checksum += $cmd[$i]
    }
    
    # Agregar checksum (2 bytes little-endian)
    $checksumBytes = [BitConverter]::GetBytes([uint16]($checksum -band 0xFFFF))
    $cmd += $checksumBytes
    
    # Mostrar comando
    $hexCmd = ($cmd | ForEach-Object { "{0:X2}" -f $_ }) -join " "
    Write-Host "   Comando HEX: $hexCmd" -ForegroundColor Gray
    Write-Host "   Longitud: $($cmd.Length) bytes" -ForegroundColor Gray
    
    # Enviar comando
    $stream.Write($cmd, 0, $cmd.Length)
    $stream.Flush()
    
    Write-Host "   ✅ Comando enviado al lector" -ForegroundColor Green
    Write-Host ""
    Write-Host "   ⏳ Esperando respuesta..." -ForegroundColor Yellow
    
    # Esperar respuesta
    Start-Sleep -Milliseconds 1000
    
    if ($stream.DataAvailable) {
        $responseBytes = New-Object byte[] 256
        $bytesRead = $stream.Read($responseBytes, 0, 256)
        
        if ($bytesRead -gt 0) {
            $hexResponse = ($responseBytes[0..($bytesRead-1)] | ForEach-Object { "{0:X2}" -f $_ }) -join " "
            Write-Host "   📡 Respuesta recibida ($bytesRead bytes):" -ForegroundColor Cyan
            Write-Host "      $hexResponse" -ForegroundColor Gray
            
            # Verificar respuesta
            # Formato típico: A0 03 00 [Checksum]
            # Byte 0: Header (A0)
            # Byte 1: Length (03)
            # Byte 2: Status (00 = éxito)
            
            if ($bytesRead >= 3) {
                $status = $responseBytes[2]
                
                if ($status -eq 0x00) {
                    Write-Host ""
                    Write-Host "   🎉 ¡ÉXITO! Relé activado correctamente" -ForegroundColor Green
                    Write-Host "   🔊 Deberías escuchar un 'click' del relé" -ForegroundColor Yellow
                    Write-Host "   ⏱️  Duración: $($duration / 1000) segundos" -ForegroundColor Yellow
                } elseif ($status -eq 0x01) {
                    Write-Host ""
                    Write-Host "   ⚠️  Error: Comando inválido" -ForegroundColor Red
                } elseif ($status -eq 0x02) {
                    Write-Host ""
                    Write-Host "   ⚠️  Error: Parámetros incorrectos" -ForegroundColor Red
                } else {
                    Write-Host ""
                    Write-Host "   ⚠️  Estado desconocido: 0x$($status.ToString('X2'))" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "   ⚠️  Sin respuesta del lector" -ForegroundColor Yellow
        Write-Host "   💡 Esto puede ser normal si el comando se ejecutó" -ForegroundColor Gray
    }
    
    $stream.Close()
    $client.Close()
    Write-Host ""
    Write-Host "   ✅ Conexión cerrada" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Detalles:" -ForegroundColor Gray
    Write-Host "   $($_.Exception.ToString())" -ForegroundColor DarkGray
} finally {
    if ($client -and $client.Connected) {
        $client.Close()
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Prueba completada" -ForegroundColor Green
Write-Host ""
Write-Host "💡 VERIFICACIÓN:" -ForegroundColor Yellow
Write-Host "   1. ¿Escuchaste un 'click' del relé?" -ForegroundColor White
Write-Host "   2. ¿Se abrió el portón?" -ForegroundColor White
Write-Host "   3. Si no funcionó, verifica:" -ForegroundColor White
Write-Host "      - Conexión física del relé" -ForegroundColor Gray
Write-Host "      - Número de canal correcto (1-4)" -ForegroundColor Gray
Write-Host "      - Voltaje del portón" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

pause
