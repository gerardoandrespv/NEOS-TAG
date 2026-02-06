@echo off
echo ============================================
echo   CONFIGURAR AUTO-INICIO DEL GATEWAY
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

echo Creando tarea programada...
echo.

schtasks /create /tn "NeosTech RFID Gateway" /tr "dotnet \"C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Rfid_gateway.dll\"" /sc onstart /ru SYSTEM /rl highest /f

if %errorLevel% equ 0 (
    echo OK Tarea programada creada exitosamente!
    echo.
    echo Detalles:
    echo   Nombre: NeosTech RFID Gateway
    echo   Inicio: Al arrancar el sistema
    echo   Usuario: SYSTEM
    echo   Permisos: Maximos
    echo.
    echo El Gateway se iniciara automaticamente al reiniciar Windows.
    echo.
    schtasks /query /tn "NeosTech RFID Gateway"
) else (
    echo ERROR creando tarea programada
    pause
    exit /b 1
)

echo.
echo ============================================
echo   AUTO-INICIO CONFIGURADO
echo ============================================
echo.
echo Para gestionar la tarea:
echo   - Abrir: Programador de tareas
echo   - Buscar: NeosTech RFID Gateway
echo.
echo Para iniciar manualmente:
echo   schtasks /run /tn "NeosTech RFID Gateway"
echo.
echo Para detener:
echo   taskkill /F /IM dotnet.exe
echo.
pause
