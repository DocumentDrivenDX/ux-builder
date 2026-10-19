"""Pick a theme's highlight colour out of its logo, and make it legible.

The accent is not decoration here. `--accent` is used as TEXT (the kickers
above every answer), as focus rings, and as the ground under white glyphs, so
a colour lifted straight from a logo can be brand-correct and still unreadable
on one of the two appearances.

So this does three things in order:

  1. Pull the candidate colours out of the artwork, ignoring the ones that are
     structure rather than identity: ink, paper, flat greys, and the dark or
     pale near-colours that are really one of those wearing a tint.
  2. Rank what is left by how much of the artwork it covers. Once ink, paper
     and greys are gone, everything remaining is a brand colour, and the one
     covering the most is the one a person would name. Saturation only breaks
     ties — picking the most saturated instead lands on the violet tip of
     one test product's blue gradient, which is nobody's idea of its brand colour.
  3. Fit the winner to each ground, keeping its hue and moving only its
     lightness until it clears the contrast floor. A theme needs TWO accents:
     Claude-like itself ships #D97757 on its dark ground and a deeper #C15F3C
     on its light one, for exactly this reason.

    python tools/theme_accent.py logo-dark.svg logo-light.svg
    python tools/theme_accent.py --ground '#1B1A19,#F0EEE6' mark.png

SVG and PNG both. An SVG names its colours, so they are read from the markup
and weighted by how often they appear. A PNG only has pixels, so they are
counted by area, with transparent pixels skipped and near-neighbours folded
together — otherwise a single anti-aliased edge fragments the brand colour
into a thousand shades of almost-itself and none of them wins.

Reports what it chose, what it had to move, and by how much. A colour that had
to travel a long way to become legible is a sign the brand and the ground
disagree, and that is worth a person's judgement rather than a silent fix.
"""
from __future__ import annotations

import argparse
import colorsys
import re
import struct
import sys
import zlib
from pathlib import Path

# Text on a ground. The UI floor (3:1) is lower, but the accent is used for
# words, so the word floor is the one that binds.
MIN_CONTRAST = 4.5

DARK_GROUND = "#1B1A19"      # the Claude-like working ground
LIGHT_GROUND = "#F0EEE6"

