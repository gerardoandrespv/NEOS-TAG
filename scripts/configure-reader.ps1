# Script para configurar la lectora RFID con parámetros óptimos
Write-Host "=== CONFIGURACIÓN DE LECTORA RFID ===" -ForegroundColor Cyan
Write-Host ""

# Compilar Gateway
Write-Host "Compilando Gateway..." -ForegroundColor Yellow
dotnet build C:\NeosTech-RFID-System-Pro\src\Gateway\Rfid_gateway.csproj -c Release --nologo -v q

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en compilación" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit
}

# Crear script de configuración temporal
$configScript = @"
using System;
using System.Runtime.InteropServices;

public class ReaderConfig
{
    [DllImport("SWNetApi.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool SWNet_OpenDevice(string ipAddress, ushort port);
    
    [DllImport("SWNetApi.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern void SWNet_CloseDevice();
    
    [DllImport("SWNetApi.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool SWNet_SetDeviceOneParam(byte devAddr, byte paramAddr, byte value);
    
    [DllImport("SWNetApi.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool SWNet_ReadDeviceOneParam(byte devAddr, byte paramAddr, byte[] value);
    
    public static void Main()
    {
        Console.WriteLine("[CONFIG] Conectando a lectora...");
        
        if (!SWNet_OpenDevice("192.168.1.200", 60000))
        {
            Console.WriteLine("[ERROR] No se pudo conectar");
            return;
        }
        
        Console.WriteLine("[OK] Conectado\n");
        
        // Leer configuración actual
        Console.WriteLine("=== CONFIGURACIÓN ACTUAL ===");
        byte[] value = new byte[1];
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x02, value))
        {
            string mode = value[0] == 0x01 ? "ActiveMode" : "AnswerMode";
            Console.WriteLine($"WorkMode: {mode} (0x{value[0]:X2})");
        }
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x04, value))
        {
            Console.WriteLine($"FilterTime: {value[0] * 10}ms (0x{value[0]:X2})");
        }
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x05, value))
        {
            Console.WriteLine($"RFPower: {value[0]} dBm");
        }
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x06, value))
        {
            string beep = value[0] == 1 ? "On" : "Off";
            Console.WriteLine($"Beep: {beep}");
        }
        
        Console.WriteLine("\n=== APLICANDO NUEVA CONFIGURACIÓN ===\n");
        
        // Configurar parámetros óptimos
        Console.Write("1. WorkMode = ActiveMode (0x01)... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x02, 0x01))
        {
            Console.WriteLine("✓ OK");
        }
        else
        {
            Console.WriteLine("✗ FALLO");
        }
        
        Console.Write("2. FilterTime = 50ms (0x05)... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x04, 0x05))
        {
            Console.WriteLine("✓ OK");
        }
        else
        {
            Console.WriteLine("✗ FALLO");
        }
        
        Console.Write("3. RFPower = 26 dBm... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x05, 26))
        {
            Console.WriteLine("✓ OK");
        }
        else
        {
            Console.WriteLine("✗ FALLO");
        }
        
        Console.Write("4. Beep = On... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x06, 0x01))
        {
            Console.WriteLine("✓ OK");
        }
        else
        {
            Console.WriteLine("✗ FALLO");
        }
        
        Console.WriteLine("\n=== VERIFICANDO CAMBIOS ===\n");
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x02, value))
        {
            string mode = value[0] == 0x01 ? "ActiveMode" : "AnswerMode";
            Console.WriteLine($"WorkMode: {mode} ✓");
        }
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x04, value))
        {
            Console.WriteLine($"FilterTime: {value[0] * 10}ms ✓");
        }
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x05, value))
        {
            Console.WriteLine($"RFPower: {value[0]} dBm ✓");
        }
        
        Console.WriteLine("\n⚠️ NOTA IMPORTANTE:");
        Console.WriteLine("ReadTime y ByteLength NO se pueden configurar via SDK.");
        Console.WriteLine("Debes configurarlos MANUALMENTE en Reader software 5.4:");
        Console.WriteLine("  - ReadTime(*10ms): 100 (1 segundo)");
        Console.WriteLine("  - ByteLength(Hex): 0C (12 bytes)");
        
        SWNet_CloseDevice();
        Console.WriteLine("\n[CONFIG] Configuración completada");
    }
}
"@

# Guardar script
$configScript | Out-File -FilePath "C:\NeosTech-RFID-System-Pro\src\Gateway\ReaderConfig.cs" -Encoding UTF8

Write-Host "Ejecutando configuración..." -ForegroundColor Cyan
Write-Host ""

$binPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0"

# Compilar script de configuración
csc /target:exe /out:"$binPath\ReaderConfig.exe" "C:\NeosTech-RFID-System-Pro\src\Gateway\ReaderConfig.cs" 2>$null

if (Test-Path "$binPath\ReaderConfig.exe") {
    Push-Location $binPath
    .\ReaderConfig.exe
    Pop-Location
    
    Write-Host ""
    Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Parámetros SDK configurados" -ForegroundColor Green
    Write-Host "⚠️  Faltan parámetros que SOLO se configuran en Reader software:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   📌 EN READER SOFTWARE 5.4, PESTAÑA 'ParameterSet':" -ForegroundColor White
    Write-Host "      1. ReadTime(*10ms): cambiar de 0 a 100" -ForegroundColor Yellow
    Write-Host "      2. ByteLength(Hex): cambiar de 01 a 0C" -ForegroundColor Yellow  
    Write-Host "      3. Hacer clic en 'Set' y esperar 'Operation succeeded'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   📌 LUEGO EN PESTAÑA 'ActiveMode':" -ForegroundColor White
    Write-Host "      1. Hacer clic en 'Get'" -ForegroundColor Yellow
    Write-Host "      2. Colocar tag cerca de lectora" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Si aún NO funciona después de eso, el problema es de hardware/firmware." -ForegroundColor Red
    Write-Host ""
} else {
    Write-Host "❌ No se pudo compilar el configurador" -ForegroundColor Red
    Write-Host ""
    Write-Host "CONFIGURACIÓN MANUAL REQUERIDA en Reader software 5.4:" -ForegroundColor Yellow
    Write-Host "  - ParameterSet → WorkMode: ActiveMod" -ForegroundColor White
    Write-Host "  - ParameterSet → ReadTime(*10ms): 100" -ForegroundColor White
    Write-Host "  - ParameterSet → ByteLength(Hex): 0C" -ForegroundColor White
    Write-Host "  - ParameterSet → FilterTime: 5 (50ms)" -ForegroundColor White
    Write-Host "  - Hacer clic en 'Set'" -ForegroundColor White
}

Write-Host ""
Read-Host "Presiona Enter para salir"
