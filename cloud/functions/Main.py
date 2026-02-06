import functions_framework
import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore import SERVER_TIMESTAMP
import json
import datetime
import hashlib
import requests

# Inicializar Firebase
try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app()

db = firestore.client()

# Gateway local configuration
GATEWAY_BASE_URL = "http://192.168.1.11:8080"

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
        # Intentar usar timestamp del Gateway si está disponible
        timestamp_from_gateway = request_json.get('timestamp')
        if timestamp_from_gateway:
            try:
                # Si el timestamp viene como string ISO 8601
                timestamp_dt = datetime.datetime.fromisoformat(timestamp_from_gateway.replace('Z', '+00:00'))
            except:
                timestamp_dt = datetime.datetime.utcnow()
        else:
            timestamp_dt = datetime.datetime.utcnow()
        
        timestamp_str = timestamp_dt.strftime("%Y%m%d_%H%M%S_%f")  # Para ID único
        doc_id = f"{reader_id}_{tag_id}_{timestamp_str}"
        
        # Crear estructura de datos para Firestore
        tag_data = {
            "id": doc_id,
            "tag_id": tag_id,
            "reader_id": reader_id,
            "client_id": client_id,
            "timestamp": SERVER_TIMESTAMP,  # ✅ USAR FIRESTORE SERVER_TIMESTAMP
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
            "timestamp": timestamp_dt.isoformat() + "Z",
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

@functions_framework.http
def open_relay(request):
    """Proxy HTTPS para abrir relay en Gateway local (HTTP)"""
    
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
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    try:
        # Obtener datos JSON
        request_json = request.get_json(silent=True)
        
        if not request_json or 'access_point' not in request_json:
            return json.dumps({
                "status": "error",
                "message": "Missing access_point parameter"
            }), 400, headers
        
        access_point = request_json['access_point']
        
        # Hacer request al Gateway local
        gateway_url = f"{GATEWAY_BASE_URL}/api/open"
        gateway_payload = {"access_point": access_point}
        
        # Timeout de 5 segundos para evitar bloqueos
        response = requests.post(
            gateway_url,
            json=gateway_payload,
            timeout=5
        )
        
        # Reenviar respuesta del Gateway
        if response.status_code == 200:
            return json.dumps(response.json()), 200, headers
        else:
            return json.dumps({
                "status": "error",
                "message": f"Gateway returned status {response.status_code}",
                "gateway_response": response.text
            }), response.status_code, headers
            
    except requests.exceptions.Timeout:
        return json.dumps({
            "status": "error",
            "message": "Gateway timeout - is it running?"
        }), 504, headers
        
    except requests.exceptions.ConnectionError:
        return json.dumps({
            "status": "error",
            "message": "Cannot connect to Gateway - is it running?"
        }), 503, headers
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }), 500, headers
