@echo off
echo ============================================
echo   INICIANDO GATEWAY COMO ADMINISTRADOR
echo ============================================
echo.

REM Verificar si ya somos administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Ya ejecutando como Administrador
    echo.
    cd /d "%~dp0src\Gateway"
    dotnet run
) else (
    echo Solicitando permisos de Administrador...
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/k cd /d %~dp0src\Gateway && dotnet run' -Verb RunAs"
)

pause
