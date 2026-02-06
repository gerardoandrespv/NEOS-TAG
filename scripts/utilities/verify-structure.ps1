# ============================================
# SCRIPT DE VALIDACION DE ESTRUCTURA
# NeosTech RFID System Pro
# ============================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "     VALIDACION DE ESTRUCTURA DEL PROYECTO                 " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Contadores
$errorsFound = 0
$warningsFound = 0
$checksTotal = 0

# Funcion para reportar error
function Report-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    $script:errorsFound++
}

# Funcion para reportar advertencia
function Report-Warning {
    param($Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
    $script:warningsFound++
}

# Funcion para reportar exito
function Report-Success {
    param($Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

# ============================================
# CHECK 1: Archivos en Root
# ============================================
Write-Host "[CHECK 1] Verificando archivos en directorio raiz..." -ForegroundColor Cyan
$script:checksTotal++

$allowedRootFiles = @(
    ".env.example",
    ".firebaserc",
    ".gitignore",
    "CHANGELOG.md",
    "cleanup-project.ps1",
    "CLEANUP_REPORT.md",
    "CONVENCIONES.md",
    "firebase.json",
    "firestore.rules",
    "lectora.config.json",
    "LEEME-PRIMERO.md",
    "LIMPIEZA-COMPLETADA.md",
    "NeosTech-RFID-System-Pro.sln",
    "package-lock.json",
    "package.json",
    "README.md",
    "RESUMEN_SISTEMA.txt"
)

$rootFiles = Get-ChildItem -File | Select-Object -ExpandProperty Name
$rootFileCount = ($rootFiles | Measure-Object).Count

Write-Host "  Archivos en root: $rootFileCount" -ForegroundColor White

if ($rootFileCount -gt 20) {
    Report-Error "Demasiados archivos en root ($rootFileCount). Maximo recomendado: 20"
} elseif ($rootFileCount -gt 17) {
    Report-Warning "Muchos archivos en root ($rootFileCount). Recomendado: ~15"
} else {
    Report-Success "Cantidad de archivos en root aceptable ($rootFileCount)"
}

# Verificar archivos no permitidos
foreach ($file in $rootFiles) {
    if ($file -notin $allowedRootFiles) {
        # Verificar si es un tipo de archivo que no deberia estar en root
        if ($file -match '\.ps1$' -and $file -ne 'cleanup-project.ps1') {
            Report-Error "Script PowerShell en root: $file (mover a scripts/)"
        }
        elseif ($file -match '\.bat$') {
            Report-Error "Script Batch en root: $file (mover a scripts/windows/)"
        }
        elseif ($file -match '\.html$') {
            Report-Error "Archivo HTML en root: $file (mover a tests/manual/ o eliminar)"
        }
        elseif ($file -match '\.js$' -and $file -ne 'package.json' -and $file -ne 'package-lock.json') {
            Report-Error "Archivo JavaScript en root: $file (mover a src/web/ o tests/)"
        }
        elseif ($file -match '^(RESUMEN|DIAGNOSTICO|ESTADO|PLAN|PRUEBAS|TESTING|GUIA|INSTRUCCIONES|CONFIGURACION|DEPLOYMENT|INSTALACION).*\.md$' -and $file -notin @('README.md', 'CHANGELOG.md', 'LEEME-PRIMERO.md', 'CONVENCIONES.md', 'LIMPIEZA-COMPLETADA.md', 'CLEANUP_REPORT.md')) {
            Report-Warning "Documento en root: $file (considerar mover a docs/)"
        }
    }
}

# ============================================
# CHECK 2: Estructura de Directorios
# ============================================
Write-Host ""
Write-Host "[CHECK 2] Verificando estructura de directorios..." -ForegroundColor Cyan
$script:checksTotal++

$requiredDirs = @(
    "docs",
    "scripts",
    "src",
    "src\Gateway",
    "src\web",
    "config",
    "Instalador"
)

$allDirsOk = $true
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "  [OK] $dir\" -ForegroundColor Green
    } else {
        Report-Error "Directorio requerido no existe: $dir\"
        $allDirsOk = $false
    }
}

if ($allDirsOk) {
    Report-Success "Estructura de directorios correcta"
}

# ============================================
# CHECK 3: Scripts en Lugares Incorrectos
# ============================================
Write-Host ""
Write-Host "[CHECK 3] Verificando scripts fuera de scripts/..." -ForegroundColor Cyan
$script:checksTotal++

$scriptsOutside = Get-ChildItem -Recurse -Include *.ps1,*.bat -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch '\\scripts\\' -and 
                   $_.FullName -notmatch '\\node_modules\\' -and
                   $_.FullName -notmatch '\\.archive\\' -and
                   $_.FullName -notmatch '\\.git\\' -and
                   $_.Name -ne 'cleanup-project.ps1' }

if ($scriptsOutside) {
    foreach ($script in $scriptsOutside) {
        $relativePath = $script.FullName.Replace((Get-Location).Path, ".")
        Report-Warning "Script fuera de scripts/: $relativePath"
    }
} else {
    Report-Success "Todos los scripts estan en scripts/"
}

