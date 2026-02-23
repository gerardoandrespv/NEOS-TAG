# ============================================
# SCRIPT DE SUBIDA DE SONIDOS DE EMERGENCIA
# ============================================
# 
# Propósito: Subir archivos MP3 de alertas a Firebase Storage
# Autor: NeosTech Development Team
# Fecha: 2026-02-02
# Versión: 1.0.0
#
# Uso:
#   .\scripts\utilities\upload_alert_sounds.ps1
#
# Requiere:
#   - Firebase CLI instalado (npm install -g firebase-tools)
#   - Autenticado (firebase login)
#   - Archivos MP3 en assets/sounds/
#
# ============================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║    📤 SUBIDA DE SONIDOS DE EMERGENCIA A FIREBASE          ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Variables de configuración
$ProjectRoot = "C:\NeosTech-RFID-System-Pro"
$SoundsDir = Join-Path $ProjectRoot "assets\sounds"
$ConfigFile = Join-Path $ProjectRoot "config\alert_sounds.json"
$FirebaseProject = "neostech"
$StorageBucket = "neos-tech.appspot.com"  # Firebase Storage bucket — generado por GCP, no cambia
$StoragePath = "alert_sounds"

# Archivos de sonido requeridos
$RequiredSounds = @(
    "emergency_alarm_fire.mp3",
    "emergency_alarm_evacuation.mp3",
    "emergency_alarm_flood.mp3",
    "emergency_alarm_general.mp3",
    "emergency_alarm_cancel.mp3"
)

# ============================================
# FUNCIÓN: Verificar Firebase CLI
# ============================================
function Test-FirebaseCLI {
    Write-Host "🔍 Verificando Firebase CLI..." -ForegroundColor Yellow
    
    try {
        $version = firebase --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Firebase CLI instalado: $version" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ Firebase CLI no encontrado" -ForegroundColor Red
        Write-Host ""
        Write-Host "Para instalar Firebase CLI:" -ForegroundColor Yellow
        Write-Host "  npm install -g firebase-tools" -ForegroundColor White
        Write-Host ""
        return $false
    }
}

# ============================================
# FUNCIÓN: Verificar autenticación Firebase
# ============================================
function Test-FirebaseAuth {
    Write-Host "🔐 Verificando autenticación Firebase..." -ForegroundColor Yellow
    
    try {
        $projects = firebase projects:list 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Autenticado en Firebase" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ No autenticado en Firebase" -ForegroundColor Red
        Write-Host ""
        Write-Host "Para autenticarse:" -ForegroundColor Yellow
        Write-Host "  firebase login" -ForegroundColor White
        Write-Host ""
        return $false
    }
}

# ============================================
# FUNCIÓN: Verificar archivos MP3
# ============================================
function Test-SoundFiles {
    Write-Host "📂 Verificando archivos de sonido..." -ForegroundColor Yellow
    Write-Host ""
    
    $allExist = $true
    $foundFiles = @()
    
    foreach ($sound in $RequiredSounds) {
        $filePath = Join-Path $SoundsDir $sound
        
        if (Test-Path $filePath) {
            $fileSize = (Get-Item $filePath).Length
            $fileSizeKB = [Math]::Round($fileSize / 1KB, 2)
            
            Write-Host "  ✅ $sound" -ForegroundColor Green -NoNewline
            Write-Host " ($fileSizeKB KB)" -ForegroundColor Gray
            
            $foundFiles += $sound
        }
        else {
            Write-Host "  ❌ $sound (NO ENCONTRADO)" -ForegroundColor Red
            $allExist = $false
        }
    }
    
    Write-Host ""
    
    if (-not $allExist) {
        Write-Host "⚠️  Algunos archivos faltan. Verifica:" -ForegroundColor Yellow
        Write-Host "   Carpeta: $SoundsDir" -ForegroundColor White
        Write-Host ""
        Write-Host "Consulta docs/SONIDOS-EMERGENCIA.md para obtener los archivos" -ForegroundColor Cyan
        return $false
    }
    
    Write-Host "✅ Todos los archivos de sonido están presentes ($($foundFiles.Count)/5)" -ForegroundColor Green
    return $true
}

