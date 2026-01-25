# 🚀 Configuración Sistema de Whitelist/Blacklist

## ✅ Sistema Implementado

El sistema ahora verifica cada tag contra Firestore antes de activar el relé:

- **✅ WHITELIST**: Tags autorizados → Relé SE ACTIVA
- **❌ BLACKLIST**: Tags bloqueados → Relé NO se activa  
- **⚠️ NO REGISTRADO**: Tags desconocidos → Relé NO se activa

---

## 📋 Paso 1: Agregar Tags a Firestore

### Opción A: Desde el Dashboard (Recomendado)

1. **Inicia el dashboard**:
   ```powershell
   firebase serve --only hosting --port 5000
   ```

2. **Abre en el navegador**:
   ```
   http://localhost:5000
   ```

3. **Abre DevTools** (F12)

4. **En la consola, pega el contenido de**:
   ```
   C:\NeosTech-RFID-System-Pro\setup-tags-whitelist.js
   ```

5. **Ejecuta**:
   ```javascript
   agregarTagsPrueba()
   ```

6. **Verifica en Firebase Console**:
   ```
   https://console.firebase.google.com/project/neos-tech/firestore
   Ruta: clients → condominio-neos → tags
   ```

### Opción B: Manualmente en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/project/neos-tech/firestore)
2. Navega a: `clients` → `condominio-neos` → `tags`
3. Agrega documentos con esta estructura:

```json
{
  "tag_id": "E28069150000402009073E7F",
  "status": "whitelist",
  "name": "Tag de Prueba 1",
  "description": "Tag detectado en las pruebas",
  "owner": "Administrador",
  "created_at": "TIMESTAMP",
  "updated_at": "TIMESTAMP"
}
```

**Estados posibles**:
- `"whitelist"` → Acceso permitido ✅
- `"blacklist"` → Acceso denegado ❌

---

## 🔧 Paso 2: Desplegar Cloud Functions

### Opción A: Con Firebase CLI

```powershell
# Desde C:\NeosTech-RFID-System-Pro
cd src\functions

# Login (si es necesario)
firebase login

# Desplegar ambas funciones
firebase deploy --only functions:rfid-gateway,functions:check-tag-access --project neos-tech
```

### Opción B: Con script automatizado

```powershell
.\scripts\deploy-functions.ps1
```

**URLs resultantes**:
- `https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway`
- `https://us-central1-neos-tech.cloudfunctions.net/check-tag-access`

---

## 🚀 Paso 3: Compilar e Iniciar Gateway

### Cerrar Gateway anterior (si está ejecutándose)

1. Ve a la ventana del Gateway
2. Presiona `Ctrl+C`

### Compilar e iniciar

```powershell
# Compilar
dotnet build .\src\Gateway\Rfid_gateway.csproj -c Release --nologo -v q

# Iniciar como Administrador
cd src\Gateway\bin\Release\net8.0
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd C:\NeosTech-RFID-System-Pro\src\Gateway\bin\Release\net8.0; Write-Host '=== GATEWAY RFID - v2.0 ===' -ForegroundColor Green; Write-Host 'Sistema de Control de Acceso con Whitelist/Blacklist' -ForegroundColor Yellow; Write-Host ''; .\Rfid_gateway.exe"
```

---

## 🧪 Paso 4: Pruebas

### Tags de Prueba Creados

| Tag ID | Status | Nombre | Resultado Esperado |
|--------|--------|--------|-------------------|
| `E28069150000402009073E7F` | ✅ WHITELIST | Tag de Prueba 1 | ✅ ABRE RELÉ |
| `E280691500004020090AAAAA` | ✅ WHITELIST | Juan Pérez | ✅ ABRE RELÉ |
| `E280691500004020090BBBBB` | ❌ BLACKLIST | Tag Bloqueado | ❌ NO ABRE |
| `E280691500004020090CCCCC` | ✅ WHITELIST | María García | ✅ ABRE RELÉ |
| Cualquier otro | ⚠️ NO REGISTRADO | - | ⚠️ NO ABRE |

### Prueba 1: Tag en Whitelist

1. **Acerca el tag** `E28069150000402009073E7F` a la lectora
2. **Observa en el Gateway**:
   ```
   [timestamp] 🏷️ TAG DETECTADO: E28069150000402009073E7F
   [timestamp] 📡 Lector: Portón Triwe
   [timestamp] 🔍 Verificando acceso...
   [timestamp] 📋 Estado: whitelist
   [timestamp] 💬 Mensaje: Acceso permitido: Tag de Prueba 1
   [timestamp] ✅ ACCESO PERMITIDO - Activando relé...
   [timestamp] 🔓 Relé activado por 3 segundos
   ```
3. **Deberías oír**: Click del relé (3 segundos)

### Prueba 2: Tag en Blacklist (si lo tienes)

1. **Acerca un tag** configurado como `blacklist`
2. **Observa en el Gateway**:
   ```
   [timestamp] 🏷️ TAG DETECTADO: E280691500004020090BBBBB
   [timestamp] 📡 Lector: Portón Triwe
   [timestamp] 🔍 Verificando acceso...
   [timestamp] 📋 Estado: blacklist
   [timestamp] 💬 Mensaje: Acceso denegado: Tag Bloqueado (lista negra)
   [timestamp] ❌ ACCESO DENEGADO - Tag en lista negra
   ```
