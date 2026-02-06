# ============================================
# INSTALADOR AUTOMÁTICO - NeosTech RFID Gateway
# Versión: 1.0
# ============================================

Write-Host "`n" -NoNewline
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      NeosTech RFID Gateway - Instalador Automático       ║" -ForegroundColor Cyan
Write-Host "║                     Versión 1.0                           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar permisos de administrador
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ ERROR: Este script requiere permisos de Administrador" -ForegroundColor Red
    Write-Host "Haz clic derecho en el script y selecciona 'Ejecutar como Administrador'" -ForegroundColor Yellow
    pause
    exit
}

# Variables de instalación
$InstallPath = "C:\NeosTech-Gateway"
$ServiceName = "NeosTechGateway"
$GatewayExe = "Rfid_gateway.exe"

Write-Host "📁 Ruta de instalación: $InstallPath" -ForegroundColor Green
Write-Host ""

# ============================================
# PASO 1: VERIFICAR .NET 8.0 RUNTIME
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASO 1: Verificando .NET 8.0 Runtime..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$dotnetVersion = & dotnet --list-runtimes 2>$null | Select-String "Microsoft.NETCore.App 8"

if ($dotnetVersion) {
    Write-Host "✅ .NET 8.0 Runtime ya está instalado" -ForegroundColor Green
    Write-Host "   Versión: $dotnetVersion" -ForegroundColor Gray
} else {
    Write-Host "⚠️  .NET 8.0 Runtime NO encontrado" -ForegroundColor Yellow
    Write-Host "📥 Descargando .NET 8.0 Runtime..." -ForegroundColor Cyan
    
    $dotnetUrl = "https://download.visualstudio.microsoft.com/download/pr/6224f00f-08da-4e7f-85b1-00d42c2bb3d3/b775de636b91e023574a0bbc291f705a/dotnet-runtime-8.0.1-win-x64.exe"
    $dotnetInstaller = "$env:TEMP\dotnet-runtime-8.0-installer.exe"
    
    try {
        Invoke-WebRequest -Uri $dotnetUrl -OutFile $dotnetInstaller -UseBasicParsing
        Write-Host "✅ Descarga completada" -ForegroundColor Green
        
        Write-Host "🔧 Instalando .NET 8.0 Runtime..." -ForegroundColor Cyan
        Start-Process -FilePath $dotnetInstaller -ArgumentList "/quiet", "/norestart" -Wait
        
        Write-Host "✅ .NET 8.0 Runtime instalado exitosamente" -ForegroundColor Green
        Remove-Item $dotnetInstaller -Force
    } catch {
        Write-Host "❌ ERROR: No se pudo descargar/instalar .NET 8.0" -ForegroundColor Red
        Write-Host "   Por favor descarga manualmente desde: https://dotnet.microsoft.com/download/dotnet/8.0" -ForegroundColor Yellow
        pause
        exit
    }
}

Start-Sleep -Seconds 2

# ============================================
# PASO 2: CREAR DIRECTORIO DE INSTALACIÓN
# ============================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASO 2: Preparando directorio de instalación..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if (Test-Path $InstallPath) {
    Write-Host "⚠️  El directorio $InstallPath ya existe" -ForegroundColor Yellow
    $overwrite = Read-Host "¿Deseas sobrescribirlo? (S/N)"
    if ($overwrite -eq "S" -or $overwrite -eq "s") {
        Write-Host "🗑️  Eliminando archivos antiguos..." -ForegroundColor Cyan
        Remove-Item -Path $InstallPath -Recurse -Force
        Write-Host "✅ Limpieza completada" -ForegroundColor Green
    } else {
        Write-Host "❌ Instalación cancelada" -ForegroundColor Red
        pause
        exit
    }
}

New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
Write-Host "✅ Directorio creado: $InstallPath" -ForegroundColor Green

Start-Sleep -Seconds 1

# ============================================
# PASO 3: COPIAR ARCHIVOS DEL GATEWAY
# ============================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASO 3: Copiando archivos del Gateway..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$SourcePath = Join-Path $PSScriptRoot "Gateway"

