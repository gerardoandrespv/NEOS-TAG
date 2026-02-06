# 🔁 Sistema de Debouncing RFID - Anti-Spam de Lecturas

## 📋 Problema Común en Sistemas RFID

Los lectores RFID detectan el mismo tag **múltiples veces por segundo** mientras está en su rango de lectura. Esto genera:

- ❌ **Cientos de eventos duplicados** (mismo tag leído 50-200 veces en 10 segundos)
- ❌ **Sobrecarga del servidor** (Cloud Function recibe lecturas innecesarias)
- ❌ **Logs contaminados** (difícil ver eventos reales)
- ❌ **Costos elevados** (más invocaciones de Cloud Functions)
- ❌ **Múltiples aperturas** de portones (usuario cruza una vez, pero se abre 20 veces)

## ✅ Solución Implementada: Debouncing Inteligente

### **¿Qué es Debouncing?**

Es un mecanismo que **agrupa lecturas duplicadas** del mismo tag dentro de un período de tiempo configurable (cooldown), procesando solo la **primera lectura** y descartando el resto.

**Ejemplo**:
```
Sin Debouncing:
├─ 14:30:00.123 - Tag E280... detectado ✅ PROCESADO
├─ 14:30:00.456 - Tag E280... detectado ✅ PROCESADO (DUPLICADO)
├─ 14:30:00.789 - Tag E280... detectado ✅ PROCESADO (DUPLICADO)
├─ 14:30:01.012 - Tag E280... detectado ✅ PROCESADO (DUPLICADO)
└─ ... 50+ lecturas más en 10 segundos

Con Debouncing (10s):
├─ 14:30:00.123 - Tag E280... detectado ✅ PROCESADO
├─ 14:30:00.456 - Tag E280... detectado ❌ FILTRADO (< 10s)
├─ 14:30:00.789 - Tag E280... detectado ❌ FILTRADO (< 10s)
├─ 14:30:01.012 - Tag E280... detectado ❌ FILTRADO (< 10s)
└─ 14:30:11.234 - Tag E280... detectado ✅ PROCESADO (> 10s desde última)
```

---

## 🔧 Configuración

### **Archivo: `gateway.config.json`**

```json
{
  "rfid": {
    "tag_cooldown_seconds": 10,
    "show_duplicate_stats": true
  },
  "access_points": [
    {
      "id": "porton_triwe",
      "name": "Portón Triwe",
      "tag_cooldown_seconds": 15
    },
    {
      "id": "porton_principal",
      "name": "Portón Principal",
      "tag_cooldown_seconds": 30
    }
  ]
}
```

### **Parámetros**:

| Parámetro | Ubicación | Descripción | Valor Típico |
|-----------|-----------|-------------|--------------|
| `tag_cooldown_seconds` | `rfid` | Cooldown **global** por defecto | 10 segundos |
| `tag_cooldown_seconds` | `access_points[].` | Cooldown **específico** de un reader | 15-30s |
| `show_duplicate_stats` | `rfid` | Mostrar estadísticas en consola cada 10 duplicados | `true` |

---

## 🎯 Tiempos Recomendados por Tipo de Uso

| Escenario | Cooldown Recomendado | Razón |
|-----------|---------------------|-------|
| **Control de Acceso (Portones)** | 15-30 segundos | Evitar que el portón se abra múltiples veces mientras la persona cruza |
| **Inventario/Conteo** | 3-5 segundos | Permitir re-lecturas rápidas si el tag se mueve |
| **Registro de Asistencia** | 60-120 segundos | Una entrada por persona cada minuto |
| **Estacionamiento** | 30-60 segundos | Evitar lecturas mientras el vehículo entra/sale |
| **Eventos VIP** | 5-10 segundos | Balance entre precisión y evitar spam |

---

## 📊 Estadísticas en Tiempo Real

### **Endpoint**: `GET /api/rfid/stats`

```bash
curl http://localhost:8080/api/rfid/stats
```

**Respuesta**:
```json
{
  "total_reads": 1523,
  "duplicates_filtered": 1347,
  "unique_reads": 176,
  "filter_rate_percent": 88.45,
  "uptime_minutes": 45.23,
  "default_cooldown_seconds": 10,
  "active_tags_cached": 12,
  "show_duplicate_stats": true,
  "readers": [
    {
      "id": "porton_triwe",
      "name": "Portón Triwe",
      "cooldown_seconds": 15
    },
    {
      "id": "porton_principal",
      "name": "Portón Principal",
      "cooldown_seconds": 30
    }
  ]
}
```

