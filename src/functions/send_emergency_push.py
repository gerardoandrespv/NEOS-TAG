"""
Cloud Function para enviar notificaciones push de emergencia
Archivo separado para despliegue independiente
"""

import json
import logging
from push_notifications import emit_emergency_alert
from firebase_functions import https_fn

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
