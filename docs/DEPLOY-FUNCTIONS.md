# Guía Rápida: Desplegar Cloud Function

## 1. Instalar Firebase CLI (si no lo tienes)

```powershell
npm install -g firebase-tools
```

## 2. Iniciar sesión en Firebase

```powershell
firebase login
```

## 3. Verificar que estás en el proyecto correcto

```powershell
firebase projects:list
firebase use neos-tech-9f9b6
```

## 4. Desplegar la Cloud Function

```powershell
cd C:\NeosTech-RFID-System-Pro
firebase deploy --only functions
```

Esto desplegará la función `sendEmergencyPush` que el dashboard usará para enviar push notifications.

## 5. Verificar que se desplegó correctamente

Después del deploy, verás una URL como:
```
https://us-central1-neos-tech-9f9b6.cloudfunctions.net/sendEmergencyPush
```

Copia esta URL y actualízala en el dashboard si es diferente.

## 6. Probar desde el Dashboard

1. Abre el dashboard: http://localhost:5500/src/web/index.html (o tu URL)
2. Emite una alerta de prueba
3. Verifica en tu celular que llegue la notificación push

## Notas:

- La primera vez puede tardar 2-3 minutos en desplegar
- Firebase te mostrará la URL de la función al terminar
- Si hay errores, revisa los logs: `firebase functions:log`

## Alternativa Local (Para Pruebas):

Si quieres probar localmente primero:

```powershell
cd src/functions
functions-framework --target=sendEmergencyPush --port=8000
```

Luego cambia la URL en el dashboard a: `http://localhost:8000`
