import functions_framework
import json
from google.cloud import firestore
from datetime import datetime
import os

@functions_framework.http
def process_tag(request):
    """Procesa tags RFID desde el gateway y los guarda en Firestore."""
    
    print(f"🔔 INICIO PROCESAMIENTO - {datetime.utcnow().isoformat()}")
    
    # Configurar Firestore
    db = firestore.Client(project='neos-tech')
    
    try:
        # Obtener datos de la solicitud
        request_json = request.get_json(silent=True)
        print(f"📦 Datos recibidos: {request_json}")
        
        if not request_json:
            return json.dumps({
                "access_granted": False,
                "error": "No JSON data provided",
                "timestamp": datetime.utcnow().isoformat()
            }), 400
        
        # Extraer y transformar datos
        epc = request_json.get('epc', '')
        reader_sn = request_json.get('reader_sn', '')
        gateway_version = request_json.get('gateway_version', '')
        
        # Normalizar client_id
        client_id = "condominio-neos"
        if gateway_version:
            client_id = gateway_version.replace("_2.0", "-neos").replace("_", "-").lower()
        
        # Crear ID único para el documento
        timestamp = datetime.utcnow()
        doc_id = f"{epc}_{timestamp.strftime('%Y%m%d_%H%M%S_%f')}" if epc else f"NO_EPC_{timestamp.strftime('%Y%m%d_%H%M%S_%f')}"
        
        # Datos para Firestore
        tag_data = {
            "id": epc or doc_id,
            "tag_id": epc,
            "reader_id": reader_sn,
            "reader_sn": reader_sn,
            "client_id": client_id,
            "gateway_version": gateway_version,
            "timestamp": timestamp.isoformat(),
            "processed_at": datetime.utcnow().isoformat(),
            "source": "gateway",
            "status": "active"
        }
        
        print(f"📝 Datos a guardar: {json.dumps(tag_data, indent=2)}")
        
        # Guardar en Firestore
        collection_name = "rfid_tags"
        doc_ref = db.collection(collection_name).document(doc_id)
        doc_ref.set(tag_data)
        
        print(f"✅ GUARDADO EXITOSO en {collection_name}/{doc_id}")
        print(f"✅ CLIENT_ID: {client_id}")
        print(f"✅ TIMESTAMP: {timestamp.isoformat()}")
        
        # Respuesta exitosa
        response = {
            "access_granted": True,
            "client_id": client_id,
            "tag_id": epc,
            "reader_id": reader_sn,
            "document_id": doc_id,
            "timestamp": timestamp.isoformat(),
            "message": "Acceso permitido - Registro guardado",
            "firestore_saved": True,
            "collection": collection_name
        }
        
        return json.dumps(response, indent=2), 200
        
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {str(e)}")
        import traceback
        print(f"📋 Stack trace: {traceback.format_exc()}")
        
        error_response = {
            "access_granted": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "client_id": client_id if 'client_id' in locals() else "unknown"
        }
        
        return json.dumps(error_response, indent=2), 500
