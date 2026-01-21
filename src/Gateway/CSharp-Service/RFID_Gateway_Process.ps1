# Gateway RFID Neos Tech - PowerShell Version
# Se ejecuta como proceso independiente en puerto 60000

# Configuración
$port = 60000
$cloudFunctionUrl = "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway"
$logFile = "C:\NeosTech-RFID-System-Pro\logs\gateway_process.log"

# Crear directorio de logs si no existe
$logDir = Split-Path $logFile -Parent
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

# Función para escribir logs
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $Message"
    $logMessage | Out-File -FilePath $logFile -Append -Encoding UTF8
    Write-Host $logMessage
}

Write-Log "=== INICIANDO GATEWAY RFID ==="
Write-Log "Puerto: $port"
Write-Log "Cloud Function: $cloudFunctionUrl"

try {
    # Cargar ensamblados necesarios
    Add-Type -TypeDefinition @"
        using System;
        using System.Net;
        using System.Text;
        using System.IO;
        using System.Threading;
        
        public class RFIDHttpServer
        {
            private HttpListener listener;
            private Thread listenerThread;
            private bool isRunning = true;
            
            public RFIDHttpServer(int port)
            {
                listener = new HttpListener();
                listener.Prefixes.Add($"http://localhost:{port}/");
                listener.Start();
                
                listenerThread = new Thread(new ThreadStart(ListenerLoop));
                listenerThread.Start();
                
                Console.WriteLine($"RFID Gateway escuchando en http://localhost:{port}/");
            }
            
            private void ListenerLoop()
            {
                while (isRunning)
                {
                    try
                    {
                        var context = listener.GetContext();
                        ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                    }
                    catch (Exception ex)
                    {
                        if (isRunning)
                            Console.WriteLine($"Error en listener: {ex.Message}");
                    }
                }
            }
            
            private void ProcessRequest(object state)
            {
                var context = (HttpListenerContext)state;
                var request = context.Request;
                var response = context.Response;
                
                try
                {
                    // Health Check
                    if (request.HttpMethod == "GET" && request.Url.AbsolutePath == "/health")
                    {
                        string json = "{\"status\":\"ok\",\"service\":\"RFID Gateway\",\"version\":\"condominio_2.0\",\"timestamp\":\"" + DateTime.UtcNow.ToString("o") + "\"}";
                        SendResponse(response, json);
                        return;
                    }
                    
                    // API Tag
                    if (request.HttpMethod == "POST" && request.Url.AbsolutePath == "/api/tag")
                    {
                        string body;
                        using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                        {
                            body = reader.ReadToEnd();
                        }
                        
                        Console.WriteLine($"Tag recibido: {body}");
                        
                        // Enviar a Cloud Function
                        string cloudResponse = SendToCloud(body);
                        
                        SendResponse(response, cloudResponse);
                        return;
                    }
                    
                    // Not found
                    response.StatusCode = 404;
                    SendResponse(response, "{\"error\":\"Not found\"}");
                }
                catch (Exception ex)
                {
                    response.StatusCode = 500;
                    SendResponse(response, $"{{\"error\":\"{ex.Message.Replace("\"", "'")}\"}}");
                }
            }
            
            private void SendResponse(HttpListenerResponse response, string content)
            {
                byte[] buffer = Encoding.UTF8.GetBytes(content);
                response.ContentType = "application/json";
                response.ContentLength64 = buffer.Length;
                response.OutputStream.Write(buffer, 0, buffer.Length);
                response.OutputStream.Close();
            }
            
            private string SendToCloud(string data)
            {
                try
                {
                    var request = WebRequest.Create("$cloudFunctionUrl");
                    request.Method = "POST";
                    request.ContentType = "application/json";
                    request.Timeout = 10000; // 10 segundos
                    
                    byte[] bytes = Encoding.UTF8.GetBytes(data);
                    request.ContentLength = bytes.Length;
                    
                    using (var stream = request.GetRequestStream())
                    {
                        stream.Write(bytes, 0, bytes.Length);
                    }
                    
                    using (var response = request.GetResponse())
                    using (var stream = response.GetResponseStream())
                    using (var reader = new StreamReader(stream))
                    {
                        return reader.ReadToEnd();
                    }
                }
                catch (WebException ex)
                {
                    using (var stream = ex.Response?.GetResponseStream())
                    {
                        if (stream != null)
                        {
                            using (var reader = new StreamReader(stream))
                            {
                                return reader.ReadToEnd();
                            }
                        }
                    }
                    return $"{{\"error\":\"{ex.Message.Replace("\"", "'")}\"}}";
                }
            }
            
            public void Stop()
            {
                isRunning = false;
                listener.Stop();
                listenerThread.Join(3000);
            }
        }
"@ -ReferencedAssemblies @("System.Net.Http.dll")

    # Iniciar servidor
    Write-Log "Iniciando servidor HTTP..."
    $server = New-Object RFIDHttpServer($port)
    Write-Log "✅ Servidor iniciado correctamente"
    
    # Mantener el proceso activo
    Write-Log "Gateway funcionando. Presiona Ctrl+C para detener."
    while ($true) {
        Start-Sleep -Seconds 10
    }
    
} catch {
    Write-Log "ERROR CRÍTICO: $($_.Exception.Message)"
    Write-Log $_.Exception.StackTrace
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
