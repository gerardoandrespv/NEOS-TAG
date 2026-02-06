# CONTROL DE FILTRO INTERNO - THY RFID READER

## 🚀 REINICIAR GATEWAY CON NUEVA FUNCIONALIDAD

**Pasos:**

1. **Cierra la ventana de PowerShell que tiene el Gateway corriendo** (la ventana de Administrador)

2. **Haz clic derecho en `restart-gateway-filtro.ps1`** → **"Ejecutar con PowerShell"** (como Administrador)

3. **Espera 20 segundos** a que el Gateway inicie

---

## 📡 NUEVOS ENDPOINTS DISPONIBLES

### 1️⃣ Consultar estado del filtro
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/lectora/filter" -Method GET
```

**Respuesta:**
```json
{
  "filter_enabled": false,
  "valid_tag_count": 1,
  "status": "INACTIVO",
  "warning": null
}
```

---

### 2️⃣ HABILITAR filtro interno
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/lectora/filter" -Method POST -ContentType "application/json" -Body '{"enabled": true}'
```

**Respuesta:**
```json
{
  "success": true,
  "filter_enabled": true,
  "valid_tag_count": 1,
  "message": "Filtro HABILITADO - 1 tag(s) en memoria"
}
```

---

### 3️⃣ DESHABILITAR filtro interno
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/lectora/filter" -Method POST -ContentType "application/json" -Body '{"enabled": false}'
```

**Respuesta:**
```json
{
  "success": true,
  "filter_enabled": false,
  "valid_tag_count": 1,
  "message": "Filtro DESHABILITADO - 1 tag(s) en memoria"
}
```

---

## 🧪 PRUEBA DEL FILTRO INTERNO

**Comportamiento esperado:**

- **Filtro DESHABILITADO (0x0B=0x00):** La lectora lee TODOS los tags y los envía al Gateway
  
- **Filtro HABILITADO (0x0B=0x01):** La lectora SOLO lee el tag almacenado en su memoria interna (1 tag según parámetros 0x0D=0x01, 0x0E=0x01)

**Limitaciones:**
- La lectora tiene solo **1 tag** en memoria interna
- No puedes agregar más tags sin interfaz web o software específico THY
- El SDK actual (SWNetApi.dll 2020) no tiene función para escribir tags en whitelist

---

## ⚙️ PARÁMETROS INVOLUCRADOS

| Parámetro | Descripción | Valor Actual |
|-----------|-------------|--------------|
| **0x0B** | Tag Filter Enable | 0x00 (OFF) |
| **0x0C** | Filter Mode | 0x00 |
| **0x0D** | Valid Tag Count (Low) | 0x01 |
| **0x0E** | Valid Tag Count (High) | 0x01 |

**Total de tags en whitelist interna:** (0x0E << 8) \| 0x0D = **1 tag**

---

## 🔍 COMPARACIÓN: FIRESTORE vs FILTRO INTERNO

| Característica | Firestore Whitelist | Filtro Interno |
|----------------|---------------------|----------------|
| **Capacidad** | Ilimitada | 1 tag (actual) |
| **Sincronización** | Cada 5 minutos | Tiempo real |
| **Gestión** | Dashboard web | Requiere software THY |
| **Centralización** | Sí (múltiples lectoras) | No (cada lectora independiente) |
| **Auditabilidad** | Completa (Firestore logs) | Limitada |
| **Flexibilidad** | Alta (reglas, horarios) | Baja (solo permitir/denegar) |

**Recomendación:** Mantener Firestore como solución principal. El filtro interno es útil solo para:
- **Modo offline** (sin Gateway)
- **Seguridad adicional** (doble validación)
- **Testing/troubleshooting**
