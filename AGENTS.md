# Reglas del Agente (NeosTech)

## Flujo de trabajo
- NO modificar archivos a menos que diga la palabra exacta: **APLICA**
- Entregar primero: (1) plan, (2) diff unificado, (3) lista de archivos a modificar, (4) `git diff --stat` esperado.
- Máximo **3 archivos por PR**.
- No "formatear todo". No refactorizar fuera del alcance solicitado.
- Siempre dar rutas exactas.

## Disciplina Git
- Una tarea = una rama.
- Mantener commits pequeños y con alcance definido.
- Nunca hacer commit de secretos, tokens o valores `.env`.

## Formato de salida
- Preferir diffs unificados para cambios de código.
- Si algo es ambiguo, hacer máximo 3 preguntas.
