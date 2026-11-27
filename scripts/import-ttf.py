#!/usr/bin/env python3
"""Rasterize an open-licensed (OFL) TrueType font into an `easyfont/1` source file.

Dev-time helper (needs Pillow with FreeType). The output is a plain .easyfont that the normal CLI checks,
renders and exports on any OS; Easy Font itself never needs Python or the TTF at runtime.

    python3 scripts/import-ttf.py Sarabun-Medium.ttf --size 14 --id sarabun-px-14 \
        --name "Sarabun Pixel 14" --th "สารบรรณ พิกเซล 14" --out samples/fonts/sarabun-px-14.easyfont

Glyphs are drawn by FreeType's monochrome (hinted, 1-bit) rasterizer: crisp pixels, no anti-aliasing.
Thai combining marks become zero-width `mark` glyphs at their default (high) height; Easy Font generates the low,
left and tailless presentation forms (ญ / ฐ without the part under the baseline are cropped here).
"""
import argparse
from PIL import ImageFont

MARKS = [0x0E31] + list(range(0x0E34, 0x0E3B)) + list(range(0x0E47, 0x0E4F))
TONES = list(range(0x0E48, 0x0E4C))
UPPER = [0x0E31, 0x0E34, 0x0E35, 0x0E36, 0x0E37, 0x0E47]
LOWER = [0x0E38, 0x0E39, 0x0E3A]
CHARS = (list(range(0x0E01, 0x0E3B)) + list(range(0x0E3F, 0x0E5C)) + list(range(0x21, 0x7F))
         + [0x2018, 0x2019, 0x201C, 0x201D, 0x2013, 0x2014, 0x2026, 0x00B7, 0x00D7, 0x00B0])


