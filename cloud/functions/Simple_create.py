import firebase_admin
from firebase_admin import firestore, credentials
import datetime
import os

# Cargar credenciales desde archivo JSON
key_path = "serviceAccountKey.json"
if os.path.exists(key_path):
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    # Solo crear documentos vacíos para que existan las colecciones
    collections = ['users', 'user_tags', 'whitelist', 'blacklist', 'alerts', 'gate_logs', 'remote_commands']
    
    for collection in collections:
        try:
            # Intentar crear un documento vacío
            db.collection(collection).document('initial').set({
                'created_at': datetime.datetime.now(),
                'init': True
            })
            print(f"✅ Colección '{collection}' inicializada")
        except Exception as e:
            print(f"⚠️  Colección '{collection}': {str(e)}")
    
    print("\n🎯 ¡Estructura de base de datos creada!")
else:
    print("❌ No se encontró serviceAccountKey.json")
    print("Descarga desde: Firebase Console → Configuración → Cuentas de servicio")
