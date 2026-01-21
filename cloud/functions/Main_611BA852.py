import functions_framework
import json
from google.cloud import firestore
from datetime import datetime, timezone
import os
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def process_rfid_tag(request):
    """Cloud Function para procesar tags RFID en producción."""
    
    logger.info("=== INICIO PROCESAMIENTO RFID ===")
    
    # Configurar Firestore
    db = firestore.Client()
    
    # Headers CORS para producción
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600'
    }
    
    # Manejar preflight CORS
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    # Verificar método
    if request.method != 'POST':
        return (json.dumps({"error": "Método no permitido"}), 405, headers)
    
    try:
        # Obtener y validar datos
        request_json = request.get_json(silent=True)
        logger.info(f"Datos recibidos: {request_json}")
        
        if not request_json:
            logger.error("No se recibió JSON")
            return (json.dumps({
                "success": False,
                "error": "No se recibieron datos JSON",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 400, headers)
        
        # Validar campos obligatorios
        required_fields = ['epc', 'reader_sn', 'gateway_version']
        missing_fields = [field for field in required_fields if field not in request_json]
        
        if missing_fields:
            logger.error(f"Campos faltantes: {missing_fields}")
            return (json.dumps({
                "success": False,
                "error": f"Campos faltantes: {missing_fields}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 400, headers)
        
        # Extraer datos
        epc = request_json['epc'].strip()
        reader_sn = request_json['reader_sn'].strip()
        gateway_version = request_json['gateway_version'].strip()
        
        # Normalizar client_id
        client_id = gateway_version.replace("_2.0", "-neos").replace("_", "-").lower()
        
        # Crear timestamp
        timestamp = datetime.now(timezone.utc)
        
        # Generar ID del documento
        doc_id = f"{reader_sn}_{epc}_{timestamp.strftime('%Y%m%d_%H%M%S_%f')}"
        
        # Datos para Firestore
        tag_data = {
            "id": doc_id,
            "epc": epc,
            "tag_id": epc,
            "reader_sn": reader_sn,
            "reader_id": reader_sn,
            "gateway_version": gateway_version,
            "client_id": client_id,
            "client_id_raw": gateway_version,
            "timestamp": timestamp.isoformat(),
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "source": "gateway",
            "environment": "production",
            "status": "processed"
        }
        
        logger.info(f"Guardando documento: {doc_id}")
        
        # Guardar en Firestore
        doc_ref = db.collection('rfid_tags').document(doc_id)
        doc_ref.set(tag_data)
        
        logger.info(f"✅ Documento guardado exitosamente: {doc_id}")
        
        # Actualizar estadísticas
        update_stats(db, client_id, reader_sn)
        
        # Respuesta exitosa
        response = {
            "success": True,
            "access_granted": True,
            "document_id": doc_id,
            "client_id": client_id,
            "reader_id": reader_sn,
            "tag_id": epc,
            "timestamp": timestamp.isoformat(),
            "message": "Tag RFID procesado exitosamente",
            "environment": "production"
        }
        
        return (json.dumps(response, indent=2), 200, headers)
        
    except Exception as e:
        logger.error(f"❌ Error procesando tag: {str(e)}", exc_info=True)
        
        error_response = {
            "success": False,
            "access_granted": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": "production"
        }
        
        return (json.dumps(error_response, indent=2), 500, headers)

def update_stats(db, client_id, reader_sn):
    """Actualizar estadísticas en Firestore."""
    try:
        stats_ref = db.collection('stats').document('counters')
        
        # Actualizar contadores
        db.run_transaction(lambda transaction: 
            update_transaction(transaction, stats_ref, client_id, reader_sn)
        )
        
        logger.info("Estadísticas actualizadas")
        
    except Exception as e:
        logger.error(f"Error actualizando estadísticas: {e}")

def update_transaction(transaction, stats_ref, client_id, reader_sn):
    """Transacción para actualizar estadísticas."""
    snapshot = stats_ref.get(transaction=transaction)
    
    if snapshot.exists:
        data = snapshot.to_dict()
        # Incrementar contadores
        data['total_tags'] = data.get('total_tags', 0) + 1
        data['last_updated'] = datetime.now(timezone.utc).isoformat()
        
        # Contador por client_id
        client_key = f"client_{client_id}"
        data[client_key] = data.get(client_key, 0) + 1
        
        # Contador por reader
        reader_key = f"reader_{reader_sn}"
        data[reader_key] = data.get(reader_key, 0) + 1
    else:
        # Inicializar estadísticas
        data = {
            'total_tags': 1,
            'last_updated': datetime.now(timezone.utc).isoformat(),
            f"client_{client_id}": 1,
            f"reader_{reader_sn}": 1
        }
    
    transaction.set(stats_ref, data)
