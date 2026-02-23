# NEOS TECH RFID - Cloud Function para verificar acceso
# Consulta whitelist/blacklist en Firestore

import json
import logging
from datetime import datetime
from google.cloud import firestore
import functions_framework
from flask import jsonify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def check_tag_access(request):
    """Verifica si un tag tiene acceso (whitelist/blacklist)"""
    
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
        logger.info(f"Verificando acceso para: {json.dumps(data)}")
        
        # 2. Client ID
        client_id = request.headers.get('X-Client-ID') or data.get('client_id') or 'default'
        
        # 3. Tag ID
        tag_id = data.get('tag_id') or data.get('id') or ''
        
        if not tag_id:
            return jsonify({'error': 'Se requiere tag_id'}), 400, headers
        
        # 4. Conectar a Firestore
        db = firestore.Client()  # project inferido de GOOGLE_CLOUD_PROJECT en runtime GCP
        
        # 5. Buscar tag en la colección del cliente
        client_ref = db.collection('clients').document(client_id)
        tags_ref = client_ref.collection('tags')
        
        # Buscar por tag_id
        query = tags_ref.where('tag_id', '==', tag_id).limit(1)
        results = list(query.stream())
        
        if len(results) > 0:
            # Tag encontrado
            tag_doc = results[0].to_dict()
            status = tag_doc.get('status', 'unknown')
            name = tag_doc.get('name', 'Sin nombre')
            
            if status == 'whitelist':
                response = {
                    'access_granted': True,
                    'status': 'whitelist',
                    'message': f'Acceso permitido: {name}',
                    'tag_id': tag_id,
                    'tag_info': tag_doc
                }
                logger.info(f"✅ Acceso PERMITIDO para {tag_id}")
                return jsonify(response), 200, headers
                
            elif status == 'blacklist':
                response = {
                    'access_granted': False,
                    'status': 'blacklist',
                    'message': f'Acceso denegado: {name} (lista negra)',
                    'tag_id': tag_id,
                    'tag_info': tag_doc
                }
                logger.info(f"❌ Acceso DENEGADO (blacklist) para {tag_id}")
                return jsonify(response), 200, headers
            else:
                # Estado desconocido, denegar por seguridad
                response = {
                    'access_granted': False,
                    'status': status,
                    'message': f'Estado desconocido: {status}',
                    'tag_id': tag_id,
                    'tag_info': tag_doc
                }
                logger.info(f"⚠️ Estado desconocido para {tag_id}: {status}")
                return jsonify(response), 200, headers
        else:
            # Tag NO encontrado = no registrado
            response = {
                'access_granted': False,
                'status': 'not_registered',
                'message': 'Tag no registrado en el sistema',
                'tag_id': tag_id
            }
            logger.info(f"⚠️ Tag NO REGISTRADO: {tag_id}")
            return jsonify(response), 200, headers
        
    except Exception as e:
        logger.error(f"Error verificando acceso: {str(e)}")
        return jsonify({
            'access_granted': False,
            'status': 'error',
            'error': str(e),
            'message': 'Error del servidor'
        }), 500, headers
