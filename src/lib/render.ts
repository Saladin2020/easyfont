import { layoutText, renderLayout } from "../shared/layout.js";
import type { CompiledFont } from "../shared/types.js";
import { encodePng } from "./png.js";
import { hex, Raster } from "./raster.js";

export interface RenderOptions {
  scale?: number;
  color?: string;
  bg?: string | null;
  pad?: number;
  maxWidth?: number;
  lineGap?: number;
}

/** Text → raster (ink colour on bg, nearest-neighbour scaled). */
export function renderTextRaster(font: CompiledFont, text: string, o: RenderOptions = {}): { raster: Raster; missing: string[]; lines: number } {
  const lay = layoutText(font, text, { maxWidth: o.maxWidth, lineGap: o.lineGap });
  const ink = renderLayout(lay, hex(o.color ?? "#2a1606"), o.pad ?? 2);
  const s = Math.max(1, Math.min(16, Math.floor(o.scale ?? 1)));
  const r = new Raster(ink.width * s, ink.height * s, o.bg === null ? undefined : (o.bg ?? "#f7ebd3"));
  for (let y = 0; y < ink.height; y++)
    for (let x = 0; x < ink.width; x++) {
      const i = (y * ink.width + x) * 4;
      if (!ink.data[i + 3]) continue;
      r.rect(x * s, y * s, s, s, [ink.data[i]!, ink.data[i + 1]!, ink.data[i + 2]!, 255]);
    }
  return { raster: r, missing: lay.missing, lines: lay.lines };
}

export function renderTextPng(font: CompiledFont, text: string, o: RenderOptions = {}) {
  const { raster, missing, lines } = renderTextRaster(font, text, o);
  return { png: encodePng(raster.width, raster.height, raster.data), width: raster.width, height: raster.height, missing, lines };
}

/** A dialogue-box style preview: panel, frame and the text inside it (what the font is for). */
export function dialogueRaster(font: CompiledFont, speaker: string, text: string, width = 320, scale = 3): Raster {
  const lay = layoutText(font, text, { maxWidth: width - 20 });
  const body = renderLayout(lay, hex("#f7ebd3"), 0);
  const nameLay = layoutText(font, speaker);
  const name = renderLayout(nameLay, hex("#2a1606"), 0);
  const h = body.height + 26 + font.line;
  const r = new Raster(width, h, "#140e0a");
  r.rect(2, font.line / 2 + 4, width - 4, h - font.line / 2 - 6, "#523822");
  r.rect(4, font.line / 2 + 6, width - 8, h - font.line / 2 - 10, "#2a1d13");
  r.rect(10, 2, name.width + 10, name.height + 2, "#f4ae3d");
  const blit = (img: { width: number; height: number; data: Uint8Array }, ox: number, oy: number) => {
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        if (img.data[i + 3]) r.set(ox + x, oy + y, [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, 255]);
      }
  };
  blit(name, 15, 3);
  blit(body, 10, font.line + 8);
  return r.scaled(scale);
}
