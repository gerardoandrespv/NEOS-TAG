"""
Sistema de Alertas de Emergencia - Cloud Function
NeosTech Building Alert System

Maneja la emisión y distribución de alertas de emergencia a residentes.
"""

import functions_framework
from firebase_admin import initialize_app, firestore, messaging
from datetime import datetime, timedelta
import os
from typing import Dict, List, Any
import logging
from push_notifications import send_alert_to_all_devices

# Inicializar Firebase Admin
initialize_app()
db = firestore.client()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@functions_framework.http
def emit_alert(request):
    """
    Endpoint para emitir nueva alerta de emergencia.
    
    POST /emit_alert
    Body: {
        "type": "FIRE" | "EVACUATION" | "FLOOD" | "POWER_OUTAGE" | "SYSTEM_FAILURE" | "GENERAL",
        "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        "title": "Título de la alerta",
        "message": "Mensaje detallado",
        "building_zone": "Piso 3 - Ala Este",
        "affected_floors": [3, 4],
        "send_push": true,
        "send_sms": false,
        "send_email": false,
        "priority": "HIGH",
        "issued_by": "user_id",
        "template_id": "template_fire" (opcional)
    }
    """
    
    # CORS headers
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
        # Validar método
        if request.method != 'POST':
            return ({'error': 'Método no permitido'}, 405, headers)
        
        # Obtener datos del request
        request_json = request.get_json(silent=True)
        if not request_json:
            return ({'error': 'Cuerpo de request inválido'}, 400, headers)
        
        # Validar campos requeridos
        required_fields = ['type', 'severity', 'title', 'message', 'issued_by']
        for field in required_fields:
            if field not in request_json:
                return ({'error': f'Campo requerido: {field}'}, 400, headers)
        
        # Crear documento de alerta
        alert_data = {
            'type': request_json['type'],
            'severity': request_json['severity'],
            'title': request_json['title'],
            'message': request_json['message'],
            'building_zone': request_json.get('building_zone', 'Todo el edificio'),
            'affected_floors': request_json.get('affected_floors', []),
            
            # Control de emisión
            'issued_at': firestore.SERVER_TIMESTAMP,
            'issued_by': request_json['issued_by'],
            'expires_at': datetime.now() + timedelta(hours=24),  # Expira en 24h
            'cancelled_at': None,
            'status': 'ACTIVE',
            
            # Configuración de envío
            'send_push': request_json.get('send_push', True),
            'send_sms': request_json.get('send_sms', False),
            'send_email': request_json.get('send_email', False),
            'priority': request_json.get('priority', 'HIGH'),
            
            # Confirmaciones (se actualizan después)
            'total_recipients': 0,
            'delivered_count': 0,
            'read_count': 0,
            'confirmed_safe_count': 0,
            
            # Metadatos
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        # Guardar alerta en Firestore
        alert_ref = db.collection('emergency_alerts').document()
        alert_ref.set(alert_data)
        alert_id = alert_ref.id
        
        logger.info(f"Alerta creada: {alert_id} - Tipo: {alert_data['type']}")

        # Enviar push a todos los suscriptores (topic all-users)
        if alert_data['send_push']:
            try:
                push_result = send_alert_to_all_devices(
                    alert_type=alert_data['type'],
                    title=alert_data['title'],
                    body=alert_data['message'],
                    severity=alert_data['severity'],
                )
                logger.info(f"Push enviado: {push_result}")
            except Exception as push_err:
                logger.error(f"Error enviando push: {push_err}")

        # Obtener destinatarios (todos los usuarios activos)
        recipients = get_recipients(request_json.get('affected_floors'))
        
        # Actualizar contador de destinatarios
        alert_ref.update({'total_recipients': len(recipients)})
        
        # Enviar notificaciones
        results = {
            'push_sent': 0,
            'sms_sent': 0,
            'email_sent': 0,
            'errors': []
        }
        
        for recipient in recipients:
            recipient_id = save_recipient(alert_id, recipient, alert_data)

            # Enviar SMS
            if alert_data['send_sms'] and recipient.get('phone'):
                try:
                    send_sms(recipient, alert_data)
                    results['sms_sent'] += 1
                    update_recipient_delivery(recipient_id, 'sms')
                except Exception as e:
                    logger.error(f"Error enviando SMS a {recipient['user_id']}: {str(e)}")
                    results['errors'].append({
                        'user_id': recipient['user_id'],
                        'channel': 'sms',
                        'error': str(e)
                    })
            
            # Enviar Email
            if alert_data['send_email'] and recipient.get('email'):
                try:
                    send_email(recipient, alert_data)
                    results['email_sent'] += 1
                    update_recipient_delivery(recipient_id, 'email')
                except Exception as e:
                    logger.error(f"Error enviando email a {recipient['user_id']}: {str(e)}")
                    results['errors'].append({
                        'user_id': recipient['user_id'],
                        'channel': 'email',
                        'error': str(e)
                    })
        
        # Registrar en logs de auditoría
        log_alert_action(alert_id, 'CREATED', alert_data['issued_by'], {
            'recipient_count': len(recipients),
            **results
        })
        
        # Actualizar contadores en alerta
        alert_ref.update({
            'delivered_count': results['push_sent'] + results['sms_sent'] + results['email_sent']
        })
        
        logger.info(f"Alerta {alert_id} procesada. Push: {results['push_sent']}, SMS: {results['sms_sent']}, Email: {results['email_sent']}")
        
        return ({
            'success': True,
            'alert_id': alert_id,
            'recipients_count': len(recipients),
            'results': results
        }, 200, headers)
        
    except Exception as e:
        logger.error(f"Error emitiendo alerta: {str(e)}")
        return ({'error': str(e)}, 500, headers)


def get_recipients(affected_floors: List[int] = None) -> List[Dict[str, Any]]:
    """
    Obtiene lista de destinatarios para la alerta.
    
    Args:
        affected_floors: Lista de pisos afectados (None = todos)
    
    Returns:
        Lista de diccionarios con datos de destinatarios
    """
    recipients = []
    
    # Query de usuarios activos
    users_ref = db.collection('users').where('status', '==', 'active')
    
    for user_doc in users_ref.stream():
        user_data = user_doc.to_dict()
        user_id = user_doc.id
        
        # Si hay pisos específicos, filtrar
        if affected_floors:
            user_floor = user_data.get('floor')
            if user_floor not in affected_floors:
                continue
        
        # Obtener tokens de dispositivos (si existen)
        device_tokens = []
        devices_ref = db.collection('users').document(user_id).collection('devices')
        for device_doc in devices_ref.stream():
            device_data = device_doc.to_dict()
            if device_data.get('token'):
                device_tokens.append({
                    'token': device_data['token'],
                    'platform': device_data.get('platform', 'unknown'),
                    'model': device_data.get('model', 'unknown')
                })
        
        recipients.append({
            'user_id': user_id,
            'name': user_data.get('name', 'Usuario'),
            'apartment': user_data.get('apartment', 'N/A'),
            'floor': user_data.get('floor', 0),
            'phone': user_data.get('phone'),
            'email': user_data.get('email'),
            'device_tokens': device_tokens
        })
    
    return recipients


def save_recipient(alert_id: str, recipient: Dict[str, Any], alert_data: Dict[str, Any]) -> str:
    """
    Guarda información del destinatario de la alerta.
    
    Returns:
        ID del documento recipient creado
    """
    recipient_data = {
        'alert_id': alert_id,
        'user_id': recipient['user_id'],
        
        # Información del destinatario
        'name': recipient['name'],
        'apartment': recipient['apartment'],
        'floor': recipient['floor'],
        'phone': recipient.get('phone'),
        'email': recipient.get('email'),
        
        # Dispositivos
        'devices': recipient.get('device_tokens', []),
        
        # Estado de entrega (se actualiza después)
        'push_delivered': False,
        'push_delivered_at': None,
        'sms_delivered': False,
        'sms_delivered_at': None,
        'email_delivered': False,
        'email_delivered_at': None,
        
        # Confirmaciones del usuario
        'read_at': None,
        'confirmed_safe': False,
        'confirmed_safe_at': None,
        'location_shared': False,
        
        # Metadatos
        'created_at': firestore.SERVER_TIMESTAMP
    }
    
    recipient_ref = db.collection('alert_recipients').document()
    recipient_ref.set(recipient_data)
    
    return recipient_ref.id


def send_push_notification(recipient: Dict[str, Any], alert_data: Dict[str, Any]):
    """
    Envía notificación push via Firebase Cloud Messaging.
    """
    device_tokens = recipient.get('device_tokens', [])
    
    if not device_tokens:
        logger.warning(f"Usuario {recipient['user_id']} no tiene tokens de dispositivo")
        return
    
    # Determinar configuración según tipo de alerta
    alert_config = get_alert_config(alert_data['type'])
    
    # Construir mensaje FCM
    for device in device_tokens:
        token = device['token']
        platform = device['platform']
        
        # Configuración base
        notification = messaging.Notification(
            title=alert_data['title'],
            body=alert_data['message'][:100] + '...' if len(alert_data['message']) > 100 else alert_data['message']
        )
        
        # Configuración específica por plataforma
        if platform == 'android':
            android_config = messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    channel_id='emergency_alerts',
                    priority='max',
                    sound=alert_config['sound'],
                    visibility='public',
                    default_vibrate_timings=False,
                    vibrate_timings_millis=[500, 200, 500, 200, 500],
                    color='#FF6B00'  # Naranja corporativo
                )
            )
        else:
            android_config = None
        
        if platform == 'ios':
            apns_config = messaging.APNSConfig(
                headers={
                    'apns-priority': '10',
                    'apns-push-type': 'alert'
                },
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(
                            title=alert_data['title'],
                            body=alert_data['message']
                        ),
                        sound=messaging.CriticalSound(
                            name=alert_config['sound'] + '.caf',
                            critical=True,
                            volume=1.0
                        ),
                        badge=1,
                        content_available=True,
                        custom_data={
                            'interruption-level': 'critical'
                        }
                    )
                )
            )
        else:
            apns_config = None
        
        # Data payload (para ambas plataformas)
        data = {
            'alert_id': alert_data.get('id', ''),
            'type': alert_data['type'],
            'severity': alert_data['severity'],
            'zone': alert_data['building_zone']
        }
        
        # Crear y enviar mensaje
        message = messaging.Message(
            notification=notification,
            data=data,
            token=token,
            android=android_config,
            apns=apns_config
        )
        
        try:
            response = messaging.send(message)
            logger.info(f"Push enviado a {recipient['user_id']} ({platform}): {response}")
        except Exception as e:
            logger.error(f"Error enviando push: {str(e)}")
            raise