HEX = re.compile(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b")
RGB_FN = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", re.I)

NAMED = {
    "red": "#FF0000", "green": "#008000", "blue": "#0000FF", "orange": "#FFA500",
    "purple": "#800080", "teal": "#008080", "navy": "#000080", "maroon": "#800000",
    "olive": "#808000", "gold": "#FFD700", "coral": "#FF7F50", "crimson": "#DC143C",
}


def to_rgb(token: str) -> tuple[int, int, int] | None:
    t = token.strip().lower()
    if t in NAMED:
        t = NAMED[t]
    m = HEX.fullmatch(t) or HEX.match(t)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    m = RGB_FN.match(t)
    if m:
        return tuple(min(255, int(g)) for g in m.groups())
    return None


def _lin(v: float) -> float:
    c = v / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb) -> float:
    r, g, b = (_lin(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def hexof(rgb) -> str:
    return "#" + "".join(f"{max(0, min(255, int(round(v)))):02X}" for v in rgb)


def chroma(rgb) -> float:
    """How much colour, as opposed to how much light. 0 for any grey."""
    r, g, b = (v / 255 for v in rgb)
    return max(r, g, b) - min(r, g, b)


def lightness(rgb) -> float:
    r, g, b = (v / 255 for v in rgb)
    return (max(r, g, b) + min(r, g, b)) / 2


# A brand accent is saturated AND mid-toned. Chroma alone is not enough: a deep
# navy wordmark carries real chroma and is still ink, and picking it yields a
# colour that has to travel halfway across the spectrum to become legible —
# which is what happened to one test product's own logo the first time this ran.
MIN_CHROMA = 0.20
LIGHT_BAND = (0.18, 0.92)


def is_identity(rgb) -> bool:
    """A colour a person would name, rather than ink, paper or an edge."""
    return chroma(rgb) >= MIN_CHROMA and LIGHT_BAND[0] <= lightness(rgb) <= LIGHT_BAND[1]


# ------------------------------------------------------------------ PNG --
# Decoded here rather than with an image library, because the only thing this
# needs is pixels and the alternative is a dependency in the server's own
# requirements for the sake of a development tool.

_FILTER_ERR = "unsupported PNG filter {}"


def _unfilter(raw: bytes, width: int, height: int, bpp: int) -> bytearray:
    """Undo the per-scanline filters. Stride is bytes per row, not pixels."""
    stride = width * bpp
    out = bytearray(stride * height)
    prev = bytearray(stride)
    pos = 0
    for y in range(height):
        ftype = raw[pos]
        pos += 1
        line = bytearray(raw[pos:pos + stride])
        pos += stride
        if ftype == 1:                                   # Sub
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 0xFF
        elif ftype == 2:                                 # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ftype == 3:                                 # Average
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:                                 # Paeth
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pred) & 0xFF
        elif ftype != 0:
            raise ValueError(_FILTER_ERR.format(ftype))
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return out


def png_pixels(data: bytes):
    """Yield (r, g, b, a) for a non-interlaced 8- or 16-bit PNG.

    Handles truecolour, truecolour+alpha, palette and greyscale, which covers
    every logo anyone has actually handed over. Interlaced files are refused by
    name rather than decoded wrongly.
    """
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    pos, idat, palette, trns = 8, bytearray(), None, None
    width = height = depth = ctype = interlace = 0
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", body)
        elif kind == b"PLTE":
            palette = body
        elif kind == b"tRNS":
            trns = body
        elif kind == b"IDAT":
            idat += body
        elif kind == b"IEND":
            break
    if interlace:
        raise ValueError("interlaced PNG — re-save without interlacing")
    if depth not in (8, 16):
        raise ValueError(f"{depth}-bit PNG — re-save as 8-bit")

    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(ctype)
    if channels is None:
        raise ValueError(f"unsupported PNG colour type {ctype}")
    step = depth // 8
    bpp = channels * step
    flat = _unfilter(zlib.decompress(bytes(idat)), width, height, bpp)

    # Sample rather than walk every pixel: ranking colours needs coverage, not
    # completeness, and a large logo would otherwise take seconds.
    total = width * height
    stride = max(1, int((total / 250_000) ** 0.5))
    for y in range(0, height, stride):
        row = y * width * bpp
        for x in range(0, width, stride):
            i = row + x * bpp
            px = [flat[i + c * step] for c in range(channels)]   # high byte if 16-bit
            if ctype == 3:
                idx = px[0]
                if palette is None or idx * 3 + 2 >= len(palette):
                    continue
                r, g, b = palette[idx * 3:idx * 3 + 3]
                a = trns[idx] if trns and idx < len(trns) else 255
            elif ctype == 0:
                r = g = b = px[0]; a = 255
            elif ctype == 4:
                r = g = b = px[0]; a = px[1]
            elif ctype == 2:
                r, g, b = px; a = 255
            else:
                r, g, b, a = px
            yield r, g, b, a


def png_candidates(data: bytes) -> dict[tuple[int, int, int], int]:
    """Colours by area, with the near-identical folded together.

    Anti-aliasing means a PNG has no flat colours at its edges. Rounding to a
    coarse grid before counting keeps one brand colour as one entry instead of
    several hundred neighbours that each lose to the background.
    """
    found: dict[tuple[int, int, int], int] = {}
    for r, g, b, a in png_pixels(data):
        if a < 128:                       # transparent enough not to be seen
            continue
        rgb = (r, g, b)
        if not is_identity(rgb):
            continue
        key = tuple((v // 12) * 12 + 6 for v in rgb)     # ~20 steps per channel
        found[key] = found.get(key, 0) + 1
    return found


def colours_from(path: Path) -> dict[tuple[int, int, int], int]:
    """Every colour a file offers, however it stores them."""
    raw = path.read_bytes()
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return png_candidates(raw)
    text = raw.decode("utf-8", errors="replace")
    return dict(candidates(text))


def candidates(svg: str) -> list[tuple[tuple[int, int, int], int]]:
    """Every colour the artwork mentions, with how often, most colourful first.

    Counts occurrences rather than pixels: an SVG does not have pixels until it
    is drawn, and a colour named once on the largest shape still matters. The
    count breaks ties between colours of similar chroma.
    """
    found: dict[tuple[int, int, int], int] = {}
    for token in re.findall(r'(?:fill|stroke|stop-color)\s*[:=]\s*["\']?([^"\';\s)]+)', svg, re.I):
        rgb = to_rgb(token)
        if rgb is None:
            continue
        # Structure, not identity.
        if not is_identity(rgb):
            continue
        found[rgb] = found.get(rgb, 0) + 1
    return sorted(found.items(), key=lambda kv: (-chroma(kv[0]), -kv[1]))


def fit(rgb, ground, floor: float = MIN_CONTRAST):
    """Keep the hue, move the lightness until it is readable on that ground.

    Returns (rgb, moved_by) where moved_by is the lightness distance travelled,
    so a caller can say how far the brand had to bend.
    """
    if contrast(rgb, ground) >= floor:
        return rgb, 0.0
    h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in rgb))
    toward = 1.0 if luminance(ground) < 0.2 else 0.0
    best, best_move = None, None
    step = 0.01
    moved = 0.0
    while moved <= 1.0:
        moved += step
        nl = min(1.0, max(0.0, l + (toward - l) * moved))
        cand = tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, nl, s))
        if contrast(cand, ground) >= floor:
            best, best_move = cand, abs(nl - l)
            break
    if best is None:
        best, best_move = ((255, 255, 255) if toward else (0, 0, 0)), 1.0
    return best, best_move


