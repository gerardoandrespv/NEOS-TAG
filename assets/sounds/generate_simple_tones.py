#!/usr/bin/env python3
"""
Generador Simple de Tonos de Emergencia
Usa solo numpy y wave (built-in de Python) - sin dependencias externas problemáticas

IMPORTANTE: Genera sonidos PERSONALIZADOS, NO oficiales de SHOA
"""

import wave
import numpy as np
import os
import struct

def create_wav_file(filename, samples, sample_rate=44100):
    """Crea archivo WAV desde array numpy"""
    # Normalizar a 16-bit PCM
    samples = np.clip(samples, -1.0, 1.0)
    samples = (samples * 32767).astype(np.int16)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(samples.tobytes())

def create_fire_alarm():
    """🔥 Alarma de Incendio - Beeps rápidos"""
    print("🔥 Generando alarma de incendio...")
    
    sample_rate = 44100
    freq = 900  # Hz
    
    # Beep de 200ms
    beep_duration = 0.2
    silence_duration = 0.1
    
    t_beep = np.linspace(0, beep_duration, int(sample_rate * beep_duration))
    beep = np.sin(2 * np.pi * freq * t_beep) * 0.8
    
    silence = np.zeros(int(sample_rate * silence_duration))
    
    # Patrón: beep + silencio, repetido 33 veces = ~10 segundos
    pattern = np.concatenate([beep, silence])
    alarm = np.tile(pattern, 33)
    
    create_wav_file("emergency_alarm_fire.wav", alarm)
    print("   ✅ emergency_alarm_fire.wav creado")
    return True

def create_evacuation_alarm():
    """🚨 Alarma de Evacuación - Sirena oscilante"""
    print("🚨 Generando alarma de evacuación...")
    
    sample_rate = 44100
    duration = 15  # segundos
    
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Frecuencia oscilante 400-1000 Hz, 0.5 Hz de oscilación
    freq = 700 + 300 * np.sin(2 * np.pi * 0.5 * t)
    
    # Generar onda con frecuencia variable
    phase = 2 * np.pi * np.cumsum(freq) / sample_rate
    alarm = np.sin(phase) * 0.8
    
    create_wav_file("emergency_alarm_evacuation.wav", alarm)
    print("   ✅ emergency_alarm_evacuation.wav creado")
    return True

def create_flood_alarm():
    """💧 Alarma de Inundación - Ondas ascendentes"""
    print("💧 Generando alarma de inundación...")
    
    sample_rate = 44100
    duration = 8
    
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Frecuencia ondulante 400-600 Hz
    freq = 500 + 100 * np.sin(2 * np.pi * 0.33 * t)
    
    phase = 2 * np.pi * np.cumsum(freq) / sample_rate
    alarm = np.sin(phase)
    
    # Envelope fade-in
    envelope = 1 - np.exp(-t / 2)
    alarm = alarm * envelope * 0.7
    
    create_wav_file("emergency_alarm_flood.wav", alarm)
    print("   ✅ emergency_alarm_flood.wav creado")
    return True

def create_general_alarm():
    """⚡ Alarma General - Triple beep"""
    print("⚡ Generando alarma general...")
    
    sample_rate = 44100
    freq = 750
    
    # Beep corto 150ms
    beep_duration = 0.15
    short_pause = 0.1
    long_pause = 1.5
    
    t_beep = np.linspace(0, beep_duration, int(sample_rate * beep_duration))
    beep = np.sin(2 * np.pi * freq * t_beep) * 0.6
    
    short_silence = np.zeros(int(sample_rate * short_pause))
    long_silence = np.zeros(int(sample_rate * long_pause))
    
    # Patrón: 3 beeps + pausa larga
    pattern = np.concatenate([
        beep, short_silence,
        beep, short_silence,
        beep, long_silence
    ])
    
    # Repetir 3 veces = ~6 segundos
    alarm = np.tile(pattern, 3)
    
    create_wav_file("emergency_alarm_general.wav", alarm)
    print("   ✅ emergency_alarm_general.wav creado")
    return True

def create_cancel_alarm():
    """✅ Alarma Cancelada - Tonos descendentes"""
    print("✅ Generando alarma de cancelación...")
    
    sample_rate = 44100
    
    # 5 tonos descendentes
    freqs = [800, 700, 600, 500, 400]
    tone_duration = 0.2
    pause_duration = 0.05
    
    tones = []
    for freq in freqs:
        t = np.linspace(0, tone_duration, int(sample_rate * tone_duration))
        tone = np.sin(2 * np.pi * freq * t)
        
        # Fade out
        fade = np.linspace(1, 0.3, len(t))
        tone = tone * fade * 0.6
        
        tones.append(tone)
        
        # Añadir pausa entre tonos
        if freq != freqs[-1]:
            tones.append(np.zeros(int(sample_rate * pause_duration)))
    
    alarm = np.concatenate(tones)
    
    create_wav_file("emergency_alarm_cancel.wav", alarm)
    print("   ✅ emergency_alarm_cancel.wav creado")
    return True

def verify_files():
    """Verificar que todos los archivos fueron creados"""
    print("\n📊 Verificación de archivos:")
    print("-" * 60)
    
    required_files = [
        "emergency_alarm_fire.wav",
        "emergency_alarm_evacuation.wav",
        "emergency_alarm_flood.wav",
        "emergency_alarm_general.wav",
        "emergency_alarm_cancel.wav"
    ]
    
    all_ok = True
    for filename in required_files:
        if os.path.exists(filename):
            size_kb = os.path.getsize(filename) / 1024
            print(f"  ✅ {filename:<35} ({size_kb:.1f} KB)")
        else:
            print(f"  ❌ {filename:<35} (FALTA)")
            all_ok = False
    
    print("-" * 60)
    return all_ok

def main():
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║    🎵 GENERADOR DE SONIDOS DE EMERGENCIA                  ║")
    print("║       NeosTech Building Alert System                      ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    print("\n⚠️  ADVERTENCIA LEGAL:")
    print("    Estos sonidos son PERSONALIZADOS para uso del edificio")
    print("    ❌ NO son sonidos oficiales de SHOA")
    print("    ❌ NO son sonidos de organismos gubernamentales")
    print("    ✅ Solo para alertas internas del edificio\n")
    
    try:
        # Generar todos los sonidos
        create_fire_alarm()
        create_evacuation_alarm()
        create_flood_alarm()
        create_general_alarm()
        create_cancel_alarm()
        
        # Verificar
        if verify_files():
            print("\n✅ ÉXITO - Todos los archivos generados correctamente")
            print("\n📝 PRÓXIMOS PASOS:")
            print("   1. Probar archivos localmente: Start-Process emergency_alarm_fire.wav")
            print("   2. Convertir WAV a MP3 (opcional): ffmpeg -i *.wav -b:a 128k output.mp3")
            print("   3. Subir a Firebase: .\\scripts\\utilities\\upload_alert_sounds.ps1")
            return 0
        else:
            print("\n❌ ERROR - Algunos archivos no se generaron")
            return 1
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