**Interpretación**:
- `total_reads: 1523` → Total de veces que el lector detectó tags
- `duplicates_filtered: 1347` → Lecturas descartadas por debouncing (88.45%)
- `unique_reads: 176` → Eventos reales procesados
- `filter_rate_percent: 88.45` → **Reducción de spam del 88%** 🎉

---

## 🔧 Modificar Cooldown en Tiempo Real (Sin Reiniciar)

### **Cambiar Cooldown Global**

```bash
curl -X POST http://localhost:8080/api/rfid/cooldown \
  -H "Content-Type: application/json" \
  -d '{"default_cooldown": 20}'
```

### **Cambiar Cooldown de un Reader Específico**

```bash
curl -X POST http://localhost:8080/api/rfid/cooldown \
  -H "Content-Type: application/json" \
  -d '{
    "reader_id": "porton_triwe",
    "cooldown": 25
  }'
```

**Ventajas**:
- ✅ Sin reiniciar Gateway
- ✅ Efecto inmediato
- ✅ Ideal para ajustes en producción

---

## 📝 Logs de Depuración

### **Logs en Consola**

Cuando `show_duplicate_stats: true`:

```
[14:30:15] 🔁 Duplicados filtrados: 10/12 (83.3%) - Últimos 3.2s
[14:30:42] 🔁 Duplicados filtrados: 20/24 (83.3%) - Últimos 2.8s
[14:31:08] 🔁 Duplicados filtrados: 30/35 (85.7%) - Últimos 1.5s
```

**Interpretación**:
- `10/12`: 10 duplicados filtrados de 12 lecturas totales
- `(83.3%)`: Tasa de filtrado
- `Últimos 3.2s`: Tiempo desde la última lectura del mismo tag (menor que el cooldown)

---

## 🧠 Funcionamiento Interno

### **Algoritmo**:

```csharp
private static async Task ProcessTag(string tagId, AccessPointConfig reader)
{
    totalTagReads++;
    
    // 1. Determinar cooldown (específico del reader o global)
    int cooldown = reader?.TagCooldownSeconds ?? defaultCooldownSeconds;
    
    // 2. Clave única: reader + tag (permite que el mismo tag se procese en readers diferentes)
    string cacheKey = $"{reader?.Id}:{tagId}";
    
    // 3. Verificar si el tag fue leído recientemente
    if (lastTagRead.ContainsKey(cacheKey))
    {
        var timeSinceLastRead = (DateTime.Now - lastTagRead[cacheKey]).TotalSeconds;
        
        if (timeSinceLastRead < cooldown)
        {
            duplicateTagsFiltered++;
            return; // ❌ FILTRADO - Tag leído muy recientemente
        }
    }
    
    // 4. Actualizar timestamp de última lectura
    lastTagRead[cacheKey] = DateTime.Now;
    
    // 5. Procesar tag (enviar a Cloud Function, abrir portón, etc.)
    await SendToCloudFunction(tagId, reader.id);
}
```

### **Características Clave**:

1. **Cooldown por Reader + Tag**:
   - El mismo tag puede procesarse en diferentes readers simultáneamente
   - Clave de caché: `"porton_triwe:E28011700000020562D2ED2C"`

2. **Limpieza Automática**:
   - Mantiene solo los últimos 200 tags en memoria
   - Cuando se superan 200, elimina los 100 más antiguos

3. **Cooldown Jerárquico**:
   ```
   1. Cooldown específico del reader (si existe)
   2. Cooldown global (si no hay específico)
   3. 10 segundos (valor por defecto si no hay configuración)
   ```

---

## 🎨 Visualización de Estadísticas (Dashboard)

Puedes agregar un widget en el dashboard para ver estadísticas en tiempo real:

```javascript
async function loadDebounceStats() {
    try {
        const response = await fetch('http://localhost:8080/api/rfid/stats');
        const stats = await response.json();
        
        document.getElementById('total-reads').textContent = stats.total_reads;
        document.getElementById('unique-reads').textContent = stats.unique_reads;
        document.getElementById('duplicates').textContent = stats.duplicates_filtered;
        document.getElementById('filter-rate').textContent = stats.filter_rate_percent.toFixed(1) + '%';
        
        // Actualizar cada 5 segundos
        setTimeout(loadDebounceStats, 5000);
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

loadDebounceStats();
```

**HTML**:
```html
<div class="stats-card">
    <h3>📊 Debouncing RFID</h3>
    <div class="stat">
        <span class="label">Lecturas Totales:</span>
        <span id="total-reads">0</span>
    </div>
    <div class="stat">
        <span class="label">Eventos Únicos:</span>
        <span id="unique-reads">0</span>
    </div>
    <div class="stat">
        <span class="label">Duplicados Filtrados:</span>
        <span id="duplicates">0</span>
    </div>
    <div class="stat">
        <span class="label">Tasa de Filtrado:</span>
        <span id="filter-rate">0%</span>
    </div>
</div>
```

