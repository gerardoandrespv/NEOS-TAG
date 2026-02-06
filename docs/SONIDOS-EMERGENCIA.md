# 🔊 SISTEMA DE SONIDOS DE EMERGENCIA

**Versión:** 1.0.0  
**Fecha:** 2 de Febrero 2026  
**Sistema:** NeosTech Building Alert System  

---

## ⚠️ ADVERTENCIA LEGAL CRÍTICA

### ❌ PROHIBIDO ABSOLUTO

**NUNCA usar los siguientes sonidos bajo ninguna circunstancia:**

1. **Sonidos oficiales de SHOA** (Servicio Hidrográfico y Oceanográfico de la Armada)
   - Tono de 20 segundos de alerta de tsunami
   - Cualquier sonido usado en el sistema SAE (Sistema de Alerta de Emergencias)
   - Archivo `shoa_alert.mp3` o similar

2. **Sonidos de ONEMI** (Oficina Nacional de Emergencia)
   - Alertas sísmicas oficiales
   - Tonos de emergencia gubernamental

3. **Sonidos de servicios de emergencia**
   - Sirenas de bomberos
   - Sirenas de ambulancia
   - Sirenas de policía

**Consecuencias de usar sonidos oficiales:**
- ⚖️ Delito de suplantación de autoridad gubernamental
- ⚖️ Multas y sanciones administrativas
- ⚖️ Responsabilidad civil por pánico causado
- ⚖️ Posible procesamiento penal

---

## ✅ SOLUCIÓN LEGAL: SONIDOS PERSONALIZADOS

Usamos **sonidos completamente personalizados** diseñados específicamente para este edificio.

### Características de Nuestros Sonidos

| Aspecto | Configuración |
|---------|---------------|
| **Identidad** | ALERTA EDIFICIO (NO oficial) |
| **Colores** | Naranja #FF6B00 (NO rojo SHOA) |
| **Fuente** | Bibliotecas libres de derechos |
| **Licencia** | Creative Commons / Dominio público |
| **Diferenciación** | Claramente distinguibles de alertas oficiales |

---

## 🎵 ESPECIFICACIÓN DE SONIDOS

### 1. 🔥 ALARMA DE INCENDIO (`emergency_alarm_fire.mp3`)

**Patrón:** Beeps rápidos y urgentes

```
Características técnicas:
- Frecuencia: 800-1200Hz
- Patrón: Beep-Beep-Beep continuo (3 beeps/segundo)
- Duración: 10 segundos
- Loop: Sí (hasta cancelar alerta)
- Volumen: 100% (máximo)
- Prioridad: CRÍTICA

Vibración (Android/iOS):
[500ms, 200ms, 500ms, 200ms, 500ms, 200ms, 500ms]
(vibrar-pausa-vibrar-pausa alternado)
```

**Descripción auditiva:**
```
♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪ ♪♪♪
(Beeps agudos repetitivos que no paran)
```

**Uso:**
- Incendio confirmado en cualquier área
- Humo detectado por sistema
- Activación manual de alarma contra incendios

---

### 2. 🚨 ALARMA DE EVACUACIÓN (`emergency_alarm_evacuation.mp3`)

**Patrón:** Sirena oscilante lenta

```
Características técnicas:
- Frecuencia: 400-1000Hz oscilante
- Patrón: Ascendente-descendente (1 ciclo cada 2 segundos)
- Duración: 15 segundos
- Loop: Sí
- Volumen: 100% (máximo)
- Prioridad: CRÍTICA

Vibración:
[1000ms, 500ms, 1000ms, 500ms]
(vibración larga-pausa alternado)
```

**Descripción auditiva:**
```
♫～～～～～～～～～～～～～～～～～～～～～～～～～～～♫
  ↗︎               ↘︎           ↗︎               ↘︎
(Sirena que sube y baja suavemente, repetitiva)
```

**Uso:**
- Evacuación total del edificio
- Emergencia estructural
- Amenaza de bomba
- Orden de autoridad competente

---

### 3. 💧 ALARMA DE INUNDACIÓN (`emergency_alarm_flood.mp3`)