def send_sms(recipient: Dict[str, Any], alert_data: Dict[str, Any]):
    """
    Envía SMS via Twilio.
    
    TODO: Implementar integración con Twilio
    """
    phone = recipient.get('phone')
    
    if not phone:
        logger.warning(f"Usuario {recipient['user_id']} no tiene teléfono")
        return
    
    # Formatear mensaje SMS (máximo 160 caracteres)
    sms_message = f"""
[ALERTA EDIFICIO]
{alert_data['type']}: {alert_data['title']}

{alert_data['message'][:80]}

Más info en app.
    """.strip()
    
    logger.info(f"SMS a enviar a {phone}: {sms_message}")
    
    # TODO: Implementar envío real con Twilio
    # from twilio.rest import Client
    # client = Client(TWILIO_SID, TWILIO_TOKEN)
    # client.messages.create(
    #     to=phone,
    #     from_=TWILIO_PHONE,
    #     body=sms_message
    # )


def send_email(recipient: Dict[str, Any], alert_data: Dict[str, Any]):
    """
    Envía email via SendGrid.
    
    TODO: Implementar integración con SendGrid
    """
    email = recipient.get('email')
    
    if not email:
        logger.warning(f"Usuario {recipient['user_id']} no tiene email")
        return
    
    logger.info(f"Email a enviar a {email}")
    
    # TODO: Implementar envío real con SendGrid


