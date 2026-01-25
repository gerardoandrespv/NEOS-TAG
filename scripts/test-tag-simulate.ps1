# Test directo de envío de tag simulado a Firestore
Write-Host "`n=== Test de Tag Simulado ===" -ForegroundColor Cyan
Write-Host ""

# Simular tag detectado - enviar directamente a Cloud Function
$tagData = @{
    tag_id = "E280116060000206F2084E2E"
    reader_id = "porton_triwe"
    reader_serial = "20033445"
    access_point_id = "porton_triwe"
    access_point_name = "Portón Triwe"
    timestamp = [DateTime]::UtcNow.ToString("o")
    client_id = "condominio-neos"
    source = "manual_test"
    user_name = "TEST USUARIO"
    departamento = "TEST 101"
    event_type = "tag_read"
} | ConvertTo-Json

Write-Host "Tag simulado:" -ForegroundColor Yellow
Write-Host $tagData
Write-Host ""

# Probar ambas funciones
$functions = @(
    "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway",
    "https://us-central1-neos-tech.cloudfunctions.net/check-tag-access"
)

foreach ($function in $functions) {
    Write-Host "Probando: $function" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri $function `
            -Method POST `
            -ContentType "application/json" `
            -Body $tagData `
            -TimeoutSec 15
        
        Write-Host "   ✅ Respuesta exitosa:" -ForegroundColor Green
        Write-Host "   $($response | ConvertTo-Json)" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Detalles: $responseBody" -ForegroundColor DarkRed
        }
    }
    Write-Host ""
}

Write-Host "Ahora ve al dashboard (localhost:5004) y verifica si apareció el tag" -ForegroundColor Yellow
Write-Host ""