**Patrón:** Onda ascendente suave

```
Características técnicas:
- Frecuencia: 300-800Hz ondulante
- Patrón: Onda suave ascendente (ciclo 3 segundos)
- Duración: 8 segundos
- Loop: Sí
- Volumen: 90%
- Prioridad: ALTA

Vibración:
[300ms, 100ms, 300ms, 100ms, 300ms, 100ms, 800ms]
(pulsos cortos + vibración larga)
```

**Descripción auditiva:**
```
～～～～～～～～～～～～～～～
    ↗︎       ↗︎       ↗︎
(Ondas suaves que suben progresivamente)
```

**Uso:**
- Fuga de agua detectada
- Inundación en sótano/parking
- Rotura de cañería principal
- Filtración importante

---

### 4. ⚡ ALARMA GENERAL (`emergency_alarm_general.mp3`)

**Patrón:** Triple beep

```
Características técnicas:
- Frecuencia: 600-900Hz
- Patrón: 3 beeps cortos + pausa 2 segundos
- Duración: 6 segundos
- Loop: Sí
- Volumen: 80%
- Prioridad: MEDIA

Vibración:
[200ms, 100ms, 200ms, 100ms, 200ms, 1500ms]
(3 vibraciones cortas + pausa larga)
```

**Descripción auditiva:**
```
♪ ♪ ♪  [pausa]  ♪ ♪ ♪  [pausa]  ♪ ♪ ♪
(Triple beep, espera, repite)
```

**Uso:**
- Corte de energía prolongado
- Falla de sistema de ascensores
- Mantenimiento urgente
- Anuncios generales importantes

---

### 5. ✅ ALARMA CANCELADA (`emergency_alarm_cancel.mp3`)

**Patrón:** Melodía descendente

```
Características técnicas:
- Frecuencia: 800Hz → 400Hz (descendente)
- Patrón: 5 tonos descendentes en 1 segundo
- Duración: 3 segundos
- Loop: NO (una sola vez)
- Volumen: 80%
- Prioridad: BAJA

Vibración:
[100ms, 50ms, 100ms, 50ms, 100ms]
(vibraciones cortas decrecientes)
```

**Descripción auditiva:**
```
♪↘︎ ♪↘︎ ♪↘︎ ♪↘︎ ♪↘︎
(5 notas que bajan de tono suavemente)
```

**Uso:**
- Cancelación de alerta previa
- Falsa alarma
- Situación controlada
- Fin de emergencia

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
NeosTech-RFID-System-Pro/
├── config/
│   └── alert_sounds.json           # Configuración completa
│
├── docs/
│   └── SONIDOS-EMERGENCIA.md       # Esta documentación
│
├── scripts/utilities/
│   └── upload_alert_sounds.ps1     # Script de subida a Firebase
│
└── assets/sounds/                   # Archivos MP3 (no incluidos en repo)
    ├── emergency_alarm_fire.mp3
    ├── emergency_alarm_evacuation.mp3
    ├── emergency_alarm_flood.mp3
    ├── emergency_alarm_general.mp3
    └── emergency_alarm_cancel.mp3
