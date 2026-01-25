# Script para configurar lectora RFID con parámetros óptimos
Write-Host "=== CONFIGURANDO LECTORA RFID ===" -ForegroundColor Cyan
Write-Host ""

# Navegar al directorio del Gateway donde está el DLL
Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0"
Write-Host "Directorio de trabajo: $PWD" -ForegroundColor Gray
Write-Host ""

# Código C# inline para configurar la lectora
$code = @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class ReaderConfig
{
    const string DLL = @"C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\SWNetApi.dll";
    
    [DllImport(DLL)] public static extern bool SWNet_OpenDevice(byte[] ip, ushort port);
    [DllImport(DLL)] public static extern bool SWNet_CloseDevice();
    [DllImport(DLL)] public static extern bool SWNet_SetDeviceOneParam(byte addr, byte param, byte value);
    [DllImport(DLL)] public static extern bool SWNet_ReadDeviceOneParam(byte addr, byte param, byte[] value);
    
    public static void Main()
    {
        Console.WriteLine("Conectando a 192.168.1.200:60000...");
        byte[] ip = System.Text.Encoding.ASCII.GetBytes("192.168.1.200");
        
        if (!SWNet_OpenDevice(ip, 60000))
        {
            Console.WriteLine("ERROR: No se pudo conectar");
            return;
        }
        
        Console.WriteLine("✓ Conectado");
        Thread.Sleep(500);
        
        // Transport = 0x02 (RJ45/Net) CRÍTICO para ActiveMode
        Console.Write("Configurando Transport a RJ45... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x01, 0x02))
            Console.WriteLine("✓");
        else
            Console.WriteLine("✗ FALLÓ");
        Thread.Sleep(300);
        
        // WorkMode = 0x00 (AnswerMode) para que InventoryG2 funcione
        Console.Write("Configurando WorkMode a AnswerMode... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x02, 0x00))
            Console.WriteLine("✓");
        else
            Console.WriteLine("✗ FALLÓ");
        Thread.Sleep(300);
        
        // FilterTime = 50ms (0x05 = 50ms)
        Console.Write("Configurando FilterTime a 50ms... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x04, 0x05))
            Console.WriteLine("✓");
        else
            Console.WriteLine("✗ FALLÓ");
        Thread.Sleep(300);
        
        // RFPower = 26 dBm (0x1A)
        Console.Write("Configurando RFPower a 26 dBm... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x05, 0x1A))
            Console.WriteLine("✓");
        else
            Console.WriteLine("✗ FALLÓ");
        Thread.Sleep(300);
        
        // Beep = ON (0x01)
        Console.Write("Configurando Beep a ON... ");
        if (SWNet_SetDeviceOneParam(0xFF, 0x06, 0x01))
            Console.WriteLine("✓");
        else
            Console.WriteLine("✗ FALLÓ");
        Thread.Sleep(300);
        
        Console.WriteLine("");
        Console.WriteLine("=== CONFIGURACIÓN ACTUAL ===");
        
        byte[] val = new byte[1];
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x02, val))
            Console.WriteLine("WorkMode: " + (val[0] == 0 ? "AnswerMode ✓" : "ActiveMode"));
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x04, val))
            Console.WriteLine("FilterTime: " + (val[0] * 10) + "ms");
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x05, val))
            Console.WriteLine("RFPower: " + val[0] + " dBm");
        
        if (SWNet_ReadDeviceOneParam(0xFF, 0x06, val))
            Console.WriteLine("Beep: " + (val[0] == 1 ? "ON ✓" : "OFF"));
        
        SWNet_CloseDevice();
        Console.WriteLine("");
        Console.WriteLine("✅ Configuración completada");
        Console.WriteLine("");
        Console.WriteLine("IMPORTANTE: En Reader Software:");
        Console.WriteLine("  1. Pestaña ParameterSet → ReadTime(*10ms) = 50");
        Console.WriteLine("  2. Pestaña AdvanceSet → ByteLength(Hex) = 0C");
        Console.WriteLine("  3. Pestaña AdvanceSet → Protocol DESMARCADO");
        Console.WriteLine("  4. Click 'Set' en cada cambio");
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp
[ReaderConfig]::Main()

Write-Host ""
Write-Host "Presiona Enter para cerrar..." -ForegroundColor Yellow
Read-Host