SHARE = 0.05        # a colour has to cover this much before it counts as the brand
KEEP = 3            # ...unless nothing does, in which case take the biggest few


def rank(pool: dict[tuple[int, int, int], int]) -> list[tuple[tuple[int, int, int], int]]:
    """The most of the artwork, among the colours that are identity at all.

    This took three passes to get right, and the wrong answers are instructive.

    Chroma first picked the most vivid pixel — on one test product's blue mark that is
    the violet tip of its gradient, which nobody would call the brand colour.
    Adding a coverage gate made it worse: the largest thing with any chroma was
    the near-black navy of the wordmark, ink rather than identity, and it had
    to travel halfway across the spectrum to become legible on a dark ground.

    What fixed it was doing the structural work in `is_identity` instead: once
    ink, paper, greys and their tinted near-neighbours are gone, everything
    left IS a brand colour, and the one covering the most artwork is the one a
    person would name. Chroma only breaks ties.
    """
    if not pool:
        return []
    total = sum(pool.values()) or 1
    significant = [(rgb, n) for rgb, n in pool.items() if n / total >= SHARE]
    if not significant:
        significant = sorted(pool.items(), key=lambda kv: -kv[1])[:KEEP]
    return sorted(significant, key=lambda kv: (-kv[1], -chroma(kv[0])))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("svg", nargs="+", metavar="FILE",
                    help="SVG or PNG files to read colours from")
    ap.add_argument("--ground", default=f"{DARK_GROUND},{LIGHT_GROUND}",
                    help="dark,light grounds the accent must be legible on")
    ap.add_argument("--floor", type=float, default=MIN_CONTRAST)
    args = ap.parse_args()

    dark_g, light_g = (to_rgb(g) for g in args.ground.split(","))

    pool: dict[tuple[int, int, int], int] = {}
    for path in args.svg:
        try:
            for rgb, n in colours_from(Path(path)).items():
                pool[rgb] = pool.get(rgb, 0) + n
        except ValueError as err:
            print(f"{path}: {err}", file=sys.stderr)
    ranked = rank(pool)

    if not ranked:
        print("no candidate colour in the artwork — it is monochrome.")
        print("keep the inherited accent and say so; do not invent one.")
        sys.exit(3)

    print(f"{'colour':<10} {'chroma':>6} {'weight':>7}   on dark      on light")
    for rgb, n in ranked[:6]:
        print(f"{hexof(rgb):<10} {chroma(rgb):>6.2f} {n:>7}   "
              f"{contrast(rgb, dark_g):>5.1f}:1      {contrast(rgb, light_g):>5.1f}:1")

    winner = ranked[0][0]
    on_dark, moved_d = fit(winner, dark_g, args.floor)
    on_light, moved_l = fit(winner, light_g, args.floor)

    print(f"\nchosen: {hexof(winner)}")
    print(f"  --accent (dark ground):  {hexof(on_dark)}   "
          f"{contrast(on_dark, dark_g):.1f}:1"
          f"{'' if moved_d == 0 else f'   (lightened {moved_d:.0%} to clear the floor)'}")
    print(f"  --accent (light ground): {hexof(on_light)}   "
          f"{contrast(on_light, light_g):.1f}:1"
          f"{'' if moved_l == 0 else f'   (darkened {moved_l:.0%} to clear the floor)'}")

    if max(moved_d, moved_l) > 0.25:
        print("\n  NOTE: the brand colour had to move a long way to become legible.")
        print("  That is a disagreement between the brand and the ground, not a")
        print("  detail — worth a person deciding rather than accepting silently.")


if __name__ == "__main__":
    main()