def ink(font, ch):
    """(rows as list[str], left, top) relative to the pen origin on the baseline; None for blank glyphs."""
    mask, (ox, oy) = font.getmask2(ch, mode="1", anchor="ls")
    w, h = mask.size
    px = [[mask.getpixel((x, y)) > 0 for x in range(w)] for y in range(h)]
    ys = [y for y in range(h) if any(px[y])]
    xs = [x for x in range(w) if any(px[y][x] for y in range(h))]
    if not ys:
        return None
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    rows = ["".join("#" if px[y][x] else "." for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
    return rows, ox + x0, oy + y0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ttf")
    ap.add_argument("--size", type=int, required=True)
    ap.add_argument("--id", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--th", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--spacing", type=int, default=1)
    ap.add_argument("--leftshift", type=int, default=None)
    ap.add_argument("--credit", default="")
    ap.add_argument("--patch", default=None, help="easyfont glyph blocks that replace rasterized glyphs (hand pixel edits)")
    a = ap.parse_args()
    font = ImageFont.truetype(a.ttf, a.size)
    g = {c: ink(font, chr(c)) for c in CHARS}
    missing = [hex(c) for c, v in g.items() if v is None and c not in (0x20,)]
    # Re-zone the Thai marks (hinted TTF marks at pixel sizes sit too close): body · blank · upper vowel · blank ·
    # tone (high form); lower vowels one blank row under the baseline. Letters keep their TTF rows.
    UPPERS = UPPER + [0x0E4D]  # nikhahit sits with the upper vowels (ำ = ํ + tone + า)
    TONECLS = TONES + [0x0E4C, 0x0E4E]
    th = lambda c: len(g[c][0])

    def fit(c, h):
        """Pixel-edit a mark down to h rows: drop rows that repeat their neighbour first, then middle rows."""
        rows, left, t = g[c]
        rows = list(rows)
        while len(rows) > h:
            dup = next((i for i in range(1, len(rows)) if rows[i] == rows[i - 1]), None)
            rows.pop(dup if dup is not None else len(rows) // 2)
        g[c] = (rows, left, t + (len(g[c][0]) - len(rows)))

    from collections import Counter
    for cls in (UPPERS, TONECLS, LOWER):
        common = Counter(th(c) for c in cls).most_common(1)[0][0]
        for c in cls:
            if th(c) > common:
                fit(c, common)
    TALL = (0x0E1B, 0x0E1D, 0x0E1F, 0x0E2C)
    body_h = max(-g[c][2] for c in range(0x0E01, 0x0E2F) if c not in TALL and g.get(c))
    upper_h = max(th(c) for c in UPPERS)
    tone_h = max(th(c) for c in TONECLS)
    above = max(-v[2] for c, v in g.items() if v and c not in MARKS)  # tallest letter (Latin caps, ป ฟ, ๆ …)
    need = body_h + 1 + upper_h + 1 + tone_h
    baseline = max(above, need) + 1
    body = baseline - body_h
    upper_bottom = body - 2
    tone_bottom = upper_bottom - upper_h - 1
    tops = {}
    for c in UPPERS: tops[c] = upper_bottom - th(c) + 1 - baseline
    for c in TONECLS: tops[c] = tone_bottom - th(c) + 1 - baseline
    for c in LOWER: tops[c] = 1
    for c, t in tops.items():
        rows, left, _ = g[c]
        g[c] = (rows, left, t)
    # ำ: nikhahit rows (above the body in the TTF) move up into the upper-vowel zone
    am_rows, am_left, am_top = g[0x0E33]
    split = next(i for i, r in enumerate(am_rows) if am_top + i >= -body_h and "#" in r)
    nik = [r for r in am_rows[:split] if "#" in r]
    aa = am_rows[split:]
    gap = (upper_bottom - baseline) - (-body_h) + 1  # rows between nikhahit bottom and body top (negative)
    g[0x0E33] = (nik + ["." * len(aa[0])] * (-gap - 1 if gap < -1 else 0) + aa, am_left, upper_bottom - len(nik) + 1 - baseline)
    bottom = max(v[2] + len(v[0]) - 1 for v in g.values() if v)
    line = baseline + bottom + 1
    row = lambda c: baseline + g[c][2]
    upper = min(row(c) for c in UPPERS)
    lower = baseline + 1
    lowshift = upper_bottom - tone_bottom
    stem = g[0x0E1B][0]
    leftshift = a.leftshift if a.leftshift is not None else len(stem[0]) - len(stem[0].rstrip("#")) + 1
    lowerdrop = max(0, row(0x0E0E) + th(0x0E0E) - baseline) if g.get(0x0E0E) else 0
    TONE_ROW = min(row(c) for c in TONECLS)
    line = max(line, lower + max(th(c) for c in LOWER) + lowerdrop)  # ุ ู dropped under ฎ ฏ stay inside the cell
    out = [
        f"# {a.name} · {a.th} — rasterized from an open-licensed TrueType font by scripts/import-ttf.py",
        f"# {a.credit}".rstrip(),
        "# SIL Open Font License 1.1 (see the OFL text shipped next to this font). Pixels: FreeType monochrome, size %d." % a.size,
        "format easyfont/1",
        f"id {a.id}",
        f"name {a.name}",
        f"th {a.th}",
        f"size {a.size}",
        f"line {line}",
        f"baseline {baseline}",
        f"spacing {a.spacing}",
        f"space {max(3, round(font.getlength(' ')))}",
        f"zones tone={TONE_ROW} upper={upper} body={body} lower={lower} lowshift={lowshift} leftshift={leftshift} lowerdrop={lowerdrop}",
        "",
    ]

    def emit(code, rows, top_row, mark=False, dx=0):
        key = chr(code) if 0x21 <= code < 0x7F or 0x0E01 <= code <= 0x0E5B and code not in MARKS else f"U+{code:04X}"
        if key in ("#",):
            key = f"U+{code:04X}"
        opts = (" mark" if mark else "") + (f" dx={dx}" if dx else "")
        out.append(f"g {key} {top_row}{opts}")
        out.extend(rows)
        out.append("")

    for c in CHARS:
        v = g[c]
        if not v:
            continue
        rows, left, t = v
        tr = baseline + t
        if c in MARKS:
            emit(c, rows, tr, mark=True)
            continue
        if left >= 0:
            emit(c, ["." * left + r for r in rows], tr)
        else:
            emit(c, rows, tr, dx=left)  # e.g. ำ: the nikhahit hangs over the previous letter
    # hand-drawn forms in the other fonts: ญ / ฐ without the part below the baseline
    for code, src in ((0xF70F, 0x0E0D), (0xF700, 0x0E10)):
        rows, left, t = g[src]
        keep = [r for i, r in enumerate(rows) if baseline + t + i < baseline]
        emit(code, ["." * max(0, left) + r for r in keep], baseline + t)
    if a.patch:
        blocks, cur = {}, None
        for ln in open(a.patch, encoding="utf-8").read().splitlines():
            if ln.startswith("g "):
                cur = ln.split()[1]
                blocks[cur] = [ln]
            elif cur and ln.strip() and not ln.startswith("# "):
                blocks[cur].append(ln)
        kept, skip = [], False
        for ln in out:
            if ln.startswith("g "):
                skip = ln.split()[1] in blocks
            if not skip:
                kept.append(ln)
            elif ln == "":
                skip = False
        out = kept + [x for b in blocks.values() for x in b + [""]]
    with open(a.out, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out))
    print(f"{a.id}: line {line} baseline {baseline} body {body} lowshift {lowshift} leftshift {leftshift} lowerdrop {lowerdrop} missing {missing}")


if __name__ == "__main__":
    main()
