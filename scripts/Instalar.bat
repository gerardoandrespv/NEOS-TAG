@echo off
echo ========================================
echo    INSTALADOR RFID GATEWAY CONDOMINIO
echo ========================================
echo.
echo Este instalador requiere PowerShell.
echo.
echo Si no funciona, ejecuta manualmente:
echo   1. Abre PowerShell como Administrador
echo   2. Navega a esta carpeta
echo   3. Ejecuta: .\Instalar.ps1
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0Instalar.ps1"
pause