```

---

## 🛠️ CÓMO OBTENER/CREAR LOS ARCHIVOS DE AUDIO

### Opción 1: Descargar de Bibliotecas Libres

**Fuentes recomendadas (100% legales):**

1. **Freesound.org** (Creative Commons)
   - URL: https://freesound.org/
   - Buscar: "emergency beep", "alarm tone", "evacuation siren"
   - Filtrar por: Licencia CC0 o CC-BY
   - Descargar MP3
   - **NO buscar "SHOA" o "tsunami oficial"**

2. **Zapsplat.com** (Free Sound Effects)
   - URL: https://www.zapsplat.com/
   - Categoría: Alarms & Sirens
   - Licencia: Free for commercial use
   - Descargar WAV o MP3

3. **BBC Sound Effects** (Dominio público)
   - URL: https://sound-effects.bbcrewind.co.uk/
   - Buscar: "alarm", "siren", "warning"
   - Licencia: RemArc License (uso libre)

### Opción 2: Generar con Software

**A. Con Audacity (GRATIS)**

1. Descargar Audacity: https://www.audacityteam.org/
2. Menú → Generate → Tone
3. Para **Alarma de Incendio**:
   ```
   Waveform: Square
   Frequency: 900 Hz
   Amplitude: 0.8
   Duration: 0.2 seconds
   ```
   Generar 3 veces con 0.1s de silencio entre cada una
   Copiar y pegar el patrón para llenar 10 segundos

4. Para **Alarma de Evacuación**:
   ```
   Generate → Chirp
   Start Frequency: 400 Hz
   End Frequency: 1000 Hz
   Duration: 1 second
   Waveform: Sine
   ```
   Duplicar alternando ascendente/descendente por 15 segundos

5. Exportar:
   - File → Export → Export as MP3
   - Quality: 128 kbps
   - Channels: Mono
   - Sample Rate: 44100 Hz

**B. Con ToneGenerator.net (ONLINE)**

1. Ir a: https://www.szynalski.com/tone-generator/
2. Configurar frecuencia (ej: 800 Hz)
3. Hacer clic en frecuencia para reproducir
4. Grabar con software de grabación de audio
5. Editar y exportar como MP3

**C. Con Python (Programático)**

```python
# Instalar: pip install pydub numpy
from pydub import AudioSegment
from pydub.generators import Sine, Square
import numpy as np

# Generar alarma de incendio (3 beeps rápidos)
def create_fire_alarm():
    beep = Square(800).to_audio_segment(duration=200)  # 200ms
    silence = AudioSegment.silent(duration=100)  # 100ms
    
    pattern = beep + silence + beep + silence + beep + silence
    alarm = pattern * 15  # Repetir 15 veces (≈10 segundos)
    
    alarm.export("emergency_alarm_fire.mp3", format="mp3", bitrate="128k")

# Generar alarma de evacuación (sirena)
def create_evacuation_alarm():
    duration = 1000  # 1 segundo
    samples = 44100
    
    # Generar onda ascendente
    up = np.array([np.sin(2 * np.pi * (400 + 600 * i / samples) * i / samples) 
                   for i in range(samples)])
    # Generar onda descendente
    down = up[::-1]
    
    # Combinar y repetir
    siren = np.concatenate([up, down] * 8)
    
    # Convertir a audio
    audio = AudioSegment(
        siren.tobytes(), 
        frame_rate=44100,
        sample_width=2, 
        channels=1
    )
    
    audio.export("emergency_alarm_evacuation.mp3", format="mp3", bitrate="128k")

# Ejecutar
create_fire_alarm()
create_evacuation_alarm()
```

---

## 📤 SUBIR ARCHIVOS A FIREBASE STORAGE

Una vez tengas los archivos MP3 listos:

### Método 1: Consola Web Firebase

1. Ir a: https://console.firebase.google.com/
2. Seleccionar proyecto: `neos-tech`
3. Storage → Files
4. Crear carpeta: `alert_sounds/`
5. Upload files:
   - `emergency_alarm_fire.mp3`
   - `emergency_alarm_evacuation.mp3`
   - `emergency_alarm_flood.mp3`
   - `emergency_alarm_general.mp3`
   - `emergency_alarm_cancel.mp3`
6. Click derecho en cada archivo → Get download URL
7. Copiar URLs y pegarlas en `config/alert_sounds.json`

### Método 2: Script PowerShell (Automático)

```powershell
# Ejecutar desde raíz del proyecto
.\scripts\utilities\upload_alert_sounds.ps1
```

Este script:
- ✅ Verifica que existan los archivos MP3
- ✅ Sube a Firebase Storage automáticamente
- ✅ Obtiene las URLs públicas
- ✅ Actualiza `alert_sounds.json` con las URLs

---

## 🧪 PROBAR SONIDOS LOCALMENTE

### En Windows (PowerShell)

```powershell
# Reproducir archivo MP3
Start-Process "assets/sounds/emergency_alarm_fire.mp3"

