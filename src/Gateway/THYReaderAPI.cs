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
                
                // Leer parámetros individuales
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
                
                // Leer configuración completa del dispositivo (parámetros adicionales)
                byte[] allParams = new byte[128];
                if (SWNet_GetDeviceParam(0xFF, allParams))
                {
                    config["RawParams"] = BitConverter.ToString(allParams, 0, 20);
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
                if (!SWNet_InventoryG2(devAddr, arrBuffer, out iTotalLen, out iNum))
                {
                    return new string[0];
                }
                
                int iTagNumber = iNum;
                if (iTagNumber == 0) return new string[0];
                
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
