param(
    [string]$Action = "run"
)

if ($Action -eq "install") {
    # Crear servicio Windows
    $serviceName = "RFIDGateway"
    $displayName = "RFID Gateway Service"
    $description = "Servicio Gateway para sistema RFID Neos Tech"
    
    # Ruta al script actual
    $scriptPath = $MyInvocation.MyCommand.Path
    $powershellPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
    $serviceCommand = "& `"$powershellPath`" -ExecutionPolicy Bypass -File `"$scriptPath`" run"
    
    # Crear servicio
    sc.exe create $serviceName binPath= "`"$powershellPath`" -ExecutionPolicy Bypass -File `"$scriptPath`" run" start= auto DisplayName= "$displayName"
    sc.exe description $serviceName "$description"
    
    Write-Host "Servicio creado: $serviceName" -ForegroundColor Green
    sc.exe start $serviceName
    exit 0
}

if ($Action -eq "uninstall") {
    sc.exe stop RFIDGateway
    sc.exe delete RFIDGateway
    Write-Host "Servicio eliminado" -ForegroundColor Green
    exit 0
}

# ============================================
# GATEWAY HTTP EN POWERSHELL
# ============================================

Add-Type -TypeDefinition @"
using System;
using System.Net;
using System.Text;
using System.IO;

public class RFIDGatewayServer
{
    private HttpListener listener;
    
    public void Start()
    {
        listener = new HttpListener();
        listener.Prefixes.Add("http://localhost:60000/");
        listener.Start();
        Console.WriteLine("RFID Gateway escuchando en http://localhost:60000/");
        
        while (true)
        {
            try
            {
                var context = listener.GetContext();
                ProcessRequest(context);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
            }
        }
    }
    
    private void ProcessRequest(HttpListenerContext context)
    {
        var request = context.Request;
        var response = context.Response;
        
        try
        {
            // Health Check
            if (request.HttpMethod == "GET" && request.Url.AbsolutePath == "/health")
            {
                string json = "{\"status\":\"ok\",\"service\":\"RFID Gateway PowerShell\",\"version\":\"condominio_2.0\"}";
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
                string cloudUrl = "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway";
                string cloudResponse = SendToCloud(cloudUrl, body);
                
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
            SendResponse(response, $"{{\"error\":\"{ex.Message}\"}}");
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
    
    private string SendToCloud(string url, string data)
    {
        try
        {
            var request = WebRequest.Create(url);
            request.Method = "POST";
            request.ContentType = "application/json";
            
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
            return $"{{\"error\":\"{ex.Message}\"}}";
        }
    }
}
"@ -ReferencedAssemblies @("System.Net.Http.dll")

# Iniciar servidor
$gateway = New-Object RFIDGatewayServer
$gateway.Start()
