import sys
import ezdxf

"""
NeosTools - Filtro DXF

Objetivo:
- Mantener TODA la geometría relevante (muros, ductos, equipos, etc.)
  -> LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, SPLINE, ELLIPSE, INSERT, SOLID, 3DFACE, TRACE
- Eliminar "ruido":
  -> TEXT, MTEXT, DIMENSION, HATCH, LEADER, TOLERANCE, etc.

IMPORTANTE:
- NO filtramos por capas, sólo por tipo de entidad.
  Así no perdemos la capa ARQ ni ninguna otra capa de muros.
"""

ALLOWED_TYPES = {
    "LINE",
    "LWPOLYLINE",
    "POLYLINE",
    "ARC",
    "CIRCLE",
    "SPLINE",
    "ELLIPSE",
    "INSERT",    # bloques (puertas, muebles, etc.)
    "SOLID",
    "3DFACE",
    "TRACE",
}


def main() -> None:
    if len(sys.argv) != 3:
        print("Uso: python neos_filtrar_dxf.py entrada.dxf salida.dxf")
        sys.exit(1)

    entrada = sys.argv[1]
    salida = sys.argv[2]

    print(f"Abriendo DXF: {entrada}")
    try:
        doc = ezdxf.readfile(entrada)
    except Exception as e:
        print("Error leyendo DXF:", e)
        sys.exit(1)

    msp = doc.modelspace()

    # Creamos un DXF nuevo
    new_doc = ezdxf.new(setup=True)
    new_msp = new_doc.modelspace()

    capas = set()
    copiados = 0

    for e in msp:
        capas.add(e.dxf.layer)
        dxftype = e.dxftype()

        if dxftype in ALLOWED_TYPES:
            try:
                new_msp.add_foreign_entity(e)
                copiados += 1
            except ezdxf.DXFStructureError:
                # Algunas entidades especiales no se pueden copiar así, las ignoramos
                pass

    print("Capas encontradas en el DXF:")
    for layer in sorted(capas):
        print("  -", layer)

    print("Entidades copiadas:", copiados)

    if copiados == 0:
        print("No se copiaron entidades, puede que el filtro sea demasiado estricto.")
        sys.exit(1)

    try:
        new_doc.saveas(salida)
        print("DXF filtrado guardado en:", salida)
    except Exception as e:
        print("Error guardando DXF filtrado:", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
