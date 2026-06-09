#!/usr/bin/env python3
"""Build the inline icon sprite for index.html from moses-web design_assets.

The new design-asset icons are single-colour (fill+stroke #262626) with a tunable
stroke-width and a uniform 0 0 1055 1055 viewBox. We strip the hard-coded
fill/stroke/stroke-width so the page can drive colour + thickness via CSS
inheritance, keep fill-rule (for the evenodd holes), add a non-scaling stroke,
and crop each viewBox to the art so every icon fills its box consistently.
"""
import re
import sys
import json
import pathlib
import os

ROOT = pathlib.Path(__file__).resolve().parent
DEFAULT_SRC = ROOT.parent / "moses-web" / "design_assets" / "icon"
SRC = pathlib.Path(os.environ.get("MOSES_ICON_SRC", DEFAULT_SRC))

# symbol id -> source filename
ICONS = {
    "i-play": "Play.svg",
    "i-code": "Code_Bracket.svg",
    "i-sparkles": "Sparkles.svg",
    "i-alert": "Exclamatioin_Circle.svg",
    "i-receipt": "Receipt_Percent.svg",
    "i-calc": "Calculator.svg",
    "i-copy": "Documenet_Duplicate.svg",
    "i-photo": "Photo.svg",
    "i-pencil": "Pencil.svg",
    "i-plus": "Plus.svg",
    "i-chat": "Chat_Bubble_Bottom_Center_Text.svg",
    "i-heart": "Heart.svg",
    "i-thumb": "Hand_Thumb_Up.svg",
    "i-person": "User_Circle.svg",   # was a custom person glyph
    "i-box": "Circle_Stack.svg",     # was a custom storage glyph
    "i-arrow": "Arrow_Right.svg",
}

PATH_RE = re.compile(r"<path\b([^>]*?)/>", re.S)
D_RE = re.compile(r'\bd="([^"]*)"')
EVENODD_RE = re.compile(r'fill-rule="evenodd"')
SW_RE = re.compile(r'stroke-width="([0-9.]+)"')

# The source icons draw their main outlines at stroke-width 84 and thinner
# details (e.g. the "!" dot, the calculator "%") at ~37-38. We keep that
# relative weighting so details don't balloon when the main stroke goes bold.
BASE_STROKE = 84.0

# Line weight, as a fraction of each icon's (cropped, square) box. The source
# icons are bold hand-drawn outlines; a scaling stroke keeps that weight in
# proportion to the icon's display size — matching the bold wordmark, headings
# and thick wobbly frames. (Tune here; rerun the script to regenerate.)
STROKE_RATIO = 0.11

# optional measured crops: { id: [x, y, w, h] }  (geometry bbox in 1055 space)
crops = {}
crop_file = pathlib.Path(__file__).with_name("crops.json")
if crop_file.exists():
    crops = json.loads(crop_file.read_text())


def crop_for(icon_id: str):
    """Return (viewBox string, square side) for the icon."""
    bb = crops.get(icon_id)
    if not bb:
        return "0 0 1055 1055", 1055.0
    x, y, w, h = bb
    side = max(w, h)
    margin = side * 0.12          # breathing room so the bold stroke never clips
    new = side + 2 * margin
    cx, cy = x + w / 2, y + h / 2
    return f"{cx - new / 2:.1f} {cy - new / 2:.1f} {new:.1f} {new:.1f}", new


def build_symbol(icon_id: str, filename: str) -> str:
    svg = (SRC / filename).read_text()
    vb, side = crop_for(icon_id)
    main_sw = side * STROKE_RATIO        # bold weight for the main outlines
    paths = []
    for attrs in PATH_RE.findall(svg):
        dm = D_RE.search(attrs)
        if not dm:
            continue
        d = dm.group(1)
        fr = ' fill-rule="evenodd"' if EVENODD_RE.search(attrs) else ""
        swm = SW_RE.search(attrs)
        orig = float(swm.group(1)) if swm else BASE_STROKE
        sw = round(main_sw * orig / BASE_STROKE, 1)   # keep each path's relative weight
        paths.append(f'<path{fr} stroke-width="{sw}" d="{d}"/>')
    body = "".join(paths)
    return f'      <symbol id="{icon_id}" viewBox="{vb}">{body}</symbol>'


def main():
    syms = [build_symbol(i, f) for i, f in ICONS.items()]
    out = (
        '  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">\n'
        "    <defs>\n" + "\n".join(syms) + "\n    </defs>\n  </svg>"
    )
    pathlib.Path(__file__).with_name("sprite.html").write_text(out)
    sys.stderr.write(f"wrote sprite.html ({len(out)} bytes, crops={'yes' if crops else 'no'})\n")


if __name__ == "__main__":
    main()