def update_recipient_delivery(recipient_id: str, channel: str):
    """
    Actualiza estado de entrega de un destinatario.
    """
    update_data = {
        f'{channel}_delivered': True,
        f'{channel}_delivered_at': firestore.SERVER_TIMESTAMP
    }
    
    db.collection('alert_recipients').document(recipient_id).update(update_data)


def get_alert_config(alert_type: str) -> Dict[str, str]:
    """
    Obtiene configuración de sonido/color según tipo de alerta.
    """
    configs = {
        'FIRE': {
            'sound': 'emergency_alarm_fire',
            'color': '#FF6B00'
        },
        'EVACUATION': {
            'sound': 'emergency_alarm_evacuation',
            'color': '#FF8C00'
        },
        'FLOOD': {
            'sound': 'emergency_alarm_flood',
            'color': '#4A90E2'
        },
        'POWER_OUTAGE': {
            'sound': 'emergency_alarm_general',
            'color': '#FFD700'
        },
        'SYSTEM_FAILURE': {
            'sound': 'emergency_alarm_general',
            'color': '#FFA500'
        },
        'GENERAL': {
            'sound': 'emergency_alarm_general',
            'color': '#4A90E2'
        }
    }
    
    return configs.get(alert_type, configs['GENERAL'])


def log_alert_action(alert_id: str, action: str, actor_id: str, details: Dict[str, Any]):
    """
    Registra acción en logs de auditoría.
    """
    log_data = {
        'alert_id': alert_id,
        'action': action,
        'actor_id': actor_id,
        'details': details,
        'timestamp': firestore.SERVER_TIMESTAMP
    }
    
    db.collection('alert_logs').add(log_data)


