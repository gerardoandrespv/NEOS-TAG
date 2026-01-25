# ============================================
# NeosTech RFID System - Detener Todos los Servicios
# ============================================

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║   NEOS TECH - RFID SYSTEM PRO                ║" -ForegroundColor Red
Write-Host "║   Deteniendo Servicios...                    ║" -ForegroundColor Red
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Red

# Detener Gateway
Write-Host "[1/2] Deteniendo Gateway RFID..." -ForegroundColor Yellow
Get-Process -Name "Rfid_gateway" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*Gateway*" } | Stop-Process -Force

# Detener Firebase
Write-Host "[2/2] Deteniendo Dashboard Firebase..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*firebase*" } | Stop-Process -Force

Start-Sleep -Seconds 2

Write-Host "`n✓ Servicios detenidos" -ForegroundColor Green
Write-Host "  - Para reiniciar, ejecuta: .\start-all-services.ps1`n" -ForegroundColor Gray
