# Checklist de Deployment - NeosTech RFID System

## Pre-Deployment

### 1. Crear Rama de Deployment
```powershell
# Formato: deploy/vX.X-descripcion-YYYYMMDD-HHmm
git checkout -b deploy/v6.0-relay-control-$(Get-Date -Format 'yyyyMMdd-HHmm')
```

### 2. Verificar Herramientas
- [ ] Firebase CLI instalado (`firebase --version`)
- [ ] gcloud CLI instalado (`gcloud --version`)
- [ ] .NET SDK 8.0 instalado (`dotnet --version`)
- [ ] Python instalado (`python --version`)

### 3. Verificar Componentes
```powershell
.\scripts\deploy.ps1 -OnlyTest
```

Verificar que todos los componentes pasen:
- [ ] Gateway compila sin errores
- [ ] Dashboard completo (index.html, firebase-config.js, style.css)
- [ ] Cloud Function (main.py, requirements.txt)
- [ ] Firestore Rules
- [ ] Configuraciones (gateway.config.json, firebase.json)

## Deployment

### 4. Ejecutar Deployment
```powershell
.\scripts\deploy.ps1
```

Esto desplegará:
- [ ] Gateway compilado a `dist/gateway/`
- [ ] Dashboard a Firebase Hosting
- [ ] Firestore Rules
- [ ] Cloud Function a Google Cloud

### 5. Verificación Post-Deployment
- [ ] Dashboard accesible (https://neos-tech.web.app)
- [ ] Cloud Function responde (prueba con tag de test)
- [ ] Firestore Rules aplicadas correctamente
- [ ] Gateway local puede iniciarse sin errores

## Post-Deployment

### 6. Commit y Push
```powershell
# Agregar archivos modificados
git add src/Gateway/Program.cs src/Gateway/gateway.config.json
git add src/web/ src/functions/ firestore.rules scripts/ docs/

# Commit descriptivo
git commit -m "Deploy vX.X: Descripcion breve

- Cambio principal 1
- Cambio principal 2
- Cambio principal 3

Deployment exitoso:
- Dashboard: URL
- Cloud Function: URL
- Gateway: Estado

Credenciales actualizadas: Si/No"

# Push de la rama
git push origin deploy/vX.X-descripcion-YYYYMMDD-HHmm
```

### 7. Crear Tag de Versión
```powershell
# Tag anotado con descripción
git tag -a v6.0.0 -m "Version 6.0.0 - Control fisico de relays

Funcionalidades:
- Activacion real de relays via HTTP
- Dashboard con tema oscuro
- 2 puntos de acceso configurados
- Cloud Function Python 3.9

Deployado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Push del tag
git push origin v6.0.0
```

### 8. Crear Pull Request (Opcional)
Si trabajas en equipo:
- [ ] Crear PR de la rama deploy/* a main
- [ ] Revisar cambios
- [ ] Merge después de aprobación

### 9. Documentar Deployment
Actualizar CHANGELOG.md con:
- Fecha de deployment
- Versión
- Cambios principales
- URLs de producción
- Problemas conocidos

## Rollback (Si es necesario)

### En caso de error crítico:
```powershell
# Volver a deployment anterior
git checkout deploy/v5.X-fecha-anterior

# Re-deployar versión anterior
.\scripts\deploy.ps1

# O usar Firebase para rollback
firebase hosting:rollback
```

## Notas Importantes

### Formato de Ramas
- `deploy/v6.0-relay-control-20260122-1730` - Deployment de producción
- `feature/nueva-funcionalidad` - Desarrollo de features
- `bugfix/correccion-error` - Corrección de bugs
- `hotfix/parche-urgente` - Parches urgentes

### Versionado Semántico
- **MAJOR.MINOR.PATCH** (ej: 6.0.0)
- **MAJOR**: Cambios incompatibles
- **MINOR**: Nueva funcionalidad compatible
- **PATCH**: Correcciones de bugs

### Ambientes
- **Producción**: `https://neos-tech.web.app`
- **Staging**: (configurar si es necesario)
- **Desarrollo**: `http://localhost:5002`

## Checklist Rápido

Antes de cada deployment:
```
[ ] Nueva rama creada
[ ] Código probado localmente
[ ] Verificación pre-deployment exitosa
[ ] Deployment ejecutado
[ ] Verificación post-deployment OK
[ ] Commit realizado
[ ] Tag creado
[ ] Push a GitHub
[ ] Documentación actualizada
```
