"""
========================================
RFID SIMULATOR - Para Tests Sin Hardware
========================================

Simula lectora THY sin necesidad de hardware físico
Genera eventos RFID deterministas para testing
"""

import socket
import threading
import time
import json
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import random


@dataclass
class RFIDTag:
    """Tag RFID simulado"""
    epc: str  # Código EPC del tag
    rssi: int = -45  # Potencia de señal (-90 a -30)
    antenna: int = 1  # Antena que detectó (1-4)
    read_count: int = 1  # Número de lecturas


class RFIDSimulator:
    """
    Simulador de lectora RFID THY
    Genera eventos de lectura por TCP/HTTP
    """
    
    def __init__(self, host='127.0.0.1', port=8888, protocol='tcp'):
        self.host = host
        self.port = port
        self.protocol = protocol
        self.running = False
        self.server_socket = None
        self.clients = []
        
        # Tags simulados predefinidos
        self.predefined_tags = {
            'authorized_user_1': '

E28069150000402009073E7F',
            'authorized_user_2': 'E2806915000050200907367F',
            'unauthorized_user': '000000000000000000000000',
            'blacklisted_user': 'DEADBEEFDEADBEEFDEADBEEF',
            'test_duplicate': 'E28069150000502009073A7F'
        }
        
        # Eventos programados
        self.scheduled_events: List[Dict] = []
        
        # Estadísticas
        self.tags_sent = 0
        self.events_processed = 0
    
    
    def start(self):
        """Inicia el simulador"""
        self.running = True
        
        if self.protocol == 'tcp':
            self._start_tcp_server()
        elif self.protocol == 'http':
            self._start_http_server()
    
    
    def stop(self):
        """Detiene el simulador"""
        self.running = False
        
        if self.server_socket:
            self.server_socket.close()
        
        for client in self.clients:
            client.close()
    
    
    def _start_tcp_server(self):
        """Inicia servidor TCP que simula protocolo de lectora"""
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        
        print(f"[RFID Simulator] TCP server started on {self.host}:{self.port}")
        
        # Thread para aceptar conexiones
        threading.Thread(target=self._accept_connections, daemon=True).start()
    
    
    def _accept_connections(self):
        """Acepta conexiones entrantes"""
        while self.running:
            try:
                client_socket, address = self.server_socket.accept()
                print(f"[RFID Simulator] Client connected: {address}")
                self.clients.append(client_socket)
                
                # Thread para manejar cliente
                threading.Thread(
                    target=self._handle_client,
                    args=(client_socket,),
                    daemon=True
                ).start()
            except Exception as e:
                if self.running:
                    print(f"[RFID Simulator] Error accepting connection: {e}")
    
    
    def _handle_client(self, client_socket):
        """Maneja comandos del cliente (Gateway)"""
        while self.running:
            try:
                # Recibir comando del Gateway
                data = client_socket.recv(1024)
                if not data:
                    break
                
                command = data.decode('utf-8').strip()
                print(f"[RFID Simulator] Received command: {command}")
                
                # Procesar comando
                response = self._process_command(command)
                
                # Enviar respuesta
                client_socket.send(response.encode('utf-8'))
                
            except Exception as e:
                print(f"[RFID Simulator] Error handling client: {e}")
                break
        
        client_socket.close()
    
    
    def _process_command(self, command: str) -> str:
        """Procesa comandos del protocolo THY"""
        
        if command.startswith('READ'):
            # Simular lectura de tags
            return self._simulate_tag_read()
        
        elif command.startswith('SET_RELAY'):
            # Simular activación de relé
            return 'OK:RELAY_ACTIVATED'
        
        elif command.startswith('GET_CONFIG'):
            # Devolver configuración simulada
            return json.dumps({
                'Transport': 'RJ45',
                'WorkMode': 'ActiveMod',
                'Power': 30,
                'Frequency': 920.5
            })
        
        else:
            return 'ERROR:UNKNOWN_COMMAND'
    
    
    def _simulate_tag_read(self) -> str:
        """Simula lectura de tag RFID"""
        
        # Seleccionar tag aleatorio o de eventos programados
        if self.scheduled_events:
            event = self.scheduled_events.pop(0)
            tag_epc = event['epc']
            rssi = event.get('rssi', -45)
        else:
            # Tag aleatorio
            tag_name = random.choice(list(self.predefined_tags.keys()))
            tag_epc = self.predefined_tags[tag_name]
            rssi = random.randint(-70, -30)
        
        # Formato de respuesta simulada (formato THY)
        response = {
            'epc': tag_epc,
            'rssi': rssi,
            'antenna': random.randint(1, 4),
            'timestamp': datetime.now().isoformat(),
            'read_count': 1
        }
        
        self.tags_sent += 1
        
        return json.dumps(response)
    
    
    def emit_tag(self, epc: str, rssi: int = -45, delay: float = 0.0):
        """
        Programa emisión de un tag específico
        
        Args:
            epc: Código EPC del tag
            rssi: Potencia de señal
            delay: Delay en segundos antes de emitir
        """
        event = {
            'epc': epc,
            'rssi': rssi,
            'scheduled_at': time.time() + delay
        }
        self.scheduled_events.append(event)
        
        if delay == 0:
            # Emitir inmediatamente
            self._broadcast_tag_event(event)
    
    
    def emit_tag_burst(self, epc: str, count: int = 10, interval: float = 0.1):
        """
        Simula ráfaga de lecturas (tag detectado repetidamente)
        Útil para probar debouncing
        
        Args:
            epc: Tag a emitir
            count: Número de lecturas
            interval: Intervalo entre lecturas (segundos)
        """
        for i in range(count):
            self.emit_tag(epc, delay=i * interval)
    
    
    def emit_tag_sequence(self, tags: List[str], interval: float = 1.0):
        """
        Emite secuencia de tags con intervalo
        
        Args:
            tags: Lista de EPCs a emitir
            interval: Intervalo entre tags
        """
        for i, tag_epc in enumerate(tags):
            self.emit_tag(tag_epc, delay=i * interval)
    
    
    def _broadcast_tag_event(self, event: Dict):
        """Envía evento a todos los clientes conectados"""
        message = json.dumps(event).encode('utf-8')
        
        for client in self.clients[:]:  # Copy to avoid modification during iteration
            try:
                client.send(message)
            except Exception as e:
                print(f"[RFID Simulator] Error broadcasting to client: {e}")
                self.clients.remove(client)
    
    
    def get_stats(self) -> Dict:
        """Devuelve estadísticas del simulador"""
        return {
            'tags_sent': self.tags_sent,
            'events_processed': self.events_processed,
            'connected_clients': len(self.clients),
            'scheduled_events': len(self.scheduled_events)
        }


