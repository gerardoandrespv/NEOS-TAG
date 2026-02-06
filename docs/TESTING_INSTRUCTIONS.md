# 📋 INSTRUCCIONES DE TESTING - Sistema RFID NeosTech Pro

## 🎯 Objetivo
Probar el sistema completo de gestión de usuarios y whitelist RFID antes del despliegue en producción.

---

## 🛠️ Correcciones Aplicadas

### 1. **Fix Contraste de Colores** ✅
- **Problema**: Texto blanco sobre fondo blanco en dropdowns de configuración del lector
- **Solución**: Agregados estilos CSS para `select option` con:
  - `background-color: #1e293b;` (azul oscuro)
  - `color: #ffffff;` (texto blanco)
  - Hover: `background-color: #3b82f6;`

### 2. **Fix Actualización de UI después de Editar** ✅
- **Problema**: Al editar un usuario, los cambios no se reflejaban inmediatamente en la tabla
- **Solución**: 
  - Agregado delay de 300ms antes de recargar la lista (espera sincronización Firestore)
  - Mejorado feedback visual con notificaciones progresivas
  - Logs detallados de cada paso del proceso

### 3. **Funciones de Utilidad para Testing** ✅
- `deleteAllUsers()`: Elimina todos los usuarios y whitelist (requiere doble confirmación)
- `createTestUsers()`: Crea 3 usuarios de prueba automáticamente

---

## 🧪 PROCEDIMIENTO DE TESTING

### **Fase 1: Limpieza de Base de Datos**

1. Abrir el dashboard: `https://neos-tech.web.app/app.html`
2. Iniciar sesión como administrador
3. Abrir la consola del navegador (F12)
4. Ejecutar:
   ```javascript
   deleteAllUsers()
   ```
5. Confirmar la operación:
   - Primera confirmación: "Aceptar"
   - Segunda confirmación: Escribir `ELIMINAR TODOS` (mayúsculas exactas)
6. **Resultado esperado**: Todos los usuarios eliminados, tabla vacía

---

### **Fase 2: Creación de Usuarios de Prueba**

1. En la consola del navegador, ejecutar:
   ```javascript
   createTestUsers()
   ```
2. Confirmar la operación
3. **Resultado esperado**: 
   - ✅ 3 usuarios creados:
     - Usuario Autorizado - Prueba (Block 1-101)
     - Usuario No Autorizado - Prueba (Block 1-102) [INACTIVO]
     - Usuario Sin Tags - Prueba (Block 1-103)
   - ✅ Notificación con instrucciones siguientes
   - ✅ Tabla actualizada automáticamente

---

### **Fase 3: Asignación Manual de Tags**

#### **3.1 Usuario Autorizado (Block 1-101)**

1. Click en botón **"✏️"** del Usuario Autorizado
2. En el modal, agregar un tag conocido (24 caracteres hexadecimales)
   - Ejemplo: `E28011700000020562D2ED2C`
3. Asegurarse que el switch **"Activo"** esté **ON** (verde)
4. Click **"Guardar"**
5. **Resultado esperado**:
   - ✅ Notificación: "Usuario actualizado exitosamente"
   - ✅ Notificación: "Actualizando lista..."
   - ✅ Tabla se recarga automáticamente
   - ✅ El tag aparece en la columna "Tags RFID"
   - ✅ Estado muestra "✔️ Activo"

#### **3.2 Usuario No Autorizado (Block 1-102)**

1. Click en botón **"✏️"** del Usuario No Autorizado
2. Agregar un tag **DIFERENTE** al anterior
   - Ejemplo: `E28011700000020562D2AAAA`
3. Asegurarse que el switch **"Activo"** esté **OFF** (gris/rojo)
4. Click **"Guardar"**
5. **Resultado esperado**:
   - ✅ Tag asignado correctamente
   - ✅ Estado muestra "❌ Inactivo"
   - ✅ Tabla actualizada automáticamente

#### **3.3 Usuario Sin Tags (Block 1-103)**

1. **NO editar este usuario**
2. Dejarlo sin tags asignados
3. **Resultado esperado**:
   - ✅ Columna "Tags RFID" muestra "Sin tags"
   - ✅ Estado puede ser "Activo" o "Inactivo" (no importa)

---

### **Fase 4: Pruebas CRUD Completas**

