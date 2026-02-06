#!/usr/bin/env python3
"""
Generador de Sonidos de Emergencia
Crea los 5 archivos MP3 necesarios para el sistema de alertas NeosTech

IMPORTANTE: Este script genera sonidos PERSONALIZADOS para uso exclusivo
del edificio. NO usa sonidos oficiales de SHOA u organismos gubernamentales.

Requisitos:
    pip install pydub numpy

Si falta ffmpeg:
    Windows: choco install ffmpeg
    Mac: brew install ffmpeg
    Linux: apt-get install ffmpeg

Uso:
    cd assets/sounds
    python generate_sounds.py
"""

import os
import sys

try:
    from pydub import AudioSegment
    from pydub.generators import Sine, Square
    import numpy as np
except ImportError as e:
    print("❌ Error: Dependencias faltantes")
    print("")
    print("Instala las dependencias requeridas:")
    print("  pip install pydub numpy")
    print("")
    sys.exit(1)

def print_header():
    """Imprime header del script"""
    print("")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║    🎵 GENERADOR DE SONIDOS DE EMERGENCIA                  ║")
    print("║       NeosTech Building Alert System                      ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print("")

def print_legal_warning():
    """Advertencia legal"""
    print("⚠️  ADVERTENCIA LEGAL:")
    print("   ✅ Estos sonidos son PERSONALIZADOS para edificio")
    print("   ❌ NO son sonidos oficiales de SHOA")
    print("   ❌ NO son sonidos de emergencia gubernamental")
    print("   ✅ Cumple con normativas de diferenciación")
    print("")

def create_fire_alarm():
    """
    Alarma de incendio: Beeps rápidos urgentes
    Patrón: 3 beeps por segundo, continuo
    """
    print("🔥 Generando alarma de incendio...", end=" ")
    
    try:
        # Beep agudo de 200ms a 900Hz
        beep = Square(900).to_audio_segment(duration=200)
        silence = AudioSegment.silent(duration=100)
        
        # Patrón: beep-pausa repetido
        pattern = beep + silence
        alarm = pattern * 33  # ~10 segundos
        
        # Normalizar volumen a -3dB
        alarm = alarm.normalize()
        
        # Exportar
        alarm.export("emergency_alarm_fire.mp3", format="mp3", bitrate="128k")
        print("✅")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_evacuation_alarm():
    """
    Alarma de evacuación: Sirena oscilante
    Patrón: Frecuencia oscila entre 400-1000Hz cada 2 segundos
    """
    print("🚨 Generando alarma de evacuación...", end=" ")
    
    try:
        duration_ms = 15000  # 15 segundos
        sample_rate = 44100
        
        # Calcular samples
        samples = int(sample_rate * duration_ms / 1000)
        t = np.linspace(0, duration_ms / 1000, samples)
        
        # Frecuencia oscilante (ciclo de 2 segundos)
        freq = 700 + 300 * np.sin(2 * np.pi * 0.5 * t)
        wave = np.sin(2 * np.pi * freq * t)
        
        # Convertir a int16 con volumen 80%
        wave_int = np.int16(wave * 32767 * 0.8)
        
        # Crear AudioSegment
        audio = AudioSegment(
            wave_int.tobytes(),
            frame_rate=sample_rate,
            sample_width=2,
            channels=1
        )
        
        # Normalizar y exportar
        audio = audio.normalize()
        audio.export("emergency_alarm_evacuation.mp3", format="mp3", bitrate="128k")
        print("✅")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_flood_alarm():
    """
    Alarma de inundación: Patrón ondulante
    Patrón: Onda suave ascendente progresiva
    """
    print("💧 Generando alarma de inundación...", end=" ")
    
    try:
        duration_ms = 8000  # 8 segundos
        sample_rate = 44100
        
        samples = int(sample_rate * duration_ms / 1000)
        t = np.linspace(0, duration_ms / 1000, samples)
        
        # Onda que asciende progresivamente
        freq = 400 + 200 * np.sin(2 * np.pi * 0.33 * t)
        wave = np.sin(2 * np.pi * freq * t)
        
        # Aplicar envelope suave
        envelope = 1 - np.exp(-t / 2)  # Fade in gradual
        wave = wave * envelope
        
        wave_int = np.int16(wave * 32767 * 0.7)
        
        audio = AudioSegment(
            wave_int.tobytes(),
            frame_rate=sample_rate,
            sample_width=2,
            channels=1
        )
        
        audio = audio.normalize()
        audio.export("emergency_alarm_flood.mp3", format="mp3", bitrate="128k")
        print("✅")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_general_alarm():
    """
    Alarma general: Triple beep
    Patrón: 3 beeps cortos + pausa larga, repetir
    """
    print("⚡ Generando alarma general...", end=" ")
    
    try:
        # Beep de 150ms a 750Hz
        beep = Square(750).to_audio_segment(duration=150)
        short_pause = AudioSegment.silent(duration=100)
        long_pause = AudioSegment.silent(duration=1500)
        
        # Patrón: beep-pausa-beep-pausa-beep-pausa_larga
        pattern = beep + short_pause + beep + short_pause + beep + long_pause
        
        # Repetir 3 veces (~6 segundos total)
        alarm = pattern * 3
        
        alarm = alarm.normalize()
        alarm.export("emergency_alarm_general.mp3", format="mp3", bitrate="128k")
        print("✅")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_cancel_alarm():
    """
    Alerta cancelada: Melodía descendente
    Patrón: 5 tonos descendentes (800→400Hz)
    """
    print("✅ Generando alarma de cancelación...", end=" ")
    
    try:
        # 5 frecuencias descendentes
        freqs = [800, 700, 600, 500, 400]
        tones = []
        
        for freq in freqs:
            tone = Sine(freq).to_audio_segment(duration=200)
            tones.append(tone)
        
        # Unir con pausas cortas
        alarm = AudioSegment.silent(duration=50)
        for tone in tones:
            alarm += tone + AudioSegment.silent(duration=50)
        
        # Fade out suave al final
        alarm = alarm.fade_out(200)
        
        alarm = alarm.normalize()
        alarm.export("emergency_alarm_cancel.mp3", format="mp3", bitrate="128k")
        print("✅")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def get_file_info(filename):
    """Obtiene información del archivo generado"""
    if os.path.exists(filename):
        size_bytes = os.path.getsize(filename)
        size_kb = round(size_bytes / 1024, 2)
        return f"{size_kb} KB"
    return "N/A"

def verify_files():
    """Verifica que todos los archivos fueron creados"""
    print("")
    print("📊 Verificando archivos generados:")
    print("")
    
    files = [
        "emergency_alarm_fire.mp3",
        "emergency_alarm_evacuation.mp3",
        "emergency_alarm_flood.mp3",
        "emergency_alarm_general.mp3",
        "emergency_alarm_cancel.mp3"
    ]
    
    all_ok = True
    
    for f in files:
        if os.path.exists(f):
            size = get_file_info(f)
            print(f"  ✅ {f:<35} ({size})")
        else:
            print(f"  ❌ {f:<35} (FALTA)")
            all_ok = False
    
    print("")
    return all_ok

def print_next_steps():
    """Muestra los próximos pasos"""
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║    🚀 PRÓXIMOS PASOS                                      ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print("")
    print("1️⃣  Probar archivos localmente:")
    print("   - Reproducir cada archivo y verificar que suenen bien")
    print("   - Ajustar volumen si es necesario")
    print("")
    print("2️⃣  Subir a Firebase Storage:")
    print("   PowerShell:")
    print("   cd ../..")
    print("   .\\scripts\\utilities\\upload_alert_sounds.ps1")
    print("")
    print("   O manualmente en Firebase Console:")
    print("   https://console.firebase.google.com/project/neos-tech/storage")
    print("")
    print("3️⃣  Verificar configuración:")
    print("   config/alert_sounds.json debe tener las URLs actualizadas")
    print("")
    print("4️⃣  Integrar en app móvil:")
    print("   - Android: Copiar MP3 a res/raw/")
    print("   - iOS: Convertir a CAF y copiar a proyecto")
    print("")

def main():
    """Función principal"""
    print_header()
    print_legal_warning()
    
    print("🎬 Iniciando generación de archivos...")
    print("")
    
    # Generar cada alarma
    results = []
    results.append(create_fire_alarm())
    results.append(create_evacuation_alarm())
    results.append(create_flood_alarm())
    results.append(create_general_alarm())
    results.append(create_cancel_alarm())
    
    # Verificar archivos
    all_ok = verify_files()
    
    if all_ok:
        print("╔════════════════════════════════════════════════════════════╗")
        print("║                                                            ║")
        print("║    ✅ GENERACIÓN COMPLETADA EXITOSAMENTE                  ║")
        print("║                                                            ║")
        print("╚════════════════════════════════════════════════════════════╝")
        print("")
        print_next_steps()
        return 0
    else:
        print("❌ ALGUNOS ARCHIVOS NO SE GENERARON CORRECTAMENTE")
        print("")
        print("Verifica:")
        print("  - Dependencias instaladas: pip install pydub numpy")
        print("  - ffmpeg instalado y en PATH")
        print("  - Permisos de escritura en esta carpeta")
        print("")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("")
        print("⚠️  Generación cancelada por el usuario")
        sys.exit(1)
    except Exception as e:
        print("")
        print(f"❌ ERROR INESPERADO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
