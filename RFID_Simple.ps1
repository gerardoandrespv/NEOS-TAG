# Gateway RFID Simplificado - Solo funcionalidad esencial
$port = 60000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

Write-Host "🚀 Gateway RFID iniciado en puerto $port"
Write-Host "📡 Health: http://localhost:$port/health"
Write-Host "🛑 Ctrl+C para detener`n"

$listener.Start()

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    # Health Check
    if ($request.Url.LocalPath -eq "/health") {
        $json = @{status="online";port=$port;timestamp=(Get-Date -Format "yyyy-MM-ddTHH:mm:ss")} | ConvertTo-Json
        $buffer = [Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }
    
    # Procesar RFID
    if ($request.Url.LocalPath -eq "/process" -and $request.HttpMethod -eq "POST") {
        $reader = New-Object System.IO.StreamReader($request.InputStream)
        $body = $reader.ReadToEnd()
        $reader.Close()
        
        # Enviar a Cloud Function
        try {
            $cfResponse = Invoke-RestMethod -Uri "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway" `
                -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
            $jsonResponse = $cfResponse | ConvertTo-Json
        } catch {
            $jsonResponse = @{error="Cloud error";message=$_.Exception.Message} | ConvertTo-Json
        }
        
        $buffer = [Text.Encoding]::UTF8.GetBytes($jsonResponse)
        $response.ContentType = "application/json"
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }
    
    # 404
    $errorJson = @{error="Not found"} | ConvertTo-Json
    $buffer = [Text.Encoding]::UTF8.GetBytes($errorJson)
    $response.StatusCode = 404
    $response.ContentType = "application/json"
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.Close()
}
