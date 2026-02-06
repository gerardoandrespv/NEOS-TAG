using System;
using System.Runtime.InteropServices;
using System.Text;

namespace RFID_Gateway
{
    /// <summary>
    /// Wrapper para la librería SWNetApi.dll del lector RFID THY
    /// </summary>
    public static class THYReaderAPI
    {
        private const string DLL_NAME = "SWNetApi.dll";
        
        // Funciones de conexión
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_OpenDevice(string ipAddress, ushort port);
        
        [DllImport(DLL_NAME)]
        public static extern void SWNet_CloseDevice();
        
        // Funciones de información del dispositivo
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_GetDeviceSystemInfo(byte devAddr, byte[] buffer);
        
        // Funciones de control de relé
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_RelayOn(byte devAddr);
        
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_RelayOff(byte devAddr);
        
        // Funciones de lectura de tags (Modo Activo)
        [DllImport(DLL_NAME)]
        public static extern void SWNet_ClearTagBuf();
        
        [DllImport(DLL_NAME)]
        public static extern byte SWNet_GetTagBuf(byte[] buffer, out int length, out int tagNumber);
        
        // Funciones de configuración del dispositivo
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_GetDeviceParam(byte devAddr, byte[] buffer);
        
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_SetDeviceParam(byte devAddr, byte[] buffer);
        
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_SetDeviceOneParam(byte devAddr, byte paramAddr, byte value);
        
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_ReadDeviceOneParam(byte devAddr, byte paramAddr, byte[] value);
        
        // Funciones de inventario y lectura
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_InventoryG2(byte devAddr, byte[] buffer, out ushort totalLen, out ushort cardNum);
        
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_StartRead(byte devAddr);
        
        [DllImport(DLL_NAME)]
        public static extern bool SWNet_StopRead(byte devAddr);
        
