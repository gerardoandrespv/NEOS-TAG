import firebase_admin
from firebase_admin import firestore, credentials
import datetime

# Configuración
SERVICE_ACCOUNT_KEY = {
  "type": "service_account",
  "project_id": "neos-tech",
  "private_key_id": "tu_private_key_id",  # Obtener de Firebase Console
  "private_key": "-----BEGIN PRIVATE KEY-----\ntu_clave_privada\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@neos-tech.iam.gserviceaccount.com",
  "client_id": "tu_client_id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40neos-tech.iam.gserviceaccount.com"
}

# Inicializar Firebase
cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
firebase_admin.initialize_app(cred)
db = firestore.client()

# Crear colecciones básicas
def create_collections():
    print("Creando colecciones...")
    
    # Colección: users
    users_ref = db.collection('users')
    users_ref.document('admin').set({
        'nombre': 'Administrador',
        'apellido': 'Sistema',
        'tipo': 'administrador',
        'unidad': 'Administración',
        'telefono': '123456789',
        'email': 'admin@condominio.com',
        'fecha_registro': datetime.datetime.now(),
        'activo': True
    })
    print("✅ Colección 'users' creada")
    
    # Colección: user_tags
    db.collection('user_tags').document('initial').set({'init': True})
    print("✅ Colección 'user_tags' creada")
    
    # Colección: whitelist
    db.collection('whitelist').document('initial').set({'init': True})
    print("✅ Colección 'whitelist' creada")
    
    # Colección: blacklist
    db.collection('blacklist').document('initial').set({'init': True})
    print("✅ Colección 'blacklist' creada")
    
    # Colección: alerts
    db.collection('alerts').document('initial').set({'init': True})
    print("✅ Colección 'alerts' creada")
    
    # Colección: gate_logs
    db.collection('gate_logs').document('initial').set({'init': True})
    print("✅ Colección 'gate_logs' creada")
    
    # Colección: remote_commands
    db.collection('remote_commands').document('initial').set({'init': True})
    print("✅ Colección 'remote_commands' creada")
    
    print("\n🎯 ¡Todas las colecciones creadas exitosamente!")
    print("Ve a: https://console.firebase.google.com/project/neos-tech/firestore")

if __name__ == "__main__":
    create_collections()