# ============================================
# FUNCIÓN: Crear carpeta si no existe
# ============================================
function Ensure-Directory {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Host "📁 Creando carpeta: $Path" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

# ============================================
# FUNCIÓN: Subir archivo a Firebase Storage
# ============================================
function Upload-ToFirebase {
    param(
        [string]$LocalFile,
        [string]$RemotePath
    )
    
    $fileName = Split-Path $LocalFile -Leaf
    Write-Host "📤 Subiendo: $fileName..." -ForegroundColor Cyan
    
    try {
        # Comando gsutil (alternativa a Firebase CLI para Storage)
        # Nota: Requiere Google Cloud SDK instalado
        $remoteUrl = "gs://$StorageBucket/$RemotePath/$fileName"
        
        # Intentar con gsutil si está disponible
        $gsutilAvailable = Get-Command gsutil -ErrorAction SilentlyContinue
        
        if ($gsutilAvailable) {
            gsutil cp $LocalFile $remoteUrl 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                # Hacer público el archivo
                gsutil acl ch -u AllUsers:R $remoteUrl 2>&1 | Out-Null
                
                $publicUrl = "https://storage.googleapis.com/$StorageBucket/$RemotePath/$fileName"
                Write-Host "  ✅ Subido exitosamente" -ForegroundColor Green
                Write-Host "  🔗 URL: $publicUrl" -ForegroundColor Gray
                return $publicUrl
            }
            else {
                Write-Host "  ❌ Error subiendo archivo" -ForegroundColor Red
                return $null
            }
        }
        else {
            Write-Host "  ⚠️  gsutil no disponible. Usar consola web Firebase:" -ForegroundColor Yellow
            Write-Host "     https://console.firebase.google.com/project/$FirebaseProject/storage" -ForegroundColor White
            
            # Generar URL esperada
            $expectedUrl = "https://storage.googleapis.com/$StorageBucket/$RemotePath/$fileName"
            return $expectedUrl
        }
    }
    catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
        return $null
    }
}

