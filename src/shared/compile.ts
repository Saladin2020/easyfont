import { cpLabel } from "./parse.js";
import { FORMS, TAIL } from "./shape.js";
import type { CompiledFont, Diagnostic, FontSource, Glyph, GlyphSrc } from "./types.js";

function bitsOf(g: GlyphSrc): { w: number; h: number; bits: Uint8Array; left: number } {
  const h = g.rows.length;
  let right = 0;
  let left = Infinity;
  for (const r of g.rows)
    for (let x = 0; x < r.length; x++)
      if (r[x] === "#") {
        right = Math.max(right, x + 1);
        left = Math.min(left, x);
      }
  if (left === Infinity) left = 0;
  const w = Math.max(0, right);
  const bits = new Uint8Array(w * h);
  g.rows.forEach((r, y) => {
    for (let x = 0; x < w; x++) if (r[x] === "#") bits[y * w + x] = 1;
  });
  return { w, h, bits, left };
}

/** Compile a parsed source: ink bitmaps, offsets and advances, plus the generated Thai presentation forms. */
export function compileFont(f: FontSource): { font: CompiledFont; warnings: Diagnostic[] } {
  const glyphs = new Map<number, Glyph>();
  const warnings: Diagnostic[] = [];
  for (const g of f.glyphs) {
    const { w, h, bits } = bitsOf(g);
    if (g.mark) glyphs.set(g.cp, { cp: g.cp, w, h, bits, xoff: -(w + f.spacing) + g.dx, yoff: g.top, adv: 0, mark: true });
    else glyphs.set(g.cp, { cp: g.cp, w, h, bits, xoff: Math.min(0, g.dx), yoff: g.top, adv: Math.max(0, w + f.spacing + g.dx), mark: false });
  }
  // space
  if (!glyphs.has(0x20)) glyphs.set(0x20, { cp: 0x20, w: 0, h: 0, bits: new Uint8Array(0), xoff: 0, yoff: 0, adv: f.space, mark: false });
  if (!glyphs.has(0x200b)) glyphs.set(0x200b, { cp: 0x200b, w: 0, h: 0, bits: new Uint8Array(0), xoff: 0, yoff: 0, adv: 0, mark: false });
  if (!glyphs.has(0xa0)) glyphs.set(0xa0, { ...glyphs.get(0x20)!, cp: 0xa0 });
  const z = f.zones;
  for (const spec of FORMS) {
    if (glyphs.has(spec.cp)) continue; // hand-drawn presentation form wins
    const src = glyphs.get(spec.src);
    if (!src) continue;
    const dy = spec.low ? z.lowshift : spec.lower ? z.lowerdrop : 0;
    const dx = spec.left ? -z.leftshift : 0;
    glyphs.set(spec.cp, { ...src, cp: spec.cp, xoff: src.xoff + dx, yoff: src.yoff + dy, derived: `${cpLabel(spec.src)}${spec.left ? " left" : ""}${spec.low ? " low" : ""}${spec.lower ? " drop" : ""}` });
  }
  for (const [base, alt] of TAIL) if (glyphs.has(base) && !glyphs.has(alt)) {
    glyphs.set(alt, { ...glyphs.get(base)!, cp: alt, derived: `${cpLabel(base)} (draw a tailless form for lower vowels)` });
    warnings.push({ path: `${f.id}`, message: `${String.fromCodePoint(base)} has no tailless form ${cpLabel(alt)}: lower vowels may touch its tail`, severity: "warning" });
  }
  // sara am fallback: nikhahit + sara aa if not drawn
  return { font: { id: f.id, name: f.name, size: f.size, line: f.line, baseline: f.baseline, spacing: f.spacing, zones: f.zones, glyphs }, warnings };
}

/** Character coverage of a compiled font against a text (after shaping). */
export function missingChars(font: CompiledFont, shaped: string): string[] {
  const miss = new Set<string>();
  for (const c of shaped) {
    const cp = c.codePointAt(0)!;
    if (cp === 0x0a || cp === 0x0d) continue;
    if (!font.glyphs.has(cp)) miss.add(c);
  }
  return [...miss];
}
