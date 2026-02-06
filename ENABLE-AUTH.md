# ⚠️ ERROR: Firebase Authentication No Configurado

## El error que ves:

```
auth/internal-error: CONFIGURATION_NOT_FOUND
```

**Significa:** El método de autenticación Email/Password no está habilitado en Firebase.

---

## 🔧 Solución: Habilitar Email/Password Authentication

### Opción 1: Firebase Console (2 minutos)

1. **Abre Firebase Console:**
   https://console.firebase.google.com/project/neos-tech/authentication/providers

2. **Click en "Email/Password"** (primera opción en la lista)

3. **Habilitar:**
   - ✅ Activa el switch "Enable"
   - ❌ NO actives "Email link (passwordless sign-in)" por ahora
   
4. **Click "Save"**

5. **Recarga la app:** https://neos-tech.web.app

---

### Opción 2: Firebase CLI

```powershell
# Nota: Firebase CLI no tiene comando directo para esto
# Debes usar Firebase Console (Opción 1)
```

---

## ✅ Verificación

Después de habilitar, deberías ver:

1. Modal de login en https://neos-tech.web.app
2. Campos: Email y Contraseña
3. Al intentar login sin usuario: "❌ Usuario no encontrado"
4. Al intentar login con usuario válido: "✅ Bienvenido"

---

## 🔐 Crear Primer Usuario Admin

Después de habilitar Email/Password:

### Paso 1: Crear en Authentication

1. Ve a: https://console.firebase.google.com/project/neos-tech/authentication/users

2. Click **"Add user"**

3. Ingresa:
   ```
   Email:    admin@neostech.local
   Password: [contraseña segura, ej: Admin2026!]
   ```

4. Click **"Add user"**

5. **Copia el UID** generado (ejemplo: `abc123def456...`)

### Paso 2: Crear Documento en Firestore

1. Ve a: https://console.firebase.google.com/project/neos-tech/firestore/data

2. Click en colección **"users"** (o créala si no existe)

3. Click **"Add document"**

4. **Document ID:** Pega el UID copiado

5. **Fields:**
   ```
   user_id      (string)     [el UID copiado]
   email        (string)     admin@neostech.local
   name         (string)     Administrador
   role         (string)     admin
   status       (string)     active
   created_at   (timestamp)  [click en reloj → "Now"]
   updated_at   (timestamp)  [click en reloj → "Now"]
   ```

6. Click **"Save"**

---

## 🧪 Probar Login

1. Abre: https://neos-tech.web.app

2. Ingresa:
   ```
   Email:      admin@neostech.local
   Password:   [la contraseña que pusiste]
   ```

3. Click **"Iniciar Sesión"**

4. Deberías ver:
   - ✅ "Bienvenido"
   - Modal se cierra
   - Nombre "Administrador" en header
   - Role "Administrador"

---

## 🐛 Troubleshooting

### Error: "auth/user-not-found"
- Verifica que el email existe en Authentication
- Verifica que no tenga typos

### Error: "auth/wrong-password"
- Verifica la contraseña
- Puedes resetearla en Firebase Console → Authentication → 3 puntos → Reset password

### Error: "permission-denied" después de login
- Verifica que el documento en Firestore tenga `role: "admin"`
- Verifica que el UID en Firestore coincida con el UID en Authentication

### Login funciona pero no veo nada
- Abre consola (F12)
- Busca errores
- Verifica que las reglas de Firestore estén desplegadas

---

## 📸 Capturas de Referencia

**Firebase Console → Authentication → Sign-in method:**
```
✅ Email/Password    Enabled
```

**Firebase Console → Authentication → Users:**
```
admin@neostech.local    [UID]    Created [fecha]
```

**Firebase Console → Firestore → users → [UID]:**
```
{
  user_id: "abc123...",
  email: "admin@neostech.local",
  name: "Administrador",
  role: "admin",
  status: "active"
}
```

---

## ⏭️ Siguiente Paso

Una vez que hayas:
1. ✅ Habilitado Email/Password
2. ✅ Creado usuario admin
3. ✅ Creado documento en Firestore
4. ✅ Probado login exitoso

Ya puedes usar el sistema normalmente y crear más usuarios desde la interfaz web (cuando estés como admin).