#### **4.1 Crear Nuevo Usuario**

1. Click **"➕ Nuevo Residente"**
2. Llenar formulario:
   - Nombre: `Prueba Creación Manual`
   - Block: `2`
   - Departamento: `201`
   - Teléfono: `+56912345678`
   - Vehículo: (dejar vacío o ingresar `AB-12-CD`)
   - Tags: (dejar vacío)
   - Activo: ON
3. Click **"Guardar"**
4. **Resultado esperado**:
   - ✅ Notificación: "Usuario creado exitosamente"
   - ✅ Usuario aparece en la tabla
   - ✅ Todos los datos correctos

#### **4.2 Editar Usuario Existente**

1. Buscar "Prueba Creación Manual"
2. Click **"✏️"**
3. Modificar:
   - Teléfono: `+56987654321`
   - Agregar vehículo: `XY-98-ZW`
4. Click **"Guardar"**
5. **Verificar cambios**:
   - ✅ Tabla se actualiza automáticamente (delay 300ms)
   - ✅ Teléfono muestra nuevo valor
   - ✅ Vehículo aparece formateado correctamente
6. **Volver a abrir para verificar persistencia**:
   - Click **"✏️"** nuevamente
   - ✅ Los cambios persisten en el formulario

#### **4.3 Asignar y Eliminar Tags**

1. Editar "Prueba Creación Manual"
2. Agregar tag: `E28011700000020562D2BBBB`
3. Guardar
4. **Verificar**:
   - ✅ Tag aparece en tabla
   - ✅ Tag agregado a whitelist
5. Volver a editar
6. Eliminar el tag (borrar del campo "Tags")
7. Guardar
8. **Verificar**:
   - ✅ Tabla muestra "Sin tags"
   - ✅ Tag eliminado de whitelist

#### **4.4 Eliminar Usuario**

1. Buscar "Prueba Creación Manual"
2. Click **"🗑️"**
3. Confirmar eliminación
4. **Resultado esperado**:
   - ✅ Usuario desaparece de la tabla
   - ✅ Tags eliminados de whitelist
   - ✅ Notificación de éxito

---

### **Fase 5: Validación de Whitelist con Gateway**

**Requisito previo**: Gateway debe estar ejecutándose y Cloudflare Tunnel activo.

#### **5.1 Verificar Whitelist en Gateway**

1. Verificar que el Gateway esté sincronizado con Firestore
2. En logs del Gateway, buscar:
   ```
   [INFO] Whitelist sincronizada: X tags
   ```

#### **5.2 Prueba con Tag Autorizado (Usuario Activo)**

1. Acercar el tag del "Usuario Autorizado" al lector
2. **Resultado esperado**:
   - ✅ Gateway logs: `✅ Acceso PERMITIDO`
   - ✅ Relé se activa (puerta se abre)
   - ✅ Dashboard "🏷️ Lecturas en Vivo" muestra:
     - Tag con fondo **VERDE**
     - Usuario: "Usuario Autorizado - Prueba"
     - Estado: "Autorizado"

#### **5.3 Prueba con Tag No Autorizado (Usuario Inactivo)**

1. Acercar el tag del "Usuario No Autorizado" al lector
2. **Resultado esperado**:
   - ✅ Gateway logs: `❌ Acceso DENEGADO (usuario inactivo)`
   - ✅ Relé NO se activa
   - ✅ Dashboard muestra:
     - Tag con fondo **ROJO/NARANJA**
     - Estado: "No autorizado" o "Usuario inactivo"

#### **5.4 Prueba con Tag Desconocido**

1. Acercar un tag que NO esté en la base de datos
2. **Resultado esperado**:
   - ✅ Gateway logs: `⚠️ Tag no registrado`
   - ✅ Relé NO se activa
   - ✅ Dashboard muestra:
     - Tag con fondo **GRIS**
     - Estado: "No registrado"

---

### **Fase 6: Pruebas de UI/UX**

#### **6.1 Verificar Contraste de Colores**

1. Ir a **"⚙️ Gateway y Lectora"**
2. Click **"🔄 Cargar Configuración"**
3. Verificar que aparece el formulario "⚙️ Parámetros del Lector"
4. Abrir todos los dropdowns (select):
   - Frecuencia de Operación
   - Modo de Trabajo
   - Sesión EPC
   - Modo de Relé
   - Modo Wiegand
   - Velocidad de Comunicación
