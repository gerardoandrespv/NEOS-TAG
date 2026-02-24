"""
Servicio simplificado de notificaciones push con Firebase Admin SDK
Compatible con API V1 (moderna)
"""

import firebase_admin
from firebase_admin import credentials, messaging
from google.cloud import firestore
import os
import time
from typing import Dict, List
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializar Firebase Admin (si no está inicializado)
try:
    firebase_admin.get_app()
except ValueError:
    # En Cloud Functions 2nd gen, las credenciales se manejan automáticamente
    firebase_admin.initialize_app()


def subscribe_to_topic(token: str, topic: str = 'all-users') -> Dict:
    """
    Suscribe un token FCM a un topic
    
    Args:
        token: Token FCM del dispositivo
        topic: Nombre del topic (default: 'all-users')
        
    Returns:
        Resultado de la suscripción
    """
    try:
        response = messaging.subscribe_to_topic([token], topic)
        logger.info(f"✅ Token suscrito al topic {topic}: {response.success_count} exitosos, {response.failure_count} fallidos")
        
        return {
            'success': True,
            'success_count': response.success_count,
            'failure_count': response.failure_count,
            'topic': topic
        }
    except Exception as e:
        logger.error(f"❌ Error suscribiendo token: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def send_alert_to_all_devices(alert_type: str, title: str, body: str, severity: str = 'MEDIUM') -> Dict:
    """
    Envía notificación push SOLO a residentes SAE en Android Chrome
    (device_type == 'sae_resident'). No envía a PC ni a Firefox.
    Usa multicast por tokens individuales, no topic broadcast.
    """
    try:
        db = firestore.Client()

        # Solo tokens de residentes SAE (mobile Android Chrome)
        q = db.collection('alert_subscribers').where(
            filter=firestore.FieldFilter('notifications_enabled', '==', True)
        ).where(
            filter=firestore.FieldFilter('device_type', '==', 'sae_resident')
        ).stream()

        tokens = [doc.to_dict().get('fcm_token') for doc in q if doc.to_dict().get('fcm_token')]

        if not tokens:
            logger.warning('[SAE] No hay tokens de residentes para enviar push')
            return {
                'success': True,
                'success_count': 0,
                'failure_count': 0,
                'total_tokens': 0,
                'method': 'multicast_sae_resident'
            }

        logger.info(f'[SAE] Enviando push a {len(tokens)} residentes')

        success_count = 0
        failure_count = 0

        # Multicast en lotes de 500 (límite FCM)
        for i in range(0, len(tokens), 500):
            batch = tokens[i:i + 500]
            message = messaging.MulticastMessage(
                notification=messaging.Notification(  # nativo Android + iOS
                    title=title,
                    body=body,
                ),
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        color='#DC2626',
                    )
                ),
                webpush=messaging.WebpushConfig(
                    headers={'Urgency': 'high'},
                    notification=messaging.WebpushNotification(
                        title=title,
                        body=body,
                        icon='https://neos-tech.web.app/assets/images/neostechb.png',
                        require_interaction=True,
                    ),
                    fcm_options=messaging.WebpushFCMOptions(
                        link='https://neos-tech.web.app/sae'
                    )
                ),
                tokens=batch
            )
            response = messaging.send_each_for_multicast(message)
            success_count += response.success_count
            failure_count += response.failure_count
            logger.info(f'[SAE] Lote {i//500 + 1}: {response.success_count} ok, {response.failure_count} fail')
            # Log individual failures para diagnóstico
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    logger.error(f'[SAE] Token[{i+idx}] fallo: {resp.exception}')

        return {
            'success':       True,
            'success_count': success_count,
            'failure_count': failure_count,
            'total_tokens':  len(tokens),
            'alert_type':    alert_type,
            'severity':      severity,
            'method':        'multicast_sae_resident'
        }

    except Exception as e:
        logger.error(f'[SAE] Error enviando push multicast: {str(e)}')
        return {
            'success': False,
            'error':   str(e)
        }