@functions_framework.http
def cancel_alert(request):
    """
    Cancela una alerta activa.
    
    POST /cancel_alert
    Body: {
        "alert_id": "alert_id",
        "reason": "Motivo de cancelación",
        "cancelled_by": "user_id"
    }
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    try:
        request_json = request.get_json(silent=True)
        alert_id = request_json.get('alert_id')
        reason = request_json.get('reason', 'Sin motivo especificado')
        cancelled_by = request_json.get('cancelled_by')
        
        # Actualizar alerta
        alert_ref = db.collection('emergency_alerts').document(alert_id)
        alert_ref.update({
            'status': 'CANCELLED',
            'cancelled_at': firestore.SERVER_TIMESTAMP,
            'cancel_reason': reason,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        
        # Enviar notificación de cancelación
        alert_data = alert_ref.get().to_dict()
        recipients = get_recipients()
        
        for recipient in recipients:
            if recipient.get('device_tokens'):
                send_cancellation_notification(recipient, alert_data, reason)
        
        # Log de auditoría
        log_alert_action(alert_id, 'CANCELLED', cancelled_by, {'reason': reason})
        
        return ({
            'success': True,
            'message': 'Alerta cancelada exitosamente'
        }, 200, headers)
        
    except Exception as e:
        logger.error(f"Error cancelando alerta: {str(e)}")
        return ({'error': str(e)}, 500, headers)


def send_cancellation_notification(recipient: Dict[str, Any], alert_data: Dict[str, Any], reason: str):
    """
    Envía notificación de cancelación de alerta.
    """
    for device in recipient.get('device_tokens', []):
        notification = messaging.Notification(
            title="✅ ALERTA CANCELADA",
            body=f"{alert_data['title']} - {reason}"
        )
        
        message = messaging.Message(
            notification=notification,
            data={
                'alert_id': alert_data.get('id', ''),
                'action': 'CANCELLED'
            },
            token=device['token']
        )
        
        try:
            messaging.send(message)
        except Exception as e:
            logger.error(f"Error enviando notificación de cancelación: {str(e)}")


@functions_framework.http
def confirm_safe(request):
    """
    Registra confirmación de usuario que está a salvo.
    
    POST /confirm_safe
    Body: {
        "alert_id": "alert_id",
        "user_id": "user_id",
        "location": { "lat": -33.0, "lng": -71.0 } (opcional)
    }
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    try:
        request_json = request.get_json(silent=True)
        alert_id = request_json.get('alert_id')
        user_id = request_json.get('user_id')
        location = request_json.get('location')
        
        # Buscar recipient
        recipients_ref = db.collection('alert_recipients')
        query = recipients_ref.where('alert_id', '==', alert_id).where('user_id', '==', user_id)
        
        docs = query.stream()
        for doc in docs:
            # Actualizar confirmación
            doc.reference.update({
                'confirmed_safe': True,
                'confirmed_safe_at': firestore.SERVER_TIMESTAMP,
                'location_shared': location is not None,
                'location': location
            })
            
            # Actualizar contador en alerta
            alert_ref = db.collection('emergency_alerts').document(alert_id)
            alert_ref.update({
                'confirmed_safe_count': firestore.Increment(1)
            })
            
            break
        
        return ({
            'success': True,
            'message': 'Confirmación registrada'
        }, 200, headers)
        
    except Exception as e:
        logger.error(f"Error registrando confirmación: {str(e)}")
        return ({'error': str(e)}, 500, headers)