---

## 🧪 Testing del Sistema

### **Test 1: Verificar Configuración Cargada**

```bash
# Iniciar Gateway y verificar logs
dotnet run

# Deberías ver:
# [14:30:00] 🔁 Cooldown global: 10s
# [14:30:00] Cargado: Portón Triwe @ 192.168.1.200:60000 (cooldown: 15s)
# [14:30:00] Cargado: Portón Principal @ 192.168.1.101:60000 (cooldown: 30s)
```

### **Test 2: Simular Lecturas Duplicadas**

```bash
# Acercar un tag al lector y mantenerlo por 10 segundos
# Observar en consola:

[14:35:12] 📥 Tag E28011700000020562D2ED2C procesado
[14:35:12] 🔁 Duplicados filtrados: 10/11 (90.9%) - Últimos 0.5s
[14:35:13] 🔁 Duplicados filtrados: 20/21 (95.2%) - Últimos 0.3s
```

### **Test 3: Consultar Estadísticas**

```bash
curl http://localhost:8080/api/rfid/stats | jq
```

### **Test 4: Cambiar Cooldown en Vivo**

```bash
# Cambiar cooldown de porton_triwe a 5 segundos
curl -X POST http://localhost:8080/api/rfid/cooldown \
  -H "Content-Type: application/json" \
  -d '{"reader_id": "porton_triwe", "cooldown": 5}'

# Verificar cambio
curl http://localhost:8080/api/rfid/stats | jq '.readers'
```

---

## 🚀 Ventajas del Sistema Implementado

| Ventaja | Descripción |
|---------|-------------|
| **Reducción de Spam** | 80-95% menos eventos procesados |
| **Ahorro de Costos** | Menos invocaciones de Cloud Functions |
| **Mejor UX** | Portones no se abren múltiples veces |
| **Logs Limpios** | Solo eventos reales en Firestore |
| **Configurable** | Diferentes tiempos por tipo de uso |
| **En Tiempo Real** | Cambios sin reiniciar Gateway |
| **Estadísticas** | Visibilidad completa del filtrado |

---

## 📖 Comparación con Otros Sistemas RFID

| Sistema | Método de Debouncing | Cooldown Típico |
|---------|---------------------|-----------------|
| **Zebra FX7500** | Session-based (agrupa lecturas en ventanas de tiempo) | 2-10 segundos |
| **Impinj R700** | Tag PopulationEstimate (filtra duplicados en hardware) | Configurable 1-30s |
| **Alien ALR-9900** | Tag Streaming (buffer interno con filtrado) | 5-15 segundos |
| **NeosTech Gateway** | Cache con timestamp por reader+tag | 10-30 segundos |

---

## 🔧 Troubleshooting

### **Problema: Sigue habiendo muchos duplicados**

**Solución**: Incrementar cooldown
```bash
curl -X POST http://localhost:8080/api/rfid/cooldown \
  -d '{"default_cooldown": 30}'
```

### **Problema: El mismo tag se procesa en múltiples readers**

**Esperado**: El debouncing es por `reader:tag`, permitiendo que el mismo tag se procese en diferentes puntos de acceso.

**Si quieres evitarlo**: Implementar debouncing global (solo por tag, sin reader):
```csharp
// Cambiar cacheKey de:
string cacheKey = $"{reader?.Id}:{tagId}";
// A:
string cacheKey = tagId;
```

### **Problema: No veo logs de duplicados**

**Verificar**: `show_duplicate_stats: true` en `gateway.config.json`

---

## 📚 Próximas Mejoras Posibles

1. **Whitelist con Cooldown Personalizado**:
   - Tags VIP: 5 segundos
   - Tags normales: 15 segundos
   - Tags de servicio: 60 segundos

2. **Análisis de Patrones**:
   - Detectar si un tag está "pegado" al lector (lecturas continuas)
   - Alertar sobre posibles tags olvidados cerca del lector

3. **Dashboard de Estadísticas**:
   - Gráfica en tiempo real de tasa de filtrado
   - Top 10 tags más leídos
   - Heatmap de horas con más duplicados

4. **Debouncing Adaptativo**:
   - Aumentar cooldown automáticamente si se detectan muchos duplicados
   - Reducir cooldown en horas valle

---

**Estado**: ✅ Implementado y Desplegado  
**Versión**: v6.0 con Debouncing Inteligente  
**Última Actualización**: 31 de Enero, 2026
