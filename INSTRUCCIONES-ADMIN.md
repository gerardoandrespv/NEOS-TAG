# ╔════════════════════════════════════════════════════════════╗
# ║  INSTRUCCIONES: EJECUTAR GATEWAY COMO ADMINISTRADOR       ║
# ╚════════════════════════════════════════════════════════════╝

## 🎯 FORMA MÁS SIMPLE (3 pasos)

1. **Presiona**: `Windows + X`

2. **Click en**: "Terminal (Administrador)" o "PowerShell (Administrador)"

3. **Ejecuta**:
   ```powershell
   cd C:\NeosTech-RFID-System-Pro\src\Gateway
   dotnet run
   ```

## ✅ Verificar que funciona

Debe mostrar:

```
🌐 Servidor HTTP activo en puerto 8080
📡 Accesible desde:
   - http://localhost:8080
   - http://192.168.1.XXX:8080
```

Si ves esto → **¡LISTO!** El Gateway puede recibir tags HTTP.

---

## 🔧 Alternativa: Click Derecho

1. **Click derecho** en el icono de **PowerShell** en la barra de tareas

2. **Seleccionar**: "Ejecutar como administrador"

3. **Ejecutar**:
   ```powershell
   cd C:\NeosTech-RFID-System-Pro\src\Gateway
   dotnet run
   ```

---

## ❌ Si los scripts no funcionan

Los scripts `.ps1` pueden estar bloqueados por la política de ejecución.

**Solución**: Usar la forma manual arriba (Windows + X → Terminal Admin)

---

## 🧪 Prueba Final

Una vez el Gateway esté corriendo como Admin:

1. **Acerca un tag** a la lectora

2. **Revisa la terminal** del Gateway

3. **Debe aparecer**: `🏷️ TAG HTTP: E200341E...`

Si aparece → El sistema híbrido funciona ✅

---

📅 Última actualización: 29-01-2026
