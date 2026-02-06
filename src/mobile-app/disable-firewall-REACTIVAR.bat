@echo off
echo ================================================
echo   REACTIVAR FIREWALL
echo ================================================
echo.

netsh advfirewall set privateprofile state on

echo.
echo ✅ Firewall reactivado
echo.
pause
