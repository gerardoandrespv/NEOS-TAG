# Test directo de lectura de tags - Sin Gateway
Write-Host "`n=== TEST DIRECTO DE LECTOR RFID ===" -ForegroundColor Cyan
Write-Host "Este script lee directamente del lector sin pasar por el Gateway" -ForegroundColor Yellow
Write-Host ""

Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0"

$code = @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class DirectRFIDTest
{
    const string DLL = @"C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\SWNetApi.dll";
    
    [DllImport(DLL)] public static extern bool SWNet_OpenDevice(string ip, ushort port);
    [DllImport(DLL)] public static extern bool SWNet_CloseDevice();
    [DllImport(DLL)] public static extern bool SWNet_InventoryG2(byte addr, byte[] buffer, out ushort totalLen, out ushort cardNum);
    
    public static void Main()
    {
        Console.WriteLine("Conectando a 192.168.1.200:60000...");
        if (!SWNet_OpenDevice("192.168.1.200", 60000))
        {
            Console.WriteLine("ERROR: No se pudo conectar al lector");
            Console.WriteLine("Verifica que:");
            Console.WriteLine("  1. El lector esté encendido");
            Console.WriteLine("  2. La IP sea correcta (192.168.1.200)");
            Console.WriteLine("  3. No haya otro programa usando el lector");
            return;
        }
        
        Console.WriteLine("✓ Conectado exitosamente");
        Console.WriteLine("");
        Console.WriteLine("=== LECTURA CONTINUA ===");
        Console.WriteLine("🏷️ Acerca un tag RFID al lector...");
        Console.WriteLine("Presiona Ctrl+C para salir");
        Console.WriteLine("");
        
        byte[] buffer = new byte[4096];
        ushort totalLen = 0;
        ushort cardNum = 0;
        int readCount = 0;
        
        while (true)
        {
            readCount++;
            if (SWNet_InventoryG2(0xFF, buffer, out totalLen, out cardNum))
            {
                if (cardNum > 0)
                {
                    Console.WriteLine("════════════════════════════════════════");
                    Console.WriteLine("🎯 ¡TAG DETECTADO!");
                    Console.WriteLine("Cantidad de tags: " + cardNum);
                    Console.WriteLine("Hora: " + DateTime.Now.ToString("HH:mm:ss.fff"));
                    
                    int pos = 0;
                    for (int i = 0; i < cardNum; i++)
                    {
                        byte len = buffer[pos];
                        pos++;
                        
                        string epc = "";
                        for (int j = 0; j < len; j++)
                        {
                            epc += buffer[pos].ToString("X2");
                            pos++;
                        }
                        
                        Console.WriteLine("");
                        Console.WriteLine("Tag #" + (i + 1) + ": " + epc);
                        Console.WriteLine("Longitud: " + len + " bytes");
                    }
                    
                    Console.WriteLine("════════════════════════════════════════");
                    Console.WriteLine("");
                    
                    // Pausa para no saturar
                    Thread.Sleep(2000);
                }
            }
            
            // Mostrar indicador de vida cada 20 lecturas
            if (readCount % 20 == 0)
            {
                Console.Write(".");
            }
            
            Thread.Sleep(300);
        }
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp

Write-Host "Iniciando lectura directa..." -ForegroundColor Green
Write-Host ""

[DirectRFIDTest]::Main()
