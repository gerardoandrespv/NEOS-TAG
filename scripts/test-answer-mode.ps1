# Polling manual agresivo para Answer Mode
# Este script hace polling constante al lector y envía tags al dashboard

Write-Host "`n=== Lectura Agresiva en Answer Mode ===" -ForegroundColor Cyan
Write-Host "Este script hace polling constante al lector y muestra tags" -ForegroundColor Yellow
Write-Host ""

Set-Location "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0"

$code = @"
using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Net.Http;
using System.Text;
using Newtonsoft.Json;
using System.Collections.Generic;

public class AggressivePolling
{
    const string DLL = @"C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\SWNetApi.dll";
    
    [DllImport(DLL)] public static extern bool SWNet_OpenDevice(string ip, ushort port);
    [DllImport(DLL)] public static extern bool SWNet_CloseDevice();
    [DllImport(DLL)] public static extern bool SWNet_InventoryG2(byte addr, byte[] buffer, out ushort totalLen, out ushort cardNum);
    
    private static HashSet<string> recentTags = new HashSet<string>();
    private static HttpClient httpClient = new HttpClient();
    
    public static void Main()
    {
        Console.WriteLine("Conectando a 192.168.1.200:60000...");
        if (!SWNet_OpenDevice("192.168.1.200", 60000))
        {
            Console.WriteLine("ERROR: No se pudo conectar");
            return;
        }
        
        Console.WriteLine("✅ Conectado - Iniciando polling agresivo...");
        Console.WriteLine("🏷️ Acerca un tag al lector");
        Console.WriteLine("");
        
        byte[] buffer = new byte[4096];
        ushort totalLen, cardNum;
        int pollCount = 0;
        
        while (true)
        {
            pollCount++;
            
            // Hacer inventario (forzar lectura)
            if (SWNet_InventoryG2(0xFF, buffer, out totalLen, out cardNum))
            {
                if (cardNum > 0)
                {
                    int pos = 0;
                    for (int i = 0; i < cardNum; i++)
                    {
                        byte len = buffer[pos++];
                        string epc = "";
                        for (int j = 0; j < len; j++)
                        {
                            epc += buffer[pos++].ToString("X2");
                        }
                        
                        // Solo procesar si no lo hemos visto recientemente
                        if (!recentTags.Contains(epc))
                        {
                            recentTags.Add(epc);
                            
                            Console.WriteLine("════════════════════════════════════════");
                            Console.WriteLine("TAG DETECTADO: " + epc);
                            Console.WriteLine("Hora: " + DateTime.Now.ToString("HH:mm:ss"));
                            Console.WriteLine("════════════════════════════════════════");
                            
                            // Enviar a Cloud Function
                            SendTagToCloud(epc);
                            
                            // Anti-spam: eliminar después de 5 segundos
                            System.Threading.Tasks.Task.Run(async () =>
                            {
                                await System.Threading.Tasks.Task.Delay(5000);
                                recentTags.Remove(epc);
                            });
                        }
                    }
                }
            }
            
            // Indicador de vida cada 50 polls
            if (pollCount % 50 == 0)
            {
                Console.Write(".");
            }
            
            // Polling cada 200ms (agresivo)
            Thread.Sleep(200);
        }
    }
    
    private static async System.Threading.Tasks.Task SendTagToCloud(string tagId)
    {
        try
        {
            var payload = new
            {
                tag_id = tagId,
                reader_id = "porton_triwe",
                access_point_id = "porton_triwe",
                access_point_name = "Portón Triwe",
                timestamp = DateTime.UtcNow.ToString("o"),
                client_id = "condominio-neos",
                source = "polling_manual"
            };
            
            string json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            Console.WriteLine("Enviando a Cloud Function...");
            var response = await httpClient.PostAsync(
                "https://us-central1-neos-tech.cloudfunctions.net/check-tag-access", 
                content
            );
            
            string result = await response.Content.ReadAsStringAsync();
            Console.WriteLine("Respuesta: " + result);
            Console.WriteLine("");
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error enviando tag: " + ex.Message);
        }
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp -ReferencedAssemblies @(
    "System.Net.Http",
    "System.Runtime",
    "C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0\Newtonsoft.Json.dll"
)

Write-Host "Iniciando polling..." -ForegroundColor Green
[AggressivePolling]::Main()
