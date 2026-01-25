# Test Live Tag Detection and Relay Activation
# Este script simula un tag RFID y prueba el botón Triwe

Write-Host "`n=== Test de Sistema RFID ===" -ForegroundColor Cyan
Write-Host ""

# 1. Probar botón Triwe - Enviar comando al Gateway
Write-Host "1. Probando apertura manual del portón Triwe..." -ForegroundColor Yellow
try {
    $openResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/open" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"access_point": "porton_triwe"}' `
        -TimeoutSec 10
    
    Write-Host "   ✅ Gateway respondió correctamente" -ForegroundColor Green
    Write-Host "   Respuesta: $($openResponse | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Error al enviar comando: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. Simular lectura de tag (enviar directamente a Firebase vía Cloud Function)
Write-Host "2. Simulando lectura de tag RFID..." -ForegroundColor Yellow
$tagData = @{
    tag_id = "E280116060000206F2084E2E"
    reader_id = "porton_triwe"
    reader_serial = "20033445"
    timestamp = [DateTimeOffset]::UtcNow.ToString("o")
    client_id = "condominio-neos"
    source = "test_script"
} | ConvertTo-Json

try {
    $cloudFunction = "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway"
    Write-Host "   Enviando a Cloud Function..." -ForegroundColor Gray
    
    $tagResponse = Invoke-RestMethod -Uri $cloudFunction `
        -Method POST `
        -ContentType "application/json" `
        -Body $tagData `
        -TimeoutSec 15
    
    Write-Host "   ✅ Tag enviado exitosamente" -ForegroundColor Green
    Write-Host "   Respuesta: $($tagResponse | ConvertTo-Json)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   🏷️ Revisa el dashboard - deberías ver el tag en tiempo real!" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Error al enviar tag: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Fin del test ===" -ForegroundColor Cyan
Write-Host ""
