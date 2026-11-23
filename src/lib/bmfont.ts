import type { CompiledFont, Glyph } from "../shared/types.js";

export interface AtlasChar {
  cp: number;
  x: number;
  y: number;
  w: number;
  h: number;
  xoff: number;
  yoff: number;
  adv: number;
}

export interface Atlas {
  width: number;
  height: number;
  /** RGBA, white ink on transparent (tint it in the engine). */
  data: Uint8Array;
  chars: AtlasChar[];
}

/**
 * Pack every glyph (source + generated Thai presentation forms) into one atlas page. Forms that share a bitmap with
 * their source glyph share its atlas cell, so the PUA copies cost nothing.
 */
export function buildAtlas(font: CompiledFont, pad = 1): Atlas {
  const glyphs = [...font.glyphs.values()].sort((a, b) => a.cp - b.cp);
  const cellOf = new Map<string, { x: number; y: number }>();
  const key = (g: Glyph) => `${g.w}x${g.h}:${Buffer.from(g.bits).toString("base64")}`;
  const uniq: Glyph[] = [];
  for (const g of glyphs) if (g.w && g.h && !cellOf.has(key(g))) {
    cellOf.set(key(g), { x: 0, y: 0 });
    uniq.push(g);
  }
  const area = uniq.reduce((s, g) => s + (g.w + pad) * (g.h + pad), 0);
  let width = 64;
  while (width * width < area * 1.6) width *= 2;
  // shelf pack, tallest first
  const order = [...uniq].sort((a, b) => b.h - a.h || b.w - a.w || a.cp - b.cp);
  let x = pad;
  let y = pad;
  let shelf = 0;
  for (const g of order) {
    if (x + g.w + pad > width) {
      x = pad;
      y += shelf + pad;
      shelf = 0;
    }
    cellOf.set(key(g), { x, y });
    x += g.w + pad;
    shelf = Math.max(shelf, g.h);
  }
  let height = 16;
  while (height < y + shelf + pad) height *= 2;
  const data = new Uint8Array(width * height * 4);
  for (const g of uniq) {
    const c = cellOf.get(key(g))!;
    for (let yy = 0; yy < g.h; yy++)
      for (let xx = 0; xx < g.w; xx++)
        if (g.bits[yy * g.w + xx]) data.set([255, 255, 255, 255], ((c.y + yy) * width + c.x + xx) * 4);
  }
  const chars = glyphs.map((g) => {
    const c = g.w && g.h ? cellOf.get(key(g))! : { x: 0, y: 0 };
    return { cp: g.cp, x: c.x, y: c.y, w: g.w, h: g.h, xoff: g.xoff, yoff: g.yoff, adv: g.adv };
  });
  return { width, height, data, chars };
}

/** AngelCode BMFont text format (.fnt) — read by Godot 4 (imports as FontFile), PixiJS v8, Phaser, LibGDX, Love2D… */
export function bmfontText(font: CompiledFont, atlas: Atlas, png: string): string {
  const q = (s: string) => `"${s.replace(/"/g, "'")}"`;
  const lines = [
    `info face=${q(font.name)} size=${font.size} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=1 padding=0,0,0,0 spacing=1,1 outline=0`,
    `common lineHeight=${font.line} base=${font.baseline} scaleW=${atlas.width} scaleH=${atlas.height} pages=1 packed=0 alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4`,
    `page id=0 file=${q(png)}`,
    `chars count=${atlas.chars.length}`,
    ...atlas.chars.map((c) => `char id=${c.cp} x=${c.x} y=${c.y} width=${c.w} height=${c.h} xoffset=${c.xoff} yoffset=${c.yoff} xadvance=${c.adv} page=0 chnl=15`),
    "kernings count=0",
  ];
  return `${lines.join("\n")}\n`;
}

/** Minimal BMFont text parser (tests and the editor read exports back with it). */
export function parseBmfont(text: string) {
  const attrs = (line: string) => {
    const o: Record<string, string> = {};
    for (const m of line.matchAll(/(\w+)=("[^"]*"|\S+)/g)) o[m[1]!] = m[2]!.replace(/^"|"$/g, "");
    return o;
  };
  const out = { info: {} as Record<string, string>, common: {} as Record<string, string>, pages: [] as string[], chars: new Map<number, Record<string, number>>() };
  for (const line of text.split(/\r?\n/)) {
    const tag = line.split(" ")[0];
    const a = attrs(line);
    if (tag === "info") out.info = a;
    else if (tag === "common") out.common = a;
    else if (tag === "page") out.pages.push(a.file ?? "");
    else if (tag === "char") out.chars.set(Number(a.id), Object.fromEntries(Object.entries(a).map(([k, v]) => [k, Number(v)])));
  }
  return out;
}
