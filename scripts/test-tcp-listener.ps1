# Test TCP Listener - Ver si la lectora envía datos automáticamente

Write-Host "=== Listener TCP - Puerto 60000 ===" -ForegroundColor Cyan
Write-Host "Esperando datos de la lectora 192.168.1.200..." -ForegroundColor Yellow
Write-Host "Pasa un tag por la lectora..." -ForegroundColor Yellow
Write-Host ""

try {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, 60001)
    $listener.Start()
    Write-Host "✓ Listener iniciado en puerto 60001" -ForegroundColor Green
    Write-Host "Esperando conexión..." -ForegroundColor Cyan
    
    $timeout = 30
    $stopwatch = [Diagnostics.Stopwatch]::StartNew()
    
    while ($stopwatch.Elapsed.TotalSeconds -lt $timeout) {
        if ($listener.Pending()) {
            $client = $listener.AcceptTcpClient()
            Write-Host "✓ Conexión recibida de $($client.Client.RemoteEndPoint)" -ForegroundColor Green
            
            $stream = $client.GetStream()
            $buffer = New-Object byte[] 1024
            
            while ($client.Connected) {
                if ($stream.DataAvailable) {
                    $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
                    if ($bytesRead -gt 0) {
                        $hex = ($buffer[0..($bytesRead-1)] | ForEach-Object { $_.ToString("X2") }) -join " "
                        $ascii = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
                        
                        Write-Host ""
                        Write-Host "📨 DATOS RECIBIDOS ($bytesRead bytes):" -ForegroundColor Green
                        Write-Host "HEX: $hex" -ForegroundColor White
                        Write-Host "ASCII: $ascii" -ForegroundColor Gray
                    }
                }
                Start-Sleep -Milliseconds 100
            }
            
            $client.Close()
        }
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host ""
    Write-Host "❌ Timeout - No se recibieron conexiones" -ForegroundColor Yellow
    $listener.Stop()
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
