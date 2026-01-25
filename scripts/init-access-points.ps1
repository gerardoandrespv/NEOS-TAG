# Inicializar Puntos de Acceso en Firestore
# NeosTech RFID System v6.0

Write-Host "`n=== INICIALIZACION DE PUNTOS DE ACCESO ===" -ForegroundColor Cyan
Write-Host "Configurando puntos de acceso en Firestore...`n" -ForegroundColor Yellow

# Leer configuración del gateway
$config = Get-Content "src/gateway/gateway.config.json" | ConvertFrom-Json

Write-Host "Puntos de acceso configurados:" -ForegroundColor Green
Write-Host ""

$accessPoints = @()

foreach ($ap in $config.access_points) {
    Write-Host "  $($ap.id.PadRight(20)) $($ap.name)" -ForegroundColor White
    Write-Host "    Tipo: $($ap.type.PadRight(10)) IP: $($ap.reader_ip):$($ap.reader_port)" -ForegroundColor DarkGray
    Write-Host "    Duracion: $($ap.open_duration_ms)ms" -ForegroundColor DarkGray
    Write-Host ""
    
    $accessPoints += @{
        id = $ap.id
        name = $ap.name
        type = $ap.type
        reader_ip = $ap.reader_ip
        reader_port = $ap.reader_port
        relay_channel = $ap.relay_channel
        open_duration_ms = $ap.open_duration_ms
        enabled = $true
        created_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    }
}

Write-Host "Total: $($accessPoints.Count) puntos de acceso" -ForegroundColor Green
Write-Host ""

# Generar archivo JSON para importar a Firestore
$firestoreData = @{
    access_points = $accessPoints
}

$outputPath = "config/access_points_firestore.json"
$firestoreData | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "Archivo generado: $outputPath" -ForegroundColor Green
Write-Host ""
Write-Host "Para importar a Firestore:" -ForegroundColor Yellow
Write-Host "  1. Abrir Firebase Console: https://console.firebase.google.com/" -ForegroundColor White
Write-Host "  2. Ir a Firestore Database" -ForegroundColor White
Write-Host "  3. Crear coleccion 'access_points'" -ForegroundColor White
Write-Host "  4. Agregar documentos manualmente con los datos de arriba" -ForegroundColor White
Write-Host ""
Write-Host "O usar Firebase CLI:" -ForegroundColor Yellow
Write-Host "  firebase firestore:delete --all-collections" -ForegroundColor DarkGray
Write-Host "  # (Cuidado: borra todo)" -ForegroundColor DarkGray
Write-Host ""

# Mostrar ejemplo de estructura
Write-Host "Ejemplo de documento Firestore:" -ForegroundColor Yellow
Write-Host ""
Write-Host "access_points/" -ForegroundColor Cyan
Write-Host "  porton_principal/" -ForegroundColor Green
Write-Host "    {" -ForegroundColor DarkGray
Write-Host '      "name": "Porton Principal",' -ForegroundColor DarkGray
Write-Host '      "type": "gate",' -ForegroundColor DarkGray
Write-Host '      "reader_ip": "192.168.1.100",' -ForegroundColor DarkGray
Write-Host '      "reader_port": 8080,' -ForegroundColor DarkGray
Write-Host '      "relay_channel": 1,' -ForegroundColor DarkGray
Write-Host '      "open_duration_ms": 3000,' -ForegroundColor DarkGray
Write-Host '      "enabled": true' -ForegroundColor DarkGray
Write-Host "    }" -ForegroundColor DarkGray
Write-Host ""
Write-Host "LISTO" -ForegroundColor Green
Write-Host ""
