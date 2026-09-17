"""Outline approved variable fonts at explicit weights (requires fonttools)."""
import html
import json
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

if len(sys.argv) > 1:
    directory = Path(sys.argv[1])
    jobs = []
    for size in (250, 100):
        jobs.extend([
            {"font": str(directory / "Exo2-Variable.ttf"), "weight": 700, "size": size, "text": "AMP"},
            {"font": str(directory / "Exo2-Variable.ttf"), "weight": 700, "size": size, "text": "MATRIX"},
            {"font": str(directory / "Inter-Variable.ttf"), "weight": 600, "size": 88 if size == 250 else 24, "text": "AMPLIFIER CARD FOR HOME ASSISTANT"},
        ])
else:
    jobs = json.load(sys.stdin)
results = []
fonts = {}
for job in jobs:
    key = (job["font"], job["weight"])
    if key not in fonts:
        font = TTFont(job["font"])
        if "fvar" in font:
            font = instantiateVariableFont(font, {"wght": job["weight"]}, inplace=True)
        fonts[key] = font
    font = fonts[key]
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = job["size"] / font["head"].unitsPerEm
    cursor = 0
    paths = []
    for character in job["text"]:
        glyph = glyphs[cmap[ord(character)]]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        data = pen.getCommands()
        if data:
            paths.append(f'<path transform="translate({cursor} 0)" d="{data}"/>')
        cursor += glyph.width
    results.append({"width": cursor * scale, "paths": f'<g aria-label="{html.escape(job["text"])}" transform="scale({scale} {-scale})">{"".join(paths)}</g>'})
json.dump(results, sys.stdout)
