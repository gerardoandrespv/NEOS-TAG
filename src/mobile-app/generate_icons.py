#!/usr/bin/env python3
"""
Generador de Iconos PWA
Crea los íconos necesarios para la app móvil
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """Crea un ícono con el logo de NeosTech"""
    
    # Crear imagen con fondo naranja
    img = Image.new('RGB', (size, size), color='#FF6B00')
    draw = ImageDraw.Draw(img)
    
    # Dibujar círculo blanco en el centro
    margin = size // 5
    circle_bbox = [margin, margin, size - margin, size - margin]
    draw.ellipse(circle_bbox, fill='white')
    
    # Dibujar símbolo de alerta (triángulo con !)
    # Triángulo
    center_x = size // 2
    center_y = size // 2
    triangle_size = size // 3
    
    triangle = [
        (center_x, center_y - triangle_size // 2),  # Top
        (center_x - triangle_size // 2, center_y + triangle_size // 2),  # Bottom left
        (center_x + triangle_size // 2, center_y + triangle_size // 2)   # Bottom right
    ]
    
    draw.polygon(triangle, fill='#FF6B00')
    
    # Exclamación (!)
    excl_width = size // 20
    excl_height = size // 8
    excl_x = center_x - excl_width // 2
    excl_y = center_y - triangle_size // 4
    
    # Barra vertical del !
    draw.rectangle(
        [excl_x, excl_y, excl_x + excl_width, excl_y + excl_height],
        fill='white'
    )
    
    # Punto del !
    dot_size = excl_width * 2
    dot_y = excl_y + excl_height + excl_width
    draw.ellipse(
        [excl_x - excl_width // 2, dot_y, 
         excl_x + excl_width + excl_width // 2, dot_y + dot_size],
        fill='white'
    )
    
    # Guardar
    img.save(filename, 'PNG')
    print(f'✅ {filename} creado ({size}x{size})')

def main():
    print('\n🎨 Generando íconos PWA...\n')
    
    # Crear directorio si no existe
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Generar íconos de diferentes tamaños
    create_icon(192, os.path.join(script_dir, 'icon-192.png'))
    create_icon(512, os.path.join(script_dir, 'icon-512.png'))
    
    print('\n✅ Íconos generados correctamente\n')

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print('❌ Error: PIL (Pillow) no está instalado')
        print('   Instala con: pip install Pillow')
        exit(1)
    except Exception as e:
        print(f'❌ Error: {e}')
        exit(1)