# O con reproductor específico
& "C:\Program Files\Windows Media Player\wmplayer.exe" "assets\sounds\emergency_alarm_fire.mp3"
```

### En Chrome/Firefox

```javascript
// Probar en consola del navegador
const audio = new Audio('https://storage.googleapis.com/.../emergency_alarm_fire.mp3');
audio.volume = 0.5; // 50% volumen para pruebas
audio.play();
```

### En Android Studio (Emulador)

1. Copiar MP3 a: `app/src/main/res/raw/`
2. Código Kotlin:
```kotlin
val mediaPlayer = MediaPlayer.create(context, R.raw.emergency_alarm_fire)
mediaPlayer.start()
```

---

## 📊 ESPECIFICACIONES TÉCNICAS COMPLETAS

### Tabla Resumen

| Tipo | Archivo | Duración | Frecuencia | Loop | Vol | Prioridad |
|------|---------|----------|------------|------|-----|-----------|
| 🔥 Incendio | `emergency_alarm_fire.mp3` | 10s | 800-1200Hz | ✅ | 100% | CRÍTICA |
| 🚨 Evacuación | `emergency_alarm_evacuation.mp3` | 15s | 400-1000Hz | ✅ | 100% | CRÍTICA |
| 💧 Inundación | `emergency_alarm_flood.mp3` | 8s | 300-800Hz | ✅ | 90% | ALTA |
| ⚡ General | `emergency_alarm_general.mp3` | 6s | 600-900Hz | ✅ | 80% | MEDIA |
| ✅ Cancelada | `emergency_alarm_cancel.mp3` | 3s | 800→400Hz | ❌ | 80% | BAJA |

### Formato de Archivos

```
Formato: MP3
Bitrate: 128 kbps (CBR)
Sample Rate: 44100 Hz
Channels: 1 (Mono)
Codec: LAME MP3 Encoder
Tamaño aprox: 100-200 KB por archivo
```

### Metadata ID3 (Opcional pero recomendado)

```
Title: Alarma de [Tipo]
Artist: NeosTech RFID System
Album: Emergency Alert Sounds
Year: 2026
Genre: Alert
Comment: Custom building alert - NOT official SHOA
```

---

## 📱 INTEGRACIÓN CON APPS

### Android (FCM Data Payload)

```json
{
  "notification": {
    "title": "🔥 INCENDIO DETECTADO",
    "body": "Piso 3 - Ala Este. Evacue inmediatamente.",
    "sound": "emergency_alarm_fire",
    "android_channel_id": "emergency_alerts"
  },
  "data": {
    "alert_id": "alert_12345",
    "type": "FIRE",
    "severity": "CRITICAL",
    "sound_url": "https://storage.googleapis.com/.../emergency_alarm_fire.mp3",
    "vibration_pattern": "[500,200,500,200,500,200,500]",
    "loop_sound": "true"
  }
}
```

### iOS (APNS Payload)

```json
{
  "aps": {
    "alert": {
      "title": "🔥 INCENDIO DETECTADO",
      "body": "Piso 3 - Ala Este. Evacue inmediatamente."
    },
    "sound": {
      "critical": 1,
      "name": "emergency_alarm_fire.caf",
      "volume": 1.0
    },
    "interruption-level": "critical"
  },
  "alert_id": "alert_12345",
  "type": "FIRE"
}
```

**Nota iOS:** Archivos `.caf` requeridos (convertir MP3 a CAF con `afconvert`)

```bash
afconvert -d ima4 -f caff emergency_alarm_fire.mp3 emergency_alarm_fire.caf
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Obtención de Archivos
- [ ] Descargar o generar `emergency_alarm_fire.mp3`
- [ ] Descargar o generar `emergency_alarm_evacuation.mp3`
- [ ] Descargar o generar `emergency_alarm_flood.mp3`
- [ ] Descargar o generar `emergency_alarm_general.mp3`
- [ ] Descargar o generar `emergency_alarm_cancel.mp3`
- [ ] Verificar que NO sean sonidos oficiales SHOA
- [ ] Verificar licencias (CC0, CC-BY, Dominio Público)
- [ ] Probar archivos localmente