# ============================================
# CHECK 4: Archivos Temporales
# ============================================
Write-Host ""
Write-Host "[CHECK 4] Verificando archivos temporales..." -ForegroundColor Cyan
$script:checksTotal++

$tempPatterns = @(
    "*-test*.html",
    "*-temp*.html",
    "*-prueba*.html",
    "test-*.js",
    "temp-*.js",
    "*-old.*",
    "*-backup.*",
    "*.tmp"
)

$tempFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { 
        $matches = $false
        foreach ($pattern in $tempPatterns) {
            if ($_.Name -like $pattern) {
                $matches = $true
                break
            }
        }
        $matches -and 
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\.archive\\' -and
        $_.FullName -notmatch '\\.git\\' -and
        $_.FullName -notmatch '\\tests\\'
    }

if ($tempFiles) {
    foreach ($file in $tempFiles) {
        $relativePath = $file.FullName.Replace((Get-Location).Path, ".")
        Report-Warning "Archivo temporal encontrado: $relativePath"
    }
} else {
    Report-Success "No se encontraron archivos temporales"
}

# ============================================
# CHECK 5: Logs Antiguos
# ============================================
Write-Host ""
Write-Host "[CHECK 5] Verificando logs antiguos..." -ForegroundColor Cyan
$script:checksTotal++

if (Test-Path "logs") {
    $logFiles = Get-ChildItem "logs" -File -ErrorAction SilentlyContinue
    $allowedLogs = @("gateway.log", "gateway_process.log")
    
    $extraLogs = $logFiles | Where-Object { $_.Name -notin $allowedLogs }
    
    if ($extraLogs) {
        Report-Warning "Archivos extra en logs/ ($($extraLogs.Count) archivos)"
        Write-Host "  Ejecutar: Remove-Item logs\* -Exclude gateway.log,gateway_process.log" -ForegroundColor Yellow
    } else {
        Report-Success "Directorio logs/ limpio"
    }
} else {
    Report-Warning "Directorio logs/ no existe"
}

# ============================================
# CHECK 6: Compilacion del Gateway
# ============================================
Write-Host ""
Write-Host "[CHECK 6] Verificando compilacion del Gateway..." -ForegroundColor Cyan
$script:checksTotal++

if (Test-Path "src\Gateway\Rfid_gateway.csproj") {
    Push-Location "src\Gateway"
    
    $buildOutput = dotnet build --configuration Release --no-restore 2>&1
    $buildSuccess = $LASTEXITCODE -eq 0
    
    Pop-Location
    
    if ($buildSuccess) {
        Report-Success "Gateway compila correctamente"
    } else {
        Report-Error "Gateway tiene errores de compilacion"
    }
} else {
    Report-Error "Proyecto del Gateway no encontrado (src\Gateway\Rfid_gateway.csproj)"
}

# ============================================
# CHECK 7: Archivos de Firebase
# ============================================
Write-Host ""
Write-Host "[CHECK 7] Verificando archivos de Firebase..." -ForegroundColor Cyan
$script:checksTotal++

$firebaseFiles = @(
    "firebase.json",
    "firestore.rules",
    ".firebaserc",
    "src\web\index.html"
)

$allFirebaseOk = $true
foreach ($file in $firebaseFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Report-Error "Archivo de Firebase no encontrado: $file"
        $allFirebaseOk = $false
    }
}

if ($allFirebaseOk) {
    Report-Success "Archivos de Firebase presentes"
}

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "     RESUMEN DE VALIDACION                                 " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checks ejecutados: $checksTotal" -ForegroundColor White
Write-Host "Errores encontrados: $errorsFound" -ForegroundColor $(if ($errorsFound -eq 0) { "Green" } else { "Red" })
Write-Host "Advertencias encontradas: $warningsFound" -ForegroundColor $(if ($warningsFound -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($errorsFound -eq 0 -and $warningsFound -eq 0) {
    Write-Host "=============================================================" -ForegroundColor Green
    Write-Host "     VALIDACION EXITOSA - PROYECTO EN BUEN ESTADO          " -ForegroundColor Green
    Write-Host "=============================================================" -ForegroundColor Green
    exit 0
} elseif ($errorsFound -eq 0) {
    Write-Host "=============================================================" -ForegroundColor Yellow
    Write-Host "     VALIDACION COMPLETADA CON ADVERTENCIAS                " -ForegroundColor Yellow
    Write-Host "=============================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recomendacion: Revisar y corregir las advertencias" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "=============================================================" -ForegroundColor Red
    Write-Host "     VALIDACION FALLIDA - CORREGIR ERRORES                 " -ForegroundColor Red
    Write-Host "=============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Accion requerida: Corregir los errores encontrados" -ForegroundColor Red
    Write-Host "Referencia: CONVENCIONES.md" -ForegroundColor Yellow
    exit 1
}
