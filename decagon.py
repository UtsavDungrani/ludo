import math
from PIL import Image, ImageDraw

# ---- shape parameters -------------------------------------------------
SIZE      = 1200          # final image size (px, square)
SS        = 4             # supersampling factor for smooth edges
R         = 440           # circumradius -> all 10 points equidistant from centre
LONG_ARC  = 48.0          # degrees spanned by every ODD-numbered side  (long)
SHORT_ARC = 24.0          # degrees spanned by every EVEN-numbered side (short)
                          # 5*(48+24) = 360  -> closes perfectly

FILL    = (205, 243, 248)   # light cyan background of the shape
OUTLINE = (32, 162, 182)    # darker shade of cyan for the outline
BG      = (255, 255, 255)   # white page background
STROKE  = 9                 # outline thickness (px, final scale)

def vertices():
    """10 points on one circle; arcs alternate long/short."""
    # centre the first (long) side on the bottom so the shape sits upright
    ang = 270.0 - LONG_ARC / 2.0
    pts = []
    for i in range(10):
        pts.append(ang)
        ang += LONG_ARC if i % 2 == 0 else SHORT_ARC
    return pts

def main():
    n   = SIZE * SS
    cx  = cy = n / 2.0
    r   = R * SS
    img = Image.new("RGB", (n, n), BG)
    d   = ImageDraw.Draw(img)

    pts = [(cx + r * math.cos(math.radians(a)),
            cy + r * math.sin(math.radians(a))) for a in vertices()]

    d.polygon(pts, fill=FILL)

    w = STROKE * SS
    d.line(pts + [pts[0]], fill=OUTLINE, width=w, joint="curve")
    # fill the mitre gaps at each vertex
    for (x, y) in pts:
        d.ellipse([x - w/2, y - w/2, x + w/2, y + w/2], fill=OUTLINE)

    img.resize((SIZE, SIZE), Image.LANCZOS).save("decagon_shape.png")

    # ---- matching SVG (vector, same geometry) ------------------------
    sx = [(SIZE/2 + R*math.cos(math.radians(a)), SIZE/2 + R*math.sin(math.radians(a)))
          for a in vertices()]
    poly = " ".join(f"{x:.2f},{y:.2f}" for x, y in sx)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" '
           f'viewBox="0 0 {SIZE} {SIZE}">\n'
           f'  <rect width="{SIZE}" height="{SIZE}" fill="#ffffff"/>\n'
           f'  <polygon points="{poly}" fill="#cdf3f8" stroke="#20a2b6" '
           f'stroke-width="{STROKE}" stroke-linejoin="round"/>\n</svg>\n')
    open("decagon_shape.svg", "w").write(svg)

    # ---- report ------------------------------------------------------
    long_len  = 2 * R * math.sin(math.radians(LONG_ARC) / 2)
    short_len = 2 * R * math.sin(math.radians(SHORT_ARC) / 2)
    print(f"points: 10, all at radius {R} from centre")
    print(f"odd  sides (1,3,5,7,9) : {long_len:.1f} px")
    print(f"even sides (2,4,6,8,10): {short_len:.1f} px")
    print(f"ratio long/short       : {long_len/short_len:.2f}")

main()