### Fase 2: Optimización
- [ ] Verificar formato MP3 128kbps mono
- [ ] Normalizar volumen a -3dB peak
- [ ] Verificar duración correcta (3-15s)
- [ ] Agregar metadata ID3
- [ ] Reducir tamaño de archivo (<200KB cada uno)

### Fase 3: Firebase Storage
- [ ] Subir archivos a `alert_sounds/` en Storage
- [ ] Configurar reglas de acceso público para lectura
- [ ] Obtener URLs públicas de cada archivo
- [ ] Actualizar `config/alert_sounds.json` con URLs
- [ ] Verificar descarga desde URL en navegador

### Fase 4: Integración App
- [ ] Android: Copiar MP3 a `res/raw/`
- [ ] iOS: Convertir a CAF y copiar a proyecto
- [ ] Configurar canal de notificación Android
- [ ] Probar reproducción en emulador
- [ ] Probar con volumen al 100%
- [ ] Verificar vibración simultánea
- [ ] Probar loop continuo hasta cancelar

### Fase 5: Testing
- [ ] Prueba de volumen en dispositivo silenciado
- [ ] Prueba con modo No Molestar activo (debe sonar)
- [ ] Prueba de duración y loop
- [ ] Prueba de vibración
- [ ] Prueba de cancelación (debe detenerse inmediatamente)
- [ ] Prueba con 5-10 dispositivos diferentes
- [ ] Validar que se distingue de alarmas oficiales

---

## 📖 REFERENCIAS Y RECURSOS

### Herramientas de Audio Gratuitas
- **Audacity**: https://www.audacityteam.org/
- **Ocenaudio**: https://www.ocenaudio.com/
- **WavePad**: https://www.nch.com.au/wavepad/

### Bibliotecas de Sonidos Libres
- **Freesound**: https://freesound.org/
- **Zapsplat**: https://www.zapsplat.com/
- **BBC Sound Effects**: https://sound-effects.bbcrewind.co.uk/
- **Free Music Archive**: https://freemusicarchive.org/

### Generadores de Tono Online
- **Online Tone Generator**: https://www.szynalski.com/tone-generator/
- **Signal Generator**: https://www.audiocheck.net/soundtests_signals.php

### Documentación Técnica
- **FCM Notifications**: https://firebase.google.com/docs/cloud-messaging
- **APNS Sound**: https://developer.apple.com/documentation/usernotifications/
- **Firebase Storage**: https://firebase.google.com/docs/storage

---

## ⚖️ CUMPLIMIENTO LEGAL

### Declaración de Conformidad

Este sistema de sonidos cumple con:

✅ **Ley 19.628** (Protección de Datos Personales - Chile)  
✅ **Ley de Propiedad Intelectual** (No usa material protegido sin licencia)  
✅ **Normativa de Emergencias Edificios** (D.S. 594 Art. 37-44)  
✅ **Diferenciación de Alertas Oficiales** (No suplanta autoridad gubernamental)

### Responsabilidades del Administrador

El administrador del edificio debe:
1. ✅ Usar sonidos SOLO para emergencias reales
2. ✅ No probar alarmas sin previo aviso a residentes
3. ✅ Mantener registro de todas las emisiones (audit log)
4. ✅ Capacitar al personal de seguridad en uso correcto
5. ✅ NO usar estos sonidos fuera del edificio

---

## 📞 SOPORTE

**Preguntas técnicas:**
- Revisar: `docs/SISTEMA-ALERTAS-EMERGENCIA.md`
- Cloud Function: `src/functions/emergency_alerts.py`
- Configuración: `config/alert_sounds.json`

**Problemas comunes:**
- ❓ Sonido no se escucha → Verificar volumen app y dispositivo
- ❓ No vibra → Verificar permisos de vibración
- ❓ URL no funciona → Re-generar URL pública en Firebase Storage
- ❓ Archivo muy grande → Re-exportar como 128kbps mono

---

**Documento preparado por:** NeosTech Development Team  
**Última actualización:** 2 de Febrero 2026  
**Versión:** 1.0.0  
**Licencia:** Uso exclusivo interno NeosTech RFID System Pro
