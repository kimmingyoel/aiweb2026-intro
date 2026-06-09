#!/usr/bin/env python3
"""Subset the Memoment Kkukkukk handwriting font to the page's actual text.

The full font lives in moses-web (public/fonts/, ~5.6 MB) and covers all
11,172 Hangul syllables; shipping it whole is wasteful for a one-page site,
so fonts/MemomentKkukkukk.woff2 is a subset. The catch: a copy edit that
introduces a new syllable needs a re-run of this script, or the new glyphs
silently fall back to the system font (mixed-typeface text).

We simply subset to every character that appears in index.html — markup is
ASCII and ASCII glyphs are tiny, so this can never miss rendered text.

Requires fontTools + brotli:  pip install fonttools brotli
"""
import os
import pathlib
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent
DEFAULT_SRC = ROOT.parent / "moses-web" / "public" / "fonts" / "MemomentKkukkukk.woff2"
SRC = pathlib.Path(os.environ.get("MOSES_FONT_SRC", DEFAULT_SRC))
OUT = ROOT / "fonts" / "MemomentKkukkukk.woff2"

# headroom: punctuation/symbols the copy is likely to grow into
EXTRA = "“”‘’…·—–₩%+~©"


def main():
    text = (ROOT / "index.html").read_text() + EXTRA
    options = subset.Options()
    options.flavor = "woff2"
    font = subset.load_font(str(SRC), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    subset.save_font(font, str(OUT), options)
    kb = OUT.stat().st_size / 1024
    import sys
    sys.stderr.write(f"wrote {OUT.name} ({kb:.0f} KiB) from {SRC}\n")


if __name__ == "__main__":
    main()
