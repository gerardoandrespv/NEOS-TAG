import json
import logging
import os
from push_notifications import emit_emergency_alert, subscribe_to_topic
from firebase_functions import https_fn
import functions_framework
from flask import jsonify
from firebase_admin import firestore as fs_admin

db = fs_admin.client()

# TODO: Firestore trigger requiere Python <3.14
# from alert_trigger import on_alert_created

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@https_fn.on_request()
def sendEmergencyPush(request: https_fn.Request) -> https_fn.Response:
    """Cloud Function HTTP para enviar notificaciones push de emergencia"""
    
    # Configurar CORS
    if request.method == "OPTIONS":
        return https_fn.Response(
            "",
            status=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "3600",
            }
        )
    
    try:
        # Obtener datos del request
        request_json = request.get_json(silent=True) or {}
        logger.info(f"Recibido request: {json.dumps(request_json)}")
        
        # Validar datos requeridos
        alert_type = request_json.get('type', 'GENERAL')
        message = request_json.get('message', '')
        severity = request_json.get('severity', 'MEDIUM')
        tower = request_json.get('tower')
        floor = request_json.get('floor')
        alert_id = request_json.get('alert_id', 'AUTO')
        
        if not message:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Se requiere message'}),
                status=400,
                headers={"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
            )
        
        # Preparar datos de alerta
        alert_data = {
            'type': alert_type,
            'message': message,
            'severity': severity,
            'affected_tower': tower,
            'affected_floor': floor
        }
        
        # Enviar notificación push
        result = emit_emergency_alert(alert_data)
        
        return https_fn.Response(
            json.dumps({
                'success': True,
                'result': result,
                'alert_id': alert_id
            }),
            status=200,
            headers={"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
        )
        
    except Exception as e:
        logger.error(f"Error al enviar push: {str(e)}", exc_info=True)
        return https_fn.Response(
            json.dumps({'success': False, 'error': str(e)}),
            status=500,
            headers={"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
        )
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
        tag_id = data.get('id') or data.get('tag_id') or data.get('epc') or ''
        reader_id = data.get('readsn') or data.get('reader_id') or ''
        
        if not tag_id:
            return jsonify({'error': 'Se requiere tag_id'}), 400, headers
        
        # 4. Conectar a Firestore
        db = firestore.Client()  # project inferido de GOOGLE_CLOUD_PROJECT en runtime GCP
        
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


@https_fn.on_request()
def subscribeToTopic(request: https_fn.Request) -> https_fn.Response:
    """Suscribe un token FCM al topic all-users"""
    
    # Configurar CORS
    if request.method == "OPTIONS":
        return https_fn.Response(
            "",
            status=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "3600",
            }
        )
    
    try:
        request_json = request.get_json(silent=True) or {}
        token = request_json.get('token')
        topic = request_json.get('topic', 'all-users')
        
        if not token:
            return https_fn.Response(
                json.dumps({'success': False, 'error': 'Token requerido'}),
                status=400,
                headers={"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
            )
        
        result = subscribe_to_topic(token, topic)

        # Guardar token en alert_subscribers para que alert_trigger.py pueda enviar push
        client_id   = request_json.get('clientId', '')
        device_type = request_json.get('device_type', 'web')
        try:
            db.collection('alert_subscribers').document(token[:128]).set({
                'fcm_token':             token,
                'notifications_enabled': True,
                'clientId':              client_id,
                'device_type':           device_type,
                'last_updated':          fs_admin.SERVER_TIMESTAMP,
            }, merge=True)
        except Exception as db_err:
            logger.warning(f"subscribeToTopic: no se pudo guardar en Firestore: {db_err}")
        
        return https_fn.Response(
            json.dumps(result),
            status=200,
            headers={"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
        )
        
    except Exception as e:
        logger.error(f"Error en subscribeToTopic: {str(e)}")
        return https_fn.Response(
            json.dumps({'success': False, 'error': str(e)}),
            status=500,
            headers={"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
        )
