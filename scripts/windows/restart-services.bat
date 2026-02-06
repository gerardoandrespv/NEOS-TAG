@echo off
echo === Limpiando procesos del Gateway ===

REM Matar cualquier proceso de Rfid_gateway
taskkill /F /IM Rfid_gateway.exe 2>nul
timeout /t 2 >nul

echo.
echo === Iniciando Gateway limpio ===
cd /d C:\NeosTech-RFID-System-Pro

REM Ejecutar el script de inicio
powershell -ExecutionPolicy Bypass -File "C:\NeosTech-RFID-System-Pro\restart-gateway-cors.ps1"
