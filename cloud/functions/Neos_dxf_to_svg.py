import sys
import math
import ezdxf

"""
NeosTools - DXF -> SVG con colores y soporte de bloques (INSERT)

- Dibuja LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE
- Mira también dentro de bloques (INSERT.virtual_entities())
- Colorea por capa / color ACI
"""

ALLOWED_TYPES = {
    "LINE",
    "LWPOLYLINE",
    "POLYLINE",
    "ARC",
    "CIRCLE",
}


# Mapeo básico de índices ACI a colores SVG
ACI_COLORS = {
    1:  "#ff0000",  # red
    2:  "#ffff00",  # yellow
    3:  "#00ff00",  # green
    4:  "#00ffff",  # cyan
    5:  "#0000ff",  # blue
    6:  "#ff00ff",  # magenta
    7:  "#000000",  # black/white
    8:  "#808080",  # gray
    9:  "#c0c0c0",  # light gray
}


def aci_to_hex(aci: int) -> str:
    """Convierte un índice de color ACI a un color hex aproximado."""
    if aci in ACI_COLORS:
        return ACI_COLORS[aci]
    # por defecto un gris medio
    return "#404040"


def get_entity_color(doc, entity) -> str:
    """
    Devuelve color SVG (#rrggbb) para la entidad:
    - si entity.dxf.color != 0/256 usar ese
    - si es BYLAYER, usar color de la capa
    """
    color = entity.dxf.get("color", 256)  # 256 = BYLAYER
    if color not in (0, 256):  # color propio de la entidad
        return aci_to_hex(color)

    layer_name = entity.dxf.get("layer", "0")
    try:
        layer = doc.layers.get(layer_name)
        layer_color = layer.dxf.get("color", 7)  # default white/black
    except Exception:
        layer_color = 7
    return aci_to_hex(layer_color)


def iter_points(entity, arc_segments=64):
    """Devuelve una lista de (x, y) representativos de la entidad."""
    dxftype = entity.dxftype()

    # ---------- LINE ----------
    if dxftype == "LINE":
        s = entity.dxf.start
        e = entity.dxf.end
        return [(s.x, s.y), (e.x, e.y)]

    # ---------- LWPOLYLINE ----------
    if dxftype == "LWPOLYLINE":
        pts = []
        for p in entity.get_points("xy"):
            pts.append((p[0], p[1]))
        return pts

    # ---------- POLYLINE clásica ----------
    if dxftype == "POLYLINE":
        pts = []
        for v in entity.vertices:
            loc = getattr(v.dxf, "location", None)
            if loc is None:
                continue
            pts.append((loc.x, loc.y))
        return pts

    # ---------- CIRCLE ----------
    if dxftype == "CIRCLE":
        center = entity.dxf.center
        r = entity.dxf.radius
        pts = []
        for i in range(arc_segments + 1):
            a = 2.0 * math.pi * i / arc_segments
            x = center.x + r * math.cos(a)
            y = center.y + r * math.sin(a)
            pts.append((x, y))
        return pts

    # ---------- ARC ----------
    if dxftype == "ARC":
        center = entity.dxf.center
        r = entity.dxf.radius
        start = math.radians(entity.dxf.start_angle)
        end = math.radians(entity.dxf.end_angle)

        if end < start:
            end += 2.0 * math.pi

        pts = []
        steps = arc_segments
        step = (end - start) / steps
        a = start
        for _ in range(steps + 1):
            x = center.x + r * math.cos(a)
            y = center.y + r * math.sin(a)
            pts.append((x, y))
            a += step
        return pts

    return []


def flatten_entities(doc):
    """
    Recorre el modelspace, pero si encuentra INSERT,
    usa insert.virtual_entities() para “explotar” el bloque
    y devolver también su geometría.
    """
    msp = doc.modelspace()
    for e in msp:
        if e.dxftype() == "INSERT":
            # Desplegamos el bloque
            try:
                for sub in e.virtual_entities():
                    yield sub
            except Exception:
                # si algo falla, al menos devolvemos el INSERT como está (aunque no lo pintemos)
                continue
        else:
            yield e