3. **NO debería sonar**: Relé NO se activa

### Prueba 3: Tag No Registrado

1. **Acerca cualquier tag** que NO esté en Firestore
2. **Observa en el Gateway**:
   ```
   [timestamp] 🏷️ TAG DETECTADO: XXXXXXXXXXXXXXXXXXXX
   [timestamp] 📡 Lector: Portón Triwe
   [timestamp] 🔍 Verificando acceso...
   [timestamp] 📋 Estado: not_registered
   [timestamp] 💬 Mensaje: Tag no registrado en el sistema
   [timestamp] ⚠️ ACCESO DENEGADO - Tag no registrado
   ```
3. **NO debería sonar**: Relé NO se activa

---

## 📊 Estructura de Datos en Firestore

```
clients/
  └── condominio-neos/
      ├── name: "Condominio Neos"
      ├── status: "active"
      └── tags/ (subcollection)
          ├── {doc_id_1}/
          │   ├── tag_id: "E28069150000402009073E7F"
          │   ├── status: "whitelist"
          │   ├── name: "Tag de Prueba 1"
          │   ├── description: "..."
          │   ├── owner: "Administrador"
          │   ├── created_at: TIMESTAMP
          │   └── updated_at: TIMESTAMP
          │
          ├── {doc_id_2}/
          │   ├── tag_id: "E280691500004020090BBBBB"
          │   ├── status: "blacklist"
          │   ├── name: "Tag Bloqueado"
          │   ├── blocked_reason: "Actividad sospechosa"
          │   └── ...
          │
          └── ...
```

---

## 🔧 Agregar Nuevos Tags

### Desde Firebase Console

1. Ve a `clients` → `condominio-neos` → `tags`
2. Click en "Agregar documento"
3. ID del documento: (automático)
4. Campos:
   - `tag_id` (string): ID del tag RFID (ej: `E28069150000402009073E7F`)
   - `status` (string): `"whitelist"` o `"blacklist"`
   - `name` (string): Nombre descriptivo
   - `owner` (string): Propietario
   - `description` (string): Descripción opcional
   - `apartment` (string): Apartamento (opcional)
   - `created_at` (timestamp): Fecha de creación
   - `updated_at` (timestamp): Última actualización

### Desde el Dashboard (futuro)

Se puede implementar una interfaz en el dashboard para:
- Ver todos los tags
- Agregar nuevos tags
- Editar tags existentes
- Cambiar status (whitelist ↔ blacklist)
- Ver historial de accesos

---

## 🛠️ Troubleshooting

### Gateway no se conecta a Cloud Function

1. Verifica que las funciones estén desplegadas:
   ```
   firebase functions:list --project neos-tech
   ```

2. Verifica la URL en `gateway.config.json`:
   ```json
   {
     "cloud_function_url": "https://us-central1-neos-tech.cloudfunctions.net/check-tag-access"
   }
   ```

### Todos los tags son denegados

1. Verifica que el tag esté en Firestore
2. Verifica que `client_id` sea `"condominio-neos"`
3. Verifica que `status` sea exactamente `"whitelist"` (no "Whitelist", etc.)
4. Revisa los logs de la Cloud Function en Firebase Console

### Relé no se activa con tag en whitelist

1. Verifica que el relé funcione manualmente:
   ```
   http://192.168.1.2:8080/api/open?access_point=porton_triwe
   ```

2. Revisa los logs del Gateway para ver si hay errores

---

## 📝 Logs del Sistema

### Gateway
```
[timestamp] 🏷️ TAG DETECTADO: {tag_id}
[timestamp] 📡 Lector: {reader_name}
[timestamp] 🔍 Verificando acceso...
[timestamp] 📋 Estado: {whitelist|blacklist|not_registered}
[timestamp] 💬 Mensaje: {mensaje}
[timestamp] ✅ ACCESO PERMITIDO / ❌ ACCESO DENEGADO
```

### Cloud Function (Firebase Console → Functions → Logs)
```
✅ Acceso PERMITIDO para {tag_id}
❌ Acceso DENEGADO (blacklist) para {tag_id}
⚠️ Tag NO REGISTRADO: {tag_id}
```

---

## ✅ Checklist de Configuración

- [ ] Tags agregados a Firestore
- [ ] Cloud Function `check-tag-access` desplegada
- [ ] Cloud Function `rfid-gateway` actualizada
- [ ] Gateway compilado con nueva versión
- [ ] Gateway ejecutándose como Administrador
- [ ] Dashboard accesible en http://localhost:5000
- [ ] Lectora conectada (192.168.1.200:60000)
- [ ] Prueba con tag whitelist → Relé se activa ✅
- [ ] Prueba con tag blacklist → Relé NO se activa ❌
- [ ] Prueba con tag no registrado → Relé NO se activa ⚠️

---

## 🎯 Próximos Pasos

1. **Interfaz de gestión de tags en el dashboard**
2. **Registro de eventos de acceso** (logs persistentes)
3. **Notificaciones** (email/SMS cuando tag blacklist intenta acceder)
4. **Horarios de acceso** (permitir acceso solo en ciertos horarios)
5. **Estadísticas** (accesos por día/semana/mes)

---

**¿Todo funcionando?** ✅  
**¿Problemas?** 📧 Revisa los logs o contacta al administrador del sistema.
