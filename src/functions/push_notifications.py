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
    Envía notificación push a TODOS los dispositivos registrados
    Lee los tokens FCM de Firestore y envía a cada uno
    
    Args:
        alert_type: Tipo de alerta (FIRE, EVACUATION, etc.)
        title: Título de la notificación
        body: Mensaje de la alerta
        severity: Nivel de severidad (CRITICAL, HIGH, MEDIUM, LOW)
        
    Returns:
        Resultado del envío con estadísticas
    """
    
    try:
        # Obtener todos los tokens FCM de usuarios en Firestore
        db = firestore.Client()
        users_ref = db.collection('users')
        users_query = users_ref.where(filter=firestore.FieldFilter('notifications_enabled', '==', True)).stream()
        
        tokens = []
        for user in users_query:
            user_data = user.to_dict()
            token = user_data.get('fcm_token')
            if token:
                tokens.append(token)
        
        logger.info(f"📱 Encontrados {len(tokens)} dispositivos con notificaciones habilitadas")
        
        # Enviar al topic "all-users" (más confiable que tokens individuales web)
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data={
                    'alert_type': alert_type,
                    'severity': severity,
                    'alertId': f"all-users_{alert_type}_{int(time.time())}",
                    'title': title,
                    'body': body
                },
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        icon='/assets/images/neostechc.png',
                        badge='/assets/images/neostechc.png',
                        vibrate=[200, 100, 200, 100, 200, 100, 200],
                        require_interaction=True
                    ),
                    fcm_options=messaging.WebpushFCMOptions(
                        link='https://neos-tech.web.app/alert-view.html'
                    )
                ),
                topic='all-users'
            )
            
            message_id = messaging.send(message)
            logger.info(f"✅ Notificación enviada al topic all-users: {message_id}")
            
            return {
                'success': True,
                'success_count': 1,
                'failure_count': 0,
                'total_tokens': len(tokens),
                'alert_type': alert_type,
                'severity': severity,
                'method': 'topic',
                'message_id': message_id
            }
            
        except Exception as e:
            logger.error(f"❌ Error enviando al topic: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'method': 'topic'
            }
        
        return {
            'success': True,
            'success_count': success_count,
            'failure_count': failure_count,
            'total_tokens': len(tokens),
            'alert_type': alert_type,
            'severity': severity,
            'failed_tokens': failed_tokens[:5] if len(failed_tokens) > 0 else []  # Solo los primeros 5
        }
        
        return {
            'success': True,
            'message_id': response,
            'topic': 'all-devices',
            'alert_type': alert_type,
            'severity': severity
        }
        
    except Exception as e:
        logger.error(f"❌ Error enviando push: {str(e)}")
        return {
            'success': False,
            'error': str(e)
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
