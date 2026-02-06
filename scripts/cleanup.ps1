# Limpieza y preparacion para Git
$ErrorActionPreference = 'Stop'

Write-Host '============================================' -ForegroundColor Cyan
Write-Host 'LIMPIEZA Y ORGANIZACION - NeosTech RFID v6.0' -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan

# FASE 1: Backup
Write-Host '
[FASE 1] Backup de seguridad...' -ForegroundColor Yellow
$backupPath = '.archive/pre-cleanup_' + (Get-Date -Format 'yyyyMMdd_HHmmss')
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

$criticalFiles = @('firebase.json', 'firestore.rules', 'package.json', 'src/web/index.html', 'src/functions/main.py')
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $destDir = Split-Path (Join-Path $backupPath $file) -Parent
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Copy-Item $file -Destination (Join-Path $backupPath $file) -Force
        Write-Host '  OK: '$file -ForegroundColor Green
    }
}

# FASE 2: Eliminar backups
Write-Host '
[FASE 2] Eliminando archivos duplicados...' -ForegroundColor Yellow
$backupFiles = @('src/web/index_FULL_TEMP.html', 'src/web/index_CLEAN.html', 'src/web/index.html.LIMPIO_BACKUP_20260124', 'src/web/index.html.BACKUP_CORRUPT_20260124144638')
$deletedCount = 0
foreach ($file in $backupFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        $deletedCount++
        Write-Host '  Eliminado: '$file -ForegroundColor Gray
    }
}
Write-Host '  Total: '$deletedCount' archivos eliminados' -ForegroundColor Green

# FASE 3: Organizar carpetas
Write-Host '
[FASE 3] Organizando estructura...' -ForegroundColor Yellow
$folders = @('src/web', 'src/gateway', 'src/functions', 'config', 'docs', 'scripts', '.archive')
foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host '  Creada: '$folder -ForegroundColor Green
    }
}

# Mover scripts
Write-Host '
  Moviendo scripts...' -ForegroundColor Cyan
$moved = 0
Get-ChildItem -Path '.' -Filter '*.ps1' -File | Where-Object { $_.Name -notmatch '^(cleanup)' -and -not (Test-Path 'scripts/'$($_.Name)) } | ForEach-Object {
    Move-Item $_.FullName -Destination 'scripts/' -Force -ErrorAction SilentlyContinue
    $moved++
    Write-Host '    -> scripts/'$($_.Name) -ForegroundColor Green
}

# Mover docs
Get-ChildItem -Path '.' -Filter '*.md' -File | Where-Object { $_.Name -ne 'README.md' -and -not (Test-Path 'docs/'$($_.Name)) } | ForEach-Object {
    Move-Item $_.FullName -Destination 'docs/' -Force -ErrorAction SilentlyContinue
    Write-Host '    -> docs/'$($_.Name) -ForegroundColor Green
}

# FASE 4: .gitignore
Write-Host '
[FASE 4] Creando .gitignore...' -ForegroundColor Yellow
if (-not (Test-Path '.gitignore')) {
    @'
node_modules/
__pycache__/
*.pyc
dist/
build/
bin/
obj/
.vs/
.vscode/
.env
*.log
logs/
.firebase/
.DS_Store
Thumbs.db
*.bak
*_BACKUP_*
*_TEMP.html
*_CLEAN.html
.archive/
temp/
'@ | Out-File -FilePath '.gitignore' -Encoding UTF8
    Write-Host '  .gitignore creado' -ForegroundColor Green
}

# FASE 5: Git
Write-Host '
[FASE 5] Preparando Git...' -ForegroundColor Yellow
if (-not (Test-Path '.git')) {
    git init
    git branch -m main
    Write-Host '  Git inicializado' -ForegroundColor Green
}

git add .
Write-Host '  Archivos agregados a staging' -ForegroundColor Green

Write-Host '
============================================' -ForegroundColor Green
Write-Host 'LIMPIEZA COMPLETADA' -ForegroundColor Green
Write-Host '============================================' -ForegroundColor Green
Write-Host '
PROXIMOS PASOS:' -ForegroundColor Yellow
Write-Host '1. git status' -ForegroundColor Cyan
Write-Host '2. git commit -m \"Limpieza y organizacion v6.0\"' -ForegroundColor Cyan
Write-Host '3. git remote add origin <URL>' -ForegroundColor Cyan
Write-Host '4. git push -u origin main' -ForegroundColor Cyan