using System;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.IO;
using System.Collections.Generic;
using System.Linq;

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
        
        // Sistema anti-spam para tags
        private static Dictionary<string, DateTime> lastTagRead = new Dictionary<string, DateTime>();
        private static int tagCooldownSeconds = 5; // No procesar el mismo tag por 5 segundos
        
        // Control de lectura automática
        private static bool isReading = false;
        private static System.Threading.CancellationTokenSource readingCancellation;
        
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
                
                // Iniciar lectura automática de tags
                StartAutoTagReading();
                Console.WriteLine($"[{DateTime.Now}] ✅ Lectura automática habilitada");
                
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
                string fullPath = Path.GetFullPath(configFile);
                Console.WriteLine($"[{DateTime.Now}] Buscando configuración en: {fullPath}");
                
                if (File.Exists(configFile))
                {
                    string json = File.ReadAllText(configFile);
                    var config = JsonConvert.DeserializeObject<dynamic>(json);
                    
                    Console.WriteLine($"[{DateTime.Now}] Archivo de configuración encontrado y parseado");
                    
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
                else
                {
                    Console.WriteLine($"[{DateTime.Now}] ⚠️ Archivo de configuración NO encontrado en: {fullPath}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] Error cargando config: {ex.Message}");
            }
        }
        
        private static void StartHttpServer()
        {
            HttpListener listener = null;
            bool started = false;
            
            // Intentar primero escuchar en todas las interfaces
            try
            {
                listener = new HttpListener();
                listener.Prefixes.Add("http://+:8080/");
                listener.Start();
                started = true;
                
                // Mostrar todas las IPs locales donde está disponible
                var localIPs = System.Net.Dns.GetHostAddresses(System.Net.Dns.GetHostName())
                    .Where(ip => ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                    .Select(ip => ip.ToString())
                    .ToList();
                
                Console.WriteLine($"[{DateTime.Now}] 🌐 Servidor HTTP activo en puerto 8080");
                Console.WriteLine($"[{DateTime.Now}] 📡 Accesible desde:");
                Console.WriteLine($"[{DateTime.Now}]    - http://localhost:8080");
                foreach (var ip in localIPs)
                {
                    Console.WriteLine($"[{DateTime.Now}]    - http://{ip}:8080");
                }
            }
            catch (System.Net.HttpListenerException ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ⚠️ No se pudo escuchar en todas las interfaces: {ex.Message}");
                Console.WriteLine($"[{DateTime.Now}] 💡 Intentando solo localhost...");
                
                try
                {
                    // Fallback a localhost si no hay permisos
                    if (listener != null)
                    {
                        try { listener.Close(); } catch { }
                    }
                    
                    listener = new HttpListener();
                    listener.Prefixes.Add("http://localhost:8080/");
                    listener.Start();
                    started = true;
                    
                    Console.WriteLine($"[{DateTime.Now}] ✅ Servidor HTTP iniciado en http://localhost:8080");
                    Console.WriteLine($"[{DateTime.Now}] ⚠️ ADVERTENCIA: La lectora (192.168.1.200) NO podrá enviar tags.");
                    Console.WriteLine($"[{DateTime.Now}] 💡 Ejecuta como Administrador para recibir tags HTTP.");
                }
                catch (Exception ex2)
                {
                    Console.WriteLine($"[{DateTime.Now}] ❌ Error crítico iniciando servidor HTTP: {ex2.Message}");
                    Console.WriteLine($"[{DateTime.Now}] ❌ El Gateway continuará con lectura de tags pero sin API HTTP");
                    return;
                }
            }
            
            // Iniciar procesamiento de peticiones
            if (started && listener != null)
            {
                Task.Run(async () =>
                {
                    try
                    {
                        while (true)
                        {
                            var context = await listener.GetContextAsync();
                            _ = ProcessRequest(context);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[{DateTime.Now}] ❌ Error en servidor HTTP: {ex.Message}");
                    }
                });
                
                Console.WriteLine($"[{DateTime.Now}] ✅ Servidor HTTP esperando peticiones...");
            }
        }
        
        private static async Task ProcessRequest(HttpListenerContext context)
        {
            var response = context.Response;
            
            // Agregar headers CORS para permitir peticiones desde el dashboard
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
            
            // Manejar preflight request (OPTIONS)
            if (context.Request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }
            
            try
            {
                // DEBUG: Log de TODAS las peticiones HTTP
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 📨 HTTP {context.Request.HttpMethod} {context.Request.Url.PathAndQuery}");
                
                // Endpoint para recibir tags de la lectora THY (HTTP Protocol)
                if (context.Request.Url.PathAndQuery.StartsWith("/readerid"))
                {
                    // Parámetros reales de la lectora THY:
                    // - id=EPC (tag detectado)
                    // - readsn=Serial (número de serie de la lectora)
                    // - heart=1 (heartbeat cada 30 seg)
                    string tagId = context.Request.QueryString["id"];
                    string heart = context.Request.QueryString["heart"];
                    string readsn = context.Request.QueryString["readsn"];
                    
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 🔍 Parámetros recibidos: id={tagId}, heart={heart}, readsn={readsn}");
                    
                    // Ignorar heartbeats (solo procesar tags reales)
                    if (!string.IsNullOrEmpty(tagId) && heart != "1")
                    {
                        Console.WriteLine($"[{DateTime.Now:dd-MM-yyyy HH:mm:ss}] 🏷️ TAG HTTP: {tagId}");
                        
                        var reader = accessPoints.Values.FirstOrDefault();
                        if (reader != null)
                        {
                            await ProcessTag(tagId, reader);
                        }
                        else
                        {
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ⚠️ No hay puntos de acceso configurados");
                        }
                    }
                    else if (heart == "1")
                    {
                        Console.WriteLine($"[{DateTime.Now:dd-MM-yyyy HH:mm:ss}] 💓 Heartbeat de lectora {readsn}");
                    }
                    else
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ⚠️ Tag vacío o heartbeat ignorado");
                    }
                    
                    response.StatusCode = 200;
                    await SendJsonResponse(response, new { status = "ok" });
                }
                else if (context.Request.Url.PathAndQuery == "/health")
                {
                    var healthData = new
                    {
                        status = "healthy",
                        client_id = clientId,
                        timestamp = DateTime.UtcNow,
                        version = "6.1-http-reader"
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
                else if (context.Request.Url.PathAndQuery.StartsWith("/api/reader/config") && context.Request.HttpMethod == "GET")
                {
                    // Obtener configuración del lector
                    string accessPointId = context.Request.QueryString["access_point"] ?? "porton_triwe";
                    
                    if (accessPoints.ContainsKey(accessPointId))
                    {
                        var ap = accessPoints[accessPointId];
                        Console.WriteLine($"[{DateTime.Now}] 📋 Leyendo configuración completa de: {ap.name}");
                        
                        // Para este endpoint, NO necesitamos reconectar porque ya hay una conexión abierta
                        // en el loop de auto-lectura
                        var config = THYReaderAPI.GetFullConfiguration();
                        
                        await SendJsonResponse(response, new {
                            status = "success",
                            access_point = accessPointId,
                            name = ap.name,
                            reader_ip = ap.reader_ip,
                            reader_port = ap.reader_port,
                            connected = true,
                            config = config
                        });
                    }
                    else
                    {
                        response.StatusCode = 404;
                        await SendJsonResponse(response, new { error = "Punto de acceso no encontrado" });
                    }
                }
                else if (context.Request.Url.PathAndQuery.StartsWith("/api/reader/config") && context.Request.HttpMethod == "POST")
                {
                    // Configurar lector
                    using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                    {
                        string body = await reader.ReadToEndAsync();
                        var data = JsonConvert.DeserializeObject<dynamic>(body);
                        
                        string accessPointId = data?.access_point;
                        
                        if (!string.IsNullOrEmpty(accessPointId) && accessPoints.ContainsKey(accessPointId))
                        {
                            var ap = accessPoints[accessPointId];
                            Console.WriteLine($"[{DateTime.Now}] ⚙️ Configurando lector: {ap.name}");
                            
                            bool connected = THYReaderAPI.Connect(ap.reader_ip, ap.reader_port);
                            
                            if (connected)
                            {
                                try
                                {
                                    // Convertir configuración del JSON a Dictionary
                                    var config = new Dictionary<string, object>();
                                    
                                    if (data.config != null)
                                    {
                                        foreach (var prop in data.config)
                                        {
                                            config[prop.Name] = prop.Value.Value;
                                        }
                                    }
                                    
                                    bool success = THYReaderAPI.SetReaderConfig(config);
                                    
                                    if (success)
                                    {
                                        await SendJsonResponse(response, new {
                                            status = "success",
                                            message = "Configuración guardada exitosamente"
                                        });
                                    }
                                    else
                                    {
                                        response.StatusCode = 500;
                                        await SendJsonResponse(response, new { error = "Error guardando configuración" });
                                    }
                                }
                                finally
                                {
                                    THYReaderAPI.SWNet_CloseDevice();
                                }
                            }
                            else
                            {
                                response.StatusCode = 503;
                                await SendJsonResponse(response, new { error = "No se pudo conectar al lector" });
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
            return await Task.Run(() =>
            {
                try
                {
                    Console.WriteLine($"[{DateTime.Now}] Activando relay del lector {ap.name}...");
                    
                    // NO reconectar - usar la conexión existente del autoread
                    // El lector ya está conectado por StartAutoRead()
                    
                    // Activar relé (algunos lectores devuelven false pero funcionan)
                    THYReaderAPI.ActivateRelay(0xFF);
                    Console.WriteLine($"[{DateTime.Now}] ⚡ Relé activado para {ap.name}");
                    
                    // Mantener activo por la duración configurada
                    System.Threading.Thread.Sleep(ap.open_duration_ms);
                    
                    // Desactivar relay
                    THYReaderAPI.DeactivateRelay(0xFF);
                    Console.WriteLine($"[{DateTime.Now}] ✅ Relé desactivado");
                    
                    return true;  // Asumir éxito ya que físicamente funciona
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTime.Now}] ERROR activando relay: {ex.Message}");
                    return false;
                }
            });
        }
        
        private static async Task<(bool isAllowed, string status, string message)> CheckTagAccess(string tagId)
        {
            try
            {
                // Consultar cloud function para verificar acceso
                string checkUrl = cloudFunctionUrl.Replace("/rfid-gateway", "/check-tag-access");
                
                var payload = new
                {
                    tag_id = tagId,
                    client_id = clientId
                };
                
                string jsonPayload = JsonConvert.SerializeObject(payload);
                
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    client.DefaultRequestHeaders.Add("X-Client-ID", clientId);
                    
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    var response = await client.PostAsync(checkUrl, content);
                    
                    string responseContent = await response.Content.ReadAsStringAsync();
                    
                    if (response.IsSuccessStatusCode)
                    {
                        dynamic result = JsonConvert.DeserializeObject(responseContent);
                        bool isAllowed = result?.access_granted ?? false;
                        string status = result?.status ?? "unknown";
                        string message = result?.message ?? "Sin información";
                        
                        return (isAllowed, status, message);
                    }
                    else
                    {
                        Console.WriteLine($"[{DateTime.Now}] ⚠️ Error verificando tag: {responseContent}");
                        return (false, "error", "Error consultando acceso");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ⚠️ Excepción verificando tag: {ex.Message}");
                // En caso de error de red, denegar acceso por seguridad
                return (false, "error", $"Error de conexión: {ex.Message}");
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
        
        // ============================================
        // LECTURA AUTOMÁTICA DE TAGS
        // ============================================
        
        private static void StartAutoTagReading()
        {
            if (accessPoints.Count == 0)
            {
                Console.WriteLine($"[{DateTime.Now}] ⚠️ No hay puntos de acceso configurados. Lectura automática deshabilitada.");
                return;
            }
            
            // Usar el primer punto de acceso como lector principal
            var mainReader = accessPoints.Values.First();
            
            Console.WriteLine($"[{DateTime.Now}] 🔄 Iniciando lectura automática de tags...");
            Console.WriteLine($"[{DateTime.Now}] 📡 Lector: {mainReader.name} ({mainReader.reader_ip}:{mainReader.reader_port})");
            Console.WriteLine($"[{DateTime.Now}] ⏱️ Anti-spam: {tagCooldownSeconds} segundos");
            
            readingCancellation = new System.Threading.CancellationTokenSource();
            isReading = true;
            
            // Iniciar lectura en background
            Task.Run(async () => await ReadTagsLoop(mainReader), readingCancellation.Token);
        }
        
        private static async Task ReadTagsLoop(AccessPointConfig reader)
        {
            bool isConnected = false;
            int reconnectAttempts = 0;
            
            while (!readingCancellation.Token.IsCancellationRequested)
            {
                try
                {
                    // Conectar al lector si no está conectado
                    if (!isConnected)
                    {
                        Console.WriteLine($"[{DateTime.Now}] 🔌 Conectando al lector {reader.name}...");
                        isConnected = THYReaderAPI.Connect(reader.reader_ip, reader.reader_port);
                        
                        if (isConnected)
                        {
                            Console.WriteLine($"[{DateTime.Now}] ✅ Conectado al lector {reader.name}");
                            
                            // Intentar iniciar lectura continua
                            bool startReadResult = THYReaderAPI.SWNet_StartRead(0xFF);
                            Console.WriteLine($"[{DateTime.Now}] 📡 StartRead: {(startReadResult ? "OK" : "FAIL")}");
                            
                            Console.WriteLine($"[{DateTime.Now}] 📡 Modo polling del buffer (cada 500ms)");
                            Console.WriteLine($"[{DateTime.Now}] 💡 Acerca un tag RFID al lector...");
                            
                            // Limpiar buffer antiguo
                            THYReaderAPI.SWNet_ClearTagBuf();
                            
                            reconnectAttempts = 0;
                        }
                        else
                        {
                            reconnectAttempts++;
                            Console.WriteLine($"[{DateTime.Now}] ❌ No se pudo conectar al lector (intento {reconnectAttempts})");
                            
                            // Esperar antes de reintentar (backoff exponencial)
                            await Task.Delay(Math.Min(5000 * reconnectAttempts, 30000));
                            continue;
                        }
                    }
                    
                    // DEBUG: Mostrar que estamos en el loop
                    if (DateTime.Now.Second % 10 == 0 && DateTime.Now.Millisecond < 500)
                    {
                        Console.WriteLine($"[{DateTime.Now}] 🔍 Polling... (cada 500ms)");
                    }
                    
                    // MÉTODO 1: Leer buffer de tags (tags que llegaron automáticamente)
                    var bufferTags = THYReaderAPI.ReadTagBuffer();
                    
                    if (bufferTags != null && bufferTags.Length > 0)
                    {
                        Console.WriteLine($"[{DateTime.Now}] 📡 Buffer: {bufferTags.Length} tag(s) detectado(s)");
                        
                        foreach (var tag in bufferTags)
                        {
                            if (!string.IsNullOrWhiteSpace(tag))
                            {
                                Console.WriteLine($"[{DateTime.Now}] 🏷️ TAG BUFFER: {tag}");
                                await ProcessTag(tag, reader);
                            }
                        }
                    }
                    
                    // MÉTODO 2: Forzar inventario (comando-respuesta)
                    var inventoryTags = THYReaderAPI.DoInventory(0xFF);
                    
                    if (inventoryTags != null && inventoryTags.Length > 0)
                    {
                        Console.WriteLine($"[{DateTime.Now}] 📡 Inventory: {inventoryTags.Length} tag(s) detectado(s)");
                        
                        foreach (var tag in inventoryTags)
                        {
                            if (!string.IsNullOrWhiteSpace(tag))
                            {
                                Console.WriteLine($"[{DateTime.Now}] 🏷️ TAG INVENTORY: {tag}");
                                await ProcessTag(tag, reader);
                            }
                        }
                    }
                    
                    // Esperar antes de la siguiente lectura (polling interval)
                    await Task.Delay(500); // Cada 500ms para respuesta rápida
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTime.Now}] ❌ Error en lectura automática: {ex.Message}");
                    
                    // Desconectar y reintentar
                    try { THYReaderAPI.SWNet_CloseDevice(); } catch { }
                    isConnected = false;
                    
                    await Task.Delay(5000);
                }
            }
            
            // Cleanup al salir
            try
            {
                THYReaderAPI.SWNet_CloseDevice();
                Console.WriteLine($"[{DateTime.Now}] 🛑 Lectura automática detenida");
            }
            catch { }
        }
        
        private static async Task ProcessTag(string tagId, AccessPointConfig reader)
        {
            // Sistema anti-spam: verificar si ya procesamos este tag recientemente
            DateTime now = DateTime.Now;
            
            if (lastTagRead.ContainsKey(tagId))
            {
                var timeSinceLastRead = (now - lastTagRead[tagId]).TotalSeconds;
                
                if (timeSinceLastRead < tagCooldownSeconds)
                {
                    // Tag leído muy recientemente, ignorar
                    return;
                }
            }
            
            // Actualizar timestamp de última lectura
            lastTagRead[tagId] = now;
            
            // Limpiar tags antiguos del diccionario (mantener solo últimos 100)
            if (lastTagRead.Count > 100)
            {
                var oldestTags = lastTagRead
                    .OrderBy(x => x.Value)
                    .Take(50)
                    .Select(x => x.Key)
                    .ToList();
                
                foreach (var oldTag in oldestTags)
                {
                    lastTagRead.Remove(oldTag);
                }
            }
            
            Console.WriteLine($"[{DateTime.Now}] 🏷️ TAG DETECTADO: {tagId}");
            Console.WriteLine($"[{DateTime.Now}] 📡 Lector: {reader.name}");
            
            // 1. Verificar acceso (whitelist/blacklist)
            Console.WriteLine($"[{DateTime.Now}] 🔍 Verificando acceso...");
            var (isAllowed, status, message) = await CheckTagAccess(tagId);
            
            Console.WriteLine($"[{DateTime.Now}] 📋 Estado: {status}");
            Console.WriteLine($"[{DateTime.Now}] 💬 Mensaje: {message}");
            
            // 2. Solo activar relé si está en WHITELIST
            if (isAllowed && status == "whitelist")
            {
                Console.WriteLine($"[{DateTime.Now}] ✅ ACCESO PERMITIDO - Activando relé...");
                bool relayActivated = await ActivateRelay(reader);
                
                if (relayActivated)
                {
                    Console.WriteLine($"[{DateTime.Now}] 🔓 Relé activado por 3 segundos");
                }
                else
                {
                    Console.WriteLine($"[{DateTime.Now}] ⚠️ Error activando relé");
                }
            }
            else if (status == "blacklist")
            {
                Console.WriteLine($"[{DateTime.Now}] ❌ ACCESO DENEGADO - Tag en lista negra");
            }
            else if (status == "not_registered")
            {
                Console.WriteLine($"[{DateTime.Now}] ⚠️ ACCESO DENEGADO - Tag no registrado");
            }
            else
            {
                Console.WriteLine($"[{DateTime.Now}] ⚠️ ACCESO DENEGADO - {message}");
            }
            
            // 3. Registrar evento de acceso en Firestore (rfid_tags)
            _ = Task.Run(async () =>
            {
                try
                {
                    // Buscar nombre de usuario asociado al tag consultando Firestore
                    string userName = "";
                    try
                    {
                        using (var client = new HttpClient())
                        {
                            var url = $"https://firestore.googleapis.com/v1/projects/neos-tech/databases/(default)/documents/clients/condominio-neos/tags?where=tag_id=='{tagId}'&pageSize=1";
                            var response = await client.GetAsync(url);
                            if (response.IsSuccessStatusCode)
                            {
                                var json = await response.Content.ReadAsStringAsync();
                                dynamic data = JsonConvert.DeserializeObject(json);
                                if (data.documents != null && data.documents.Count > 0)
                                {
                                    var tagDoc = data.documents[0];
                                    if (tagDoc.fields != null && tagDoc.fields.name != null && tagDoc.fields.name.stringValue != null)
                                        userName = tagDoc.fields.name.stringValue;
                                }
                            }
                        }
                    }
                    catch { }

                    // Registrar evento
                    var eventData = new
                    {
                        fields = new
                        {
                            timestamp = new { timestampValue = DateTime.UtcNow.ToString("o") },
                            tag_id = new { stringValue = tagId },
                            status = new { stringValue = status },
                            lector = new { stringValue = reader.name },
                            mensaje = new { stringValue = message },
                            client_id = new { stringValue = clientId },
                            usuario = new { stringValue = userName }
                        }
                    };
                    var jsonBody = JsonConvert.SerializeObject(eventData);
                    using (var client = new HttpClient())
                    {
                        var url = "https://firestore.googleapis.com/v1/projects/neos-tech/databases/(default)/documents/rfid_tags";
                        var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                        var response = await client.PostAsync(url, content);
                        if (response.IsSuccessStatusCode)
                        {
                            Console.WriteLine($"[{DateTime.Now}] 📝 Evento registrado en Firestore");
                        }
                        else
                        {
                            Console.WriteLine($"[{DateTime.Now}] ⚠️ Error registrando evento en Firestore: {response.StatusCode}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTime.Now}] ⚠️ Excepción registrando evento: {ex.Message}");
                }
            });
        }
    }
}
