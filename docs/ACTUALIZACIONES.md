# 🎉 Actualizaciones Realizadas - NEOS TECH RFID System

## ✅ Cambios Completados

### 1. **Sistema de Bloques Numéricos (1-14)**
- ✅ Cambiado de letras (Torre A, B, C) a números (1-14)
- ✅ Formulario de usuarios actualizado con dropdown de Bloque 1 a Bloque 14
- ✅ Usuarios de ejemplo actualizados con formato numérico: `1-101`, `2-205`, `14-305`, etc.

### 2. **Tabla de Usuarios Mejorada**
- ✅ Columna "Bloque-Departamento" como encabezado único
- ✅ Removidas columnas redundantes (Block, Email)
- ✅ Exportación Excel con 5 columnas: Nombre, Bloque-Departamento, Teléfono, Vehículo, Tags

### 3. **Panel de Configuración Nuevo** ⚙️
Ahora tienes acceso al nuevo tab "Configuración" con:

#### 🔌 Estado del Gateway
- Verifica conexión con el Gateway en tiempo real
- Botón para verificar estado manualmente
- Muestra URL y estado de conexión

#### 🏢 Gestión de Bloques
- Visualización de 14 bloques del condominio
- Activar/Desactivar bloques individualmente
- Auto-creación de bloques 1-14 si no existen

#### 🏠 Gestión de Departamentos
- Agregar nuevos departamentos por bloque
- Filtrar departamentos por bloque
- Marcar departamentos como ocupados/disponibles
- Eliminar departamentos
- Formato: `Bloque-Número` (ej: 1-101, 14-305)

### 4. **Botón Triwe Mejorado** 🚪
- ✅ Mejor manejo de errores
- ✅ Feedback visual mejorado:
  - ⏳ "Abriendo Portón Triwe..."
  - ✅ "Portón Triwe abierto exitosamente"
  - ⚠️ "Gateway no disponible. Evento registrado en Firestore"
- ✅ Registro en Firestore siempre funciona (aunque Gateway esté offline)
- ✅ Instrucciones en consola si Gateway no está corriendo

---

## 🚀 Instrucciones de Uso

### Paso 1: Actualizar Base de Datos
1. Abre `check-database.html` en tu navegador
2. Haz clic en **"3. Crear Usuarios de Ejemplo"**
3. Esto eliminará usuarios antiguos con letras y creará 6 nuevos con bloques numéricos:
   - María González - `1-101` (Bloque 1)
   - Carlos Rodríguez - `2-205` (Bloque 2)
   - Ana Martínez - `3-310` (Bloque 3)
   - Juan Pérez - `14-305` (Bloque 14) - tiene 4 tags
   - Luis Fernández - `7-102` (Bloque 7)
   - Patricia Sánchez - `10-201` (Bloque 10)

### Paso 2: Iniciar Dashboard
```powershell
firebase serve
```
Accede a: http://localhost:5000

### Paso 3: Configurar Bloques y Departamentos
1. Ve al tab **"Configuración"** ⚙️
2. Los 14 bloques se crearán automáticamente si no existen
3. Agrega departamentos según necesites:
   - Haz clic en **"Agregar Departamento"**
   - Ingresa número de bloque (1-14)
   - Ingresa número de departamento (ej: 101, 205, 310)
   - El sistema creará el código completo: `1-101`, `2-205`, etc.

### Paso 4 (Opcional): Iniciar Gateway para Control de Portones
Para que los botones de apertura funcionen con los lectores físicos:

```powershell
.\start-gateway.ps1
```

O manualmente:
```powershell
dotnet run --project src\Gateway\Rfid_gateway.csproj
```

El Gateway se conectará a:
- **Portón Triwe**: 192.168.1.200:8080
- **Portón Principal**: 192.168.1.101:8080

**Nota**: Aunque el Gateway no esté corriendo, el dashboard seguirá funcionando y registrando eventos en Firestore.

---

## 📋 Características del Panel de Configuración

### Gestión de Bloques
- **Auto-creación**: Los 14 bloques se crean automáticamente al entrar al tab
- **Estado**: Cada bloque puede estar Activo o Inactivo
- **Visual**: Tarjetas con colores que indican el estado
- **Acciones**: Botón para activar/desactivar