# ========================================
# FIXTURES PREDEFINIDAS
# ========================================

class RFIDFixtures:
    """Colección de fixtures de tags para testing"""
    
    # Escenarios comunes
    AUTHORIZED_ACCESS = 'E28069150000402009073E7F'
    UNAUTHORIZED_ACCESS = '000000000000000000000000'
    BLACKLISTED_TAG = 'DEADBEEFDEADBEEFDEADBEEF'
    DUPLICATE_READ = 'E28069150000502009073A7F'
    
    # Casos edge
    CORRUPTED_TAG = 'E2806915000'  # Tag incompleto
    EMPTY_TAG = ''
    NULL_TAG = None
    MALFORMED_TAG = 'ZZZZZZZZZZZZ'  # No hexadecimal
    
    # Escenarios de carga
    @staticmethod
    def generate_burst(base_tag: str, count: int = 100) -> List[str]:
        """Genera ráfaga de mismo tag"""
        return [base_tag] * count
    
    @staticmethod
    def generate_sequence(count: int = 100) -> List[str]:
        """Genera secuencia de tags únicos"""
        return [f"E280691500004020{i:08X}" for i in range(count)]
    
    @staticmethod
    def generate_mixed_sequence(authorized: int = 70, unauthorized: int = 30) -> List[str]:
        """Genera secuencia mixta de autorizados/no autorizados"""
        tags = []
        tags.extend([RFIDFixtures.AUTHORIZED_ACCESS] * authorized)
        tags.extend([RFIDFixtures.UNAUTHORIZED_ACCESS] * unauthorized)
        random.shuffle(tags)
        return tags


# ========================================
# HELPER - Gateway Mock Client
# ========================================

class GatewayMockClient:
    """Cliente simulado del Gateway para testing"""
    
    def __init__(self, simulator: RFIDSimulator):
        self.simulator = simulator
        self.received_events = []
    
    
    def connect(self):
        """Conecta al simulador"""
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((self.simulator.host, self.simulator.port))
    
    
    def send_command(self, command: str) -> str:
        """Envía comando y recibe respuesta"""
        self.socket.send(command.encode('utf-8'))
        response = self.socket.recv(1024).decode('utf-8')
        return response
    
    
    def read_tag(self) -> Dict:
        """Lee un tag del simulador"""
        response = self.send_command('READ')
        return json.loads(response)
    
    
    def activate_relay(self, channel: int = 1) -> bool:
        """Activa relé"""
        response = self.send_command(f'SET_RELAY:{channel}')
        return 'OK' in response
    
    
    def disconnect(self):
        """Desconecta del simulador"""
        self.socket.close()


if __name__ == '__main__':
    # Test básico del simulador
    print("Starting RFID Simulator...")
    
    sim = RFIDSimulator(port=8888)
    sim.start()
    
    print("Simulator running. Press Ctrl+C to stop.")
    
    try:
        # Emitir algunos tags de prueba
        sim.emit_tag(RFIDFixtures.AUTHORIZED_ACCESS)
        time.sleep(2)
        sim.emit_tag_burst(RFIDFixtures.DUPLICATE_READ, count=5, interval=0.5)
        
        while True:
            time.sleep(1)
            stats = sim.get_stats()
            print(f"Stats: {stats}")
    
    except KeyboardInterrupt:
        print("\nStopping simulator...")
        sim.stop()
