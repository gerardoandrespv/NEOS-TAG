# Script para restaurar la configuracion del lector RFID THY desde un backup
# Restaura la configuracion de un archivo de backup al sistema

param(
    [string]$BackupFile = ""
)

Write-Host "=== Restaurar Configuracion del Lector RFID ===" -ForegroundColor Cyan

# Si no se especifica archivo, mostrar backups disponibles
$backupDir = "C:\NeosTech-RFID-System-Pro\config\backups"

if ($BackupFile -eq "") {
    Write-Host "`nBackups disponibles:" -ForegroundColor Yellow
    
    if (Test-Path $backupDir) {
        $backups = Get-ChildItem "$backupDir\reader_config_*.json" | Sort-Object LastWriteTime -Descending
        
        if ($backups.Count -eq 0) {
            Write-Host "No hay backups disponibles." -ForegroundColor Red
            Write-Host "Ejecuta .\scripts\backup-reader-config.ps1 para crear uno." -ForegroundColor Yellow
            exit 1
        }
        
        for ($i = 0; $i -lt $backups.Count; $i++) {
            $backup = $backups[$i]
            Write-Host "  [$i] $($backup.Name) - $($backup.LastWriteTime)" -ForegroundColor White
        }
        
        Write-Host "`nUsa: .\scripts\restore-reader-config.ps1 -BackupFile <ruta_del_backup>" -ForegroundColor Yellow
        Write-Host "O selecciona un numero (0-$($backups.Count - 1)): " -NoNewline -ForegroundColor Yellow
        $selection = Read-Host
        
        if ($selection -match '^\d+$' -and [int]$selection -ge 0 -and [int]$selection -lt $backups.Count) {
            $BackupFile = $backups[[int]$selection].FullName
        } else {
            Write-Host "Seleccion invalida." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "No existe el directorio de backups." -ForegroundColor Red
        exit 1
    }
}

# Verificar que el archivo de backup existe
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Archivo de backup no encontrado: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "`nRestaurando desde: $BackupFile" -ForegroundColor Cyan

# Leer el backup
$config = Get-Content $BackupFile | ConvertFrom-Json

Write-Host "Configuracion a restaurar:" -ForegroundColor Yellow
Write-Host "  Client ID: $($config.client_id)" -ForegroundColor White
Write-Host "  Version: $($config.version)" -ForegroundColor White
Write-Host "  Puntos de acceso: $($config.access_points.Count)" -ForegroundColor White

foreach ($ap in $config.access_points) {
    Write-Host "    - $($ap.name): $($ap.reader_ip):$($ap.reader_port) (relay: $($ap.open_duration_ms)ms)" -ForegroundColor Gray
}

Write-Host "`nDeseas continuar? (S/N): " -NoNewline -ForegroundColor Yellow
$confirm = Read-Host

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Restauracion cancelada." -ForegroundColor Yellow
    exit 0
}

# Restaurar configuracion
$gatewayConfigFile = "C:\NeosTech-RFID-System-Pro\src\Gateway\gateway.config.json"

# Hacer backup del archivo actual antes de sobrescribir
if (Test-Path $gatewayConfigFile) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $preRestoreBackup = "$backupDir\pre_restore_$timestamp.json"
    Copy-Item $gatewayConfigFile $preRestoreBackup -Force
    Write-Host "Backup del archivo actual guardado en: $preRestoreBackup" -ForegroundColor Green
}

# Copiar el backup al archivo de configuracion
Copy-Item $BackupFile $gatewayConfigFile -Force
Write-Host "OK - Configuracion restaurada!" -ForegroundColor Green

# Copiar tambien a los directorios de build
$debugPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Debug\net8.0\gateway.config.json"
$releasePath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\gateway.config.json"

if (Test-Path (Split-Path $debugPath)) {
    Copy-Item $BackupFile $debugPath -Force
    Write-Host "OK - Configuracion actualizada en Debug" -ForegroundColor Green
}

if (Test-Path (Split-Path $releasePath)) {
    Copy-Item $BackupFile $releasePath -Force
    Write-Host "OK - Configuracion actualizada en Release" -ForegroundColor Green
}

Write-Host "`n=== Restauracion completada ===" -ForegroundColor Green
Write-Host "Reinicia el Gateway para aplicar los cambios:" -ForegroundColor Yellow
Write-Host "  C:\NeosTech-RFID-System-Pro\restart-gateway-cors.ps1" -ForegroundColor Cyan
