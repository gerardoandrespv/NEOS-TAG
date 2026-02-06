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
        public int? TagCooldownSeconds { get; set; } // Cooldown específico de este reader
    }

    class LectoraConfig
    {
        // Configuración HTTP Output (solo lectura - SDK no permite modificar)
        public bool HttpEnabled { get; set; } = false;
        public string HttpProtocol { get; set; } = "4,HTTP";
        public string HttpParam { get; set; } = "/readerid?";
        public string RemoteIP { get; set; } = "192.168.1.11";
        public int RemotePort { get; set; } = 8080;
        
        // Configuración Output Control
        public bool RelayEnabled { get; set; } = true;
        public int RelayValidTime { get; set; } = 3; // Segundos
        public bool CacheEnabled { get; set; } = false;
        public bool TagWithTime { get; set; } = false;
        public bool RSSIFilter { get; set; } = false;
        public int RSSIValue { get; set; } = 76;
        
        // Configuración Reading Settings
        public string Interface { get; set; } = "RJ45";
        public string WorkMode { get; set; } = "ActiveMod";
        public string InquiryArea { get; set; } = "EPC";
        public string StartAddress { get; set; } = "00";
        public string ByteLength { get; set; } = "00";
        public int TriggerEffective { get; set; } = 1;
        public bool BuzzerEnabled { get; set; } = true;
        public int FilterTime { get; set; } = 0;
        public int ReadTime { get; set; } = 0;
        
        // Metadata
        public DateTime LastSync { get; set; } = DateTime.Now;
        public string Source { get; set; } = "manual"; // "sdk" o "manual"
    }

    class Program
    {
        private static string clientId;
        private static string cloudFunctionUrl;
        private static Dictionary<string, AccessPointConfig> accessPoints = new Dictionary<string, AccessPointConfig>();
        
        // Sistema anti-spam para tags (debouncing)
        private static Dictionary<string, DateTime> lastTagRead = new Dictionary<string, DateTime>();
        private static int defaultCooldownSeconds = 10; // Cooldown por defecto
        private static bool showDuplicateStats = true;
        
        // Estadísticas de duplicados
        private static int totalTagReads = 0;
        private static int duplicateTagsFiltered = 0;
        private static DateTime statsStartTime = DateTime.Now;
        
        // Control de lectura automática
        private static bool isReading = false;
        private static System.Threading.CancellationTokenSource readingCancellation;
        
        // Lock para evitar conflictos de conexión TCP
        private static readonly object thyConnectionLock = new object();
        
        // Cache local de whitelist (para funcionamiento offline)
        private static HashSet<string> whitelistCache = new HashSet<string>();
        private static DateTime whitelistLastSync = DateTime.MinValue;
        private static int whitelistSyncIntervalMinutes = 5; // Sincronizar cada 5 minutos
        
        // Configuración de lectora (snapshot + parámetros SDK)
        private static LectoraConfig lectoraConfig = new LectoraConfig();
        private static string lectoraConfigFile = "lectora.config.json";
        
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
                
                // Cargar configuración de lectora
                LoadLectoraConfig();
                Console.WriteLine($"[{DateTime.Now}] 📋 Configuración de lectora cargada");
                
                // Sincronizar whitelist al inicio
                Console.WriteLine($"[{DateTime.Now}] 🔄 Sincronizando whitelist inicial...");
                await SyncWhitelistFromFirestore();
                
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
                    
                    // Cargar configuración RFID global
                    if (config.rfid != null)
                    {
                        if (config.rfid.tag_cooldown_seconds != null)
                        {
                            defaultCooldownSeconds = (int)config.rfid.tag_cooldown_seconds;
                            Console.WriteLine($"[{DateTime.Now}] 🔁 Cooldown global: {defaultCooldownSeconds}s");
                        }
                        if (config.rfid.show_duplicate_stats != null)
                        {
                            showDuplicateStats = (bool)config.rfid.show_duplicate_stats;
                        }
                    }
                    
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
                        
                        // Cargar cooldown específico si existe
                        if (ap.tag_cooldown_seconds != null)
                        {
                            point.TagCooldownSeconds = (int)ap.tag_cooldown_seconds;
                            Console.WriteLine($"[{DateTime.Now}] Cargado: {point.name} @ {point.reader_ip}:{point.reader_port} (cooldown: {point.TagCooldownSeconds}s)");
                        }
                        else
                        {
                            Console.WriteLine($"[{DateTime.Now}] Cargado: {point.name} @ {point.reader_ip}:{point.reader_port}");
                        }
                        
                        accessPoints[point.id] = point;
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
                
                // Endpoint para obtener configuración de lectora
                if (context.Request.Url.PathAndQuery == "/api/lectora/config" && context.Request.HttpMethod == "GET")
                {
                    var configJson = JsonConvert.SerializeObject(lectoraConfig, Formatting.Indented);
                    var buffer = Encoding.UTF8.GetBytes(configJson);
                    response.ContentType = "application/json";
                    response.ContentLength64 = buffer.Length;
                    await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                    response.Close();
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ✅ Configuración de lectora enviada");
                    return;
                }
                
                // Endpoint para actualizar configuración de lectora
                if (context.Request.Url.PathAndQuery == "/api/lectora/config" && context.Request.HttpMethod == "POST")
                {
                    using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                    {
                        string json = await reader.ReadToEndAsync();
                        var newConfig = JsonConvert.DeserializeObject<LectoraConfig>(json);
                        
                        // Actualizar configuración
                        lectoraConfig = newConfig;
                        lectoraConfig.LastSync = DateTime.Now;
                        lectoraConfig.Source = "manual";
                        
                        // Guardar en archivo
                        SaveLectoraConfig();
                        
                        // Responder con éxito
                        var resultJson = JsonConvert.SerializeObject(new { status = "ok", message = "Configuración actualizada" });
                        var buffer = Encoding.UTF8.GetBytes(resultJson);
                        response.ContentType = "application/json";
                        response.ContentLength64 = buffer.Length;
                        await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                        response.Close();
                        
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ✅ Configuración de lectora actualizada");
                        return;
                    }
                }
                
                // Endpoint para refrescar configuración desde lectora (vía SDK si es posible)
                if (context.Request.Url.PathAndQuery == "/api/lectora/config/refresh" && context.Request.HttpMethod == "POST")
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 🔄 Intentando leer configuración desde lectora física...");
                    
                    try
                    {
                        // Obtener el primer lector configurado
                        var reader = accessPoints.Values.FirstOrDefault();
                        if (reader == null)
                        {
                            var errorJson = JsonConvert.SerializeObject(new { 
                                status = "error", 
                                message = "No hay lectores configurados en access_points.json"
                            });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }
                        
                        // Intentar conectar temporalmente a la lectora (si no está conectado ya)
                        bool wasConnected = isReading;
                        bool tempConnection = false;
                        
                        if (!wasConnected)
                        {
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 📡 Conectando temporalmente a {reader.reader_ip}:{reader.reader_port}...");
                            tempConnection = THYReaderAPI.Connect(reader.reader_ip, reader.reader_port);
                            
                            if (!tempConnection)
                            {
                                var errorJson = JsonConvert.SerializeObject(new { 
                                    status = "error", 
                                    message = $"No se pudo conectar a la lectora en {reader.reader_ip}:{reader.reader_port}"
                                });
                                var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                                response.ContentType = "application/json";
                                response.ContentLength64 = errorBuffer.Length;
                                await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                                response.Close();
                                return;
                            }
                            
                            // Pequeña pausa para estabilizar conexión
                            await Task.Delay(500);
                        }
                        
                        // Leer configuración desde la lectora usando el SDK
                        var readerConfig = THYReaderAPI.GetFullConfiguration();
                        
                        // Actualizar LectoraConfig con valores leídos del SDK
                        if (readerConfig.ContainsKey("WorkMode"))
                        {
                            lectoraConfig.WorkMode = readerConfig["WorkMode"].ToString();
                        }
                        
                        if (readerConfig.ContainsKey("Transport"))
                        {
                            lectoraConfig.Interface = readerConfig["Transport"].ToString();
                        }
                        
                        if (readerConfig.ContainsKey("BeepEnable"))
                        {
                            lectoraConfig.BuzzerEnabled = readerConfig["BeepEnable"].ToString() == "On";
                        }
                        
                        if (readerConfig.ContainsKey("FilterTime"))
                        {
                            // Convertir "50ms" a número
                            string filterStr = readerConfig["FilterTime"].ToString().Replace("ms", "");
                            if (int.TryParse(filterStr, out int filterMs))
                            {
                                lectoraConfig.FilterTime = filterMs / 10; // El SDK usa x10ms
                            }
                        }
                        
                        // Actualizar metadata
                        lectoraConfig.LastSync = DateTime.Now;
                        lectoraConfig.Source = "sdk";
                        
                        // Guardar configuración actualizada
                        SaveLectoraConfig();
                        
                        // Cerrar conexión temporal si la abrimos nosotros
                        if (tempConnection && !wasConnected)
                        {
                            THYReaderAPI.Disconnect();
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 🔌 Conexión temporal cerrada");
                        }
                        
                        // Responder con configuración actualizada
                        var resultJson = JsonConvert.SerializeObject(new { 
                            status = "success", 
                            message = "Configuración leída desde la lectora física exitosamente",
                            reader_data = readerConfig,
                            updated_config = lectoraConfig,
                            timestamp = DateTime.Now
                        });
                        var buffer = Encoding.UTF8.GetBytes(resultJson);
                        response.ContentType = "application/json";
                        response.ContentLength64 = buffer.Length;
                        await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                        response.Close();
                        
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ✅ Configuración sincronizada desde lectora física");
                        return;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ❌ Error leyendo configuración: {ex.Message}");
                        
                        var errorJson = JsonConvert.SerializeObject(new { 
                            status = "error", 
                            message = $"Error leyendo configuración: {ex.Message}",
                            current_config = lectoraConfig
                        });
                        var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                        response.ContentType = "application/json";
                        response.ContentLength64 = errorBuffer.Length;
                        await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                        response.Close();
                        return;
                    }
                }

                // Endpoint para control del filtro interno de la lectora
                if (context.Request.Url.PathAndQuery == "/api/lectora/filter" && context.Request.HttpMethod == "GET")
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 📊 GET /api/lectora/filter - Consultando estado del filtro");
                    try
                    {
                        var reader = accessPoints.Values.FirstOrDefault();
                        if (reader == null)
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "No hay lectoras configuradas" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 500;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }

                        bool tempConnection = THYReaderAPI.Connect(reader.reader_ip, reader.reader_port);
                        if (!tempConnection)
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "No se pudo conectar a la lectora" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 500;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }

                        var (filterEnabled, tagCount) = THYReaderAPI.GetFilterStatus();

                        if (tempConnection)
                            THYReaderAPI.Disconnect();

                        var resultJson = JsonConvert.SerializeObject(new
                        {
                            filter_enabled = filterEnabled,
                            valid_tag_count = tagCount,
                            status = filterEnabled ? "ACTIVO" : "INACTIVO",
                            warning = tagCount == 0 ? "No hay tags en memoria interna" : null
                        });
                        var buffer = Encoding.UTF8.GetBytes(resultJson);
                        response.StatusCode = 200;
                        response.ContentType = "application/json";
                        response.ContentLength64 = buffer.Length;
                        await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                        response.Close();
                        return;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ❌ Error consultando filtro: {ex.Message}");
                        var errorJson = JsonConvert.SerializeObject(new { error = ex.Message });
                        var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                        response.StatusCode = 500;
                        response.ContentType = "application/json";
                        response.ContentLength64 = errorBuffer.Length;
                        await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                        response.Close();
                        return;
                    }
                }

                // Endpoint para estadísticas de debouncing
                if (context.Request.Url.PathAndQuery == "/api/rfid/stats" && context.Request.HttpMethod == "GET")
                {
                    var uptime = (DateTime.Now - statsStartTime).TotalMinutes;
                    var filterRate = totalTagReads > 0 ? (duplicateTagsFiltered * 100.0) / totalTagReads : 0;
                    
                    var statsJson = JsonConvert.SerializeObject(new
                    {
                        total_reads = totalTagReads,
                        duplicates_filtered = duplicateTagsFiltered,
                        unique_reads = totalTagReads - duplicateTagsFiltered,
                        filter_rate_percent = Math.Round(filterRate, 2),
                        uptime_minutes = Math.Round(uptime, 2),
                        default_cooldown_seconds = defaultCooldownSeconds,
                        active_tags_cached = lastTagRead.Count,
                        show_duplicate_stats = showDuplicateStats,
                        readers = accessPoints.Values.Select(ap => new
                        {
                            id = ap.id,
                            name = ap.name,
                            cooldown_seconds = ap.TagCooldownSeconds ?? defaultCooldownSeconds
                        }).ToList()
                    });
                    
                    var buffer = Encoding.UTF8.GetBytes(statsJson);
                    response.ContentType = "application/json";
                    response.ContentLength64 = buffer.Length;
                    await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                    response.Close();
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ✅ Estadísticas de debouncing enviadas");
                    return;
                }
                
                // Endpoint para actualizar cooldown en tiempo real
                if (context.Request.Url.PathAndQuery == "/api/rfid/cooldown" && context.Request.HttpMethod == "POST")
                {
                    string requestBody;
                    using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                    {
                        requestBody = await reader.ReadToEndAsync();
                    }
                    
                    var body = JsonConvert.DeserializeObject<Dictionary<string, object>>(requestBody);
                    
                    if (body.ContainsKey("default_cooldown"))
                    {
                        defaultCooldownSeconds = Convert.ToInt32(body["default_cooldown"]);
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 🔧 Cooldown global actualizado: {defaultCooldownSeconds}s");
                    }
                    
                    if (body.ContainsKey("reader_id") && body.ContainsKey("cooldown"))
                    {
                        string readerId = body["reader_id"].ToString();
                        int cooldown = Convert.ToInt32(body["cooldown"]);
                        
                        if (accessPoints.ContainsKey(readerId))
                        {
                            accessPoints[readerId].TagCooldownSeconds = cooldown;
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 🔧 Cooldown de {accessPoints[readerId].name} actualizado: {cooldown}s");
                        }
                    }
                    
                    var resultJson = JsonConvert.SerializeObject(new { status = "ok", message = "Cooldown actualizado" });
                    var buffer2 = Encoding.UTF8.GetBytes(resultJson);
                    response.ContentType = "application/json";
                    response.ContentLength64 = buffer2.Length;
                    await response.OutputStream.WriteAsync(buffer2, 0, buffer2.Length);
                    response.Close();
                    return;
                }

                if (context.Request.Url.PathAndQuery == "/api/lectora/filter" && context.Request.HttpMethod == "POST")
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 🔧 POST /api/lectora/filter - Control de filtro interno");
                    try
                    {
                        string requestBody;
                        using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                        {
                            requestBody = await reader.ReadToEndAsync();
                        }

                        var body = JsonConvert.DeserializeObject<Dictionary<string, object>>(requestBody);
                        if (body == null || !body.ContainsKey("enabled"))
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "Parámetro 'enabled' requerido (true/false)" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 400;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }

                        var accessPoint = accessPoints.Values.FirstOrDefault();
                        if (accessPoint == null)
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "No hay lectoras configuradas" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 500;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }

                        bool enable = Convert.ToBoolean(body["enabled"]);
                        byte filterMode = 0x00;
                        if (body.ContainsKey("mode"))
                            filterMode = Convert.ToByte(body["mode"]);

                        bool tempConnection = THYReaderAPI.Connect(accessPoint.reader_ip, accessPoint.reader_port);
                        if (!tempConnection)
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "No se pudo conectar a la lectora" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 500;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }

                        bool result = THYReaderAPI.SetTagFilter(enable, filterMode);
                        var (filterEnabled, tagCount) = THYReaderAPI.GetFilterStatus();

                        if (tempConnection)
                            THYReaderAPI.Disconnect();

                        if (result)
                        {
                            var resultJson = JsonConvert.SerializeObject(new
                            {
                                success = true,
                                filter_enabled = filterEnabled,
                                valid_tag_count = tagCount,
                                message = $"Filtro {(filterEnabled ? "HABILITADO" : "DESHABILITADO")} - {tagCount} tag(s) en memoria"
                            });
                            var buffer = Encoding.UTF8.GetBytes(resultJson);
                            response.StatusCode = 200;
                            response.ContentType = "application/json";
                            response.ContentLength64 = buffer.Length;
                            await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                            response.Close();
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ✅ Filtro configurado: {(filterEnabled ? "ON" : "OFF")}");
                            return;
                        }
                        else
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "Error configurando filtro" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 500;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ❌ Error configurando filtro: {ex.Message}");
                        var errorJson = JsonConvert.SerializeObject(new { error = ex.Message });
                        var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                        response.StatusCode = 500;
                        response.ContentType = "application/json";
                        response.ContentLength64 = errorBuffer.Length;
                        await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                        response.Close();
                        return;
                    }
                }

                // Endpoint para activar relé (apertura manual desde dashboard)
                if (context.Request.Url.PathAndQuery == "/api/lectora/relay" && context.Request.HttpMethod == "POST")
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 🔓 POST /api/lectora/relay - Comando de apertura manual");
                    try
                    {
                        string requestBody;
                        using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                        {
                            requestBody = await reader.ReadToEndAsync();
                        }

                        var body = JsonConvert.DeserializeObject<Dictionary<string, object>>(requestBody);
                        if (body == null)
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "Invalid JSON body" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 400;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }

                        string action = body.ContainsKey("action") ? body["action"].ToString() : "open";
                        int duration = body.ContainsKey("duration") ? Convert.ToInt32(body["duration"]) : 3000;
                        string doorId = body.ContainsKey("door_id") ? body["door_id"].ToString() : "manual";

                        var accessPoint = accessPoints.Values.FirstOrDefault();
                        if (accessPoint == null)
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "No hay lectoras configuradas" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 500;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }

                        // Conectar temporalmente a la lectora
                        bool tempConnection = THYReaderAPI.Connect(accessPoint.reader_ip, accessPoint.reader_port);
                        if (!tempConnection)
                        {
                            var errorJson = JsonConvert.SerializeObject(new { error = "No se pudo conectar a la lectora" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 500;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }

                        // Activar relé físicamente
                        int relayNumber = 1; // Relé 1 (puerta principal)
                        bool relayResult = THYReaderAPI.ActivateRelay(relayNumber, duration);

                        // Desconectar
                        if (tempConnection)
                            THYReaderAPI.Disconnect();

                        if (relayResult)
                        {
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ✅ Relé {relayNumber} activado por {duration}ms - Door: {doorId}");
                            var resultJson = JsonConvert.SerializeObject(new
                            {
                                success = true,
                                relay = relayNumber,
                                duration_ms = duration,
                                door_id = doorId,
                                timestamp = DateTime.UtcNow.ToString("o"),
                                message = $"Relé {relayNumber} activado exitosamente"
                            });
                            var buffer = Encoding.UTF8.GetBytes(resultJson);
                            response.StatusCode = 200;
                            response.ContentType = "application/json";
                            response.ContentLength64 = buffer.Length;
                            await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                            response.Close();
                            return;
                        }
                        else
                        {
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ❌ Error activando relé {relayNumber}");
                            var errorJson = JsonConvert.SerializeObject(new { error = "Error activando relé" });
                            var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                            response.StatusCode = 500;
                            response.ContentType = "application/json";
                            response.ContentLength64 = errorBuffer.Length;
                            await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                            response.Close();
                            return;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ❌ Error en endpoint de relé: {ex.Message}");
                        var errorJson = JsonConvert.SerializeObject(new { error = ex.Message });
                        var errorBuffer = Encoding.UTF8.GetBytes(errorJson);
                        response.StatusCode = 500;
                        response.ContentType = "application/json";
                        response.ContentLength64 = errorBuffer.Length;
                        await response.OutputStream.WriteAsync(errorBuffer, 0, errorBuffer.Length);
                        response.Close();
                        return;
                    }
                }
                
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
                            Console.WriteLine($"[{DateTime.Now}] 🔓 APERTURA MANUAL: {ap.name}");
                            
                            // 1. Activar relay en background
                            _ = Task.Run(async () => await ActivateRelay(ap));
                            
                            // 2. Enviar evento a la nube (para registro en "Últimas Acciones de Control")
                            _ = Task.Run(async () => {
                                try
                                {
                                    var eventPayload = new
                                    {
                                        action = "manual_open",
                                        access_point = accessPointId,
                                        access_point_name = ap.name,
                                        client_id = clientId,
                                        timestamp = DateTime.UtcNow.ToString("o"),
                                        source = "dashboard_button"
                                    };
                                    
                                    string jsonPayload = JsonConvert.SerializeObject(eventPayload);
                                    
                                    using (var client = new HttpClient())
                                    {
                                        client.Timeout = TimeSpan.FromSeconds(5);
                                        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                                        await client.PostAsync(cloudFunctionUrl, content);
                                    }
                                    
                                    Console.WriteLine($"[{DateTime.Now}] ✅ Evento manual enviado a cloud");
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine($"[{DateTime.Now}] ⚠️ Error enviando evento manual: {ex.Message}");
                                }
                            });
                            
                            // 3. Responder inmediatamente
                            await SendJsonResponse(response, new { 
                                status = "success",
                                access_point = accessPointId,
                                name = ap.name,
                                message = "Portón abierto manualmente"
                            });
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
                    Console.WriteLine($"[{DateTime.Now}] � APERTURA MANUAL: {ap.name}");
                    
                    // Usar lock para evitar conflicto con el polling TCP
                    lock (thyConnectionLock)
                    {
                        Console.WriteLine($"[{DateTime.Now}] 🔌 Conectando a {ap.name} ({ap.reader_ip}:{ap.reader_port})...");
                        
                        // Conectar temporalmente para enviar comando de relé
                        bool connected = THYReaderAPI.Connect(ap.reader_ip, ap.reader_port);
                        
                        if (!connected)
                        {
                            Console.WriteLine($"[{DateTime.Now}] ❌ No se pudo conectar a {ap.name}");
                            return false;
                        }
                        
                        Console.WriteLine($"[{DateTime.Now}] ✅ Conectado - Activando relé...");
                        
                        // Activar relé
                        bool relayOn = THYReaderAPI.ActivateRelay(0xFF);
                        Console.WriteLine($"[{DateTime.Now}] ⚡ Relé activado para {ap.name} (resultado: {relayOn})");
                        
                        // Mantener activo por la duración configurada
                        System.Threading.Thread.Sleep(ap.open_duration_ms);
                        
                        // Desactivar relay
                        bool relayOff = THYReaderAPI.DeactivateRelay(0xFF);
                        Console.WriteLine($"[{DateTime.Now}] 🔒 Relé desactivado (resultado: {relayOff})");
                        
                        // Desconectar
                        THYReaderAPI.Disconnect();
                        Console.WriteLine($"[{DateTime.Now}] ✅ Desconectado de {ap.name}");
                        
                        return true;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTime.Now}] ❌ ERROR activando relay: {ex.Message}");
                    Console.WriteLine($"[{DateTime.Now}] Stack: {ex.StackTrace}");
                    return false;
                }
            });
        }
        
        private static async Task<(bool isAllowed, string status, string message)> CheckTagAccess(string tagId)
        {
            // PASO 1: Verificar whitelist local PRIMERO (fuente de verdad)
            bool inLocalCache = CheckWhitelistCache(tagId);
            
            // PASO 2: Si NO está en cache local, RECHAZAR inmediatamente (modo offline-first)
            if (!inLocalCache)
            {
                Console.WriteLine($"[{DateTime.Now}] ❌ Tag NO en whitelist local - ACCESO DENEGADO");
                return (false, "not_in_whitelist", "Tag no autorizado (no en whitelist local)");
            }
            
            // PASO 3: Si está en cache, intentar verificar con cloud para actualizar estado
            // (pero el acceso ya está garantizado por cache local)
            try
            {
                string checkUrl = cloudFunctionUrl.Replace("/rfid-gateway", "/check-tag-access");
                
                var payload = new
                {
                    tag_id = tagId,
                    client_id = clientId
                };
                
                string jsonPayload = JsonConvert.SerializeObject(payload);
                
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(3); // Timeout reducido para respuesta rápida
                    client.DefaultRequestHeaders.Add("X-Client-ID", clientId);
                    
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    var response = await client.PostAsync(checkUrl, content);
                    
                    string responseContent = await response.Content.ReadAsStringAsync();
                    
                    if (response.IsSuccessStatusCode)
                    {
                        dynamic result = JsonConvert.DeserializeObject(responseContent);
                        string status = result?.status ?? "unknown";
                        string message = result?.message ?? "Sin información";
                        
                        // Si cloud dice que está bloqueado, respetarlo
                        if (status == "blacklist" || status == "blocked")
                        {
                            Console.WriteLine($"[{DateTime.Now}] ⚠️ Tag bloqueado en cloud (actualizando cache local)");
                            // TODO: Remover de cache local
                            return (false, "blacklist", message);
                        }
                        
                        // Cloud confirma acceso
                        return (true, "whitelist", message);
                    }
                    else
                    {
                        Console.WriteLine($"[{DateTime.Now}] ⚠️ Error cloud, usando cache local");
                        return (true, "whitelist_cached", "Tag autorizado (cache local)");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] 🔌 MODO OFFLINE: Usando cache local");
                return (true, "whitelist_offline", "Tag autorizado (modo offline)");
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
            Console.WriteLine($"[{DateTime.Now}] ⏱️ Anti-spam: {mainReader.TagCooldownSeconds ?? defaultCooldownSeconds} segundos");
            
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
            totalTagReads++;
            
            // Determinar cooldown: específico del reader o default
            int cooldownSeconds = defaultCooldownSeconds;
            if (reader != null && reader.TagCooldownSeconds.HasValue)
            {
                cooldownSeconds = reader.TagCooldownSeconds.Value;
            }
            
            // Sistema anti-spam: verificar si ya procesamos este tag recientemente
            DateTime now = DateTime.Now;
            string cacheKey = $"{reader?.id ?? "unknown"}:{tagId}"; // Cooldown por reader+tag
            
            if (lastTagRead.ContainsKey(cacheKey))
            {
                var timeSinceLastRead = (now - lastTagRead[cacheKey]).TotalSeconds;
                
                if (timeSinceLastRead < cooldownSeconds)
                {
                    // Tag leído muy recientemente, ignorar (debouncing)
                    duplicateTagsFiltered++;
                    
                    // NO mostrar logs cada 10 duplicados (reduce spam en consola)
                    // Solo mostrar cada 100 duplicados o cada minuto
                    if (showDuplicateStats && (duplicateTagsFiltered % 100 == 0 || 
                        (now - statsStartTime).TotalSeconds % 60 < 1))
                    {
                        var uptime = (now - statsStartTime).TotalMinutes;
                        var filterRate = (duplicateTagsFiltered * 100.0) / totalTagReads;
                        Console.WriteLine($"[{now:HH:mm:ss}] 🔁 Duplicados filtrados: {duplicateTagsFiltered}/{totalTagReads} ({filterRate:F1}%)");
                    }
                    return;
                }
            }
            
            // Actualizar timestamp de última lectura
            lastTagRead[cacheKey] = now;
            
            // Limpiar tags antiguos del diccionario (mantener solo últimos 200)
            if (lastTagRead.Count > 200)
            {
                var oldestTags = lastTagRead
                    .OrderBy(x => x.Value)
                    .Take(100)
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
            
            // 2. Solo activar relé si está EXPLÍCITAMENTE en WHITELIST (no errores, no no-registrados)
            bool shouldActivateRelay = isAllowed && 
                                       (status == "whitelist" || 
                                        status == "whitelist_cached" || 
                                        status == "whitelist_offline");
            
            if (shouldActivateRelay)
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
            
            // 3. Registrar evento de acceso enviando a Cloud Function
            _ = Task.Run(async () =>
            {
                try
                {
                    // Enviar a Cloud Function para registro en Firestore
                    var payload = new
                    {
                        epc = tagId,
                        reader_sn = reader.id,
                        gateway_version = "condominio_2.0",
                        access_granted = isAllowed && status == "whitelist",
                        access_status = status,
                        access_message = message,
                        reader_name = reader.name,
                        timestamp = DateTime.UtcNow.ToString("o")
                    };
                    
                    string jsonPayload = JsonConvert.SerializeObject(payload);
                    
                    using (var client = new HttpClient())
                    {
                        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                        var response = await client.PostAsync(cloudFunctionUrl, content);
                        
                        if (response.IsSuccessStatusCode)
                        {
                            var responseContent = await response.Content.ReadAsStringAsync();
                            Console.WriteLine($"[{DateTime.Now}] 📝 Evento enviado a Firebase: {responseContent}");
                        }
                        else
                        {
                            Console.WriteLine($"[{DateTime.Now}] ⚠️ Error enviando evento: {response.StatusCode}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTime.Now}] ⚠️ Excepción enviando evento: {ex.Message}");
                }
            });
        }
        
        /// <summary>
        /// Sincroniza la whitelist local con Firestore
        /// </summary>
        private static async Task SyncWhitelistFromFirestore()
        {
            try
            {
                Console.WriteLine($"[{DateTime.Now}] 🔄 Sincronizando whitelist desde Firestore...");
                
                using (var client = new HttpClient())
                {
                    // Obtener todos los tags activos del cliente
                    var url = $"https://firestore.googleapis.com/v1/projects/neos-tech/databases/(default)/documents/clients/{clientId}/tags";
                    var response = await client.GetAsync(url);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        dynamic data = JsonConvert.DeserializeObject(json);
                        
                        var newWhitelist = new HashSet<string>();
                        
                        if (data != null && data.documents != null)
                        {
                            foreach (var doc in data.documents)
                            {
                                try
                                {
                                    // Verificar que el tag esté activo (status != "blocked")
                                    string status = doc.fields?.status?.stringValue ?? "active";
                                    string tagId = doc.fields?.tag_id?.stringValue;
                                    
                                    if (!string.IsNullOrWhiteSpace(tagId) && status != "blocked")
                                    {
                                        newWhitelist.Add(tagId);
                                    }
                                }
                                catch { }
                            }
                        }
                        
                        whitelistCache = newWhitelist;
                        whitelistLastSync = DateTime.Now;
                        
                        Console.WriteLine($"[{DateTime.Now}] ✅ Whitelist Firestore: {whitelistCache.Count} tags");
                    }
                    else
                    {
                        Console.WriteLine($"[{DateTime.Now}] ⚠️ Error sincronizando whitelist: {response.StatusCode}");
                    }
                }
                
                // NUEVO: También sincronizar con lectora THY (verificar filtro interno)
                await SyncWhitelistFromReader();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ⚠️ Excepción sincronizando whitelist: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Sincroniza whitelist leyendo el estado del filtro de la lectora THY
        /// Esto permite funcionamiento offline usando la whitelist de la lectora
        /// </summary>
        private static async Task SyncWhitelistFromReader()
        {
            await Task.Run(() =>
            {
                try
                {
                    var reader = accessPoints.Values.FirstOrDefault();
                    if (reader == null)
                    {
                        Console.WriteLine($"[{DateTime.Now}] ⚠️ No hay lectoras configuradas para sincronizar");
                        return;
                    }
                    
                    Console.WriteLine($"[{DateTime.Now}] 🔍 Verificando filtro de lectora {reader.name}...");
                    
                    // Conectar temporalmente para verificar filtro
                    bool wasConnected = THYReaderAPI.Connect(reader.reader_ip, reader.reader_port);
                    if (!wasConnected)
                    {
                        Console.WriteLine($"[{DateTime.Now}] ⚠️ No se pudo conectar a lectora para verificar filtro");
                        return;
                    }
                    
                    try
                    {
                        var (filterEnabled, tagCount) = THYReaderAPI.GetFilterStatus();
                        
                        if (filterEnabled && tagCount > 0)
                        {
                            Console.WriteLine($"[{DateTime.Now}] ℹ️ Lectora tiene filtro activo con {tagCount} tag(s)");
                            Console.WriteLine($"[{DateTime.Now}] ℹ️ Modo híbrido: Firestore ({whitelistCache.Count} tags) + Filtro lectora ({tagCount} tags)");
                        }
                        else if (!filterEnabled)
                        {
                            Console.WriteLine($"[{DateTime.Now}] ℹ️ Filtro de lectora deshabilitado - Usando solo Firestore");
                        }
                        else
                        {
                            Console.WriteLine($"[{DateTime.Now}] ⚠️ Filtro habilitado pero sin tags - Verificar configuración lectora");
                        }
                    }
                    finally
                    {
                        THYReaderAPI.Disconnect();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTime.Now}] ⚠️ Error sincronizando con lectora: {ex.Message}");
                }
            });
        }
        
        /// <summary>
        /// Verifica si un tag está en la whitelist local (cache)
        /// </summary>
        private static bool CheckWhitelistCache(string tagId)
        {
            // Si han pasado más de N minutos desde la última sincronización, disparar sync en background
            if ((DateTime.Now - whitelistLastSync).TotalMinutes > whitelistSyncIntervalMinutes)
            {
                _ = Task.Run(async () => await SyncWhitelistFromFirestore());
            }
            
            return whitelistCache.Contains(tagId);
        }
        
        /// <summary>
        /// Obtiene la whitelist completa (para API)
        /// </summary>
        private static List<string> GetWhitelistCache()
        {
            return whitelistCache.ToList();
        }
        
        // =============== CONFIGURACIÓN LECTORA ===============
        
        /// <summary>
        /// Carga configuración de lectora desde archivo JSON
        /// </summary>
        private static void LoadLectoraConfig()
        {
            try
            {
                if (File.Exists(lectoraConfigFile))
                {
                    string json = File.ReadAllText(lectoraConfigFile);
                    lectoraConfig = JsonConvert.DeserializeObject<LectoraConfig>(json);
                    Console.WriteLine($"[{DateTime.Now}] ✅ Configuración de lectora cargada desde {lectoraConfigFile}");
                }
                else
                {
                    // Crear configuración por defecto
                    lectoraConfig = new LectoraConfig();
                    SaveLectoraConfig();
                    Console.WriteLine($"[{DateTime.Now}] 📝 Configuración de lectora creada con valores por defecto");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ⚠️ Error cargando configuración de lectora: {ex.Message}");
                Console.WriteLine($"[{DateTime.Now}] 💡 Usando configuración por defecto");
                lectoraConfig = new LectoraConfig();
            }
        }
        
        /// <summary>
        /// Guarda configuración de lectora en archivo JSON
        /// </summary>
        private static void SaveLectoraConfig()
        {
            try
            {
                string json = JsonConvert.SerializeObject(lectoraConfig, Formatting.Indented);
                File.WriteAllText(lectoraConfigFile, json);
                Console.WriteLine($"[{DateTime.Now}] 💾 Configuración de lectora guardada en {lectoraConfigFile}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now}] ❌ Error guardando configuración de lectora: {ex.Message}");
            }
        }
    }
}



