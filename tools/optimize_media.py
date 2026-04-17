from __future__ import annotations

import re
import subprocess
from pathlib import Path

from PIL import Image, ImageOps
import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "img"
OPT_IMG_DIR = IMG_DIR / "optimized"
VIDEO_DIR = ROOT / "video"
MOBILE_VIDEO_DIR = VIDEO_DIR / "mobile"

HTML_FILES = [
    ROOT / "index.html",
    ROOT / "quem-somos.html",
    ROOT / "momentos.html",
    ROOT / "cardapio.html",
    ROOT / "contato.html",
]

RESPONSIVE_WIDTHS = (480, 768, 1200, 1600)

EXCLUDED_IMAGE_NAMES = {
    "kasarao-semfundo.png",
    "kasarao-k-opaco.png",
    "logo.png",
    "whats1.ico",
    "mail-envelope.ico",
    "icone-instagram.ico",
    "icone-horario.ico",
    "icone-contato.ico",
    "icone-cardapio.ico",
    "k-normal.ico",
}

TARGET_IMAGE_NAMES = {
    "sobre1.png",
    "sobre2.png",
    "sobre3.png",
    "k-gigante.png",
    "ambiente-externo.png",
    "missao.png",
    "kelly-caua.png",
    "amarula.png",
    "drink-gostoso.png",
    "torresmo-muito-bom.png",
    "IMG_7790-1.png",
    "kelly-drink.png",
    "IMG_2916-1.png",
    "IMG_3125-1.png",
    "IMG_4795-1.png",
    "IMG_5100-1.png",
    "IMG_7130-1.png",
    "IMG_7329-1.png",
    "IMG-20260215-WA0045-1.png",
    "kelly-brinde.png",
    "ambiente-noite.png",
    "asa-frango.png",
    "brinde-conosco.png",
    "comemore-conosco.png",
    "IMG_1793.JPG.png",
}

VIDEO_TARGETS = {
    "IMG_3350.mp4",
    "IMG_3350.webm",
    "kelly-entrada.mp4",
    "evento.mp4",
    "IMG_6228.mp4",
    "IMG_3568.mp4",
}


def read_dimensions() -> dict[str, tuple[int, int]]:
    dimensions: dict[str, tuple[int, int]] = {}
    for path in IMG_DIR.iterdir():
        if not path.is_file():
            continue
        try:
            with Image.open(path) as img:
                dimensions[path.name] = img.size
        except Exception:
            continue
    return dimensions


def variant_widths(original_width: int) -> list[int]:
    widths = [w for w in RESPONSIVE_WIDTHS if w < original_width]
    widths.append(original_width)
    return sorted(set(widths))


def output_name(source_name: str, width: int, ext: str) -> str:
    stem = Path(source_name).stem
    return f"{stem}-{width}.{ext}"


def save_responsive_images() -> dict[str, list[tuple[int, str, str]]]:
    OPT_IMG_DIR.mkdir(parents=True, exist_ok=True)
    generated: dict[str, list[tuple[int, str, str]]] = {}

    for name in sorted(TARGET_IMAGE_NAMES):
        source = IMG_DIR / name
        if not source.exists() or name in EXCLUDED_IMAGE_NAMES:
            continue

        with Image.open(source) as raw:
            img = ImageOps.exif_transpose(raw)
            original_width, original_height = img.size
            has_alpha = img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            )
            base = img.convert("RGBA" if has_alpha else "RGB")

            generated[name] = []
            for width in variant_widths(original_width):
                height = round(original_height * (width / original_width))
                resized = base.resize((width, height), Image.Resampling.LANCZOS)

                webp = OPT_IMG_DIR / output_name(name, width, "webp")
                avif = OPT_IMG_DIR / output_name(name, width, "avif")

                if not webp.exists():
                    resized.save(webp, "WEBP", quality=78, method=6)
                if not avif.exists():
                    resized.save(avif, "AVIF", quality=52, speed=6)

                generated[name].append(
                    (
                        width,
                        f"img/optimized/{webp.name}",
                        f"img/optimized/{avif.name}",
                    )
                )

    return generated


def sizes_for(page_name: str, image_name: str) -> str:
    if page_name == "momentos.html":
        return "(max-width: 768px) 94vw, 760px"
    if page_name == "cardapio.html":
        return "(max-width: 768px) 88vw, (max-width: 1200px) 42vw, 560px"
    if page_name == "quem-somos.html" and image_name == "kelly-caua.png":
        return "(max-width: 768px) 88vw, 960px"
    if page_name == "quem-somos.html":
        return "(max-width: 980px) 88vw, 360px"
    if page_name == "index.html":
        return "(max-width: 900px) 85vw, 300px"
    return "100vw"


def ensure_attr(attrs: str, name: str, value: str) -> str:
    if re.search(rf"\b{name}\s*=", attrs):
        return attrs
    closing = " /" if attrs.rstrip().endswith("/") else ""
    clean = attrs.rstrip().removesuffix("/").rstrip()
    return f'{clean} {name}="{value}"{closing}'


def img_tag_with_dimensions(attrs: str, dimensions: dict[str, tuple[int, int]]) -> str:
    match = re.search(r'src="img/([^"]+)"', attrs)
    if not match:
        return f"<img {attrs}>"

    name = match.group(1)
    if name in dimensions:
        width, height = dimensions[name]
        attrs = ensure_attr(attrs, "width", str(width))
        attrs = ensure_attr(attrs, "height", str(height))

    attrs = ensure_attr(attrs, "decoding", "async")
    return f"<img {attrs}>"