        /// <summary>
        /// Lee toda la configuración del dispositivo
        /// </summary>
        public static Dictionary<string, object> GetFullConfiguration()
        {
            var config = new Dictionary<string, object>();
            
            try
            {
                // Leer información del sistema
                byte[] sysInfo = new byte[64];
                if (SWNet_GetDeviceSystemInfo(0xFF, sysInfo))
                {
                    config["SoftwareVersion"] = $"{(sysInfo[0] >> 4)}.{(sysInfo[0] & 0x0F)}";
                    config["HardwareVersion"] = $"{(sysInfo[1] >> 4)}.{(sysInfo[1] & 0x0F)}";
                    
                    // Serial Number (bytes 2-8)
                    string sn = "";
                    for (int i = 2; i < 9; i++)
                    {
                        sn += sysInfo[i].ToString("X2");
                    }
                    config["SerialNumber"] = sn;
                }
                
                // Leer parámetros individuales conocidos
                /*  01: Transport (0x01=COM, 0x02=RJ45, 0x03=USB, 0x04=WiFi)
                    02: WorkMode (0x00=AnswerMode, 0x01=ActiveMode)
                    03: DeviceAddr
                    04: FilterTime (0-255, x10ms)
                    05: RFPower (0-30 dBm)
                    06: BeepEnable (0=Off, 1=On)
                    07: UartBaudRate */
                
                byte[] value = new byte[1];
                
                if (SWNet_ReadDeviceOneParam(0xFF, 0x01, value))
                {
                    string transport = value[0] switch
                    {
                        0x01 => "COM",
                        0x02 => "RJ45",
                        0x03 => "USB",
                        0x04 => "WiFi",
                        _ => $"Unknown ({value[0]:X2})"
                    };
                    config["Transport"] = transport;
                }
                
                if (SWNet_ReadDeviceOneParam(0xFF, 0x02, value))
                {
                    string workMode = value[0] switch
                    {
                        0x00 => "AnswerMode",
                        0x01 => "ActiveMode",
                        _ => $"Unknown ({value[0]:X2})"
                    };
                    config["WorkMode"] = workMode;
                }
                
                if (SWNet_ReadDeviceOneParam(0xFF, 0x03, value))
                {
                    config["DeviceAddr"] = $"0x{value[0]:X2}";
                }
                
                if (SWNet_ReadDeviceOneParam(0xFF, 0x04, value))
                {
                    config["FilterTime"] = $"{value[0] * 10}ms";
                }
                
                if (SWNet_ReadDeviceOneParam(0xFF, 0x05, value))
                {
                    config["RFPower"] = $"{value[0]} dBm";
                }
                
                if (SWNet_ReadDeviceOneParam(0xFF, 0x06, value))
                {
                    config["BeepEnable"] = value[0] == 1 ? "On" : "Off";
                }
                
                if (SWNet_ReadDeviceOneParam(0xFF, 0x07, value))
                {
                    int baudRate = value[0] switch
                    {
                        0 => 9600,
                        1 => 19200,
                        2 => 38400,
                        3 => 57600,
                        4 => 115200,
                        _ => value[0]
                    };
                    config["UartBaudRate"] = baudRate;
                }
                
                // SCAN EXTENDIDO: Leer parámetros individuales adicionales (0x08-0x30)
                // La función SWNet_GetDeviceParam NO existe en esta versión de la DLL
                // Así que escaneamos parámetro por parámetro
                Console.WriteLine($"[THY] 🔍 Escaneando parámetros extendidos (0x08-0x30)...");
                var extendedParams = new Dictionary<string, string>();
                
                for (byte paramAddr = 0x08; paramAddr <= 0x30; paramAddr++)
                {
                    try
                    {
                        byte[] paramValue = new byte[1];
                        if (SWNet_ReadDeviceOneParam(0xFF, paramAddr, paramValue))
                        {
                            // Solo reportar valores significativos
                            if (paramValue[0] != 0x00)
                            {
                                string description = GetParameterDescription(paramAddr, paramValue[0]);
                                extendedParams[$"0x{paramAddr:X2}"] = $"0x{paramValue[0]:X2} ({paramValue[0]}) - {description}";
                                Console.WriteLine($"[THY]   Param 0x{paramAddr:X2} = 0x{paramValue[0]:X2} ({paramValue[0]}) - {description}");
                            }
                        }
                    }
                    catch { }
                }
                
                if (extendedParams.Count > 0)
                {
                    config["ExtendedParams"] = extendedParams;
                    Console.WriteLine($"[THY] ✅ {extendedParams.Count} parámetros extendidos encontrados");
                }
                else
                {
                    Console.WriteLine($"[THY] ℹ️ No se encontraron parámetros extendidos activos");
                }
            }
            catch (Exception ex)
            {
                config["Error"] = ex.Message;
            }
            
            return config;
        }
        
