# 🔊 ASSETS DE SONIDOS DE EMERGENCIA

Esta carpeta contiene los archivos de audio MP3 para el sistema de alertas de emergencia.

## 📁 Archivos Requeridos

Los siguientes archivos deben estar presentes antes de ejecutar el script de subida:

```
assets/sounds/
├── emergency_alarm_fire.mp3          (Alarma de incendio - beeps rápidos)
├── emergency_alarm_evacuation.mp3    (Alarma de evacuación - sirena)
├── emergency_alarm_flood.mp3         (Alarma de inundación - ondas)
├── emergency_alarm_general.mp3       (Alarma general - triple beep)
└── emergency_alarm_cancel.mp3        (Alerta cancelada - melodía descendente)
```

## ⚠️ IMPORTANTE - CUMPLIMIENTO LEGAL

**NUNCA colocar aquí:**
- ❌ Sonidos oficiales de SHOA (tsunami, emergencia gubernamental)
- ❌ Sonidos de ONEMI (alertas sísmicas oficiales)
- ❌ Sirenas de bomberos, policía o ambulancia

**Solo usar:**
- ✅ Sonidos personalizados creados por ti
- ✅ Sonidos de bibliotecas libres (Freesound.org, Zapsplat.com)
- ✅ Sonidos generados con software (Audacity, ToneGenerator)

## 🎵 GENERACIÓN RÁPIDA CON PYTHON

Si tienes Python instalado, usa este script para generar todos los sonidos automáticamente:

### Instalación de dependencias:
```bash
pip install pydub numpy
```

### Script de generación (crear como `generate_sounds.py`):

```python
#!/usr/bin/env python3
"""
Generador de Sonidos de Emergencia
Crea los 5 archivos MP3 necesarios para el sistema de alertas
"""

from pydub import AudioSegment
from pydub.generators import Sine, Square
import numpy as np

def create_fire_alarm():
    """Alarma de incendio: Beeps rápidos urgentes"""
    print("🔥 Generando alarma de incendio...")
    
    # Beep agudo de 200ms
    beep = Square(900).to_audio_segment(duration=200)
    silence = AudioSegment.silent(duration=100)
    
    # Patrón: beep-pausa-beep-pausa (3 por segundo)
    pattern = beep + silence
    alarm = pattern * 33  # ~10 segundos
    
    # Normalizar volumen
    alarm = alarm.normalize()
    
    # Exportar
    alarm.export("emergency_alarm_fire.mp3", format="mp3", bitrate="128k")
    print("  ✅ emergency_alarm_fire.mp3 creado")

def create_evacuation_alarm():
    """Alarma de evacuación: Sirena oscilante"""
    print("🚨 Generando alarma de evacuación...")
    
    # Generar sirena que oscila entre 400Hz y 1000Hz
    duration_ms = 15000  # 15 segundos
    sample_rate = 44100
    
    # Crear onda oscilante
    samples = int(sample_rate * duration_ms / 1000)
    t = np.linspace(0, duration_ms / 1000, samples)
    
    # Frecuencia oscilante (sube y baja cada 2 segundos)
    freq = 700 + 300 * np.sin(2 * np.pi * 0.5 * t)
    wave = np.sin(2 * np.pi * freq * t)
    
    # Convertir a int16
    wave_int = np.int16(wave * 32767 * 0.8)
    
    # Crear audio
    audio = AudioSegment(
        wave_int.tobytes(),
        frame_rate=sample_rate,
        sample_width=2,
        channels=1
    )
    
    # Normalizar y exportar
    audio = audio.normalize()
    audio.export("emergency_alarm_evacuation.mp3", format="mp3", bitrate="128k")
    print("  ✅ emergency_alarm_evacuation.mp3 creado")

def create_flood_alarm():
    """Alarma de inundación: Patrón ondulante"""
    print("💧 Generando alarma de inundación...")
    
    # Ondas suaves ascendentes
    duration_ms = 8000  # 8 segundos
    sample_rate = 44100
    
    samples = int(sample_rate * duration_ms / 1000)
    t = np.linspace(0, duration_ms / 1000, samples)
    
    # Onda que asciende progresivamente
    freq = 400 + 200 * np.sin(2 * np.pi * 0.33 * t)
    wave = np.sin(2 * np.pi * freq * t)
    
    # Aplicar envelope suave
    envelope = np.exp(-t / 3)  # Decay suave
    wave = wave * (1 - envelope)
    
    wave_int = np.int16(wave * 32767 * 0.7)
    
    audio = AudioSegment(
        wave_int.tobytes(),
        frame_rate=sample_rate,
        sample_width=2,
        channels=1
    )
    
    audio = audio.normalize()
    audio.export("emergency_alarm_flood.mp3", format="mp3", bitrate="128k")
    print("  ✅ emergency_alarm_flood.mp3 creado")

def create_general_alarm():
    """Alarma general: Triple beep"""
    print("⚡ Generando alarma general...")
    
    # Triple beep corto
    beep = Square(750).to_audio_segment(duration=150)
    short_pause = AudioSegment.silent(duration=100)
    long_pause = AudioSegment.silent(duration=1500)
    
    # Patrón: 3 beeps + pausa larga
    pattern = beep + short_pause + beep + short_pause + beep + long_pause
    alarm = pattern * 3  # Repetir 3 veces (~6 segundos)
    
    alarm = alarm.normalize()
    alarm.export("emergency_alarm_general.mp3", format="mp3", bitrate="128k")
    print("  ✅ emergency_alarm_general.mp3 creado")

def create_cancel_alarm():
    """Alerta cancelada: Melodía descendente"""
    print("✅ Generando alarma de cancelación...")
    
    # 5 tonos descendentes
    freqs = [800, 700, 600, 500, 400]
    tones = []
    
    for freq in freqs:
        tone = Sine(freq).to_audio_segment(duration=200)
        tones.append(tone)
    
    # Unir con pausas cortas
    alarm = AudioSegment.silent(duration=50)
    for tone in tones:
        alarm += tone + AudioSegment.silent(duration=50)
    
    alarm = alarm.normalize()
    alarm.export("emergency_alarm_cancel.mp3", format="mp3", bitrate="128k")
    print("  ✅ emergency_alarm_cancel.mp3 creado")

def main():
    print("")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║    🎵 GENERADOR DE SONIDOS DE EMERGENCIA                  ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print("")
    
    try:
        create_fire_alarm()
        create_evacuation_alarm()
        create_flood_alarm()
        create_general_alarm()
        create_cancel_alarm()
        
        print("")
        print("✅ Todos los archivos generados exitosamente")
        print("")
        print("📁 Archivos creados:")
        print("   - emergency_alarm_fire.mp3")
        print("   - emergency_alarm_evacuation.mp3")
        print("   - emergency_alarm_flood.mp3")
        print("   - emergency_alarm_general.mp3")
        print("   - emergency_alarm_cancel.mp3")
        print("")
        print("🚀 Próximo paso:")
        print("   Ejecutar: .\\scripts\\utilities\\upload_alert_sounds.ps1")
        print("")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("")
        print("Verifica que estén instaladas las dependencias:")
        print("  pip install pydub numpy")
        print("")
        print("Si no tienes ffmpeg, instálalo:")
        print("  choco install ffmpeg  (Windows con Chocolatey)")
        print("  O descarga desde: https://ffmpeg.org/download.html")

if __name__ == "__main__":
    main()
```

