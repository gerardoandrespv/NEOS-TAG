Write-Host "Probando Relay - Lector THY RFID" -ForegroundColor Cyan
$readerIP = "192.168.1.200"
$readerPort = 60000
$duration = 5000
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect($readerIP, $readerPort)
    Write-Host "Conectado a $readerIP`:$readerPort" -ForegroundColor Green
    
    $stream = $client.GetStream()
    
    # Comando SetRelay: A0 07 94 01 [Duration4bytes] [Checksum2bytes]
    $dur = [BitConverter]::GetBytes([uint32]$duration)
    [byte[]]$cmd = @(0xA0, 0x07, 0x94, 0x01) + $dur
    $sum = 0; for ($i=1; $i -lt $cmd.Length; $i++) { $sum += $cmd[$i] }
    $cmd += [BitConverter]::GetBytes([uint16]($sum -band 0xFFFF))
    
    Write-Host "Enviando comando: $(($cmd | %{'{0:X2}' -f $_}) -join ' ')" -ForegroundColor Gray
    $stream.Write($cmd, 0, $cmd.Length)
    $stream.Flush()
    
    Start-Sleep -Seconds 1
    if ($stream.DataAvailable) {
        $resp = New-Object byte[] 128
        $len = $stream.Read($resp, 0, 128)
        Write-Host "Respuesta: $(($resp[0..($len-1)] | %{'{0:X2}' -f $_}) -join ' ')" -ForegroundColor Cyan
        if ($resp[2] -eq 0) { Write-Host "RELE ACTIVADO!" -ForegroundColor Green }
    } else {
        Write-Host "Sin respuesta (comando puede haberse ejecutado)" -ForegroundColor Yellow
    }
    $stream.Close(); $client.Close()
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