        /// <summary>
        /// Conecta al lector RFID THY
        /// </summary>
        public static bool Connect(string ipAddress, int port)
        {
            try
            {
                bool connected = SWNet_OpenDevice(ipAddress, (ushort)port);
                if (connected)
                {
                    Console.WriteLine($"[THY] Conectado a {ipAddress}:{port}");
                    
                    // Obtener información del dispositivo
                    byte[] info = new byte[64];
                    if (SWNet_GetDeviceSystemInfo(0xFF, info))
                    {
                        int softVer = (info[0] >> 4) * 10 + (info[0] & 0x0F);
                        int hardVer = (info[1] >> 4) * 10 + (info[1] & 0x0F);
                        Console.WriteLine($"[THY] Versión Software: {softVer}, Hardware: {hardVer}");
                    }
                    
                    // Configurar en Active Mode (WorkMode = 0x01) para lectura continua
                    // Parámetro 0x02 = WorkMode, Valor 0x01 = Active Mode
                    if (SWNet_SetDeviceOneParam(0xFF, 0x02, 0x01))
                    {
                        Console.WriteLine($"[THY] WorkMode configurado: Active Mode");
                    }
                    else
                    {
                        Console.WriteLine($"[THY] ADVERTENCIA: No se pudo configurar WorkMode");
                    }
                    
                    // Limpiar buffer antes de empezar
                    SWNet_ClearTagBuf();
                }
                return connected;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error conectando: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// Desconecta del lector RFID THY
        /// </summary>
        public static void Disconnect()
        {
            try
            {
                SWNet_CloseDevice();
                Console.WriteLine($"[THY] Desconectado");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error desconectando: {ex.Message}");
            }
        }

        /// <summary>
        /// Activa el relé de la lectora por un tiempo determinado
        /// </summary>
        /// <param name="relayNumber">Número de relé (1-4)</param>
        /// <param name="durationMs">Duración en milisegundos (predeterminado 3000)</param>
        /// <returns>true si se activó correctamente</returns>
        public static bool ActivateRelay(int relayNumber = 1, int durationMs = 3000)
        {
            try
            {
                Console.WriteLine($"[THY] 🔓 Activando relé {relayNumber} por {durationMs}ms");
                
                // Activar relé (dirección 0xFF = broadcast a todas las lectoras)
                bool activated = SWNet_RelayOn(0xFF);
                
                if (!activated)
                {
                    Console.WriteLine($"[THY] ❌ Error al activar relé");
                    return false;
                }
                
                Console.WriteLine($"[THY] ✅ Relé activado, esperando {durationMs}ms...");
                
                // Esperar el tiempo especificado
                System.Threading.Thread.Sleep(durationMs);
                
                // Desactivar relé
                bool deactivated = SWNet_RelayOff(0xFF);
                
                if (!deactivated)
                {
                    Console.WriteLine($"[THY] ⚠️ Advertencia: El relé se apagará automáticamente");
                }
                else
                {
                    Console.WriteLine($"[THY] ✅ Relé desactivado");
                }
                
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] ❌ Error activando relé: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// Activa el relé del lector
        /// </summary>
        public static bool ActivateRelay(byte relayNumber = 0xFF)
        {
            try
            {
                bool result = SWNet_RelayOn(relayNumber);
                Console.WriteLine($"[THY] Relé activado: {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error activando relé: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// Desactiva el relé del lector
        /// </summary>
        public static bool DeactivateRelay(byte relayNumber = 0xFF)
        {
            try
            {
                bool result = SWNet_RelayOff(relayNumber);
                Console.WriteLine($"[THY] Relé desactivado: {result}");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error desactivando relé: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// Lee tags del buffer (Active Mode)
        /// </summary>
        public static string[] ReadTagsFromBuffer()
        {
            try
            {
                byte[] buffer = new byte[64000];
                int length = 0;
                int tagNumber = 0;
                
                byte result = SWNet_GetTagBuf(buffer, out length, out tagNumber);
                
                Console.WriteLine($"[THY] GetTagBuf: result={result}, length={length}, tagNumber={tagNumber}");
                
                if (result == 0 || tagNumber == 0)
                {
                    return new string[0];
                }
                
                // Parse tags from buffer (mismo formato que InventoryG2)
                List<string> tags = new List<string>();
                int position = 0;
                
                for (int i = 0; i < tagNumber; i++)
                {
                    byte packLength = buffer[position];
                    byte tagType = buffer[position + 1];
                    
                    // Calcular longitud del EPC (check timestamp bit)
                    int epcLength;
                    if ((tagType & 0x80) == 0x80)
                    {
                        // Con timestamp - últimos 6 bytes son tiempo
                        epcLength = packLength - 7;
                    }
                    else
                    {
                        epcLength = packLength - 1;
                    }
                    
                    // Extraer EPC (saltar Type[0] y Ant[1], leer hasta epcLength)
                    StringBuilder epc = new StringBuilder();
                    for (int j = 2; j < epcLength; j++)
                    {
                        epc.Append(buffer[position + 1 + j].ToString("X2"));
                    }
                    
                    string tagId = epc.ToString();
                    Console.WriteLine($"[THY] Tag #{i+1}: {tagId}");
                    tags.Add(tagId);
                    
                    position += packLength + 1;
                }
                
                return tags.ToArray();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error leyendo buffer: {ex.Message}");
                Console.WriteLine($"[THY] Stack: {ex.StackTrace}");
                return new string[0];
            }
        }
        
        /// <summary>
        /// Ejecuta inventario de tags EPC (basado en ejemplo oficial THY)
        /// </summary>
        public static string[] DoInventory(byte devAddr = 0xFF)
        {
            try
            {
                byte[] arrBuffer = new byte[64000];
                ushort iTotalLen = 0;
                ushort iNum = 0;
                
                // Ejecutar inventario G2 (AnswerMode)
                bool result = SWNet_InventoryG2(devAddr, arrBuffer, out iTotalLen, out iNum);
                
                // Debug cada 5 segundos
                if (DateTime.Now.Second % 5 == 0 && DateTime.Now.Millisecond < 100)
                {
                    Console.WriteLine($"[THY-DEBUG] InventoryG2 result={result}, num={iNum}, len={iTotalLen}");
                }
                
                if (!result)
                {
                    // No es error, simplemente no hay respuesta
                    return new string[0];
                }
                
                int iTagNumber = iNum;
                if (iTagNumber == 0)
                {
                    // No hay tags, normal
                    return new string[0];
                }
                
                Console.WriteLine($"[THY] InventoryG2: {iTagNumber} tag(s), totalLen={iTotalLen}");
                
                // Parse tags (copiado del ejemplo oficial Form1.cs)
                List<string> tags = new List<string>();
                int iLength = 0;
                
                for (int iIndex = 0; iIndex < iTagNumber; iIndex++)
                {
                    byte bPackLength = arrBuffer[iLength];
                    int iIDLen;
                    
                    // Check timestamp bit
                    if ((arrBuffer[1 + iLength + 0] & 0x80) == 0x80)
                    {
                        // Con timestamp - últimos 6 bytes son tiempo
                        iIDLen = bPackLength - 7;
                    }
                    else
                    {
                        iIDLen = bPackLength - 1;
                    }
                    
                    // Extraer EPC (offset +2, saltar Type y Ant)
                    StringBuilder epc = new StringBuilder();
                    for (int i = 2; i < iIDLen; i++)
                    {
                        epc.Append(arrBuffer[1 + iLength + i].ToString("X2"));
                    }
                    
                    string tagId = epc.ToString();
                    
                    // Extraer antena y RSSI (opcional)
                    byte ant = arrBuffer[1 + iLength + 1];
                    byte rssi = arrBuffer[1 + iLength + iIDLen];
                    
                    Console.WriteLine($"[THY] Tag #{iIndex + 1}: {tagId} (Ant:{ant}, RSSI:{rssi})");
                    tags.Add(tagId);
                    
                    iLength = iLength + bPackLength + 1;
                }
                
                return tags.ToArray();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error en inventario: {ex.Message}");
                return new string[0];
            }
        }
        
        /// <summary>
        /// Lee los tags del buffer (modo pasivo - tags que llegaron automáticamente)
        /// </summary>
        public static string[] ReadTagBuffer()
        {
            try
            {
                byte[] buffer = new byte[64000];
                int length = 0;
                int tagNumber = 0;
                
                // Leer buffer de tags
                byte result = SWNet_GetTagBuf(buffer, out length, out tagNumber);
                
                // Debug: mostrar resultado cada 5 segundos
                if (DateTime.Now.Second % 5 == 0 && DateTime.Now.Millisecond < 100)
                {
                    Console.WriteLine($"[THY-DEBUG] GetTagBuf result={result}, tags={tagNumber}, len={length}");
                }
                
                if (result == 0 || tagNumber == 0)
                {
                    return new string[0];
                }
                
                Console.WriteLine($"[THY] Buffer: {tagNumber} tag(s), length={length}");
                
                // Parse tags del buffer
                List<string> tags = new List<string>();
                int offset = 0;
                
                for (int i = 0; i < tagNumber; i++)
                {
                    if (offset >= length) break;
                    
                    byte packLength = buffer[offset];
                    
                    if (packLength == 0 || offset + packLength > length)
                    {
                        Console.WriteLine($"[THY] Buffer: Dato inválido en offset {offset}");
                        break;
                    }
                    
                    // Determinar longitud del EPC
                    int epcLen;
                    if ((buffer[offset + 1] & 0x80) == 0x80)
                    {
                        // Con timestamp
                        epcLen = packLength - 7;
                    }
                    else
                    {
                        epcLen = packLength - 1;
                    }
                    
                    // Extraer EPC (saltar Type y Ant)
                    StringBuilder epc = new StringBuilder();
                    for (int j = 2; j < epcLen && (offset + 1 + j) < length; j++)
                    {
                        epc.Append(buffer[offset + 1 + j].ToString("X2"));
                    }
                    
                    string tagId = epc.ToString();
                    
                    if (!string.IsNullOrWhiteSpace(tagId))
                    {
                        byte ant = buffer[offset + 2];
                        Console.WriteLine($"[THY] Buffer Tag #{i + 1}: {tagId} (Ant:{ant})");
                        tags.Add(tagId);
                    }
                    
                    offset += packLength + 1;
                }
                
                return tags.ToArray();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error leyendo buffer: {ex.Message}");
                return new string[0];
            }
        }

        

        
        /// <summary>
        /// Lee los tags del buffer
        /// </summary>
        /// <summary>
        /// Obtiene la configuración del dispositivo
        /// </summary>
        public static Dictionary<string, object> GetReaderConfig(byte devAddr = 0xFF)
        {
            try
            {
                byte[] buffer = new byte[128];
                bool success = SWNet_GetDeviceParam(devAddr, buffer);
                
                if (success)
                {
                    var config = new Dictionary<string, object>
                    {
                        ["frequency"] = buffer[0], // Banda de frecuencia (0=China, 1=USA, 2=Europe, 3=Korea)
                        ["power"] = buffer[1], // Potencia de lectura (0-30 dBm)
                        ["work_mode"] = buffer[2], // Modo de trabajo (0=Answer, 1=Active)
                        ["session"] = buffer[3], // Sesión EPC (0=S0, 1=S1, 2=S2, 3=S3)
                        ["q_value"] = buffer[4], // Valor Q (0-15)
                        ["beep"] = buffer[5] == 1, // Sonido al leer tag
                        ["relay_mode"] = buffer[6], // Modo relé (0=Manual, 1=Auto)
                        ["relay_delay"] = buffer[7] * 100, // Retardo relé en ms (valor * 100)
                        ["wiegand_mode"] = buffer[8], // Modo Wiegand
                        ["baudrate"] = GetBaudRate(buffer[9]) // Velocidad comunicación
                    };
                    
                    Console.WriteLine($"[THY] Configuración leída exitosamente");
                    return config;
                }
                
                Console.WriteLine($"[THY] Error leyendo configuración");
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error obteniendo configuración: {ex.Message}");
                return null;
            }
        }
        
        /// <summary>
        /// Establece la configuración del dispositivo
        /// </summary>
        public static bool SetReaderConfig(Dictionary<string, object> config, byte devAddr = 0xFF)
        {
            try
            {
                byte[] buffer = new byte[128];
                
                // Configurar valores
                if (config.ContainsKey("frequency"))
                    buffer[0] = Convert.ToByte(config["frequency"]);
                    
                if (config.ContainsKey("power"))
                    buffer[1] = Convert.ToByte(config["power"]);
                    
                if (config.ContainsKey("work_mode"))
                    buffer[2] = Convert.ToByte(config["work_mode"]);
                    
                if (config.ContainsKey("session"))
                    buffer[3] = Convert.ToByte(config["session"]);
                    
                if (config.ContainsKey("q_value"))
                    buffer[4] = Convert.ToByte(config["q_value"]);
                    
                if (config.ContainsKey("beep"))
                    buffer[5] = (bool)config["beep"] ? (byte)1 : (byte)0;
                    
                if (config.ContainsKey("relay_mode"))
                    buffer[6] = Convert.ToByte(config["relay_mode"]);
                    
                if (config.ContainsKey("relay_delay"))
                    buffer[7] = (byte)(Convert.ToInt32(config["relay_delay"]) / 100);
                    
                if (config.ContainsKey("wiegand_mode"))
                    buffer[8] = Convert.ToByte(config["wiegand_mode"]);
                    
                if (config.ContainsKey("baudrate"))
                    buffer[9] = GetBaudRateCode(Convert.ToInt32(config["baudrate"]));
                
                bool success = SWNet_SetDeviceParam(devAddr, buffer);
                
                if (success)
                {
                    Console.WriteLine($"[THY] Configuración guardada exitosamente");
                }
                else
                {
                    Console.WriteLine($"[THY] Error guardando configuración");
                }
                
                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] Error estableciendo configuración: {ex.Message}");
                return false;
            }
        }
        
        private static int GetBaudRate(byte code)
        {
            return code switch
            {
                0 => 9600,
                1 => 19200,
                2 => 38400,
                3 => 57600,
                4 => 115200,
                _ => 115200
            };
        }
        
        /// <summary>
        /// Intenta identificar el significado de parámetros extendidos
        /// </summary>
        private static string GetParameterDescription(byte paramAddr, byte value)
        {
            return paramAddr switch
            {
                0x08 => "Wiegand Mode",
                0x09 => "Wiegand Width",
                0x0A => "Wiegand Interval",
                0x0B => "Tag Filter Enable",
                0x0C => "Filter Mode",
                0x0D => "Valid Tag Count (Low)",
                0x0E => "Valid Tag Count (High)",
                0x0F => "Session",
                0x10 => "Target",
                0x11 => "Q Value",
                0x12 => "Frequency Region",
                0x13 => "Output Mode",
                0x14 => "Relay Control",
                0x15 => "Relay Time",
                0x16 => "HTTP Enable",
                0x17 => "HTTP Mode",
                _ => "Unknown"
            };
        }
        
        /// <summary>
        /// Habilita o deshabilita el filtro interno de tags de la lectora
        /// </summary>
        public static bool SetTagFilter(bool enable, byte filterMode = 0x00)
        {
            try
            {
                Console.WriteLine($"[THY] 🔧 Configurando filtro interno: {(enable ? "HABILITADO" : "DESHABILITADO")}");
                
                // Parámetro 0x0B = Tag Filter Enable (0=Off, 1=On)
                byte filterValue = enable ? (byte)0x01 : (byte)0x00;
                bool result = SWNet_SetDeviceOneParam(0xFF, 0x0B, filterValue);
                
                if (result)
                {
                    Console.WriteLine($"[THY] ✅ Filtro {(enable ? "habilitado" : "deshabilitado")}");
                    
                    // Si se habilita, configurar modo de filtro (0x0C)
                    if (enable && filterMode != 0x00)
                    {
                        bool modeResult = SWNet_SetDeviceOneParam(0xFF, 0x0C, filterMode);
                        Console.WriteLine($"[THY] Filter Mode 0x0C = 0x{filterMode:X2}: {(modeResult ? "OK" : "FAIL")}");
                    }
                }
                else
                {
                    Console.WriteLine($"[THY] ❌ Error configurando filtro");
                }
                
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] ❌ Excepción configurando filtro: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// Lee el estado actual del filtro
        /// </summary>
        public static (bool enabled, int validTagCount) GetFilterStatus()
        {
            try
            {
                byte[] filterEnabled = new byte[1];
                byte[] tagCountLow = new byte[1];
                byte[] tagCountHigh = new byte[1];
                
                bool hasFilter = SWNet_ReadDeviceOneParam(0xFF, 0x0B, filterEnabled);
                bool hasCountLow = SWNet_ReadDeviceOneParam(0xFF, 0x0D, tagCountLow);
                bool hasCountHigh = SWNet_ReadDeviceOneParam(0xFF, 0x0E, tagCountHigh);
                
                if (hasFilter && hasCountLow && hasCountHigh)
                {
                    int count = (tagCountHigh[0] << 8) | tagCountLow[0];
                    bool enabled = filterEnabled[0] == 0x01;
                    
                    Console.WriteLine($"[THY] 📊 Filtro: {(enabled ? "ON" : "OFF")}, Tags en memoria: {count}");
                    return (enabled, count);
                }
                
                return (false, 0);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] ❌ Error leyendo estado del filtro: {ex.Message}");
                return (false, 0);
            }
        }
        
        /// <summary>
        /// Lee todos los tags detectados en el rango de la lectora (inventario)
        /// Útil para sincronizar whitelist local con tags presentes
        /// </summary>
        public static List<string> ReadInventory()
        {
            var tags = new List<string>();
            
            try
            {
                byte[] buffer = new byte[4096]; // Buffer grande para múltiples tags
                ushort totalLen = 0;
                ushort cardNum = 0;
                
                Console.WriteLine($"[THY] 📡 Realizando inventario de tags...");
                
                // Inventario G2 (EPC Gen2)
                bool success = SWNet_InventoryG2(0xFF, buffer, out totalLen, out cardNum);
                
                if (success && cardNum > 0)
                {
                    Console.WriteLine($"[THY] ✅ Inventario: {cardNum} tag(s) detectado(s)");
                    
                    // Parsear buffer para extraer EPCs
                    int offset = 0;
                    for (int i = 0; i < cardNum && offset < totalLen; i++)
                    {
                        try
                        {
                            // Formato del buffer: [PC(2)] [EPC(N)] [RSSI(1)]
                            // PC indica la longitud del EPC
                            if (offset + 2 > totalLen) break;
                            
                            ushort pc = (ushort)((buffer[offset] << 8) | buffer[offset + 1]);
                            int epcLen = ((pc >> 11) & 0x1F) * 2; // EPC length in bytes
                            
                            offset += 2; // Skip PC
                            
                            if (offset + epcLen > totalLen) break;
                            
                            // Extraer EPC
                            StringBuilder epc = new StringBuilder();
                            for (int j = 0; j < epcLen; j++)
                            {
                                epc.Append(buffer[offset + j].ToString("X2"));
                            }
                            
                            string tagId = epc.ToString();
                            if (!string.IsNullOrWhiteSpace(tagId))
                            {
                                tags.Add(tagId);
                                Console.WriteLine($"[THY]   Tag {i + 1}: {tagId}");
                            }
                            
                            offset += epcLen + 1; // Skip EPC + RSSI
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[THY] ⚠️ Error parseando tag {i + 1}: {ex.Message}");
                            break;
                        }
                    }
                }
                else
                {
                    Console.WriteLine($"[THY] ℹ️ Inventario: 0 tags detectados");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[THY] ❌ Error en inventario: {ex.Message}");
            }
            
            return tags;
        }
        
        private static byte GetBaudRateCode(int baudrate)
        {
            return baudrate switch
            {
                9600 => 0,
                19200 => 1,
                38400 => 2,
                57600 => 3,
                115200 => 4,
                _ => 4
            };
        }
    }
}
