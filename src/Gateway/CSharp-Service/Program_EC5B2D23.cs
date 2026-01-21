using System;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.IO;

namespace RFID_Gateway
{
    class Program
    {
        private static string clientId;
        private static string cloudFunctionUrl;
        
        static void Main(string[] args)
        {
            try
            {
                // Cargar configuración
                clientId = ConfigurationManager.AppSettings["ClientId"] ?? "condominio-neos";
                cloudFunctionUrl = ConfigurationManager.AppSettings["CloudFunctionUrl"] ?? "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway";
                
                Console.WriteLine($"[{DateTime.Now}] RFID Gateway iniciado");
                Console.WriteLine($"[{DateTime.Now}] Client ID: {clientId}");
                Console.WriteLine($"[{DateTime.Now}] Cloud Function: {cloudFunctionUrl}");
                
                // Iniciar servidor HTTP
                StartHttpServer();
                
                // Mantener en ejecución
                Console.WriteLine($"[{DateTime.Now}] Presiona Ctrl+C para salir");
                Console.ReadLine();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ERROR: {ex.Message}");
                Console.ReadLine();
            }
        }
        
        private static void StartHttpServer()
        {
            var listener = new HttpListener();
            listener.Prefixes.Add("http://*:60000/");
            listener.Start();
            
            Task.Run(async () =>
            {
                while (true)
                {
                    var context = await listener.GetContextAsync();
                    _ = ProcessRequest(context);
                }
            });
            
            Console.WriteLine($"[{DateTime.Now}] Servidor HTTP en puerto 60000");
        }
        
        private static async Task ProcessRequest(HttpListenerContext context)
        {
            var response = context.Response;
            
            try
            {
                if (context.Request.Url.PathAndQuery == "/health")
                {
                    var healthData = new
                    {
                        status = "healthy",
                        client_id = clientId,
                        timestamp = DateTime.UtcNow,
                        version = "2.0-multi-tenant"
                    };
                    
                    await SendJsonResponse(response, healthData);
                }
                else if (context.Request.Url.PathAndQuery == "/" && context.Request.HttpMethod == "POST")
                {
                    // Procesar tag RFID
                    using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                    {
                        string body = await reader.ReadToEndAsync();
                        var data = JsonConvert.DeserializeObject<dynamic>(body);
                        
                        string tagId = data?.id;
                        string readerId = data?.readsn;
                        
                        if (!string.IsNullOrEmpty(tagId))
                        {
                            // Enviar a Cloud Function
                            bool success = await SendToCloudFunction(tagId, readerId, body);
                            
                            await SendJsonResponse(response, new { 
                                status = success ? "processed" : "error",
                                tag_id = tagId,
                                client_id = clientId
                            });
                        }
                        else
                        {
                            response.StatusCode = 400;
                            await SendJsonResponse(response, new { error = "Tag ID requerido" });
                        }
                    }
                }
                else
                {
                    response.StatusCode = 404;
                    await SendJsonResponse(response, new { error = "Endpoint no encontrado" });
                }
            }
            catch (Exception ex)
            {
                response.StatusCode = 500;
                await SendJsonResponse(response, new { error = ex.Message });
            }
            finally
            {
                response.Close();
            }
        }
        
        private static async Task<bool> SendToCloudFunction(string tagId, string readerId, string rawData)
        {
            try
            {
                var payload = new
                {
                    id = tagId,
                    readsn = readerId,
                    client_id = clientId,  // ← AQUÍ ESTÁ EL CAMBIO PARA MULTI-TENANT
                    gateway_id = Environment.MachineName,
                    timestamp = DateTime.UtcNow.ToString("o")
                };
                
                string jsonPayload = JsonConvert.SerializeObject(payload);
                
                using (var client = new HttpClient())
                {
                    // También enviar en header por si acaso
                    client.DefaultRequestHeaders.Add("X-Client-ID", clientId);
                    
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    var response = await client.PostAsync(cloudFunctionUrl, content);
                    
                    string responseContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[{DateTime.Now}] Tag {tagId} enviado. Respuesta: {responseContent}");
                    
                    return response.IsSuccessStatusCode;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ERROR enviando tag {tagId}: {ex.Message}");
                return false;
            }
        }
        
        private static async Task SendJsonResponse(HttpListenerResponse response, object data)
        {
            string json = JsonConvert.SerializeObject(data);
            byte[] buffer = Encoding.UTF8.GetBytes(json);
            
            response.ContentType = "application/json";
            response.ContentLength64 = buffer.Length;
            
            await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
        }
    }
}
