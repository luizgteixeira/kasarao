from __future__ import annotations

from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.constants import ERROR_CORRECT_H


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "img" / "portfolio-qr.png"
URL = "https://luizgustavodev.com"


def rounded_rectangle(draw: ImageDraw.ImageDraw, box, radius: int, fill, outline=None, width=1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def main() -> None:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=14,
        border=2,
    )
    qr.add_data(URL)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="#0C1014", back_color="#F7F1E6").convert("RGBA")
    qr_img = qr_img.resize((360, 360), Image.Resampling.NEAREST)

    canvas = Image.new("RGBA", (520, 640), "#0C1014")
    draw = ImageDraw.Draw(canvas)

    rounded_rectangle(draw, (18, 18, 502, 622), 30, "#111820", "#D0AC67", 4)
    rounded_rectangle(draw, (42, 42, 478, 598), 22, "#F7F1E6", "#B98C42", 3)

    rounded_rectangle(draw, (80, 82, 440, 442), 20, "#F7F1E6")
    canvas.alpha_composite(qr_img, (80, 82))

    accent = Image.new("RGBA", (84, 84), (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent)
    accent_draw.ellipse((0, 0, 84, 84), fill="#0C1014", outline="#D0AC67", width=4)
    accent_draw.text((42, 42), "LG", anchor="mm", fill="#D0AC67", font=ImageFont.load_default(size=26))
    canvas.alpha_composite(accent, (218, 220))

    try:
        title_font = ImageFont.truetype("arialbd.ttf", 28)
        small_font = ImageFont.truetype("arial.ttf", 20)
    except OSError:
        title_font = ImageFont.load_default(size=28)
        small_font = ImageFont.load_default(size=20)

    draw.text((260, 492), "Portfólio", anchor="mm", fill="#0C1014", font=title_font)
    draw.text((260, 526), "Luiz Gustavo Dev", anchor="mm", fill="#2D241A", font=small_font)
    draw.text((260, 558), "luizgustavodev.com", anchor="mm", fill="#6F5526", font=small_font)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, "PNG", optimize=True)


if __name__ == "__main__":
    main()
