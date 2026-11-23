import { shapeThai } from "./shape.js";
import type { CompiledFont, Glyph } from "./types.js";

export interface Placed {
  g: Glyph;
  /** Pen-relative cell position: ink is drawn at (x + g.xoff, y + g.yoff). */
  x: number;
  y: number;
  /** Index of the cluster's base glyph in the placed list (for stacking checks). */
  base: number;
  line: number;
}

export interface Layout {
  placed: Placed[];
  width: number;
  height: number;
  lines: number;
  missing: string[];
}

/** Lay text out with a compiled font. Wraps at spaces / U+200B when maxWidth is set (Thai words: insert U+200B). */
export function layoutText(font: CompiledFont, text: string, opts: { shape?: boolean; maxWidth?: number; lineGap?: number } = {}): Layout {
  const s = opts.shape === false ? text : shapeThai(text);
  const lineH = font.line + (opts.lineGap ?? 0);
  const placed: Placed[] = [];
  const missing = new Set<string>();
  let x = 0;
  let line = 0;
  let width = 0;
  let base = -1;
  let lastBreak = -1; // index in placed after which we may break
  let lastBreakX = 0;
  const fallback = font.glyphs.get(0x3f);
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x0a) {
      line++;
      x = 0;
      base = -1;
      lastBreak = -1;
      continue;
    }
    let g = font.glyphs.get(cp);
    if (!g) {
      missing.add(ch);
      g = fallback;
      if (!g) continue;
    }
    if (!g.mark) base = placed.length;
    if (opts.maxWidth && !g.mark && x + g.adv > opts.maxWidth && lastBreak >= 0 && cp !== 0x20) {
      // move everything after the last break to the next line
      const shift = lastBreakX;
      line++;
      for (let k = lastBreak + 1; k < placed.length; k++) {
        placed[k]!.x -= shift;
        placed[k]!.y += lineH;
        placed[k]!.line = line;
      }
      x -= shift;
      lastBreak = -1;
    }
    placed.push({ g, x, y: line * lineH, base: g.mark ? Math.max(0, base) : placed.length, line });
    x += g.adv;
    if (cp === 0x20 || cp === 0x200b) {
      lastBreak = placed.length - 1;
      lastBreakX = x;
    }
    width = Math.max(width, x);
  }
  for (const p of placed) width = Math.max(width, p.x + p.g.xoff + p.g.w);
  return { placed, width: Math.max(0, width), height: (line + 1) * lineH, lines: line + 1, missing: [...missing] };
}

/** Rasterize a layout into an RGBA buffer (ink colour on transparent). */
export function renderLayout(lay: Layout, color: [number, number, number, number] = [0, 0, 0, 255], pad = 0): { width: number; height: number; data: Uint8Array } {
  const minX = Math.min(0, ...lay.placed.map((p) => p.x + p.g.xoff));
  const W = Math.max(1, lay.width - minX + pad * 2);
  const H = Math.max(1, lay.height + pad * 2);
  const data = new Uint8Array(W * H * 4);
  for (const p of lay.placed) {
    const ox = p.x + p.g.xoff - minX + pad;
    const oy = p.y + p.g.yoff + pad;
    for (let y = 0; y < p.g.h; y++)
      for (let x = 0; x < p.g.w; x++) {
        if (!p.g.bits[y * p.g.w + x]) continue;
        const X = ox + x;
        const Y = oy + y;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        data.set(color, (Y * W + X) * 4);
      }
  }
  return { width: W, height: H, data };
}