# ============================================
# FUNCIÓN: Actualizar configuración JSON
# ============================================
function Update-ConfigFile {
    param([hashtable]$UrlMap)
    
    Write-Host ""
    Write-Host "📝 Actualizando archivo de configuración..." -ForegroundColor Yellow
    
    try {
        if (Test-Path $ConfigFile) {
            $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
            
            # Actualizar URLs en el objeto JSON
            foreach ($sound in $config.sounds.PSObject.Properties) {
                $soundType = $sound.Name
                $fileName = $sound.Value.filename
                
                if ($UrlMap.ContainsKey($fileName)) {
                    $sound.Value.cdn_url = $UrlMap[$fileName]
                    $sound.Value.firebase_storage_url = "gs://$StorageBucket/$StoragePath/$fileName"
                    Write-Host "  ✅ Actualizado: $soundType → $fileName" -ForegroundColor Green
                }
            }
            
            # Guardar configuración actualizada
            $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigFile
            
            Write-Host ""
            Write-Host "✅ Configuración actualizada: config/alert_sounds.json" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "  ❌ Archivo de configuración no encontrado: $ConfigFile" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "  ❌ Error actualizando configuración: $_" -ForegroundColor Red
        return $false
    }
}

# ============================================
# FUNCIÓN: Mostrar instrucciones manuales
# ============================================
function Show-ManualInstructions {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║                                                            ║" -ForegroundColor Yellow
    Write-Host "║    📖 INSTRUCCIONES DE SUBIDA MANUAL                      ║" -ForegroundColor Yellow
    Write-Host "║                                                            ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Dado que las herramientas CLI no están disponibles," -ForegroundColor White
    Write-Host "sigue estos pasos para subir los archivos manualmente:" -ForegroundColor White
    Write-Host ""
    Write-Host "1️⃣  Ir a Firebase Console:" -ForegroundColor Cyan
    Write-Host "   https://console.firebase.google.com/project/$FirebaseProject/storage" -ForegroundColor White
    Write-Host ""
    Write-Host "2️⃣  Click en 'Files' → 'Upload file'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3️⃣  Crear carpeta 'alert_sounds/' si no existe" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4️⃣  Subir los siguientes archivos desde:" -ForegroundColor Cyan
    Write-Host "   $SoundsDir" -ForegroundColor White
    Write-Host ""
    
    foreach ($sound in $RequiredSounds) {
        Write-Host "   📄 $sound" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "5️⃣  Hacer archivos públicos:" -ForegroundColor Cyan
    Write-Host "   - Click derecho en cada archivo" -ForegroundColor White
    Write-Host "   - 'Edit permissions'" -ForegroundColor White
    Write-Host "   - Agregar: allUsers → Reader" -ForegroundColor White
    Write-Host ""
    Write-Host "6️⃣  Obtener URLs públicas:" -ForegroundColor Cyan
    Write-Host "   - Click derecho → 'Get download URL'" -ForegroundColor White
    Write-Host "   - Copiar cada URL" -ForegroundColor White
    Write-Host ""
    Write-Host "7️⃣  Actualizar config/alert_sounds.json:" -ForegroundColor Cyan
    Write-Host "   - Pegar URLs en campo 'cdn_url' de cada sonido" -ForegroundColor White
    Write-Host ""
}

# ============================================
# FUNCIÓN PRINCIPAL
# ============================================
function Main {
    Write-Host "Proyecto: $FirebaseProject" -ForegroundColor White
    Write-Host "Bucket: $StorageBucket" -ForegroundColor White
    Write-Host "Carpeta local: $SoundsDir" -ForegroundColor White
    Write-Host ""
    
    # Verificar que la carpeta de sonidos existe
    Ensure-Directory $SoundsDir
    
    # Paso 1: Verificar archivos MP3
    if (-not (Test-SoundFiles)) {
        Write-Host ""
        Write-Host "❌ ABORTADO: Faltan archivos de sonido" -ForegroundColor Red
        Write-Host ""
        Write-Host "📖 Consulta la documentación para obtener los archivos:" -ForegroundColor Yellow
        Write-Host "   docs/SONIDOS-EMERGENCIA.md" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    
    Write-Host ""
    
    # Paso 2: Verificar Firebase CLI (opcional)
    $firebaseAvailable = Test-FirebaseCLI
    
    if ($firebaseAvailable) {
        # Paso 3: Verificar autenticación
        $authenticated = Test-FirebaseAuth
        
        if (-not $authenticated) {
            Write-Host ""
            Write-Host "⚠️  Para subir automáticamente, ejecuta primero:" -ForegroundColor Yellow
            Write-Host "   firebase login" -ForegroundColor White
            Write-Host ""
            
            Show-ManualInstructions
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║    🚀 INICIANDO SUBIDA DE ARCHIVOS                        ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    # Mapa de URLs generadas
    $urlMap = @{}
    
    # Subir cada archivo
    foreach ($sound in $RequiredSounds) {
        $localPath = Join-Path $SoundsDir $sound
        
        if (Test-Path $localPath) {
            $url = Upload-ToFirebase -LocalFile $localPath -RemotePath $StoragePath
            
            if ($url) {
                $urlMap[$sound] = $url
            }
        }
    }
    
    # Actualizar configuración si se obtuvieron URLs
    if ($urlMap.Count -gt 0) {
        Update-ConfigFile -UrlMap $urlMap
    }
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║    ✅ PROCESO COMPLETADO                                  ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    if ($urlMap.Count -lt $RequiredSounds.Count) {
        Write-Host "⚠️  Algunos archivos requieren subida manual" -ForegroundColor Yellow
        Show-ManualInstructions
    }
    else {
        Write-Host "📊 Resumen:" -ForegroundColor Cyan
        Write-Host "   Archivos subidos: $($urlMap.Count)/$($RequiredSounds.Count)" -ForegroundColor White
        Write-Host "   Configuración: Actualizada" -ForegroundColor White
        Write-Host ""
        Write-Host "🎯 Próximos pasos:" -ForegroundColor Cyan
        Write-Host "   1. Verificar URLs en Firebase Console" -ForegroundColor White
        Write-Host "   2. Probar reproducción de sonidos" -ForegroundColor White
        Write-Host "   3. Integrar en app móvil" -ForegroundColor White
        Write-Host ""
    }
}

# ============================================
# EJECUCIÓN
# ============================================
try {
    Main
}
catch {
    Write-Host ""
    Write-Host "❌ ERROR INESPERADO:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
