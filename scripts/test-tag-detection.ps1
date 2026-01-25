# Test de detección básica de tags
Write-Host "=== TEST DE DETECCION DE TAGS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Coloca un tag PEGADO a la antena (muy cerca)" -ForegroundColor Yellow
Write-Host "Presiona Enter cuando esté listo..."
Read-Host

Write-Host "`nProbando lectura manual (Inventory)..." -ForegroundColor Cyan

# Compilar si es necesario
dotnet build C:\NeosTech-RFID-System-Pro\src\Gateway\Rfid_gateway.csproj -c Release --nologo -v q

if ($LASTEXITCODE -eq 0) {
    # Crear script temporal para test
    $testCode = @'
using System;
using System.Runtime.InteropServices;

public class TagTest
{
    [DllImport("SWNetApi.dll", EntryPoint = "SWNet_OpenDevice")]
    public static extern bool SWNet_OpenDevice(string ipAddress, ushort port);
    
    [DllImport("SWNetApi.dll", EntryPoint = "SWNet_CloseDevice")]
    public static extern bool SWNet_CloseDevice();
    
    [DllImport("SWNetApi.dll", EntryPoint = "SWNet_InventoryG2")]
    public static extern byte SWNet_InventoryG2(byte devAddr, byte[] buffer, out ushort totalLen, out ushort cardNum);
    
    public static void Main()
    {
        Console.WriteLine("[TEST] Conectando a lectora...");
        
        if (!SWNet_OpenDevice("192.168.1.200", 60000))
        {
            Console.WriteLine("[ERROR] No se pudo conectar");
            return;
        }
        
        Console.WriteLine("[OK] Conectado");
        Console.WriteLine("[TEST] Ejecutando Inventory...");
        
        byte[] buffer = new byte[64000];
        ushort totalLen = 0;
        ushort cardNum = 0;
        
        byte result = SWNet_InventoryG2(0xFF, buffer, out totalLen, out cardNum);
        
        Console.WriteLine($"[RESULTADO] result={result}, totalLen={totalLen}, cardNum={cardNum}");
        
        if (cardNum > 0)
        {
            Console.WriteLine($"[EXITO] Se detectaron {cardNum} tags!");
            
            // Mostrar primer tag
            int epcLen = buffer[5];
            Console.Write("[TAG] EPC: ");
            for (int i = 0; i < epcLen; i++)
            {
                Console.Write($"{buffer[6 + i]:X2}");
            }
            Console.WriteLine();
        }
        else
        {
            Console.WriteLine("[FALLA] NO se detectaron tags");
            Console.WriteLine("[INFO] Verifica:");
            Console.WriteLine("  1. Tag pegado a la antena");
            Console.WriteLine("  2. Tag es EPC Gen2 (UHF)");
            Console.WriteLine("  3. RFPower >= 26 dBm en Reader software");
            Console.WriteLine("  4. Antena conectada correctamente");
        }
        
        SWNet_CloseDevice();
    }
}
'@
    
    # Guardar código temporal
    $testCode | Out-File -FilePath "C:\NeosTech-RFID-System-Pro\src\Gateway\TagTest.cs" -Encoding UTF8
    
    # Compilar y ejecutar test
    Write-Host "`nCompilando test..." -ForegroundColor Yellow
    
    $binPath = "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0"
    
    csc /target:exe /out:"$binPath\TagTest.exe" "C:\NeosTech-RFID-System-Pro\src\Gateway\TagTest.cs"
    
    if (Test-Path "$binPath\TagTest.exe") {
        Write-Host "`nEjecutando test...`n" -ForegroundColor Green
        
        Push-Location $binPath
        .\TagTest.exe
        Pop-Location
    } else {
        Write-Host "`nERROR: No se pudo compilar el test" -ForegroundColor Red
        Write-Host "Usando método alternativo...`n" -ForegroundColor Yellow
        
        # Test alternativo: verificar conexión
        $testConn = Test-NetConnection 192.168.1.200 -Port 60000
        if ($testConn.TcpTestSucceeded) {
            Write-Host "[OK] Lectora responde en puerto 60000" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Lectora NO responde - verificar conexión red" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Error compilando Gateway" -ForegroundColor Red
}

Write-Host "`n" 
Write-Host "=== FIN DEL TEST ===" -ForegroundColor Cyan
Read-Host "Presiona Enter para salir"