def main():
    if len(sys.argv) != 2 and len(sys.argv) != 3:
        print("Uso: python neos_dxf_to_svg.py entrada.dxf salida.svg")
        sys.exit(1)

    entrada = sys.argv[1]
    # si no dan salida, generamos una automática
    if len(sys.argv) == 3:
        salida = sys.argv[2]
    else:
        if entrada.lower().endswith(".dxf"):
            salida = entrada[:-4] + ".svg"
        else:
            salida = entrada + ".svg"

    print(f"Abriendo DXF: {entrada}")
    try:
        doc = ezdxf.readfile(entrada)
    except Exception as e:
        print("Error leyendo DXF:", e)
        sys.exit(1)

    # ---------- 1) Recorremos entidades (incluyendo bloques) y calculamos bbox ----------
    minx = miny = float("inf")
    maxx = maxy = float("-inf")

    entidades = []  # lista de dicts {type, pts, layer, color}

    for e in flatten_entities(doc):
        if e.dxftype() not in ALLOWED_TYPES:
            continue

        pts = iter_points(e)
        if not pts:
            continue

        layer = e.dxf.get("layer", "0")
        color = get_entity_color(doc, e)

        entidades.append({
            "type": e.dxftype(),
            "pts": pts,
            "layer": layer,
            "color": color,
        })

        for x, y in pts:
            if x < minx:
                minx = x
            if x > maxx:
                maxx = x
            if y < miny:
                miny = y
            if y > maxy:
                maxy = y

    if not entidades:
        print("No se encontraron entidades válidas para SVG.")
        sys.exit(1)

    width = maxx - minx
    height = maxy - miny

    if width <= 0 or height <= 0:
        print("Bounding box inválido.")
        sys.exit(1)

    print("BBox DXF: minx=%.3f miny=%.3f maxx=%.3f maxy=%.3f" % (minx, miny, maxx, maxy))

    # ---------- 2) Generamos SVG ----------
    with open(salida, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n')
        f.write(
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="{minx:.3f} {miny:.3f} {width:.3f} {height:.3f}">\n'
        )
        f.write('  <desc>Generado por NeosTools DXF->SVG (con bloques)</desc>\n')
        f.write('  <style>\n')
        f.write('    line, polyline {\n')
        f.write('      vector-effect: non-scaling-stroke;\n')
        f.write('      stroke-width: 0.7;\n')
        f.write('      fill: none;\n')
        f.write('    }\n')
        # un poco más grueso para muros (si están en capa ARQ)
        f.write('    g.layer-ARQ line, g.layer-ARQ polyline {\n')
        f.write('      stroke-width: 1.5;\n')
        f.write('    }\n')
        f.write('  </style>\n')

        # agrupar por capa para facilitar estilos futuros
        capas = {}
        for ent in entidades:
            layer = ent["layer"]
            capas.setdefault(layer, []).append(ent)

        for layer, ents in capas.items():
            cls = f"layer-{layer.replace(' ', '_').replace('.', '_')}"
            f.write(f'  <g class="{cls}">\n')
            for ent in ents:
                color = ent["color"]
                pts = ent["pts"]
                if ent["type"] == "LINE":
                    (x1, y1), (x2, y2) = pts
                    f.write(
                        f'    <line x1="{x1:.3f}" y1="{y1:.3f}" '
                        f'x2="{x2:.3f}" y2="{y2:.3f}" stroke="{color}" />\n'
                    )
                else:
                    puntos = " ".join(f"{x:.3f},{y:.3f}" for x, y in pts)
                    f.write(
                        f'    <polyline points="{puntos}" stroke="{color}" />\n'
                    )
            f.write("  </g>\n")

        f.write("</svg>\n")

    print("SVG generado en:", salida)


if __name__ == "__main__":
    main()
