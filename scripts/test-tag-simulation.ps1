# Script de prueba para simular lectura de tags RFID
# Útil para probar el sistema sin depender del hardware

Write-Host "=== SIMULADOR DE TAGS RFID ===" -ForegroundColor Cyan
Write-Host ""

$tags = @(
    "E280689400005029C42B9C0C",
    "E280689400005029C42B9C0D",
    "E280689400005029C42B9C0E"
)

Write-Host "Tags disponibles para simular:" -ForegroundColor Yellow
for ($i = 0; $i -lt $tags.Length; $i++) {
    Write-Host "  [$($i+1)] $($tags[$i])" -ForegroundColor White
}
Write-Host ""

while ($true) {
    Write-Host "Selecciona tag a enviar (1-3) o 'q' para salir: " -NoNewline -ForegroundColor Cyan
    $input = Read-Host
    
    if ($input -eq 'q') {
        break
    }
    
    $index = [int]$input - 1
    if ($index -ge 0 -and $index -lt $tags.Length) {
        $tag = $tags[$index]
        Write-Host "Enviando tag: $tag" -ForegroundColor Green
        
        try {
            $body = @{
                id = $tag
                readsn = "porton_triwe"
                client_id = "condominio-neos"
                gateway_id = $env:COMPUTERNAME
                timestamp = (Get-Date).ToUniversalTime().ToString("o")
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
            
            Write-Host "Respuesta: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
        } catch {
            Write-Host "Error: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Opción inválida" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "Simulación finalizada" -ForegroundColor Gray
