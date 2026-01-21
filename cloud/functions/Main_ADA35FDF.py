# main.py - Cloud Function multi-tenant
import google.cloud.firestore
import json
import os
from datetime import datetime, timedelta
from flask import jsonify
import functions_framework

# Configuración inicial
PROJECT_ID = os.environ.get("GCP_PROJECT", "neos-tech")
DEFAULT_CLIENT = "default"

@functions_framework.http
def process_tag(request):
    """Procesa tags RFID para múltiples clientes"""
    
    # Configurar headers CORS (importante para dashboard)
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Client-ID",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)
    
    # Headers para respuestas normales
    headers = {"Access-Control-Allow-Origin": "*"}
    
    try:
        # 1. Obtener y validar datos
        request_data = request.get_json(silent=True) or {}
        
        # Métodos para obtener client_id (de mayor a menor prioridad):
        # 1. Header personalizado
        # 2. Campo en el JSON
        # 3. Parámetro de query string
        # 3. Extraer client_id de múltiples campos
        client_id = (
            request_data.get('client_id') or 
            request_data.get('gateway_version') or 
            request_data.get('gateway') or
            'condominio-neos'  # Valor por defecto
        )

        
# 4. Normalizar gateway_version a formato cliente si es necesario
        if 'condominio' in str(client_id).lower():
            client_id = 'condominio-neos'
        # Datos mínimos requeridos'condominio
        # 1. Extraer tag_id de múltiples campos posibles
        # 3. Datos del tag - COMPATIBILIDAD CON GATEWAY
        # El gateway envía: epc, reader_sn, gateway_version
        # Necesitamos transformar a: tag_id, reader_id, client_id

        # tag_id puede venir como id, tag_id, o epc
        tag_id = data.get('id') or data.get('tag_id') or ''

        if not tag_id:
            return jsonify({'error': 'Se requiere tag_id'}), 400, headers

        # reader_id puede venir como readsn, reader_id, o reader_sn
        reader_id = data.get('readsn') or data.get('reader_id') or ''

        # client_id puede venir como client_id o gateway_version
        client_id = data.get('client_id') or data.get('gateway_version') or 'default'

        # Normalizar condominio_2.0 a condominio-neos
        if 'condominio' in str(client_id).lower():
            client_id = 'condominio-neos'

        # 2. Extraer reader_id de múltiples campos posibles
        reader_id = (
            request_data.get('readsn') or 
            request_data.get('reader_sn') or 
            request_data.get('reader_id') or
            request_data.get('ReaderSN') or
            'unknown'
        )

        if not reader_id:
            return jsonify({"error": "Se requiere reader_id"}), 400, headers
        
        # 2. Inicializar Firestore
        db = google.cloud.firestore.Client(project=PROJECT_ID)
        
        # 3. Registrar o verificar cliente
        client_ref = db.collection("clients").document(client_id)
        client_doc = client_ref.get()
        
        if not client_doc.exists:
            # Cliente nuevo - crear automáticamente
            client_ref.set({
                "name": f"Cliente {client_id}",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "status": "active",
                "plan": "basic",
                "contact_email": "",
                "gateway_count": 0
            })
        
        # 4. Procesar el tag RFID
        result = process_rfid_tag(db, client_id, tag_id, reader_id, request_data)
        
        # 5. Devolver respuesta
        response = {
            "status": "processed",
            "client_id": client_id,
            "tag_id": tag_id,
            "access_granted": result.get("access_granted", False),
            "message": result.get("message", "Tag procesado"),
            "timestamp": datetime.utcnow().isoformat(),
            "action": result.get("action", "logged")
        }
        
        return jsonify(response), 200, headers
        
    except Exception as e:
        error_response = {
            "error": str(e),
            "client_id": client_id if 'client_id' in locals() else "unknown",
            "timestamp": datetime.utcnow().isoformat()
        }
        return jsonify(error_response), 500, headers