def send_alert_to_topic(topic: str, alert_type: str, title: str, body: str, severity: str = 'MEDIUM') -> Dict:
    """
    Envía notificación a un topic específico (torre, piso, etc.)
    
    Args:
        topic: Nombre del topic (ej: "tower-A", "floor-5")
        alert_type: Tipo de alerta
        title: Título
        body: Mensaje
        severity: Severidad
        
    Returns:
        Resultado del envío
    """
    
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body
        ),
        data={
            'alert_type': alert_type,
            'severity': severity,
            'alertId': f"{topic}_{alert_type}_{int(time.time())}"
        },
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                icon='icon_192',
                color='#FF6B00'
            )
        ),
        topic=topic
    )
    
    try:
        response = messaging.send(message)
        logger.info(f"✅ Push enviada al topic '{topic}': {response}")
        
        return {
            'success': True,
            'message_id': response,
            'topic': topic
        }
        
    except Exception as e:
        logger.error(f"❌ Error enviando push al topic '{topic}': {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'topic': topic
        }


# Mapeo de tipos de alerta a emojis y títulos
ALERT_TITLES = {
    "FIRE": "🔥 ALERTA DE INCENDIO",
    "EVACUATION": "🚨 EVACUACIÓN INMEDIATA",
    "FLOOD": "🌊 ALERTA DE INUNDACIÓN",
    "POWER_OUTAGE": "⚡ CORTE DE ENERGÍA",
    "SYSTEM_FAILURE": "⚙️ FALLA DE SISTEMAS",
    "GENERAL": "🟠 ALERTA GENERAL",
    "CANCELLED": "✅ ALERTA CANCELADA"
}


def emit_emergency_alert(alert_data: Dict) -> Dict:
    """
    Función principal para emitir alerta de emergencia
    
    Args:
        alert_data: Diccionario con los datos de la alerta:
            - type: Tipo de alerta
            - message: Mensaje
            - severity: Severidad
            - affected_tower: Torre afectada (opcional)
            - affected_floor: Piso afectado (opcional)
            
    Returns:
        Resultado del envío con estadísticas
    """
    
    alert_type = alert_data.get('type', 'GENERAL')
    message = alert_data.get('message', '')
    severity = alert_data.get('severity', 'MEDIUM')
    tower = alert_data.get('affected_tower')
    floor = alert_data.get('affected_floor')
    
    # Obtener título según tipo
    title = ALERT_TITLES.get(alert_type, "🟠 ALERTA")
    
    # Enviar a topic global (todos los dispositivos)
    result_all = send_alert_to_all_devices(alert_type, title, message, severity)
    
    results = {
        'all_devices': result_all,
        'topics': []
    }
    
    # Enviar a topics específicos si aplica
    if tower:
        topic_result = send_alert_to_topic(f"tower-{tower}", alert_type, title, message, severity)
        results['topics'].append(topic_result)
    
    if floor:
        # Si floor es una lista o string con múltiples pisos, separar y enviar a cada uno
        if isinstance(floor, str) and ',' in floor:
            floors = [f.strip() for f in floor.split(',')]
        elif isinstance(floor, list):
            floors = floor
        else:
            floors = [str(floor)]
        
        for f in floors:
            if f:  # Solo si no está vacío
                topic_result = send_alert_to_topic(f"floor-{f}", alert_type, title, message, severity)
                results['topics'].append(topic_result)
    
    return results


# Para pruebas
if __name__ == "__main__":
    # Prueba de envío
    test_alert = {
        'type': 'FIRE',
        'message': 'Incendio detectado en Torre A, Piso 5. Evacuar inmediatamente por escaleras.',
        'severity': 'CRITICAL',
        'affected_tower': 'A',
        'affected_floor': 5
    }
    
    result = emit_emergency_alert(test_alert)
    print("Resultado:", result)
