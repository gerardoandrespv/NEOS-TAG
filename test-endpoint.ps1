# Script para probar el endpoint HTTP del Gateway
# Simula que la lectora envía un tag

$gateway_ip = "192.168.1.11"
$gateway_port = "8080"
$tag_id = "E2000017941502181550D17D"  # Tag de prueba
$reader_serial = "TRIWE001"

$url = "http://${gateway_ip}:${gateway_port}/readerid?id=${tag_id}&heart=0&readsn=${reader_serial}"

Write-Host "🧪 Probando endpoint HTTP del Gateway..." -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 5
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host "   StatusCode: $($response.StatusCode)" -ForegroundColor White
    Write-Host "   Content: $($response.Content)" -ForegroundColor White
}
catch {
    Write-Host "❌ Error al contactar el Gateway:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.InnerException) {
        Write-Host "   Detalle: $($_.Exception.InnerException.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "💡 Si ves este mensaje en el Gateway, el endpoint funciona:" -ForegroundColor Cyan
Write-Host "   📨 HTTP GET /readerid?id=..." -ForegroundColor Gray
Write-Host "   🔍 Parámetros recibidos: id=$tag_id" -ForegroundColor Gray
