#!/usr/bin/env python3
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import sys

try:
    # Usar credenciales por defecto (GCP)
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {
        'projectId': 'neos-tech',
    })
    
    db = firestore.client()
    
    print("=== VERIFICANDO FIRESTORE ===")
    print(f"Fecha/Hora: {datetime.now().isoformat()}")
    
    # Verificar colección rfid_tags
    print("\n1. Últimos 10 documentos en 'rfid_tags':")
    docs = db.collection('rfid_tags').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(10).stream()
    
    count = 0
    for doc in docs:
        count += 1
        data = doc.to_dict()
        print(f"\n[{count}] ID: {doc.id}")
        print(f"   tag_id: {data.get('id', 'N/A')}")
        print(f"   client_id: {data.get('client_id', 'N/A')}")
        print(f"   timestamp: {data.get('timestamp', 'N/A')}")
        if 'debug_timestamp' in data:
            print(f"   debug: {data.get('debug_timestamp')}")
    
    print(f"\n✓ Total documentos en rfid_tags: {count}")
    
    # Verificar colección clients
    print("\n2. Documentos en 'clients':")
    clients = db.collection('clients').stream()
    client_count = 0
    for client in clients:
        client_count += 1
        data = client.to_dict()
        print(f"   [{client_count}] {client.id}: {data.get('name', 'N/A')}")
    
    print(f"\n✓ Total clientes: {client_count}")
    
    # Verificar configuración
    print("\n3. Configuración del proyecto:")
    print(f"   Project ID: neos-tech")
    print(f"   Firebase initialized: {firebase_admin._apps != {}}")
    
except Exception as e:
    print(f"❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    
    print("\n=== SOLUCIÓN ALTERNATIVA ===")
    print("1. Verificar permisos de la cuenta de servicio")
    print("2. Revisar reglas de Firestore en Firebase Console")
    print("3. Verificar que Firestore está en modo 'Native'")
