#!/usr/bin/env python3
"""
Servidor Web Simple para PWA
Sirve la app móvil en localhost para pruebas
"""

import http.server
import socketserver
import os

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Headers necesarios para PWA
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    
    def do_GET(self):
        # Servir index.html por defecto
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

def main():
    # Cambiar al directorio de la app
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    print('\n┌─────────────────────────────────────────────┐')
    print('│                                             │')
    print('│  🚀 SERVIDOR PWA INICIADO                   │')
    print('│                                             │')
    print('└─────────────────────────────────────────────┘\n')
    
    print(f'📱 Accede desde tu celular:\n')
    print(f'   1. Conecta tu celular a la MISMA WiFi que esta PC')
    print(f'   2. En tu celular, abre Chrome o Safari')
    print(f'   3. Navega a:')
    print(f'\n      http://localhost:{PORT}')
    print(f'      o')
    
    # Intentar obtener IP local
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        print(f'      http://{local_ip}:{PORT}')
        print(f'\n   📲 USAR ESTA URL EN TU CELULAR 👆\n')
    except:
        print(f'      http://[IP-DE-TU-PC]:{PORT}\n')
    
    print(f'   4. En el celular:')
    print(f'      - Android Chrome: Menú → "Agregar a pantalla de inicio"')
    print(f'      - iOS Safari: Compartir → "Agregar a pantalla de inicio"')
    print(f'\n   5. Activa notificaciones cuando te lo pida\n')
    
    print(f'⏹️  Para detener: Ctrl+C\n')
    print(f'─────────────────────────────────────────────\n')
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Servidor corriendo en puerto {PORT}...\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\n✅ Servidor detenido\n')

if __name__ == '__main__':
    main()
