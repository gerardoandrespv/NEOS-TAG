# 🚀 Deployment a Google Cloud Platform

## ✅ Estado del Deployment

**Fecha:** 29 de enero de 2026  
**Rama:** `feature/http-endpoint-hybrid-mode`  
**Commit:** d655071

---

## 🌐 URLs de Producción

### Dashboard (Firebase Hosting)
- **URL:** https://neos-tech.web.app
- **Estado:** ✅ Desplegado
- **Archivos:** 8 archivos en `src/web`

### Cloud Function - RFID Gateway
- **Nombre:** `rfid-gateway`
- **URL:** https://rfid-gateway-6psjv5t2ka-uc.a.run.app
- **Región:** us-central1
- **Runtime:** Python 3.12
- **Estado:** ✅ ACTIVE
- **Environment:** 2nd gen
- **Memoria:** 256MB
- **Timeout:** 60s
- **Max Instances:** 10

### Firestore Database
- **Proyecto:** neos-tech
- **Región:** us-central1
- **Consola:** https://console.firebase.google.com/project/neos-tech/firestore

---

## 🔧 Configuración del Gateway Local

Para conectar el Gateway local con la Cloud Function en producción, actualiza `gateway.config.json`:

```json
{
  "client_id": "condominio-neos",
  "cloud_function": "https://rfid-gateway-6psjv5t2ka-uc.a.run.app",
  "access_points": [
    {
      "id": "porton_triwe",
      "name": "Portón Triwe",
      "reader_ip": "192.168.1.200",
      "reader_port": 60000,
      "relay_channel": 1,
      "relay_duration_ms": 1000
    }
  ]
}
```

---

## 📝 Comandos de Deployment

### Dashboard (Hosting)
```bash
firebase deploy --only hosting
```

### Cloud Functions (método recomendado: gcloud)
```bash
gcloud functions deploy rfid-gateway \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=src/functions \
  --entry-point=check_tag_access \
  --trigger-http \
  --allow-unauthenticated \
  --max-instances=10 \
  --memory=256MB \
  --timeout=60s
```

### Cloud Functions (alternativa: Firebase CLI)
```bash
firebase deploy --only functions
```

---

## 🧪 Probar el Sistema en Producción

### 1. Dashboard
Abre: https://neos-tech.web.app

### 2. Cloud Function (desde PowerShell)
```powershell
$url = "https://rfid-gateway-6psjv5t2ka-uc.a.run.app"
$body = @{
    tag_id = "E2000017941502181550D17D"
    reader_id = "porton_triwe"
    client_id = "condominio-neos"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" -Headers @{"X-Client-ID"="condominio-neos"}
```

### 3. Gateway Local → Cloud
El Gateway local (en 192.168.1.11:8080) debe apuntar a la URL de producción en `gateway.config.json`.

Cuando se detecte un tag:
1. Lectora envía HTTP a Gateway local: `http://192.168.1.11:8080/readerid?id=TAG`
2. Gateway consulta Cloud Function: `https://rfid-gateway-6psjv5t2ka-uc.a.run.app`
3. Cloud Function consulta Firestore y responde
4. Gateway activa relay si está autorizado
5. Gateway registra evento en Firestore
6. Dashboard se actualiza en tiempo real

---

## 📊 Monitoreo

### Logs de Cloud Function
```bash
gcloud functions logs read rfid-gateway --region=us-central1 --limit=50
```

### Logs en tiempo real
```bash
gcloud functions logs read rfid-gateway --region=us-central1 --tail
```

### Métricas
- **Consola GCP:** https://console.cloud.google.com/functions/details/us-central1/rfid-gateway?project=neos-tech
- **Firebase Console:** https://console.firebase.google.com/project/neos-tech/overview

---

## 🔐 Seguridad

### CORS
La Cloud Function permite peticiones desde cualquier origen (`Access-Control-Allow-Origin: *`).

### Autenticación
- Cloud Function: `--allow-unauthenticated` (acceso público)
- Client ID en header `X-Client-ID` para multi-tenancy

### Firestore Rules
Revisar en: `config/firestore.rules`

---

## 🔄 Workflow de Actualización

### Para cambios en el Dashboard
```bash
git checkout feature/http-endpoint-hybrid-mode
git pull
firebase deploy --only hosting
```

### Para cambios en Cloud Functions
```bash
git checkout feature/http-endpoint-hybrid-mode
git pull
gcloud functions deploy rfid-gateway \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=src/functions \
  --entry-point=check_tag_access \
  --trigger-http \
  --allow-unauthenticated
```

### Para cambios en Gateway (local)
```bash
git checkout feature/http-endpoint-hybrid-mode
git pull
cd src/Gateway
dotnet build
.\RUN-ADMIN.ps1
```

---

## 🐛 Troubleshooting

### Dashboard no se actualiza
1. Ctrl+F5 (hard refresh)
2. Verificar Firestore en consola
3. Revisar logs del navegador (F12)

### Cloud Function no responde
```bash
# Ver logs
gcloud functions logs read rfid-gateway --region=us-central1 --limit=20

# Verificar estado
gcloud functions describe rfid-gateway --region=us-central1
```

### Gateway no se conecta a Cloud Function
1. Verificar URL en `gateway.config.json`
2. Probar manualmente:
   ```powershell
   Invoke-WebRequest -Uri "https://rfid-gateway-6psjv5t2ka-uc.a.run.app" -Method OPTIONS
   ```
3. Revisar logs del Gateway

---

## 📚 Recursos

- **Repositorio GitHub:** https://github.com/gerardoandrespv/NEOS-TAG/tree/feature/http-endpoint-hybrid-mode
- **Firebase Console:** https://console.firebase.google.com/project/neos-tech
- **GCP Console:** https://console.cloud.google.com/home/dashboard?project=neos-tech
- **Documentación Firebase:** https://firebase.google.com/docs
- **Documentación Cloud Functions:** https://cloud.google.com/functions/docs

---

## ✨ Características Desplegadas

- ✅ Dashboard web en Firebase Hosting
- ✅ Cloud Function para validación de tags
- ✅ Firestore como base de datos
- ✅ Endpoint HTTP `/readerid` en Gateway local
- ✅ Modo híbrido: lectora standalone + cloud logging
- ✅ CORS habilitado
- ✅ Multi-tenancy con Client ID
- ✅ Logs de debug completos
- ✅ Auto-elevación a Admin para Gateway

---

**¡Sistema desplegado y operativo! 🎉**
