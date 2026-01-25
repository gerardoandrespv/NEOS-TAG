# Actualización de Usuarios - NEOS TECH RFID System

## Cambios Realizados

### 1. Campos de Base de Datos Actualizados ✅

Se han actualizado todos los campos en el dashboard para que coincidan con la estructura de Firestore:

- **Antes**: `unit` (Unidad) y `type` (Tipo)
- **Ahora**: `departamento` (Departamento) y `block` (Block)

### 2. Exportación a Excel ✅

Se ha actualizado la función de exportación para generar archivos Excel (.xlsx) en lugar de CSV:

**Características**:
- Formato profesional con encabezados de NEOS TECH
- Columnas auto-ajustadas
- Encabezados con colores corporativos (azul oscuro y azul)
- Fecha de exportación incluida
- Separación correcta de columnas
- Compatible con Microsoft Excel, Google Sheets y LibreOffice

**Archivos generados**:
- Usuarios: `Residentes_NEOS_TECH_YYYY-MM-DD.xlsx`
- Logs: `Accesos_NEOS_TECH_YYYY-MM-DD.xlsx`

### 3. Soporte para Múltiples Tags ✅

El sistema ahora muestra correctamente múltiples tags RFID por usuario:
- Los tags se muestran separados por comas en la tabla
- El formulario acepta múltiples tags separados por comas
- Los tags se almacenan como array en Firestore

## Instrucciones para Activar Todos los Usuarios y Agregar Usuario Demo

### Opción 1: Desde la Consola del Navegador (Recomendado)

1. Abre el dashboard en tu navegador: https://neos-tech.web.app
2. Inicia sesión como administrador
3. Abre la Consola de Desarrollador (F12 o Ctrl+Shift+I)
4. Ve a la pestaña "Console"
5. Copia y pega el siguiente código:

```javascript
// Activar todos los usuarios
async function activarTodosLosUsuarios() {
    console.log('Activando todos los usuarios...');
    const snapshot = await db.collection('users').get();
    let activated = 0;
    
    const batch = db.batch();
    snapshot.forEach(doc => {
        if (!doc.data().active) {
            batch.update(doc.ref, { active: true });
            activated++;
        }
    });
    
    await batch.commit();
    console.log(`✅ ${activated} usuarios activados de ${snapshot.size} totales`);
}

// Agregar usuario demo con múltiples tags
async function agregarUsuarioDemo() {
    console.log('Creando usuario demo...');
    const demoUser = {
        name: 'Juan Pérez Demo',
        departamento: 'A-305',
        block: 'Torre A',
        phone: '+593987654321',
        email: 'juan.perez@demo.com',
        vehicle: 'ABC-1234',
        tags: [
            '300833B2DDD9014000000000',
            'E0040150B6FC9C25',
            'A1B2C3D4E5F60708',
            '1234567890ABCDEF'
        ],
        active: true,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('users').add(demoUser);
    console.log(`✅ Usuario demo creado con ID: ${docRef.id}`);
    console.log(`   📱 Tags: ${demoUser.tags.join(', ')}`);
    console.log(`   🏢 Departamento: ${demoUser.departamento}`);
    console.log(`   🏗️  Block: ${demoUser.block}`);
    
    return docRef.id;
}

// Ejecutar ambas funciones
async function ejecutarActualizacion() {
    try {
        await activarTodosLosUsuarios();
        await agregarUsuarioDemo();
        console.log('\n✅ ¡Actualización completada!');
        console.log('Recarga la página para ver los cambios');
        // Recargar usuarios
        if (typeof loadUsers === 'function') {
            await loadUsers();
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar
ejecutarActualizacion();
```

6. Presiona Enter
7. Espera a que aparezca el mensaje "✅ ¡Actualización completada!"
8. Recarga la página (F5)

### Opción 2: Desde Firebase Console

1. Ve a https://console.firebase.google.com/project/neos-tech/firestore
2. Selecciona la colección `users`
3. Para cada documento:
   - Click en el documento
   - Edit el campo `active` y cámbialo a `true`
   - Asegúrate que los campos `departamento` y `block` existan

4. Para agregar usuario demo:
   - Click en "Add Document"
   - ID: Auto-generated
   - Fields:
     ```
     name: "Juan Pérez Demo"
     departamento: "A-305"
     block: "Torre A"
     phone: "+593987654321"
     email: "juan.perez@demo.com"
     vehicle: "ABC-1234"
     tags: ["300833B2DDD9014000000000", "E0040150B6FC9C25", "A1B2C3D4E5F60708", "1234567890ABCDEF"]
     active: true
     created_at: timestamp (now)
     updated_at: timestamp (now)
     ```

### Opción 3: Usando el Dashboard (Manual)

1. Accede a https://neos-tech.web.app
2. Ve a la sección "Usuarios"
3. Click en "Agregar Residente"
4. Llena el formulario:
   - **Nombre**: Juan Pérez Demo
   - **Departamento**: A-305
   - **Block**: Torre A
   - **Teléfono**: +593987654321
   - **Email**: juan.perez@demo.com
   - **Vehículo**: ABC-1234
   - **Tags RFID**: 300833B2DDD9014000000000, E0040150B6FC9C25, A1B2C3D4E5F60708, 1234567890ABCDEF
5. Click en "Guardar"

## Verificación

Después de realizar la actualización, verifica que:

1. **En la tabla de usuarios** debes ver:
   - Columnas: Nombre, Departamento, Block, Teléfono, Email, Tags RFID, Estado, Acciones
   - El usuario "Juan Pérez Demo" con 4 tags separados por comas
   - Todos los usuarios con estado "Activo" (verde)

2. **Al exportar a Excel**:
   - El archivo descargado debe tener extensión `.xlsx`
   - Al abrirlo en Excel debe verse con formato profesional
   - Las columnas deben estar correctamente separadas
   - Los encabezados deben tener el logo de NEOS TECH

3. **En el formulario de edición**:
   - Los campos deben ser "Departamento" y "Block"
   - Los tags deben aparecer separados por comas

## Notas Importantes

- ⚠️ **Migración de Datos**: Si tienes usuarios existentes con campos `unit` y `type`, necesitas migrarlos manualmente a `departamento` y `block`
- 📊 **Base de Datos**: Todos los cambios se guardan en Firestore con la nueva estructura
- 🔄 **Compatibilidad**: El dashboard ahora solo funciona con los campos `departamento` y `block`
- 🏷️ **Tags Múltiples**: Los tags se almacenan como array en Firestore y se muestran separados por comas en el dashboard

## Soporte

Si encuentras algún problema:
1. Abre la consola del navegador (F12) y revisa los errores
2. Verifica que los datos en Firestore usen los campos correctos (`departamento` y `block`)
3. Asegúrate de estar usando la versión más reciente del dashboard (desplegada el 2026-01-22)

## Versión

- Dashboard: v6.1
- Fecha de actualización: 2026-01-22
- Cambios: Campos de BD, Exportación Excel, Soporte múltiples tags
