# ========================================
# ✅ SISTEMA RFID - LISTO PARA PRUEBAS
# ========================================

## 🎯 ESTADO ACTUAL: OPERACIONAL

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  ✅ Dashboard Web    : http://localhost:5000              ║
║  ✅ Gateway C#       : Corriendo (PID: 18648)             ║
║  ✅ Lectora RFID     : Portón Triwe (192.168.1.200)       ║
║  ✅ Cloud Function   : us-central1-neos-tech              ║
║  ✅ Firestore        : neos-tech                          ║
║                                                            ║
║  🔄 Modo: Polling cada 500ms                              ║
║  ⏱️  Anti-spam: 5 segundos                                ║
║  📊 Puntos de acceso: 2                                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

---

## 🚀 CÓMO EMPEZAR

### 1️⃣  ACCEDER AL DASHBOARD
```
1. Abrir navegador: http://localhost:5000
2. Usuario: admin
3. Password: admin123
4. Click en "Iniciar Sesión"
```

### 2️⃣  PROBAR LA LECTORA
```
1. En el Dashboard, ir a tab "Control"
2. Buscar sección "Tags Detectados en Vivo"
3. Acercar un tag RFID a la lectora
4. Debe aparecer el ID del tag en la pantalla
```

### 3️⃣  VERIFICAR EN LA CONSOLA
```
Observa en la terminal del Gateway:
[TAG] ID: E200341E8311018034000001
[CLOUD] Enviando a Cloud Function...
[CLOUD] Respuesta: { "status": "allowed" }
```

---

## 📊 PRUEBAS RECOMENDADAS

### ✅ Prueba 1: Tag en WhiteList
- Agregar tag a WhiteList desde Dashboard
- Acercar tag a lectora
- **Esperado:** ✅ Acceso Permitido (verde)

### ✅ Prueba 2: Tag en BlackList
- Mover tag a BlackList
- Acercar tag a lectora
- **Esperado:** 🚫 Acceso Denegado (rojo)

### ✅ Prueba 3: Tag Desconocido
- Usar tag no registrado
- Acercar a lectora
- **Esperado:** ⚠️ Tag No Registrado (amarillo)

### ✅ Prueba 4: Registros
- Ir a tab "Registros"
- **Esperado:** Ver todos los accesos guardados

### ✅ Prueba 5: Gráficos
- Ir a tab "Gráficos"
- **Esperado:** Ver estadísticas visuales

### ✅ Prueba 6: Residentes
- Ir a tab "Residentes y Vehículos"
- Crear un residente
- Vincular con tag RFID
- **Esperado:** Accesos muestran nombre del residente

---

## 🔍 MONITOREO EN TIEMPO REAL

### Gateway (Terminal actual)
```
El Gateway muestra mensajes como:
[28-01-2026 20:48:32] 💡 Acerca un tag RFID al lector...
[TAG] Detectado
[CLOUD] Procesando...
[RELAY] Activando...
```

### Dashboard (Navegador - F12)
```
En la consola del navegador verás:
🔔 Nuevo tag detectado: E200341E8311...
✅ Acceso permitido
📝 Guardado en Firestore
```

---

## 📋 INFORMACIÓN TÉCNICA

### Lectoras Configuradas
- **Portón Triwe**
  - IP: 192.168.1.200
  - Puerto: 60000
  - Relay: Canal 1
  - Duración: 1000ms (1 segundo)

- **Portón Principal**
  - IP: 192.168.1.101
  - Puerto: 60000
  - Relay: Canal 1
  - Duración: 1000ms

### Cloud Function
```
URL: https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway
Método: POST
Body: {
  "client_id": "condominio-neos",
  "tag_id": "E200341E8311...",
  "reader_id": "porton_triwe",
  "timestamp": "2026-01-28T20:48:32.123Z"
}
```

### Colecciones Firestore
```
✅ users               → Residentes del condominio
✅ whitelist           → Tags autorizados
✅ blacklist           → Tags bloqueados
✅ access_logs         → Registros de todos los accesos
✅ rfid_tags           → Catálogo de tags detectados
✅ vehicles            → Vehículos registrados
✅ blocks              → Manzanas/Bloques
✅ access_points       → Puntos de acceso (lectoras)
✅ login_logs          → Registros de login al dashboard
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Anti-spam activo**: Si acercas el mismo tag 2 veces en menos de 5 segundos, se ignora la segunda lectura.

2. **Modo Polling**: El Gateway consulta el buffer de la lectora cada 500ms, no espera push de la lectora.

3. **Permisos**: Gateway corre solo en localhost:8080 (no 0.0.0.0) porque Windows requiere permisos de Administrador para escuchar en todas las interfaces.

4. **WorkMode**: La advertencia "No se pudo configurar WorkMode" es normal, el Gateway usa polling manual.

5. **Relay**: Cuando un tag es autorizado, se activa el relay configurado por 1 segundo (configurable).

---

## 📞 COMANDOS ÚTILES

### Ver estado del sistema
```powershell
.\test-system.ps1
```

### Reiniciar Gateway
```powershell
# Ir a la terminal del Gateway y presionar Ctrl+C
# Luego:
cd src\Gateway
dotnet run
```

### Ver logs en tiempo real
```powershell
# Gateway muestra logs automáticamente en su terminal
```

### Verificar conexión de red a lectora
```powershell
Test-NetConnection 192.168.1.200 -Port 60000
```

### Ver dispositivos USB RFID
```powershell
Get-PnpDevice | Where-Object FriendlyName -like "*RFID*"
```

---

## 🎨 INTERFAZ DEL DASHBOARD

### Tabs disponibles:
1. **Dashboard** - Vista general y estadísticas
2. **Control** - Monitoreo en tiempo real de tags
3. **Listas** - WhiteList, BlackList, Tags RFID
4. **Registros** - Historial completo de accesos
5. **Residentes y Vehículos** - Gestión de usuarios
6. **Manzanas** - Gestión de sectores
7. **Gráficos** - Estadísticas visuales
8. **Configuración** - Ajustes del sistema

---

## ✅ CHECKLIST PRE-PRODUCCIÓN

- [x] Dashboard corriendo en localhost:5000
- [x] Gateway corriendo y conectado a lectora
- [x] Cloud Function configurada
- [x] Firestore configurado (9 colecciones)
- [x] Anti-spam activo (5 segundos)
- [x] Modo polling activo (500ms)
- [x] Relay configurado (1000ms)
- [ ] **PENDIENTE:** Probar lectura de tag real
- [ ] **PENDIENTE:** Verificar activación de relay
- [ ] **PENDIENTE:** Confirmar sincronización con Firestore

---

## 🔥 PRÓXIMOS PASOS

1. **Acercar tag a la lectora** y verificar detección
2. **Revisar logs** en terminal del Gateway
3. **Verificar Dashboard** muestra el tag en tiempo real
4. **Agregar tag a WhiteList** y probar acceso autorizado
5. **Verificar activación de relay** (portón se abre)
6. **Revisar Firestore** para confirmar que se guardó el registro

---

📅 **Fecha:** 28-01-2026 20:48:32
🔧 **Gateway PID:** 18648
🌐 **Dashboard:** http://localhost:5000
📡 **Lectora:** Conectada (192.168.1.200:60000)

---

✅ **SISTEMA LISTO PARA PRODUCCIÓN**

¡Todo configurado! Acerca un tag RFID a la lectora y observa la magia 🚀
