# Credenciales de Acceso - NeosTech RFID v6.0

## 🔐 Sistema de Autenticación

El sistema implementa roles de usuario con diferentes niveles de acceso:

### Credenciales de Acceso

#### 👨‍💼 Administrador
- **Usuario**: `admin`
- **Contraseña**: `admin123`
- **Permisos**: Acceso completo a todas las funciones
- **Puede acceder a**:
  - ✅ Control Panel
  - ✅ Gestión de Usuarios
  - ✅ Gestión de Listas (Whitelist/Blacklist)
  - ✅ Alertas
  - ✅ Logs de Acceso
  - ✅ Gráficos y Reportes
  - ✅ Control de Accesos

#### 👮 Guardia
- **Usuario**: `guardia`
- **Contraseña**: `guardia123`
- **Permisos**: Solo monitoreo y control básico
- **Puede acceder a**:
  - ✅ Control Panel
  - ✅ Alertas (solo lectura)
  - ✅ Logs de Acceso
  - ✅ Control de Accesos
- **NO puede acceder a**:
  - 🔒 Gestión de Usuarios
  - 🔒 Gestión de Listas
  - 🔒 Gráficos y Reportes

#### 🔓 Acceso Rápido (Sin contraseña)
- **Botón**: "Acceso como Guardia"
- **Permisos**: Iguales al rol Guardia
- **Uso**: Para acceso temporal sin credenciales

## 🎯 Características

### Inicio de Sesión
1. **Click en el Logo** - Abre modal de login
2. **Ingrese credenciales** o use "Acceso como Guardia"
3. **Sistema valida** y aplica restricciones según rol
4. **Indicador visual** muestra usuario y rol activo

### Seguridad
- ✅ Validación de credenciales en tiempo real
- ✅ Registro de login/logout en Firestore
- ✅ Tabs restringidas con icono de candado 🔒
- ✅ Mensajes de error claros
- ✅ Sesión persistente durante navegación

### Restricciones Visuales
- **Guardias**: Tabs restringidas aparecen con opacidad reducida y candado
- **Click en tab restringida**: Muestra notificación de acceso denegado
- **Funciones críticas**: Validan rol antes de ejecutar

## 🔄 Cambiar Contraseñas

Para cambiar las contraseñas, editar en `src/web/index.html`:

```javascript
const credentials = {
    admin: { password: 'NUEVA_CONTRASEÑA_ADMIN', role: 'admin', name: 'Administrador' },
    guardia: { password: 'NUEVA_CONTRASEÑA_GUARDIA', role: 'guard', name: 'Guardia' }
};
```

## ➕ Agregar Nuevos Usuarios

```javascript
const credentials = {
    admin: { password: 'admin123', role: 'admin', name: 'Administrador' },
    guardia: { password: 'guardia123', role: 'guard', name: 'Guardia' },
    supervisor: { password: 'super123', role: 'admin', name: 'Supervisor' } // Nuevo usuario
};
```

## 🔒 Recomendaciones de Seguridad

### Para Desarrollo
- ✅ Las credenciales actuales son para desarrollo
- ✅ Cambiar antes de producción

### Para Producción
1. **Integrar Firebase Authentication**
   ```javascript
   firebase.auth().signInWithEmailAndPassword(email, password)
   ```

2. **Usar variables de entorno**
   ```javascript
   const adminPass = process.env.ADMIN_PASSWORD;
   ```

3. **Implementar 2FA** (Two-Factor Authentication)

4. **Hash de contraseñas** con bcrypt o similar

5. **Sesiones con tokens JWT**

## 📝 Logs de Autenticación

Todos los login/logout se registran en Firestore:

```
login_logs/
  {logId}
    ├── user: "Administrador"
    ├── role: "admin"
    ├── action: "login" | "logout" | "guest_login"
    └── timestamp: <server_timestamp>
```

Ver logs:
```javascript
db.collection('login_logs')
  .orderBy('timestamp', 'desc')
  .limit(50)
  .get()
```

## 🎨 Interfaz de Usuario

### Indicador de Sesión
- **Nombre de usuario** visible en header
- **Badge de rol** (azul: admin, naranja: guardia)
- **Botón "Salir"** para cerrar sesión

### Login Modal
- **Diseño moderno** con fondo oscuro
- **Animaciones suaves** al abrir/cerrar
- **Auto-focus** en campo de usuario
- **Enter para login** rápido

## 🔄 Flujo de Autenticación

```
1. Usuario abre sistema
   ↓
2. Modal de login aparece automáticamente
   ↓
3. Usuario ingresa credenciales o usa acceso rápido
   ↓
4. Sistema valida y asigna rol
   ↓
5. Aplica restricciones según rol
   ↓
6. Registra login en Firestore
   ↓
7. Muestra notificación de bienvenida
   ↓
8. Usuario navega con permisos correspondientes
```

## ⚡ Atajos de Teclado

- **Enter** - Login rápido (cuando el modal está abierto)
- **Esc** - Cerrar modal (futuro)
- **Click en logo** - Abrir login

## 🔧 Personalización

### Cambiar Tabs Restringidas

Editar en `src/web/index.html`:

```javascript
const restrictedTabsForGuards = [
    'users-tab',      // Gestión de Usuarios
    'lists-tab',      // Listas Blancas/Negras
    'charts-tab'      // Gráficos
];
```

### Agregar Rol Intermedio

```javascript
const credentials = {
    admin: { password: 'admin123', role: 'admin', name: 'Administrador' },
    supervisor: { password: 'super123', role: 'supervisor', name: 'Supervisor' },
    guardia: { password: 'guardia123', role: 'guard', name: 'Guardia' }
};

// Restricciones específicas
const restrictedTabsForSupervisors = ['charts-tab'];
```

---

**Implementado**: 21 de Enero de 2026  
**Versión**: 6.0  
**Estado**: ✅ Funcional
