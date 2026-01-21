from google.cloud import firestore
import json

db = firestore.Client(project='neos-tech')

print("🔍 ANALIZANDO FORMATOS EN FIRESTORE")
print("=" * 50)

# Ver últimos 3 documentos en rfid_tags
docs = list(db.collection('rfid_tags').order_by('timestamp', direction='DESCENDING').limit(3).stream())

for i, doc in enumerate(docs):
    data = doc.to_dict()
    print(f"\n📄 Documento {i+1}:")
    print(f"   Campos: {list(data.keys())}")
    
    # Verificar campos críticos
    has_id = 'id' in data
    has_epc = 'epc' in data
    has_client = 'client_id' in data
    
    print(f"   ✅ Tiene 'id': {has_id} ({data.get('id', 'N/A')})")
    print(f"   ✅ Tiene 'epc': {has_epc} ({data.get('epc', 'N/A')})")
    print(f"   ✅ Tiene 'client_id': {has_client} ({data.get('client_id', 'N/A')})")
    
    if 'raw_data' in data:
        print(f"   📦 Raw data keys: {list(data['raw_data'].keys())}")

print(f"\n📊 Total documentos en rfid_tags: {len(list(db.collection('rfid_tags').limit(1000).stream()))}")
