# Test simple de lectura RFID - basado en ejemplo oficial THY
Write-Host "=== TEST SIMPLE RFID ===" -ForegroundColor Cyan
Write-Host "Basado en código oficial de THY" -ForegroundColor Yellow
Write-Host ""

Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0"

$code = @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class RFIDTest
{
    const string DLL = @"C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\SWNetApi.dll";
    
    [DllImport(DLL)] public static extern bool SWNet_OpenDevice(string ip, ushort port);
    [DllImport(DLL)] public static extern bool SWNet_CloseDevice();
    [DllImport(DLL)] public static extern bool SWNet_GetDeviceSystemInfo(byte addr, byte[] buffer);
    [DllImport(DLL)] public static extern bool SWNet_InventoryG2(byte addr, byte[] buffer, out ushort totalLen, out ushort cardNum);
    
    public static void Main()
    {
        Console.WriteLine("Conectando a 192.168.1.200:60000...");
        if (!SWNet_OpenDevice("192.168.1.200", 60000))
        {
            Console.WriteLine("ERROR: No se pudo conectar");
            return;
        }
        
        Console.WriteLine("✓ Conectado");
        
        // Obtener versión
        byte[] sysInfo = new byte[64];
        if (SWNet_GetDeviceSystemInfo(0xFF, sysInfo))
        {
            Console.WriteLine("Versión SW: " + (sysInfo[0] >> 4) + "." + (sysInfo[0] & 0x0F));
            Console.WriteLine("Versión HW: " + (sysInfo[1] >> 4) + "." + (sysInfo[1] & 0x0F));
        }
        
        Console.WriteLine("");
        Console.WriteLine("=== INICIANDO LECTURA CONTINUA ===");
        Console.WriteLine("Coloca un tag cerca de la lectora...");
        Console.WriteLine("Presiona Ctrl+C para salir");
        Console.WriteLine("");
        
        // Loop de lectura cada 500ms (copiado del ejemplo oficial)
        while (true)
        {
            byte[] buffer = new byte[64000];
            ushort totalLen = 0;
            ushort cardNum = 0;
            
            // Ejecutar inventario (Answer Mode - del ejemplo oficial)
            if (SWNet_InventoryG2(0xFF, buffer, out totalLen, out cardNum))
            {
                if (cardNum > 0)
                {
                    Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    Console.WriteLine("📡 TAGS DETECTADOS: " + cardNum);
                    
                    // Parse tags (copiado exacto del Form1.cs oficial)
                    int iLength = 0;
                    for (int iIndex = 0; iIndex < cardNum; iIndex++)
                    {
                        byte bPackLength = buffer[iLength];
                        int iIDLen;
                        
                        // Check timestamp bit (del ejemplo oficial)
                        if ((buffer[1 + iLength + 0] & 0x80) == 0x80)
                        {
                            iIDLen = bPackLength - 7; // Con timestamp
                        }
                        else
                        {
                            iIDLen = bPackLength - 1; // Sin timestamp
                        }
                        
                        // Tipo
                        string type = buffer[1 + iLength + 0].ToString("X2");
                        
                        // Antena
                        string ant = buffer[1 + iLength + 1].ToString("X2");
                        
                        // EPC (offset +2)
                        StringBuilder epc = new StringBuilder();
                        for (int i = 2; i < iIDLen; i++)
                        {
                            epc.Append(buffer[1 + iLength + i].ToString("X2"));
                        }
                        
                        // RSSI
                        string rssi = buffer[1 + iLength + iIDLen].ToString("X2");
                        
                        Console.WriteLine("  Tag #" + (iIndex + 1) + ":");
                        Console.WriteLine("    Type: " + type);
                        Console.WriteLine("    Ant:  " + ant);
                        Console.WriteLine("    EPC:  " + epc.ToString());
                        Console.WriteLine("    RSSI: " + rssi);
                        
                        iLength = iLength + bPackLength + 1;
                    }
                    Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    Console.WriteLine("");
                }
            }
            
            Thread.Sleep(500); // Esperar 500ms (del ejemplo oficial)
        }
    }
}
"@

try {
    Add-Type -TypeDefinition $code -Language CSharp
    [RFIDTest]::Main()
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Presiona Enter para cerrar..."
    Read-Host
}