### Ejecutar generador:
```bash
cd assets/sounds
python generate_sounds.py
```

## 🎛️ ALTERNATIVA: AUDACITY (GUI)

Si prefieres una herramienta visual:

### 1. Descargar Audacity
- https://www.audacityteam.org/download/

### 2. Generar Alarma de Incendio (Ejemplo)

1. Abrir Audacity
2. Generate → Tone...
   - Waveform: Square
   - Frequency: 900 Hz
   - Amplitude: 0.8
   - Duration: 0.2 seconds
3. Click OK
4. Editar → Copiar
5. Editar → Pegar hasta completar 10 segundos
6. Efecto → Normalizar (marcar -3dB)
7. File → Export → Export as MP3
   - Bitrate: 128 kbps
   - Channels: Mono
   - Save as: `emergency_alarm_fire.mp3`

Repetir proceso similar para cada tipo de alarma según las especificaciones.

## 🌐 DESCARGA DE BIBLIOTECAS LIBRES

### Freesound.org (Recomendado)

1. Ir a: https://freesound.org/
2. Buscar: "emergency alarm beep"
3. Filtrar por:
   - License: CC0 (Public Domain) o CC-BY
   - Duration: 3-15 seconds
   - Format: MP3
4. Descargar y renombrar según:
   - `emergency_alarm_fire.mp3`
   - `emergency_alarm_evacuation.mp3`
   - etc.

**Ejemplos de búsquedas:**
- "fast beep alarm" → Para incendio
- "evacuation siren" → Para evacuación
- "warning tone" → Para general
- "notification descending" → Para cancelación

### Zapsplat.com

1. Ir a: https://www.zapsplat.com/
2. Category: Alarms & Sirens
3. Free Download
4. Editar con Audacity si necesario (acortar, normalizar)

## ✅ CHECKLIST

Antes de ejecutar `upload_alert_sounds.ps1`:

- [ ] Los 5 archivos MP3 están en `assets/sounds/`
- [ ] Cada archivo pesa menos de 200 KB
- [ ] Son sonidos personalizados (NO oficiales SHOA)
- [ ] Formato correcto (MP3, 128kbps, mono, 44100Hz)
- [ ] Probados localmente (suenan correctamente)
- [ ] Duración correcta (3-15 segundos)

## 🔗 PRÓXIMOS PASOS

1. ✅ Generar o descargar archivos MP3
2. ✅ Colocarlos en esta carpeta
3. ✅ Ejecutar script de subida:
   ```powershell
   .\scripts\utilities\upload_alert_sounds.ps1
   ```
4. ✅ Verificar en Firebase Console que se subieron
5. ✅ Probar reproducción desde URLs

## 📖 DOCUMENTACIÓN COMPLETA

Ver: [docs/SONIDOS-EMERGENCIA.md](../../docs/SONIDOS-EMERGENCIA.md)

---

**Nota:** Esta carpeta está en `.gitignore` para NO subir archivos de audio al repositorio (pesan mucho). Los archivos se suben directamente a Firebase Storage.