def build_picture(
    indent: str,
    img_tag: str,
    page_name: str,
    image_name: str,
    variants: list[tuple[int, str, str]],
) -> str:
    sizes = sizes_for(page_name, image_name)
    webp_srcset = ", ".join(f"{webp} {width}w" for width, webp, _ in variants)
    avif_srcset = ", ".join(f"{avif} {width}w" for width, _, avif in variants)
    inner_indent = indent + "  "
    return (
        f'{indent}<picture>\n'
        f'{inner_indent}<source type="image/avif" srcset="{avif_srcset}" sizes="{sizes}" />\n'
        f'{inner_indent}<source type="image/webp" srcset="{webp_srcset}" sizes="{sizes}" />\n'
        f"{inner_indent}{img_tag}\n"
        f"{indent}</picture>"
    )


def update_html_images(
    dimensions: dict[str, tuple[int, int]],
    generated: dict[str, list[tuple[int, str, str]]],
) -> None:
    img_re = re.compile(r"(?P<indent>[ \t]*)<img (?P<attrs>[^>]*?)>")

    for html_file in HTML_FILES:
        text = html_file.read_text(encoding="utf-8")

        def replace(match: re.Match[str]) -> str:
            indent = match.group("indent")
            attrs = match.group("attrs")
            src_match = re.search(r'src="img/([^"]+)"', attrs)
            if not src_match:
                return match.group(0)

            image_name = src_match.group(1)
            img_tag = img_tag_with_dimensions(attrs, dimensions)

            before = text[max(0, match.start() - 80) : match.start()]
            if "<picture" in before and "</picture>" not in before:
                return f"{indent}{img_tag}"

            if image_name in generated:
                return build_picture(
                    indent,
                    img_tag,
                    html_file.name,
                    image_name,
                    generated[image_name],
                )

            return f"{indent}{img_tag}"

        html_file.write_text(img_re.sub(replace, text), encoding="utf-8")


def ffmpeg_run(args: list[str]) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ffmpeg, "-y", *args], check=True)


def make_mobile_mp4(source: Path, target: Path) -> None:
    if target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg_run(
        [
            "-i",
            str(source),
            "-vf",
            "scale='if(gt(iw,720),720,iw)':-2",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "28",
            "-movflags",
            "+faststart",
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            str(target),
        ]
    )


def make_mobile_webm(source: Path, target: Path) -> None:
    if target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg_run(
        [
            "-i",
            str(source),
            "-vf",
            "scale='if(gt(iw,720),720,iw)':-2",
            "-c:v",
            "libvpx-vp9",
            "-crf",
            "34",
            "-b:v",
            "0",
            "-row-mt",
            "1",
            "-c:a",
            "libopus",
            "-b:a",
            "80k",
            str(target),
        ]
    )


def save_mobile_videos() -> None:
    for name in sorted(VIDEO_TARGETS):
        source = VIDEO_DIR / name
        if not source.exists():
            continue
        stem = source.stem
        if source.suffix.lower() == ".webm":
            make_mobile_webm(source, MOBILE_VIDEO_DIR / f"{stem}-mobile.webm")
        else:
            make_mobile_mp4(source, MOBILE_VIDEO_DIR / f"{stem}-mobile.mp4")


def add_mobile_video_sources() -> None:
    replacements = {
        '<source src="video/IMG_3350.webm" type="video/webm" />':
            '<source src="video/mobile/IMG_3350-mobile.webm" type="video/webm" media="(max-width: 768px)" />\n'
            '      <source src="video/IMG_3350.webm" type="video/webm" />',
        '<source src="video/IMG_3350.mp4" type="video/mp4" />':
            '<source src="video/mobile/IMG_3350-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />\n'
            '      <source src="video/IMG_3350.mp4" type="video/mp4" />',
        '<source src="video/kelly-entrada.mp4" type="video/mp4" />':
            '<source src="video/mobile/kelly-entrada-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />\n'
            '            <source src="video/kelly-entrada.mp4" type="video/mp4" />',
        '<source src="video/evento.mp4" type="video/mp4" />':
            '<source src="video/mobile/evento-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />\n'
            '      <source src="video/evento.mp4" type="video/mp4" />',
        '<source src="video/IMG_6228.mp4" type="video/mp4" />':
            '<source src="video/mobile/IMG_6228-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />\n'
            '      <source src="video/IMG_6228.mp4" type="video/mp4" />',
        '<source src="video/IMG_3568.mp4" type="video/mp4" />':
            '<source src="video/mobile/IMG_3568-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />\n'
            '      <source src="video/IMG_3568.mp4" type="video/mp4" />',
    }

    for html_file in HTML_FILES:
        text = html_file.read_text(encoding="utf-8")
        for needle, replacement in replacements.items():
            if replacement in text:
                continue
            text = text.replace(needle, replacement)
        html_file.write_text(text, encoding="utf-8")


def main() -> None:
    dimensions = read_dimensions()
    generated = save_responsive_images()
    update_html_images(dimensions, generated)
    save_mobile_videos()
    add_mobile_video_sources()


if __name__ == "__main__":
    main()
