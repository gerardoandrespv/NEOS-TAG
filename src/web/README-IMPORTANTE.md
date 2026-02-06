# ⚠️ REGLA CRÍTICA - LEER ANTES DE EDITAR

## Archivo Principal del Dashboard

**EL ÚNICO ARCHIVO QUE SE DESPLIEGA ES: `index.html`**

### ❌ NO EDITAR:
- `app.html` - Archivo obsoleto, NO se despliega
- `dashboard.html` - Archivo obsoleto, NO se despliega
- `index.backup.html` - Solo backup

### ✅ SIEMPRE EDITAR:
- **`index.html`** - Este es el archivo que Firebase sirve en https://neos-tech.web.app

## Proceso de Deploy

1. Editar **SOLO** `index.html`
2. Ejecutar: `firebase deploy --only hosting:neos-tech`
3. Verificar versión en consola del navegador (debe cambiar)
4. Si no cambia: Ctrl+Shift+R en navegador

## Limpiar Caché del Navegador

Si ves versiones antiguas:
1. F12 → Application → Clear storage → Clear site data
2. Cerrar TODAS las ventanas del navegador
3. Abrir de nuevo

## Archivos del Proyecto

```
src/web/
├── index.html          ← ARCHIVO PRINCIPAL (EDITAR AQUÍ)
├── app.html            ← OBSOLETO (NO USAR)
├── dashboard.html      ← OBSOLETO (NO USAR)
├── style.css
└── firebase.json       ← Configuración de hosting
```

**Última actualización:** 01-02-2026
**Versión actual:** v2.4.25-FINAL