### Gestión de Departamentos
- **Agregar**: Crear departamentos con formato `Bloque-Número`
- **Filtrar**: Ver departamentos de un bloque específico
- **Estados**: Marcar como Ocupado (🔴) o Disponible (🟢)
- **Eliminar**: Borrar departamentos con confirmación
- **Tabla**: Visualización clara con todas las propiedades

### Verificación del Gateway
- **Estado en Tiempo Real**: Verifica si Gateway está corriendo
- **Health Check**: Usa endpoint `/health` del Gateway
- **Colores Visuales**:
  - 🟢 Verde: Conectado
  - 🟡 Amarillo: Verificando
  - 🔴 Rojo: Desconectado
- **Botón Manual**: Verificar conexión en cualquier momento

---

## 🎯 Siguiente Pasos Recomendados

### 1. Poblar Departamentos
- Crea los ~280 departamentos (14 bloques × 20 departamentos)
- Usa el botón "Agregar Departamento" en el tab Configuración
- O crea un script para agregarlos masivamente

### 2. Probar Control de Portones
- Inicia el Gateway: `.\start-gateway.ps1`
- Verifica conexión en tab Configuración
- Prueba los botones:
  - 🏢 Abrir Portón Triwe
  - 🚪 Abrir Portón Principal

### 3. Asignar Usuarios Reales
- Usa el tab "Residentes" para agregar usuarios
- Selecciona el bloque del dropdown (1-14)
- Ingresa el departamento (ej: 101, 205, 310)
- El sistema guardará como `block: "1"` y `departamento: "1-101"`

### 4. Validar Tags RFID
- Cuando el Gateway esté corriendo, los tags se leerán automáticamente
- Verifica en el tab "Registros" que se capturen las lecturas
- Asigna tags a usuarios en el formulario de edición

---

## 🔧 Archivos Modificados

1. **src/web/index.html**
   - Tab "Configuración" agregado
   - Dropdown de bloques actualizado (1-14)
   - Función `openGate()` mejorada
   - Funciones de gestión de bloques/departamentos
   - Mejoras visuales y de feedback

2. **check-database.html**
   - Usuarios de ejemplo con bloques numéricos
   - Formato: `1-101`, `2-205`, `14-305`

3. **start-gateway.ps1** (NUEVO)
   - Script para iniciar Gateway fácilmente
   - Muestra información de configuración
   - Valida que el proyecto exista

---

## 📝 Estructura de Datos

### Colección: `blocks`
```javascript
{
  block_number: 1,              // Número del bloque (1-14)
  name: "Bloque 1",             // Nombre del bloque
  enabled: true,                // Si está activo
  created_at: timestamp         // Fecha de creación
}
```

### Colección: `departments`
```javascript
{
  block: "1",                   // Número de bloque
  number: "101",                // Número de departamento
  full_code: "1-101",           // Código completo
  occupied: false,              // Si está ocupado
  created_at: timestamp         // Fecha de creación
}
```

### Colección: `users`
```javascript
{
  name: "María González",
  departamento: "1-101",        // Código completo
  block: "1",                   // Bloque numérico
  phone: "+593987654321",
  vehicle: "ABC-1234",
  tags: ["300833B2DDD9014000000001"],
  active: true
}
```

---

## ⚡ Solución de Problemas

### El botón Triwe no abre el portón
1. Verifica que el Gateway esté corriendo: `.\start-gateway.ps1`
2. Ve al tab "Configuración" y verifica el estado del Gateway
3. Si muestra "Desconectado", inicia el Gateway
4. Verifica que la IP 192.168.1.200 esté accesible en tu red

### Los bloques no se muestran
1. Ve al tab "Configuración"
2. Los bloques se crean automáticamente al entrar
3. Si no aparecen, revisa la consola del navegador (F12)
4. Verifica permisos en Firestore

### No puedo agregar departamentos
1. Verifica que las reglas de Firestore permitan escritura
2. Formato correcto: Bloque (1-14), Departamento (cualquier número)
3. Revisa la consola del navegador para errores

---

## 🎨 Mejoras Visuales Aplicadas

- ✅ Contraste de colores mejorado
- ✅ Tabla más limpia (solo columnas necesarias)
- ✅ Encabezados descriptivos ("Bloque-Departamento")
- ✅ Iconos y emojis para mejor UX
- ✅ Mensajes de error/éxito más claros
- ✅ Estados visuales (🟢 🔴 🟡)
- ✅ Botones con acciones claras

---

**Desarrollado por NEOS TECH** 🚀
Sistema de Control de Acceso Integral con RFID
