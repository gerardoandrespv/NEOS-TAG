@echo off
echo ================================================
echo   DESACTIVAR FIREWALL TEMPORALMENTE
echo ================================================
echo.
echo Este script desactiva el firewall de Windows
echo para redes privadas (tu WiFi local)
echo.
echo PRESIONA CUALQUIER TECLA PARA CONTINUAR...
pause > nul

netsh advfirewall set privateprofile state off

echo.
echo ✅ Firewall desactivado para redes privadas
echo.
echo Ahora intenta acceder desde tu celular:
echo    http://192.168.31.95:8080
echo.
echo ================================================
echo   PARA REACTIVAR EL FIREWALL:
echo ================================================
echo   Ejecuta: disable-firewall-REACTIVAR.bat
echo.
pause
