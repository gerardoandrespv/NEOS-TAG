using System;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.IO;
using System.Collections.Generic;

namespace RFID_Gateway
{
    class AccessPointConfig
    {
        public string id { get; set; }
        public string name { get; set; }
        public string reader_ip { get; set; }
        public int reader_port { get; set; }
        public int relay_channel { get; set; }
        public int open_duration_ms { get; set; }
    }

    class Program
    {
        private static string clientId;
        private static string cloudFunctionUrl;
        private static Dictionary<string, AccessPointConfig> accessPoints = new Dictionary<string, AccessPointConfig>();
        
        static async Task Main(string[] args)
        {
            try
            {
                // Cargar configuración
                clientId = ConfigurationManager.AppSettings["ClientId"] ?? "condominio-neos";
                cloudFunctionUrl = ConfigurationManager.AppSettings["CloudFunctionUrl"] ?? "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway";
                
                // Cargar puntos de acceso
                LoadAccessPoints();
                
                Console.WriteLine($"[{DateTime.Now}] RFID Gateway iniciado");
                Console.WriteLine($"[{DateTime.Now}] Client ID: {clientId}");
                Console.WriteLine($"[{DateTime.Now}] Cloud Function: {cloudFunctionUrl}");
                Console.WriteLine($"[{DateTime.Now}] Puntos de acceso cargados: {accessPoints.Count}");
                
                // Iniciar servidor HTTP
                await Task.Run(() => StartHttpServer());
                
                // Mantener en ejecución
                Console.WriteLine($"[{DateTime.Now}] Presiona Ctrl+C para salir");
                await Task.Delay(-1);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ERROR: {ex.Message}");
                Console.ReadLine();
            }
        }
        
        private static void LoadAccessPoints()
        {
            try
            {
                string configFile = "gateway.config.json";
                if (File.Exists(configFile))
                {
                    string json = File.ReadAllText(configFile);
                    var config = JsonConvert.DeserializeObject<dynamic>(json);
                    
                    foreach (var ap in config.access_points)
                    {
                        var point = new AccessPointConfig
                        {
                            id = ap.id,
                            name = ap.name,
                            reader_ip = ap.reader_ip,
                            reader_port = (int)ap.reader_port,
                            relay_channel = (int)ap.relay_channel,
                            open_duration_ms = (int)ap.open_duration_ms
                        };
                        accessPoints[point.id] = point;
                        Console.WriteLine($"[{DateTime.Now}] Cargado: {point.name} @ {point.reader_ip}:{point.reader_port}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] Error cargando config: {ex.Message}");
            }
        }
        
        private static void StartHttpServer()
        {
            var listener = new HttpListener();
            listener.Prefixes.Add("http://localhost:60000/");
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
                        version = "6.0-relay-control"
                    };
                    
                    await SendJsonResponse(response, healthData);
                }
                else if (context.Request.Url.PathAndQuery == "/api/open" && context.Request.HttpMethod == "POST")
                {
                    // Control manual de portones
                    using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                    {
                        string body = await reader.ReadToEndAsync();
                        var data = JsonConvert.DeserializeObject<dynamic>(body);
                        
                        string accessPointId = data?.access_point;
                        
                        if (!string.IsNullOrEmpty(accessPointId) && accessPoints.ContainsKey(accessPointId))
                        {
                            var ap = accessPoints[accessPointId];
                            Console.WriteLine($"[{DateTime.Now}] APERTURA MANUAL: {ap.name}");
                            
                            bool success = await ActivateRelay(ap);
                            
                            if (success)
                            {
                                await SendJsonResponse(response, new { 
                                    status = "success",
                                    access_point = accessPointId,
                                    name = ap.name,
                                    message = "Relay activado correctamente"
                                });
                            }
                            else
                            {
                                response.StatusCode = 500;
                                await SendJsonResponse(response, new { error = "Error activando relay" });
                            }
                        }
                        else
                        {
                            response.StatusCode = 404;
                            await SendJsonResponse(response, new { error = "Punto de acceso no encontrado" });
                        }
                    }
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
        
        private static async Task<bool> ActivateRelay(AccessPointConfig ap)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    
                    // URL para activar relay en la lectora RFID
                    // Formato: http://IP:PORT/relay?ch=1&time=5000
                    string url = $"http://{ap.reader_ip}:{ap.reader_port}/relay?ch={ap.relay_channel}&time={ap.open_duration_ms}";
                    
                    Console.WriteLine($"[{DateTime.Now}] Activando relay: {url}");
                    
                    var response = await client.GetAsync(url);
                    string content = await response.Content.ReadAsStringAsync();
                    
                    Console.WriteLine($"[{DateTime.Now}] Respuesta lectora [{response.StatusCode}]: {content}");
                    
                    return response.IsSuccessStatusCode;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ERROR activando relay: {ex.Message}");
                return false;
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
                    client_id = clientId,
                    gateway_id = Environment.MachineName,
                    timestamp = DateTime.UtcNow.ToString("o")
                };
                
                string jsonPayload = JsonConvert.SerializeObject(payload);
                
                using (var client = new HttpClient())
                {
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
