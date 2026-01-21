import functions_framework
import json
from google.cloud import firestore
from datetime import datetime, timezone
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def process_tag(request):
    """Procesa tags RFID desde el gateway y los guarda en Firestore con estructura consistente."""
    
    logger.info("🔔 INICIO PROCESAMIENTO TAG RFID")
    
    # Configurar Firestore
    db = firestore.Client(project='neos-tech')
    
    try:
        # 1. Obtener y validar datos
        request_json = request.get_json(silent=True)
        
        if not request_json:
            logger.warning("No se recibió JSON en la solicitud")
            return error_response("No JSON data provided", 400)
        
        # Campos requeridos
        required_fields = ['epc', 'reader_sn', 'gateway_version']
        missing_fields = [field for field in required_fields if field not in request_json]
        
        if missing_fields:
            logger.warning(f"Campos faltantes: {missing_fields}")
            return error_response(f"Missing fields: {missing_fields}", 400)
        
        # 2. Extraer datos
        epc = request_json['epc'].strip()
        reader_sn = request_json['reader_sn'].strip()
        gateway_version = request_json['gateway_version'].strip()
        
        logger.info(f"Datos recibidos - EPC: {epc}, Reader: {reader_sn}, Version: {gateway_version}")
        
        # 3. Normalizar y transformar
        timestamp = datetime.now(timezone.utc)
        
        # Normalizar client_id consistentemente
        client_id = normalize_client_id(gateway_version)
        
        # Crear ID de documento consistente
        doc_id = create_document_id(epc, reader_sn, timestamp)
        
        # 4. Preparar datos para Firestore
        tag_data = {
            # Campos originales (para compatibilidad)
            "epc": epc,
            "reader_sn": reader_sn,
            "gateway_version": gateway_version,
            
            # Campos normalizados (consistencia)
            "id": epc,  # Para compatibilidad con dashboard
            "tag_id": epc,
            "reader_id": reader_sn,
            "client_id": client_id,
            
            # Metadatos
            "timestamp": timestamp.isoformat(),
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "source": "gateway",
            "status": "active",
            "version": "v2-multi-tenant-normalized",
            
            # Campos de auditoría
            "year": timestamp.year,
            "month": timestamp.month,
            "day": timestamp.day,
            "hour": timestamp.hour
        }
        
        logger.info(f"Datos a guardar - Client: {client_id}, DocID: {doc_id}")
        
        # 5. Guardar en Firestore
        collection_name = "rfid_tags"
        doc_ref = db.collection(collection_name).document(doc_id)
        
        # Usar merge para no sobrescribir campos existentes innecesariamente
        doc_ref.set(tag_data, merge=True)
        
        logger.info(f"✅ GUARDADO EXITOSO - Colección: {collection_name}, Documento: {doc_id}")
        
        # 6. Respuesta exitosa
        response_data = {
            "success": True,
            "access_granted": True,
            "client_id": client_id,
            "tag_id": epc,
            "reader_id": reader_sn,
            "document_id": doc_id,
            "timestamp": timestamp.isoformat(),
            "message": "Tag procesado exitosamente",
            "firestore_saved": True,
            "collection": collection_name,
            "normalized_client": client_id
        }
        
        return json.dumps(response_data, indent=2), 200, {'Content-Type': 'application/json'}
        
    except Exception as e:
        logger.error(f"❌ ERROR CRÍTICO: {str(e)}", exc_info=True)
        return error_response(str(e), 500)

def normalize_client_id(gateway_version):
    """Normaliza el client_id para consistencia."""
    if not gateway_version:
        return "unknown"
    
    # Convertir a minúsculas y reemplazar caracteres
    normalized = gateway_version.lower().strip()
    
    # Normalizaciones específicas
    if "condominio" in normalized:
        # Asegurar formato: condominio-neos
        normalized = normalized.replace("_2.0", "-neos")
        normalized = normalized.replace("_", "-")
        if not normalized.endswith("-neos"):
            normalized = normalized + "-neos"
    
    # Limitar longitud y eliminar caracteres inválidos
    normalized = ''.join(c for c in normalized if c.isalnum() or c == '-')
    normalized = normalized[:50]  # Limitar longitud
    
    return normalized

def create_document_id(epc, reader_sn, timestamp):
    """Crea un ID de documento consistente y único."""
    # Formato: {reader}_{epc}_{timestamp}
    timestamp_str = timestamp.strftime('%Y%m%d_%H%M%S_%f')[:-3]  # Microsegundos a milisegundos
    safe_epc = epc.replace(':', '_').replace(' ', '_')
    safe_reader = reader_sn.replace(':', '_').replace(' ', '_')
    
    return f"{safe_reader}_{safe_epc}_{timestamp_str}"

def error_response(message, status_code):
    """Crea una respuesta de error estandarizada."""
    error_data = {
        "success": False,
        "error": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status_code": status_code
    }
    
    return json.dumps(error_data, indent=2), status_code, {'Content-Type': 'application/json'}

# Para testing local
if __name__ == "__main__":
    # Simular una solicitud para testing
    test_request = type('Request', (), {
        'get_json': lambda self: {
            'epc': 'TEST_EPC_123',
            'reader_sn': 'TEST_READER',
            'gateway_version': 'condominio_2.0'
        }
    })()
    
    response, status, headers = process_tag(test_request)
    print(f"Status: {status}")
    print(f"Response: {response}")
