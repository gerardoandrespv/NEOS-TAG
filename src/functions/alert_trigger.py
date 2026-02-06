"""
Cloud Function: Trigger automático para envío de alertas
Se activa cuando se crea un documento en emergency_alerts
"""

import logging
from firebase_admin import firestore, messaging
from firebase_functions import firestore_fn, options
from typing import Any

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Obtener cliente de Firestore (no reinicializar app)
db = firestore.client()


@firestore_fn.on_document_created(
    document="emergency_alerts/{alertId}",
    region="us-central1"
)
def on_alert_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """
    Se ejecuta automáticamente cuando se crea una alerta en Firestore.
    Envía notificaciones push a todos los suscriptores activos.
    """
    
    try:
        # Obtener datos de la alerta
        alert_data = event.data.to_dict()
        alert_id = event.params['alertId']
        
        logger.info(f"🚨 Nueva alerta creada: {alert_id}")
        logger.info(f"Datos: {alert_data}")
        
        # Verificar si debe enviar push
        send_push = alert_data.get('send_push', False)
        if not send_push:
            logger.info("⏭️ send_push=False, omitiendo notificaciones")
            return
        
        # Obtener suscriptores activos con FCM token
        subscribers_ref = db.collection('alert_subscribers')
        subscribers_query = subscribers_ref.where('notifications_enabled', '==', True).stream()
        
        tokens = []
        for sub in subscribers_query:
            sub_data = sub.to_dict()
            fcm_token = sub_data.get('fcm_token')
            if fcm_token:
                tokens.append(fcm_token)
        
        if not tokens:
            logger.warning("⚠️ No hay tokens FCM disponibles")
            # Actualizar contadores en la alerta
            event.data.reference.update({
                'notifications_sent': 0,
                'notifications_failed': 0,
                'sent_at': firestore.SERVER_TIMESTAMP
            })
            return
        
        # Configurar mensaje según severidad
        severity = alert_data.get('severity', 'MEDIUM')
        title = alert_data.get('title', 'Alerta de Emergencia')
        message_text = alert_data.get('message', '')
        alert_type = alert_data.get('type', 'GENERAL')
        
        # Emoji según tipo
        emoji_map = {
            'FIRE': '🔥',
            'EVACUATION': '🚨',
            'FLOOD': '💧',
            'POWER_OUTAGE': '⚡',
            'SYSTEM_FAILURE': '🔧',
            'GENERAL': '📢'
        }
        emoji = emoji_map.get(alert_type, '🔔')
        
        # Configuración de Android según severidad
        priority = 'high' if severity in ['CRITICAL', 'HIGH'] else 'normal'
        
        # Vibración agresiva para alertas críticas
        if severity == 'CRITICAL':
            vibration = [500, 200, 500, 200, 500, 200, 500]
        elif severity == 'HIGH':
            vibration = [300, 150, 300]
        else:
            vibration = [200]
        
        # Construir mensaje FCM
        notification = messaging.Notification(
            title=f"{emoji} {title}",
            body=message_text
        )
        
        android_config = messaging.AndroidConfig(
            priority=priority,
            notification=messaging.AndroidNotification(
                sound='default',
                channel_id='emergency_alerts',
                vibrate_timings_millis=vibration,
                priority='max' if severity == 'CRITICAL' else 'high',
                visibility='public'
            )
        )
        
        # Data payload para app
        data_payload = {
            'alert_id': alert_id,
            'type': alert_type,
            'severity': severity,
            'zone': alert_data.get('building_zone', ''),
            'click_action': 'FLUTTER_NOTIFICATION_CLICK'
        }
        
        # Envío en batch (máximo 500 tokens por lote)
        batch_size = 500
        total_sent = 0
        total_failed = 0
        
        for i in range(0, len(tokens), batch_size):
            batch_tokens = tokens[i:i + batch_size]
            
            message = messaging.MulticastMessage(
                notification=notification,
                android=android_config,
                data=data_payload,
                tokens=batch_tokens
            )
            
            try:
                response = messaging.send_multicast(message)
                total_sent += response.success_count
                total_failed += response.failure_count
                
                logger.info(f"✅ Batch {i//batch_size + 1}: {response.success_count} enviados, {response.failure_count} fallidos")
                
                # Limpiar tokens inválidos
                if response.failure_count > 0:
                    for idx, send_response in enumerate(response.responses):
                        if not send_response.success:
                            failed_token = batch_tokens[idx]
                            error_code = send_response.exception.code if send_response.exception else 'unknown'
                            
                            # Si el token es inválido, eliminarlo de Firestore
                            if error_code in ['invalid-registration-token', 'registration-token-not-registered']:
                                logger.warning(f"🗑️ Eliminando token inválido: {failed_token[:20]}...")
                                # Buscar y actualizar el documento
                                invalid_subs = subscribers_ref.where('fcm_token', '==', failed_token).limit(1).stream()
                                for inv_sub in invalid_subs:
                                    inv_sub.reference.update({
                                        'fcm_token': firestore.DELETE_FIELD,
                                        'notifications_enabled': False
                                    })
            
            except Exception as batch_error:
                logger.error(f"❌ Error en batch {i//batch_size + 1}: {batch_error}")
                total_failed += len(batch_tokens)
        
        # Actualizar estadísticas en el documento de alerta
        event.data.reference.update({
            'notifications_sent': total_sent,
            'notifications_failed': total_failed,
            'sent_at': firestore.SERVER_TIMESTAMP,
            'total_subscribers': len(tokens)
        })
        
        logger.info(f"🎯 Alerta {alert_id}: {total_sent} enviadas, {total_failed} fallidas de {len(tokens)} total")
        
    except Exception as e:
        logger.error(f"💥 Error procesando alerta {event.params.get('alertId')}: {e}", exc_info=True)
        # No re-raise para evitar retry infinito
