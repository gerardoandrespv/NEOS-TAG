import functions_framework
import json
import os
import traceback
import sys
from datetime import datetime
from google.cloud import firestore
from flask import jsonify, request

# Configurar logging para FORZAR salida
import logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# DEBUG: Forzar logs a stdout
print("=== CLOUD FUNCTION INICIADA ===", flush=True)

@functions_framework.http
def process_tag(request):
    """Procesa un tag RFID recibido por HTTP POST"""
    
    print(f"\n=== NUEVA EJECUCIÓN: {datetime.now().isoformat()} ===", flush=True)
    
    # 1. Configurar headers CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Client-ID',
        'Access-Control-Max-Age': '3600'
    }
    
    # Manejar preflight CORS
    if request.method == 'OPTIONS':
        print("OPTIONS request - CORS preflight", flush=True)
        return ('', 204, headers)
    
    try:
        # 2. Obtener y validar datos
        print("Leyendo datos del request...", flush=True)
        data = request.get_json(silent=True) or {}
        print(f"DATOS RECIBIDOS CRUDOS: {data}", flush=True)
        print(f"DATOS RECIBIDOS JSON: {json.dumps(data)}", flush=True)
        
        # 3. Datos del tag - COMPATIBILIDAD CON GATEWAY ACTUAL
        tag_id = data.get('id') or data.get('tag_id') or data.get('epc') or ''
        reader_id = data.get('readsn') or data.get('reader_id') or data.get('reader_sn') or ''
        client_id = data.get('client_id') or data.get('gateway_version') or 'default'
        
        print(f"EXTRACCIÓN - tag_id: '{tag_id}', reader_id: '{reader_id}', client_id: '{client_id}'", flush=True)
        
        # Normalizar condominio_2.0 a condominio-neos
        if 'condominio' in str(client_id).lower():
            client_id = 'condominio-neos'
            print(f"Client_id normalizado: {client_id}", flush=True)
        
        if not tag_id:
            print("ERROR: No hay tag_id", flush=True)
            return jsonify({'error': 'Se requiere tag_id, id o epc'}), 400, headers
        
        print(f"VALIDACIÓN OK - tag_id: {tag_id}", flush=True)
        
        # 4. Conectar a Firestore CON LOGGING DETALLADO
        print("Intentando conectar a Firestore...", flush=True)
        try:
            db = firestore.Client(project='neos-tech')
            print("✅ CONEXIÓN FIRESTORE EXITOSA", flush=True)
        except Exception as e:
            print(f"❌ ERROR CONEXIÓN FIRESTORE: {str(e)}", flush=True)
            print(traceback.format_exc(), flush=True)
            return jsonify({'error': f'Error Firestore: {str(e)}'}), 500, headers
        
        # 5. Guardar en colección legacy
        print("Guardando en colección rfid_tags...", flush=True)
        try:
            legacy_ref = db.collection('rfid_tags').document()
            timestamp_now = datetime.now()
            
            legacy_data = {
                'id': tag_id,
                'readsn': reader_id,
                'timestamp': timestamp_now,
                'client_id': client_id,
                'version': 'v2-multi-tenant',
                'source': 'gateway',
                'debug_timestamp': timestamp_now.isoformat(),
                'processed_at': datetime.now().isoformat()
            }
            
            print(f"DATA A GUARDAR: {legacy_data}", flush=True)
            
            # INTENTAR GUARDAR
            legacy_ref.set(legacy_data)
            
            print(f"✅ GUARDADO EXITOSO en rfid_tags - Document ID: {legacy_ref.id}", flush=True)
            
            # VERIFICAR QUE SE GUARDÓ
            doc_snapshot = legacy_ref.get()
            if doc_snapshot.exists:
                print(f"✅ VERIFICACIÓN: Documento {legacy_ref.id} existe en Firestore", flush=True)
                print(f"✅ DATOS VERIFICADOS: {doc_snapshot.to_dict()}", flush=True)
            else:
                print(f"❌ VERIFICACIÓN FALLIDA: Documento {legacy_ref.id} NO existe", flush=True)
                
        except Exception as e:
            print(f"❌ ERROR CRÍTICO GUARDANDO EN FIRESTORE: {str(e)}", flush=True)
            print(traceback.format_exc(), flush=True)
            # Continuamos para responder al gateway, pero logueamos el error
        
        # 6. Respuesta exitosa
        response = {
            'status': 'processed',
            'client_id': client_id,
            'tag_id': tag_id,
            'reader_id': reader_id,
            'access_granted': True,
            'message': 'Acceso permitido',
            'timestamp': datetime.now().isoformat(),
            'version': '2.0-multi-tenant',
            'debug': 'firestore_logging_enabled'
        }
        
        print(f"RESPUESTA FINAL: {json.dumps(response)}", flush=True)
        print("=== EJECUCIÓN COMPLETADA ===", flush=True)
        
        return jsonify(response), 200, headers
        
    except Exception as e:
        print(f"❌ ERROR GENERAL NO MANEJADO: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        return jsonify({'error': f'Error interno: {str(e)}'}), 500, headers

print("=== FUNCIÓN CARGADA ===", flush=True)
