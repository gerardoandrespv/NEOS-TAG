#!/usr/bin/env python3
"""Servidor HTTPS simple para PWA en red local"""
import http.server
import ssl
import os

# Directorio de trabajo
os.chdir(os.path.dirname(__file__))

# Configurar servidor
server_address = ('0.0.0.0', 8443)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

# Configurar SSL
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('server.pem')

httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("🔒 Servidor HTTPS corriendo en:")
print(f"   https://localhost:8443")
print(f"   https://192.168.31.95:8443")
print("\n⚠️  IMPORTANTE: En tu celular, acepta el certificado autofirmado")
print("   (Navegador dirá 'No seguro' - dale en 'Avanzado' → 'Continuar')\n")

httpd.serve_forever()
