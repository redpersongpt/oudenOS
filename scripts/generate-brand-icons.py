#!/usr/bin/env python3

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "apps/web/public/redcore-logo.png"

PNG_TARGETS = [
    ROOT / "apps/web/public/redcore-icon.png",
    ROOT / "apps/web/public/favicon.png",
    ROOT / "apps/web/src/app/icon.png",
    ROOT / "apps/web/src/app/apple-icon.png",
    ROOT / "apps/os-desktop/resources/redcore-icon.png",
    ROOT / "apps/os-desktop/resources/icon.png",
    ROOT / "apps/os-desktop/resources/favicon.png",
    ROOT / "apps/tuning-desktop/resources/redcore-icon.png",
    ROOT / "apps/tuning-desktop/resources/favicon.png",
]

ICO_TARGETS = [
    ROOT / "apps/web/src/app/favicon.ico",
    ROOT / "apps/os-desktop/resources/redcore-icon.ico",
    ROOT / "apps/tuning-desktop/resources/redcore-icon.ico",
]

PNG_SIZE = 512
ICO_SIZES = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]


def build_square_canvas(image: Image.Image, size: int) -> Image.Image:
    source = image.convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    target_width = int(size * 0.9)
    scale_ratio = target_width / source.width
    target_height = max(1, int(source.height * scale_ratio))
    resized = source.resize((target_width, target_height), Image.LANCZOS)

    x = (size - target_width) // 2
    y = (size - target_height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main() -> None:
    source = Image.open(SOURCE)
    square = build_square_canvas(source, PNG_SIZE)

    for target in PNG_TARGETS:
      target.parent.mkdir(parents=True, exist_ok=True)
      square.save(target, format="PNG")

    for target in ICO_TARGETS:
      target.parent.mkdir(parents=True, exist_ok=True)
      square.save(target, format="ICO", sizes=ICO_SIZES)


if __name__ == "__main__":
    main()
