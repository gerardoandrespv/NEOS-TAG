# Script para hacer backup de la configuracion del lector RFID THY
# Guarda la configuracion actual del lector en un archivo JSON con timestamp

param(
    [string]$ReaderIP = "192.168.1.200",
    [int]$ReaderPort = 60000
)

Write-Host "=== Backup de Configuracion del Lector RFID ===" -ForegroundColor Cyan
Write-Host "Lector: ${ReaderIP}:${ReaderPort}" -ForegroundColor Yellow

# Crear directorio de backups si no existe
$backupDir = "C:\NeosTech-RFID-System-Pro\config\backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "Directorio de backups creado: $backupDir" -ForegroundColor Green
}

# Timestamp para el nombre del archivo
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir\reader_config_$timestamp.json"

# Leer configuracion actual del gateway (referencia)
$gatewayConfigFile = "C:\NeosTech-RFID-System-Pro\src\Gateway\gateway.config.json"

if (Test-Path $gatewayConfigFile) {
    # Copiar configuracion del gateway como backup
    Copy-Item $gatewayConfigFile $backupFile -Force
    Write-Host "OK - Backup creado: $backupFile" -ForegroundColor Green
    
    # Mostrar resumen
    $config = Get-Content $backupFile | ConvertFrom-Json
    Write-Host "`nResumen de configuracion respaldada:" -ForegroundColor Cyan
    Write-Host "  Client ID: $($config.client_id)" -ForegroundColor White
    Write-Host "  Version: $($config.version)" -ForegroundColor White
    Write-Host "  Puntos de acceso: $($config.access_points.Count)" -ForegroundColor White
    
    foreach ($ap in $config.access_points) {
        Write-Host "    - $($ap.name): $($ap.reader_ip):$($ap.reader_port) (relay: $($ap.open_duration_ms)ms)" -ForegroundColor Gray
    }
    
    Write-Host "`nBackup guardado exitosamente!" -ForegroundColor Green
    Write-Host "Para restaurar, usa: .\scripts\restore-reader-config.ps1 -BackupFile '$backupFile'" -ForegroundColor Yellow
} else {
    Write-Host "ERROR: No se encontro el archivo de configuracion del gateway" -ForegroundColor Red
    exit 1
}

# Crear tambien un backup de la DLL THY
$dllSource = "C:\NeosTech-RFID-System-Pro\src\Gateway\SWNetApi.dll"
$dllBackup = "$backupDir\SWNetApi_$timestamp.dll"

if (Test-Path $dllSource) {
    Copy-Item $dllSource $dllBackup -Force
    Write-Host "OK - DLL respaldada: $dllBackup" -ForegroundColor Green
}

Write-Host "`n=== Backup completado ===" -ForegroundColor Green
