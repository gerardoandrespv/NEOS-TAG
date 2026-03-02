"""Generate Android launcher icons: NeosTech logo + 'SAE' label below, dark background."""
import urllib.request
import io
import os
from PIL import Image, ImageDraw, ImageFont

LOGO_URL = 'https://neos-tech.web.app/assets/images/neostechb.png'

# Android mipmap densities: (folder_suffix, icon_size_px)
DENSITIES = [
    ('mdpi',    48),
    ('hdpi',    72),
    ('xhdpi',   96),
    ('xxhdpi',  144),
    ('xxxhdpi', 192),
]

BASE_DIR = os.path.join(
    os.path.dirname(__file__),
    'src', 'SAEMobile', 'android', 'app', 'src', 'main', 'res',
)

BG_COLOR  = (15, 23, 42)   # #0f172a
SAE_COLOR = (99, 102, 241)  # #6366f1

def download_logo():
    print(f'Downloading logo from {LOGO_URL} ...')
    req = urllib.request.Request(LOGO_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return Image.open(io.BytesIO(resp.read())).convert('RGBA')

def make_icon(logo_rgba: Image.Image, size: int) -> Image.Image:
    """Creates a square icon: dark bg, logo centered in top ~70%, 'SAE' text bottom ~25%."""
    img = Image.new('RGBA', (size, size), (*BG_COLOR, 255))
    draw = ImageDraw.Draw(img)

    # Logo area: top 72% of height with padding
    logo_area_h = int(size * 0.68)
    padding = max(2, int(size * 0.06))
    logo_w = size - padding * 2
    logo_h = logo_area_h - padding

    # Resize logo keeping aspect ratio
    logo = logo_rgba.copy()
    logo.thumbnail((logo_w, logo_h), Image.LANCZOS)

    # Center logo horizontally, position from top with padding
    lx = (size - logo.width) // 2
    ly = padding
    img.paste(logo, (lx, ly), logo)

    # "SAE" text below logo
    font_size = max(8, int(size * 0.20))
    font = None
    for candidate in [
        'arialbd.ttf', 'Arial_Bold.ttf', 'Roboto-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        'C:/Windows/Fonts/arialbd.ttf',
        'C:/Windows/Fonts/Arial.ttf',
    ]:
        try:
            font = ImageFont.truetype(candidate, font_size)
            break
        except (OSError, IOError):
            pass
    if font is None:
        font = ImageFont.load_default()

    text = 'SAE'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) // 2
    ty = size - th - max(2, int(size * 0.06))
    draw.text((tx, ty), text, font=font, fill=(*SAE_COLOR, 255))

    return img.convert('RGB')

def save_icon(img: Image.Image, folder: str, filename: str):
    path = os.path.join(BASE_DIR, folder, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'PNG')
    print(f'  Saved: {path}')

def main():
    logo = download_logo()
    print(f'Logo downloaded: {logo.size}')

    for density, size in DENSITIES:
        print(f'\nGenerating {density} ({size}x{size})...')
        icon = make_icon(logo, size)
        folder = f'mipmap-{density}'
        save_icon(icon, folder, 'ic_launcher.png')
        save_icon(icon, folder, 'ic_launcher_round.png')

    print('\nAll icons generated successfully.')

if __name__ == '__main__':
    main()
