@echo off
echo ============================================
echo   INSTALAR SERVICIO NEOS-TECH RFID GATEWAY
echo ============================================
echo.

REM Verificar admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Debe ejecutar como Administrador
    echo Clic derecho en este archivo -^> Ejecutar como administrador
    pause
    exit /b 1
)

echo [1/3] Eliminando servicio antiguo (si existe)...
sc query "NeosTech-RFID-Gateway" >nul 2>&1
if %errorLevel% equ 0 (
    sc stop "NeosTech-RFID-Gateway" >nul 2>&1
    timeout /t 3 /nobreak >nul
    sc delete "NeosTech-RFID-Gateway"
    echo       OK Servicio antiguo eliminado
) else (
    echo       OK No hay servicio antiguo
)

echo.
echo [2/3] Verificando archivos...
set "GATEWAY_DLL=C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.dll"
if not exist "%GATEWAY_DLL%" (
    echo ERROR: No se encontro el DLL compilado
    echo Ruta: %GATEWAY_DLL%
    echo.
    echo Compilar primero con: dotnet build --configuration Release
    pause
    exit /b 1
)
echo       OK DLL encontrado

echo.
echo [3/3] Creando servicio...
for /f "delims=" %%i in ('where dotnet') do set DOTNET_EXE=%%i
echo       Dotnet: %DOTNET_EXE%
echo       DLL: %GATEWAY_DLL%

sc create "NeosTech-RFID-Gateway" binpath= "\"%DOTNET_EXE%\" \"%GATEWAY_DLL%\"" displayname= "NeosTech RFID Gateway" start= auto obj= LocalSystem

if %errorLevel% equ 0 (
    echo       OK Servicio creado
    
    sc description "NeosTech-RFID-Gateway" "Gateway para sistema de control de acceso RFID con lectoras THY"
    sc failure "NeosTech-RFID-Gateway" reset= 86400 actions= restart/5000/restart/10000/restart/30000
    
    echo.
    echo [4/3] Iniciando servicio...
    sc start "NeosTech-RFID-Gateway"
    timeout /t 8 /nobreak >nul
    
    sc query "NeosTech-RFID-Gateway" | findstr "ESTADO"
    
    echo.
    echo ============================================
    echo   INSTALACION COMPLETA
    echo ============================================
    echo.
    echo Servicio instalado: NeosTech RFID Gateway
    echo Inicio automatico: SI
    echo.
    echo Gestionar servicio:
    echo   services.msc
    echo   net start NeosTech-RFID-Gateway
    echo   net stop NeosTech-RFID-Gateway
    echo.
    echo Dashboard: https://neos-tech.web.app
    echo.
) else (
    echo ERROR creando servicio
    echo.
    echo Ver configuracion actual:
    sc qc "NeosTech-RFID-Gateway"
)

pause
