"""
Gera variantes avif/webp para as fotos de eventos reais (img/eventos/**).

Como adicionar um evento novo:
  1. Crie uma pasta img/eventos/<categoria>/<slug-do-evento>/ e coloque as fotos lá
     (ex.: img/eventos/formaturas/formatura-enfermagem-2026-11/foto1.png).
  2. Rode `python tools/optimize_eventos.py` para gerar as versões otimizadas.
  3. Acrescente um bloco em data/eventos-realizados.json apontando para as fotos.

Diferente de tools/optimize_media.py (que trabalha com uma lista fixa de nomes
e reescreve <img> direto no HTML), este script varre a pasta inteira e sempre
gera exatamente duas larguras (480 para miniatura, 1600 para foto cheia), para
que o JS do site sempre saiba quais dois arquivos procurar sem precisar de
nenhuma lista de configuração nova.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "img" / "eventos"
OPT_DIR = ROOT / "img" / "optimized" / "eventos"

WIDTHS = (480, 1600)
EXTENSIONS = {".png", ".jpg", ".jpeg"}


def iter_source_images():
    if not SRC_DIR.exists():
        return
    for path in SRC_DIR.rglob("*"):
        if path.is_file() and path.suffix.lower() in EXTENSIONS:
            yield path


def main() -> None:
    generated = 0
    skipped = 0

    for source in iter_source_images():
        rel = source.relative_to(SRC_DIR)
        out_base = OPT_DIR / rel.parent / source.stem
        out_base.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(source) as raw:
            img = ImageOps.exif_transpose(raw)
            original_width, original_height = img.size
            has_alpha = img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            )
            base = img.convert("RGBA" if has_alpha else "RGB")

            for target_width in WIDTHS:
                width = min(target_width, original_width)
                height = round(original_height * (width / original_width))

                webp = Path(f"{out_base}-{target_width}.webp")
                avif = Path(f"{out_base}-{target_width}.avif")

                if webp.exists() and avif.exists():
                    skipped += 1
                    continue

                resized = base.resize((width, height), Image.Resampling.LANCZOS)

                if not webp.exists():
                    resized.save(webp, "WEBP", quality=78, method=6)
                if not avif.exists():
                    resized.save(avif, "AVIF", quality=52, speed=6)

                generated += 1
                print(f"{rel} -> {webp.name}, {avif.name}")

    print(f"\nConcluído. {generated} variantes geradas, {skipped} já existiam.")


if __name__ == "__main__":
    main()
