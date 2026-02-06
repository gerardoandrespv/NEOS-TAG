"""
Script para configurar el archivo .env con las credenciales de Firebase
Ejecutar después de crear el proyecto en Firebase Console
"""

import os

print("╔═══════════════════════════════════════════════════════════╗")
print("║  🔧 CONFIGURACIÓN DE FIREBASE PARA ALERTAS MÓVILES        ║")
print("╚═══════════════════════════════════════════════════════════╝\n")

print("📋 Necesitas las siguientes credenciales de Firebase:\n")
print("1. Ve a: https://console.firebase.google.com/")
print("2. Selecciona tu proyecto (o crea uno nuevo)")
print("3. Ve a Project Settings (⚙️) → Cloud Messaging")
print("4. Copia las siguientes claves:\n")

# Solicitar credenciales
print("─" * 60)
server_key = input("FIREBASE_SERVER_KEY (Server key): ").strip()

print("\n5. Ve a Project Settings → General → Your apps")
print("6. Copia las siguientes claves del SDK de Web:\n")

api_key = input("FIREBASE_API_KEY (apiKey): ").strip()
project_id = input("FIREBASE_PROJECT_ID (projectId): ").strip()
sender_id = input("FIREBASE_MESSAGING_SENDER_ID (messagingSenderId): ").strip()
app_id = input("FIREBASE_APP_ID (appId): ").strip()

print("\n7. Ve a Project Settings → Cloud Messaging → Web Push certificates")
print("8. Genera un nuevo key pair si no existe\n")

vapid_key = input("FIREBASE_VAPID_KEY (Key pair): ").strip()

# Crear archivo .env
env_content = f"""# Firebase Configuration for Emergency Alerts
# Generado automáticamente - NO subir a GitHub

# Cloud Messaging
FIREBASE_SERVER_KEY={server_key}
FIREBASE_VAPID_KEY={vapid_key}

# Web SDK Configuration
FIREBASE_API_KEY={api_key}
FIREBASE_PROJECT_ID={project_id}
FIREBASE_MESSAGING_SENDER_ID={sender_id}
FIREBASE_APP_ID={app_id}
FIREBASE_AUTH_DOMAIN={project_id}.firebaseapp.com
FIREBASE_STORAGE_BUCKET={project_id}.appspot.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SendGrid (Email)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
"""

# Guardar archivo .env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'w', encoding='utf-8') as f:
    f.write(env_content)

print("\n✅ Archivo .env creado correctamente!")
print(f"📁 Ubicación: {os.path.abspath(env_path)}")

# Actualizar firebase-config.js
firebase_config_js = f"""// Firebase Configuration for Web Push
// Auto-generado por setup_firebase.py

const firebaseConfig = {{
  apiKey: "{api_key}",
  authDomain: "{project_id}.firebaseapp.com",
  projectId: "{project_id}",
  storageBucket: "{project_id}.appspot.com",
  messagingSenderId: "{sender_id}",
  appId: "{app_id}"
}};

const vapidKey = "{vapid_key}";

// Inicializar Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Auto-suscripción al topic all-devices
messaging.getToken({{ vapidKey: vapidKey }})
  .then((currentToken) => {{
    if (currentToken) {{
      console.log('✅ FCM Token:', currentToken);
      localStorage.setItem('fcm_token', currentToken);
      
      // Suscribirse al topic global
      fetch(`https://iid.googleapis.com/iid/v1/${{currentToken}}/rel/topics/all-devices`, {{
        method: 'POST',
        headers: {{ 'Authorization': 'key={server_key}' }}
      }}).then(() => console.log('✅ Suscrito a all-devices'));
    }}
  }});

// Manejo de mensajes en foreground
messaging.onMessage((payload) => {{
  console.log('📨 Push recibido:', payload);
  const {{ title, body }} = payload.notification;
  self.registration.showNotification(title, {{
    body: body,
    icon: '/icon-192.png',
    vibrate: [500, 200, 500, 200, 500],
    requireInteraction: true,
    tag: 'emergency'
  }});
}});

export {{ firebaseConfig, vapidKey }};
"""

firebase_config_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'mobile-app', 'firebase-config.js')
with open(firebase_config_path, 'w', encoding='utf-8') as f:
    f.write(firebase_config_js)

print(f"✅ firebase-config.js actualizado!")
print(f"📁 Ubicación: {os.path.abspath(firebase_config_path)}")

print("\n" + "═" * 60)
print("✅ CONFIGURACIÓN COMPLETA")
print("═" * 60)
print("\n📋 Próximos pasos:\n")
print("1. Verifica que el archivo .env esté en la raíz del proyecto")
print("2. NO subas el archivo .env a GitHub (ya está en .gitignore)")
print("3. Despliega la Cloud Function: firebase deploy --only functions")
print("4. Prueba enviando una alerta desde el dashboard")
print("5. Verifica que llegue la notificación push al móvil\n")
