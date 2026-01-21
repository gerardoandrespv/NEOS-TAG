import functions_framework
import firebase_admin
from firebase_admin import firestore
import json
import datetime
import hashlib

# Inicializar Firebase
try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app()

db = firestore.client()

@functions_framework.http
def process_tag(request):
    """Procesa datos RFID desde el gateway"""
    
    # Permitir CORS
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    headers = {
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        # Obtener datos JSON
        request_json = request.get_json(silent=True)
        
        if not request_json:
            return json.dumps({"error": "No JSON data received"}), 400, headers
        
        # Validar campos obligatorios
        required_fields = ['epc', 'reader_sn', 'gateway_version']
        for field in required_fields:
            if field not in request_json:
                return json.dumps({"error": f"Missing required field: {field}"}), 400, headers
        
        # Normalizar datos
        tag_id = request_json['epc']
        reader_id = request_json['reader_sn']
        gateway_version = request_json['gateway_version']
        
        # Normalizar client_id
        if gateway_version == "condominio_2.0":
            client_id = "condominio-neos"
        else:
            client_id = gateway_version.replace(".", "-").replace("_", "-").lower()
        
        # Generar ID único para el documento
        timestamp = datetime.datetime.utcnow()
        timestamp_str = timestamp.strftime("%Y%m%d_%H%M%S")
        doc_id = f"{reader_id}_{tag_id}_{timestamp_str}"
        
        # Crear estructura de datos para Firestore
        tag_data = {
            "id": doc_id,
            "tag_id": tag_id,
            "reader_id": reader_id,
            "client_id": client_id,
            "timestamp": timestamp,
            "source": "gateway",
            "status": "active",
            "version": "v2-multi-tenant-normalized"
        }
        
        # Guardar en Firestore
        doc_ref = db.collection("rfid_tags").document(doc_id)
        doc_ref.set(tag_data)
        
        # Respuesta exitosa
        response = {
            "success": True,
            "document_id": doc_id,
            "timestamp": timestamp.isoformat() + "Z",
            "normalized": {
                "original_epc": tag_id,
                "original_reader": reader_id,
                "client_id": client_id
            }
        }
        
        return json.dumps(response), 200, headers
        
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e),
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }
        return json.dumps(error_response), 500, headers
