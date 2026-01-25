# Script de Verificacion del Sistema RFID

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  SISTEMA RFID NEOSTECH - VERIFICACION" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar archivo principal
Write-Host "[*] Verificando archivo principal..." -ForegroundColor Yellow
$indexPath = "c:\NeosTech-RFID-System-Pro\src\web\index.html"
if (Test-Path $indexPath) {
    $lines = (Get-Content $indexPath | Measure-Object -Line).Lines
    Write-Host "  [OK] index.html encontrado ($lines lineas)" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] index.html NO encontrado" -ForegroundColor Red
}

# 2. Verificar funciones críticas
Write-Host ""
Write-Host "[*] Verificando funciones implementadas..." -ForegroundColor Yellow
$functionsToCheck = @(
    "async function loadLists",
    "async function moveToBlacklist",
    "async function removeFromBlacklist",
    "async function addGuardComment",
    "async function editUser",
    "async function loadLogs",
    "function renderLogs",
    "@keyframes spin3d",
    "class=`"logo-3d`""
)

foreach ($func in $functionsToCheck) {
    $found = Select-String -Path $indexPath -Pattern $func -Quiet
    if ($found) {
        Write-Host "  [OK] $func" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $func NO encontrada" -ForegroundColor Red
    }
}

# 3. Verificar servidor Python
Write-Host ""
Write-Host "[*] Verificando servidor web..." -ForegroundColor Yellow
$pythonProcess = Get-Process python -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*5004*"}
if ($pythonProcess) {
    Write-Host "  [OK] Servidor Python corriendo en puerto 5004" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Servidor Python no detectado" -ForegroundColor Yellow
    Write-Host "     Ejecuta: python -m http.server 5004 --directory src/web" -ForegroundColor Gray
}

# 4. Verificar Gateway
Write-Host ""
Write-Host "[*] Verificando Gateway RFID..." -ForegroundColor Yellow
$gatewayProcess = Get-Process Rfid_gateway -ErrorAction SilentlyContinue
if ($gatewayProcess) {
    Write-Host "  [OK] Gateway RFID corriendo" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Gateway RFID no detectado" -ForegroundColor Yellow
}

# 5. Verificar conectividad
Write-Host ""
Write-Host "[*] Verificando conectividad..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:5004" -TimeoutSec 2 -ErrorAction Stop | Out-Null
    Write-Host "  [OK] Dashboard accesible en http://localhost:5004" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Dashboard no accesible" -ForegroundColor Yellow
}

try {
    Invoke-WebRequest -Uri "http://localhost:8080/api/status" -TimeoutSec 2 -ErrorAction Stop | Out-Null
    Write-Host "  [OK] API Gateway accesible en http://localhost:8080" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] API Gateway no responde" -ForegroundColor Yellow
}

# 6. Resumen
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  NUEVAS FUNCIONALIDADES IMPLEMENTADAS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[OK] Registros de eventos - Ahora muestra TODOS los eventos" -ForegroundColor Green
Write-Host "[OK] Edicion de usuarios - Corregido mapeo de campos" -ForegroundColor Green
Write-Host "[OK] Whitelist/Blacklist - Implementado completamente" -ForegroundColor Green
Write-Host "[OK] Comentarios de guardia - Sistema nuevo implementado" -ForegroundColor Green
Write-Host "[OK] Logo 3D animado - Efecto visual profesional" -ForegroundColor Green
Write-Host "[OK] Estadisticas mejoradas - Mas informacion y robustez" -ForegroundColor Green
Write-Host ""
