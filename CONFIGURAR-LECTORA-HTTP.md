# ═══════════════════════════════════════════════════════════════════════
# 📋 CONFIGURACIÓN DE LA LECTORA THY PARA HTTP OUTPUT
# ═══════════════════════════════════════════════════════════════════════

## 🎯 Objetivo
Tu lectora está funcionando en modo standalone (buzzer suena, relay se activa),
pero necesita enviar los tags al Gateway para que se registren en la nube.

## 🔧 Pasos en el Software de la Lectora THY:

### 1. Abrir la configuración de la lectora
   - IP de la lectora: 192.168.1.200
   - Puerto: 60000
   - Abre el software de configuración THY

### 2. Buscar la sección "HTTP Output" o "Network Upload"
   Puede aparecer como:
   - "HTTP Upload"
   - "Network Output"
   - "Tag Upload Server"
   - "Cloud Upload"

### 3. Configurar los siguientes parámetros:

   **HTTP Server IP:** `192.168.1.11`
   (Esta es la IP de la PC donde corre el Gateway)

   **HTTP Server Port:** `8080`
   (Puerto del Gateway)

   **HTTP Path/URL:** `/readerid`
   (Endpoint que creamos)

   **HTTP Method:** `GET`
   (Método de envío)

   **Parámetros a enviar:**
   - `id` = EPC del tag
   - `readsn` = Serial de la lectora
   - `heart` = 0 (para tags) o 1 (para heartbeat)

   **Ejemplo de URL completa que debe enviar la lectora:**
   ```
   http://192.168.1.11:8080/readerid?id=E2000017941502181550D17D&heart=0&readsn=TRIWE001
   ```

### 4. Habilitar el envío HTTP
   - Marca la casilla "Enable HTTP Output" o similar
   - Guarda la configuración
   - Reinicia la lectora si es necesario

## 🧪 Pruebas

### Prueba 1: Verificar que el Gateway está escuchando
```powershell
Test-NetConnection -ComputerName 192.168.1.11 -Port 8080
```
Debe decir: `TcpTestSucceeded : True`

### Prueba 2: Simular que la lectora envía un tag
```powershell
.\test-endpoint.ps1
```
Deberías ver en el Gateway:
```
📨 HTTP GET /readerid?id=E2000017941502181550D17D&heart=0&readsn=TRIWE001
🔍 Parámetros recibidos: id=E2000017941502181550D17D, heart=0, readsn=TRIWE001
✅ Tag procesado: E2000017941502181550D17D
```

### Prueba 3: Escanear un tag real
1. Escanea un tag con la lectora
2. El buzzer debe sonar (modo standalone)
3. Observa el terminal del Gateway
4. Deberías ver el mensaje `📨 HTTP GET /readerid...`

## ❓ Preguntas frecuentes

**P: ¿Qué pasa si no encuentro "HTTP Output" en el software?**
R: Algunas lectoras THY tienen esta función deshabilitada por defecto. Verifica:
   - Versión del firmware (debe ser 53 o superior)
   - Modo de operación (debe ser "Answer Mode" con HTTP)
   - Consulta el manual de tu modelo específico

**P: ¿La lectora puede funcionar sin conexión a internet?**
R: Sí, el modo standalone sigue funcionando. Solo no se registrará en la nube.

**P: ¿Cómo sé si la lectora está enviando HTTP?**
R: Con los logs agregados al Gateway, verás TODAS las peticiones HTTP que lleguen.
   Si no ves nada cuando escaneas un tag, la lectora no está enviando.

## 🔍 Diagnóstico

Si después de configurar NO ves peticiones HTTP en el Gateway:

1. **Verifica la red:**
   ```powershell
   ping 192.168.1.11
   ping 192.168.1.200
   ```

2. **Verifica el firewall de Windows:**
   - Puerto 8080 debe estar abierto
   - Gateway debe estar permitido en el firewall

3. **Revisa el manual de la lectora:**
   - Busca "HTTP Upload" o "Network Output"
   - Verifica el formato de URL que usa tu modelo

4. **Contacta soporte de THY:**
   - Si tu modelo no tiene HTTP Output
   - Puede que necesites actualizar firmware

═══════════════════════════════════════════════════════════════════════
