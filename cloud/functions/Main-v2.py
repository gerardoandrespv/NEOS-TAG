# NEOS TECH RFID - Cloud Function v2.0
# MULTI-TENANT con retrocompatibilidad

import json
import logging
from datetime import datetime
from google.cloud import firestore
import functions_framework
from flask import jsonify

# Configuración
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def process_tag(request):
    """Procesa tags RFID - Versión Multi-Tenant"""
    
    # Configurar CORS
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type, X-Client-ID",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)
    
    headers = {"Access-Control-Allow-Origin": "*"}
    
    try:
        # 1. Obtener datos
        data = request.get_json(silent=True) or {}
        logger.info(f"Datos recibidos: {json.dumps(data)}")
        
        # 2. Determinar client_id (nuevo para multi-tenant)
        #    Prioridad: Header > Campo en JSON > Valor por defecto
        client_id = request.headers.get('X-Client-ID') or data.get('client_id') or 'default'
        
        # 3. Datos del tag
        ttag_id = data.get('id') or data.get('tag_id') or data.get('epc') or ''
        reader_id = data.get('readsn') or data.get('reader_id') or ''
        
        if not tag_id:
            return jsonify({'error': 'Se requiere tag_id'}), 400, headers
        
        # 4. Conectar a Firestore
        db = firestore.Client(project='neos-tech')
        
        # 5. PARA RETROCOMPATIBILIDAD: Guardar en estructura antigua
        #    Esto asegura que el dashboard actual siga funcionando
        legacy_ref = db.collection('rfid_tags').document()
        legacy_ref.set({
            'id': tag_id,
            'readsn': reader_id,
            'timestamp': datetime.now(),
            'client_id': client_id,  # Agregamos client_id al registro antiguo
            'version': 'v2-multi-tenant'
        })
        
        # 6. NUEVA ESTRUCTURA MULTI-TENANT: Guardar en colección del cliente
        #    Primero, crear/verificar cliente
        client_ref = db.collection('clients').document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            # Cliente nuevo - crear automáticamente
            client_ref.set({
                'name': f'Cliente {client_id}',
                'created_at': datetime.now(),
                'status': 'active',
                'auto_created': True
            })
        
        # 7. Guardar tag en la colección del cliente
        new_tag_ref = client_ref.collection('rfid_tags').document()
        new_tag_ref.set({
            'tag_id': tag_id,
            'reader_id': reader_id,
            'client_id': client_id,
            'timestamp': datetime.now(),
            'raw_data': data,
            'processed': True
        })
        
        # 8. Guardar en logs de acceso del cliente
        log_ref = client_ref.collection('gate_logs').document()
        log_ref.set({
            'tag_id': tag_id,
            'reader_id': reader_id,
            'client_id': client_id,
            'timestamp': datetime.now(),
            'access_granted': True,  # Por ahora siempre permitido
            'action': 'logged',
            'message': 'Tag procesado exitosamente'
        })
        
        # 9. Respuesta
        response = {
            'status': 'processed',
            'client_id': client_id,
            'tag_id': tag_id,
            'access_granted': True,
            'message': 'Acceso permitido',
            'timestamp': datetime.now().isoformat(),
            'version': '2.0-multi-tenant'
        }
        
        logger.info(f"Tag procesado: {response}")
        return jsonify(response), 200, headers
        
    except Exception as e:
        logger.error(f"Error procesando tag: {str(e)}")
        return jsonify({'error': str(e)}), 500, headers
