# Verificar tags recientes en Firestore
Write-Host "`n=== Verificando tags recientes en Firestore ===" -ForegroundColor Cyan
Write-Host ""

# Usar Firebase CLI para obtener últimos tags
Write-Host "Consultando últimos 5 tags..." -ForegroundColor Yellow

$command = "firebase firestore:get rfid_tags --limit 5 --order-by timestamp desc"

try {
    $result = Invoke-Expression $command 2>&1
    Write-Host $result
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Si no ves tags aquí, el Gateway no está enviando a Firestore ===" -ForegroundColor Yellow
Write-Host ""