def process_rfid_tag(db, client_id, tag_id, reader_id, raw_data):
    """Lógica principal de procesamiento de tags"""
    
    # Referencias a colecciones del cliente
    # Estructura: clients/{client_id}/subcolecciones
    client_ref = db.collection("clients").document(client_id)
    
    timestamp = datetime.utcnow()
    
    # 1. Registrar tag en histórico
    tag_ref = client_ref.collection("rfid_tags").document()
    tag_ref.set({
        "tag_id": tag_id,
        "reader_id": reader_id,
        "timestamp": timestamp,
        "raw_data": raw_data,
        "processed": False
    })
    
    # 2. Verificar si es un tag de usuario
    user_tag_ref = client_ref.collection("user_tags").where("tag_id", "==", tag_id).limit(1)
    user_tags = list(user_tag_ref.stream())
    
    user_info = None
    if user_tags:
        user_tag = user_tags[0].to_dict()
        user_id = user_tag.get("user_id")
        if user_id:
            user_doc = client_ref.collection("users").document(user_id).get()
            if user_doc.exists:
                user_info = user_doc.to_dict()
    
    # 3. Verificar whitelist/blacklist
    access_granted = False
    action = "logged"
    message = "Tag registrado"
    
    # Check blacklist primero
    blacklist_ref = client_ref.collection("blacklist").document(tag_id)
    blacklist_doc = blacklist_ref.get()
    
    if blacklist_doc.exists:
        # Tag bloqueado
        access_granted = False
        action = "denied"
        message = "Tag en lista negra"
        
        # Crear alerta
        alert_ref = client_ref.collection("alerts").document()
        alert_ref.set({
            "type": "blacklist_access",
            "severity": "high",
            "tag_id": tag_id,
            "user_info": user_info,
            "timestamp": timestamp,
            "resolved": False,
            "message": f"Intento de acceso con tag bloqueado: {tag_id}"
        })
    
    # Check whitelist (solo si no está en blacklist)
    elif user_tags:
        # Tag asignado a usuario - verificar si usuario está activo
        if user_info and user_info.get("activo", True):
            access_granted = True
            action = "granted"
            message = f"Acceso permitido: {user_info.get('nombre', 'Usuario')}"
        else:
            access_granted = False
            action = "denied"
            message = "Usuario inactivo"
    else:
        # Tag no reconocido
        access_granted = False
        action = "denied"
        message = "Tag no reconocido"
        
        # Alertas solo si es repetido
        recent_attempts = client_ref.collection("gate_logs") \
            .where("tag_id", "==", tag_id) \
            .where("timestamp", ">", timestamp - timedelta(hours=1)) \
            .get()
        
        if len(list(recent_attempts)) > 3:  # Más de 3 intentos en 1 hora
            alert_ref = client_ref.collection("alerts").document()
            alert_ref.set({
                "type": "suspicious_activity",
                "severity": "medium",
                "tag_id": tag_id,
                "timestamp": timestamp,
                "resolved": False,
                "message": f"Actividad sospechosa con tag {tag_id}: múltiples intentos"
            })
    
    # 4. Registrar en logs de acceso
    log_ref = client_ref.collection("gate_logs").document()
    log_data = {
        "tag_id": tag_id,
        "reader_id": reader_id,
        "timestamp": timestamp,
        "access_granted": access_granted,
        "action": action,
        "message": message,
        "user_info": user_info,
        "client_id": client_id
    }
    log_ref.set(log_data)
    
    # 5. Actualizar contadores
    if access_granted:
        # Incrementar contador de accesos exitosos
        stats_ref = client_ref.collection("stats").document("daily")
        stats_doc = stats_ref.get()
        
        today = datetime.utcnow().date().isoformat()
        if stats_doc.exists:
            stats_data = stats_doc.to_dict()
            if stats_data.get("date") == today:
                stats_ref.update({
                    "granted_access": google.cloud.firestore.Increment(1),
                    "total_access": google.cloud.firestore.Increment(1)
                })
            else:
                stats_ref.set({
                    "date": today,
                    "granted_access": 1,
                    "denied_access": 0,
                    "total_access": 1
                })
        else:
            stats_ref.set({
                "date": today,
                "granted_access": 1,
                "denied_access": 0,
                "total_access": 1
            })
    
    # 6. Actualizar tag como procesado
    tag_ref.update({"processed": True, "access_granted": access_granted})
    
    return {
        "access_granted": access_granted,
        "message": message,
        "action": action,
        "user_info": user_info
    }

# En Cloud Function main.py, agregar:
def normalize_tag_data(raw_data):
    return {
        'id': raw_data.get('id') or raw_data.get('epc') or raw_data.get('tag_id'),
        'readsn': raw_data.get('readsn') or raw_data.get('reader_sn') or raw_data.get('reader_id'),
        'client_id': raw_data.get('client_id') or 'condominio-neos',
        # Preservar original para debug
        '_original': raw_data
    }
# Función adicional para abrir portón remotamente
@functions_framework.http
def open_gate(request):
    """Abre portón remotamente para un cliente específico"""
    
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Client-ID",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)
    
    headers = {"Access-Control-Allow-Origin": "*"}
    
    try:
        request_data = request.get_json(silent=True) or {}
        
        client_id = (
            request.headers.get("X-Client-ID") or 
            request_data.get("client_id") or 
            DEFAULT_CLIENT
        )
        
        gate_id = request_data.get("gate_id", "main_gate")
        duration = int(request_data.get("duration", 10))  # segundos
        user = request_data.get("user", "system")
        reason = request_data.get("reason", "remote_command")
        
        db = google.cloud.firestore.Client(project=PROJECT_ID)
        client_ref = db.collection("clients").document(client_id)
        
        # Registrar comando
        command_ref = client_ref.collection("remote_commands").document()
        command_ref.set({
            "type": "open_gate",
            "gate_id": gate_id,
            "duration": duration,
            "user": user,
            "reason": reason,
            "timestamp": datetime.utcnow(),
            "executed": True,
            "client_id": client_id
        })
        
        # Registrar en logs
        log_ref = client_ref.collection("gate_logs").document()
        log_ref.set({
            "type": "remote_open",
            "gate_id": gate_id,
            "user": user,
            "reason": reason,
            "timestamp": datetime.utcnow(),
            "client_id": client_id
        })
        
        return jsonify({
            "status": "success",
            "message": f"Portón {gate_id} abierto por {duration} segundos",
            "client_id": client_id,
            "timestamp": datetime.utcnow().isoformat()
        }), 200, headers
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500, headers