5. **Resultado esperado**:
   - ✅ Todas las opciones son **LEGIBLES**
   - ✅ NO hay texto blanco sobre fondo blanco
   - ✅ Hover muestra fondo azul

#### **6.2 Verificar Filtros de Residentes**

1. Ir a **"👥 Gestión de Residentes"**
2. Probar todos los filtros:
   - 📊 Todos
   - 🚗 Con vehículo
   - 🚶 Sin vehículo
   - ✅ Activos
   - ❌ Inactivos
3. **Resultado esperado**:
   - ✅ Cada filtro muestra usuarios correctos
   - ✅ Contador se actualiza
   - ✅ Botón activo resaltado

#### **6.3 Verificar Exportaciones**

1. Click **"📥 Exportar ▾"**
2. Seleccionar **"📊 Excel (.xlsx)"**
3. **Verificar**:
   - ✅ Archivo descarga correctamente
   - ✅ Contiene todos los usuarios
   - ✅ Logo de NeosTech visible
4. Repetir con **"📄 PDF"**

---

## ✅ CHECKLIST FINAL PRE-DESPLIEGUE

### Funcionalidades Críticas

- [ ] Crear usuario funciona correctamente
- [ ] Editar usuario actualiza UI automáticamente
- [ ] Eliminar usuario funciona
- [ ] Asignar tags funciona
- [ ] Eliminar tags funciona
- [ ] Whitelist se sincroniza con Gateway
- [ ] Tag autorizado abre puerta
- [ ] Tag no autorizado NO abre puerta
- [ ] Tag desconocido NO abre puerta
- [ ] Lecturas en vivo se muestran en tiempo real

### UI/UX

- [ ] Todos los dropdowns son legibles (sin texto blanco sobre blanco)
- [ ] Notificaciones aparecen en cada operación
- [ ] Tabla se actualiza después de cada cambio
- [ ] Filtros funcionan correctamente
- [ ] Exportaciones (Excel/PDF) funcionan

### Performance

- [ ] Tabla de usuarios carga en < 2 segundos
- [ ] Guardar usuario tarda < 1 segundo
- [ ] Lecturas en vivo aparecen instantáneamente
- [ ] Gateway responde en < 1 segundo al abrir puerta

---

## 🐛 PROBLEMAS CONOCIDOS Y SOLUCIONES

### Problema: "Modal no se cierra después de guardar"
**Solución**: Verificar que `closeUserModal()` esté siendo llamada. Ya corregido en v2.4.13+

### Problema: "Tabla no se actualiza después de editar"
**Solución**: Agregado delay de 300ms antes de `loadUsers()`. Corregido en v2.4.13+

### Problema: "Cloudflare Tunnel dice 'offline'"
**Solución**: Ejecutar en PowerShell:
```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel --url http://localhost:8080
```
**IMPORTANTE**: Copiar la nueva URL `https://xxxxx.trycloudflare.com` y actualizar en `app.html` línea 3468

### Problema: "Tag autorizado no abre puerta"
**Verificar**:
1. Gateway está ejecutándose (`netstat -ano | findstr :8080`)
2. Cloudflare Tunnel activo
3. Usuario está **ACTIVO** en Firebase
4. Tag existe en colección `whitelist`

---

## 📞 CONTACTO DE SOPORTE

Si encuentras errores durante el testing:

1. **Capturar logs de consola** (F12 → Console → Screenshot)
2. **Capturar logs del Gateway** (PowerShell donde corre el Gateway)
3. **Describir pasos exactos** para reproducir el error
4. **Reportar al equipo de desarrollo**

---

## 🚀 VERSIÓN

**Versión de Testing**: v2.4.13-TESTING
**Fecha**: 2024
**Autor**: GitHub Copilot + NeosTech Dev Team

---

## 📝 NOTAS IMPORTANTES

1. **NO ejecutar `deleteAllUsers()` en producción**
2. **Siempre hacer backup antes de testing masivo**
3. **Verificar que Cloudflare Tunnel esté activo antes de probar relé**
4. **Gateway debe estar ejecutándose como Administrador**
5. **Usar tags de 24 caracteres hexadecimales válidos**

---

**¡Pruebas exitosas = Despliegue listo! 🎉**
