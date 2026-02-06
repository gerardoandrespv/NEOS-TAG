"""
Sistema de Push Notifications con Firebase Cloud Messaging
Envía notificaciones push a todos los dispositivos móviles registrados
"""

import requests
import json
from typing import List, Dict, Optional
import os
from datetime import datetime


class FCMNotificationService:
    """Servicio para enviar notificaciones push vía Firebase Cloud Messaging"""
    
    def __init__(self):
        self.server_key = os.environ.get('FIREBASE_SERVER_KEY')
        self.fcm_url = "https://fcm.googleapis.com/fcm/send"
        
        if not self.server_key:
            print("⚠️ WARNING: FIREBASE_SERVER_KEY no configurada")
    
    def send_to_topic(self, topic: str, title: str, body: str, data: Dict = None) -> Dict:
        """
        Envía notificación a todos los dispositivos suscritos a un topic
        
        Args:
            topic: Nombre del topic (ej: "all-devices", "tower-A", "floor-5")
            title: Título de la notificación
            body: Cuerpo del mensaje
            data: Datos adicionales para la notificación
            
        Returns:
            Respuesta de FCM con el resultado del envío
        """
        if not self.server_key:
            return {"error": "FCM no configurado"}
        
        headers = {
            "Authorization": f"Bearer {self.server_key}",
            "Content-Type": "application/json"
        }
        
        # Configurar notificación
        notification_data = {
            "to": f"/topics/{topic}",
            "notification": {
                "title": title,
                "body": body,
                "icon": "/icon-192.png",
                "badge": "/icon-192.png",
                "sound": "default",
                "click_action": "https://neos-tech.web.app/",
                "tag": "emergency-alert"
            },
            "data": data or {},
            "priority": "high",
            "time_to_live": 86400  # 24 horas
        }
        
        # Configuración de vibración según severidad
        if data and data.get('severity') == 'CRITICAL':
            notification_data['notification']['vibrate'] = [500, 200, 500, 200, 500, 200, 500]
        else:
            notification_data['notification']['vibrate'] = [200, 100, 200]
        
        try:
            response = requests.post(
                self.fcm_url,
                headers=headers,
                data=json.dumps(notification_data),
                timeout=10
            )
            
            result = response.json()
            
            if response.status_code == 200:
                print(f"✅ Push enviada al topic '{topic}': {result.get('message_id', 'OK')}")
                return {
                    "success": True,
                    "message_id": result.get('message_id'),
                    "results": result.get('results', [])
                }
            else:
                print(f"❌ Error FCM: {result}")
                return {
                    "success": False,
                    "error": result.get('error', 'Unknown error')
                }
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error de conexión FCM: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_to_multiple_topics(self, topics: List[str], title: str, body: str, data: Dict = None) -> Dict:
        """
        Envía notificación a múltiples topics
        
        Args:
            topics: Lista de topics
            title: Título
            body: Mensaje
            data: Datos adicionales
            
        Returns:
            Resultados de todos los envíos
        """
        results = []
        
        for topic in topics:
            result = self.send_to_topic(topic, title, body, data)
            results.append({
                "topic": topic,
                "result": result
            })
        
        return {
            "total_topics": len(topics),
            "results": results,
            "success_count": sum(1 for r in results if r['result'].get('success', False))
        }


def send_emergency_push(alert_type: str, severity: str, message: str, 
                       tower: Optional[str] = None, floor: Optional[int] = None) -> Dict:
    """
    Envía notificación push de emergencia
    
    Args:
        alert_type: Tipo de alerta (FIRE, EVACUATION, etc.)
        severity: Nivel de severidad (CRITICAL, HIGH, MEDIUM, LOW)
        message: Mensaje de la alerta
        tower: Torre específica (opcional)
        floor: Piso específico (opcional)
        
    Returns:
        Resultado del envío
    """
    fcm = FCMNotificationService()
    
    # Títulos según tipo de alerta
    titles = {
        "FIRE": "🔥 ALERTA DE INCENDIO",
        "EVACUATION": "🚨 EVACUACIÓN INMEDIATA",
        "FLOOD": "🌊 ALERTA DE INUNDACIÓN",
        "POWER_OUTAGE": "⚡ CORTE DE ENERGÍA",
        "SYSTEM_FAILURE": "⚙️ FALLA DE SISTEMAS",
        "GENERAL": "🟠 ALERTA GENERAL",
        "CANCELLED": "✅ ALERTA CANCELADA"
    }
    
    title = titles.get(alert_type, "🟠 ALERTA")
    
    # Determinar topics a notificar
    topics = ["all-devices"]  # Siempre enviar a todos
    
    if tower:
        topics.append(f"tower-{tower}")
    
    if floor:
        topics.append(f"floor-{floor}")
    
    # Datos adicionales
    data = {
        "alert_type": alert_type,
        "severity": severity,
        "timestamp": datetime.now().isoformat(),
        "tower": tower or "ALL",
        "floor": str(floor) if floor else "ALL"
    }
    
    # Enviar a todos los topics relevantes
    return fcm.send_to_multiple_topics(topics, title, message, data)


# Ejemplo de uso
if __name__ == "__main__":
    # Prueba de envío
    result = send_emergency_push(
        alert_type="FIRE",
        severity="CRITICAL",
        message="Incendio detectado en Torre A, Piso 5. Evacuar inmediatamente por escaleras.",
        tower="A",
        floor=5
    )
    
    print(json.dumps(result, indent=2))
