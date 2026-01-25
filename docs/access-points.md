# Configuración de Puntos de Acceso
# NeosTech RFID System v6.0

## Puntos de Acceso Configurados

Este archivo documenta todos los puntos de acceso (portones y puertas) del sistema.

### 1. Portón Principal
- **ID**: `porton_principal`
- **Tipo**: Portón eléctrico (gate)
- **Lectora IP**: 192.168.1.100:8080
- **Canal Relé**: 1
- **Tiempo Apertura**: 3 segundos

### 2. Portón Estacionamiento
- **ID**: `estacionamiento`
- **Tipo**: Portón eléctrico (gate)
- **Lectora IP**: 192.168.1.101:8080
- **Canal Relé**: 1
- **Tiempo Apertura**: 5 segundos

### 3. Puerta Peatonal
- **ID**: `puerta_peatonal`
- **Tipo**: Puerta (door)
- **Lectora IP**: 192.168.1.102:8080
- **Canal Relé**: 1
- **Tiempo Apertura**: 2 segundos

### 4. Acceso Gimnasio
- **ID**: `acceso_gimnasio`
- **Tipo**: Puerta (door)
- **Lectora IP**: 192.168.1.103:8080
- **Canal Relé**: 1
- **Tiempo Apertura**: 2 segundos

## Agregar Nuevo Punto de Acceso

Para agregar un nuevo portón o puerta:

1. **Editar** `src/gateway/gateway.config.json`
2. **Agregar** nuevo objeto en array `access_points`:

```json
{
  "id": "nuevo_acceso",
  "name": "Nombre del Acceso",
  "type": "gate",  // o "door"
  "reader_ip": "192.168.1.XXX",
  "reader_port": 8080,
  "relay_channel": 1,
  "open_duration_ms": 3000
}
```

3. **Actualizar Dashboard** en `src/web/index.html`:
   - Buscar sección "Gate Control"
   - Agregar nuevo botón con `onclick="openGate('nuevo_acceso')"`

4. **Reiniciar** Gateway para aplicar cambios

## Esquema de Red Recomendado

```
192.168.1.0/24
├── 192.168.1.100    Lectora Portón Principal
├── 192.168.1.101    Lectora Estacionamiento
├── 192.168.1.102    Lectora Puerta Peatonal
├── 192.168.1.103    Lectora Gimnasio
├── 192.168.1.104-109 (Reservado para expansión)
└── 192.168.1.200    Gateway PC
```

## Tipos de Acceso

### Gates (Portones)
- Tiempo apertura más largo (3-5 segundos)
- Para vehículos
- Requieren más espacio de maniobra

### Doors (Puertas)
- Tiempo apertura corto (2 segundos)
- Para peatones
- Apertura rápida

## Configuración Firestore

Cada punto de acceso puede tener permisos específicos en Firestore:

```
users/{userId}/
  ├── access_points: ["porton_principal", "puerta_peatonal"]
  └── schedule: { ... }
```

## Monitoreo

Ver logs en tiempo real:
```powershell
Get-Content -Path "C:\NeosTech-RFID-System-Pro\logs\gateway\gateway.log" -Tail 50 -Wait
```

Verificar estado de lectoras:
```powershell
Test-NetConnection -ComputerName 192.168.1.100 -Port 8080
```