if (-not (Test-Path $SourcePath)) {
    Write-Host "❌ ERROR: No se encuentra el directorio 'Gateway' en $PSScriptRoot" -ForegroundColor Red
    Write-Host "   Asegúrate de que la carpeta 'Gateway' esté junto al instalador" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "📦 Copiando archivos desde: $SourcePath" -ForegroundColor Cyan
Copy-Item -Path "$SourcePath\*" -Destination $InstallPath -Recurse -Force

# Verificar que el ejecutable principal exista
if (-not (Test-Path "$InstallPath\$GatewayExe")) {
    Write-Host "❌ ERROR: No se encontró $GatewayExe en la instalación" -ForegroundColor Red
    pause
    exit
}

Write-Host "✅ Archivos copiados exitosamente" -ForegroundColor Green
Write-Host "   Total de archivos: $((Get-ChildItem -Path $InstallPath -File).Count)" -ForegroundColor Gray

Start-Sleep -Seconds 1

# ============================================
# PASO 4: CONFIGURAR FIREWALL
# ============================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASO 4: Configurando reglas de Firewall..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Eliminar reglas existentes si existen
Remove-NetFirewallRule -DisplayName "NeosTech Gateway" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "NeosTech Gateway HTTP" -ErrorAction SilentlyContinue

# Crear regla para puerto 8080 (HTTP API)
New-NetFirewallRule -DisplayName "NeosTech Gateway HTTP" `
                     -Direction Inbound `
                     -Protocol TCP `
                     -LocalPort 8080 `
                     -Action Allow `
                     -Profile Any | Out-Null

Write-Host "✅ Regla de firewall creada: Puerto 8080 (HTTP API)" -ForegroundColor Green

# Crear regla para el ejecutable
New-NetFirewallRule -DisplayName "NeosTech Gateway" `
                     -Direction Inbound `
                     -Program "$InstallPath\$GatewayExe" `
                     -Action Allow `
                     -Profile Any | Out-Null

Write-Host "✅ Regla de firewall creada: $GatewayExe" -ForegroundColor Green

Start-Sleep -Seconds 1

# ============================================
# PASO 5: CREAR SERVICIO DE WINDOWS
# ============================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASO 5: Creando servicio de Windows..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Detener y eliminar servicio existente si existe
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Write-Host "⚠️  Servicio existente encontrado, eliminando..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

# Crear servicio usando sc.exe
sc.exe create $ServiceName binPath= "`"$InstallPath\$GatewayExe`"" start= auto DisplayName= "NeosTech RFID Gateway" | Out-Null
sc.exe description $ServiceName "Gateway para lectora RFID THY - Sistema de control de acceso vehicular" | Out-Null

Write-Host "✅ Servicio creado: $ServiceName" -ForegroundColor Green
Write-Host "   Tipo de inicio: Automático" -ForegroundColor Gray

Start-Sleep -Seconds 1

# ============================================
# PASO 6: VERIFICAR CLOUDFLARED (OPCIONAL)
# ============================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASO 6: Verificando Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$CloudflaredPath = Join-Path $InstallPath "cloudflared.exe"

if (Test-Path $CloudflaredPath) {
    Write-Host "✅ Cloudflared.exe encontrado en el paquete" -ForegroundColor Green
} else {
    Write-Host "⚠️  Cloudflared.exe NO encontrado" -ForegroundColor Yellow
    Write-Host "   El túnel deberá configurarse manualmente" -ForegroundColor Gray
    Write-Host "   Descarga: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Cyan
}

Start-Sleep -Seconds 1

# ============================================
# PASO 7: INICIAR SERVICIO
# ============================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASO 7: Iniciando servicio..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "¿Deseas iniciar el Gateway ahora? (S/N): " -ForegroundColor Cyan -NoNewline
$startNow = Read-Host

if ($startNow -eq "S" -or $startNow -eq "s") {
    try {
        Start-Service -Name $ServiceName
        Start-Sleep -Seconds 3
        
        $serviceStatus = Get-Service -Name $ServiceName
        if ($serviceStatus.Status -eq "Running") {
            Write-Host "✅ Servicio iniciado correctamente" -ForegroundColor Green
        } else {
            Write-Host "⚠️  El servicio no se inició automáticamente" -ForegroundColor Yellow
            Write-Host "   Estado actual: $($serviceStatus.Status)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ ERROR al iniciar el servicio: $_" -ForegroundColor Red
        Write-Host "   Inténtalo manualmente con: Start-Service $ServiceName" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Servicio NO iniciado. Inícialo manualmente cuando estés listo" -ForegroundColor Yellow
}

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           ✅ INSTALACIÓN COMPLETADA ✅                    ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 RESUMEN DE INSTALACIÓN:" -ForegroundColor Cyan
Write-Host "   ├─ Directorio: $InstallPath" -ForegroundColor White
Write-Host "   ├─ Servicio: $ServiceName" -ForegroundColor White
Write-Host "   ├─ Puerto HTTP: 8080" -ForegroundColor White
Write-Host "   └─ .NET Runtime: 8.0" -ForegroundColor White
Write-Host ""
Write-Host "🔧 COMANDOS ÚTILES:" -ForegroundColor Cyan
Write-Host "   Iniciar servicio:   " -NoNewline -ForegroundColor White
Write-Host "Start-Service $ServiceName" -ForegroundColor Yellow
Write-Host "   Detener servicio:   " -NoNewline -ForegroundColor White
Write-Host "Stop-Service $ServiceName" -ForegroundColor Yellow
Write-Host "   Estado del servicio:" -NoNewline -ForegroundColor White
Write-Host "Get-Service $ServiceName" -ForegroundColor Yellow
Write-Host "   Ver logs:           " -NoNewline -ForegroundColor White
Write-Host "Get-EventLog -LogName Application -Source $ServiceName -Newest 50" -ForegroundColor Yellow
Write-Host ""
Write-Host "📡 CONFIGURACIÓN LECTORA:" -ForegroundColor Cyan
Write-Host "   Edita: $InstallPath\lectora.config.json" -ForegroundColor White
Write-Host "   IP Lectora: 192.168.1.200" -ForegroundColor Gray
Write-Host "   Puerto: 60000" -ForegroundColor Gray
Write-Host ""
Write-Host "🔥 FIREBASE:" -ForegroundColor Cyan
Write-Host "   Edita: $InstallPath\gateway.config.json" -ForegroundColor White
Write-Host "   Proyecto: neos-tech" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 CLOUDFLARE TUNNEL (si aplica):" -ForegroundColor Cyan
Write-Host "   cd $InstallPath" -ForegroundColor White
Write-Host "   .\cloudflared.exe tunnel --url http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Verifica que la lectora RFID esté conectada a la red" -ForegroundColor Yellow
Write-Host "                antes de iniciar el servicio." -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
