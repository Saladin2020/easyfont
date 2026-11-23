export const FORMAT = "easyfont/1";
export const EXPORT_PRESETS = ["bmfont", "godot", "pixi", "png", "all"] as const;
export type ExportPreset = (typeof EXPORT_PRESETS)[number];

export interface Zones {
  /** Top row of tone marks in their default (high) position. */
  tone: number;
  /** Top row of upper vowels. */
  upper: number;
  /** Top row of the Thai consonant body (x-height). */
  body: number;
  /** Top row of lower vowels. */
  lower: number;
  /** Rows a tone mark moves down when there is no upper vowel. */
  lowshift: number;
  /** Columns marks move left over tall letters (ป ฝ ฟ ฬ). */
  leftshift: number;
  /** Rows lower vowels move down under ฎ ฏ (0 = they already clear the tail). */
  lowerdrop: number;
}

export interface GlyphSrc {
  cp: number;
  top: number;
  rows: string[];
  mark: boolean;
  dx: number;
  line: number;
}

export interface FontSource {
  format: string;
  id: string;
  name: string;
  th: string;
  size: number;
  line: number;
  baseline: number;
  spacing: number;
  space: number;
  zones: Zones;
  glyphs: GlyphSrc[];
  /** Original text (for saving back). */
  text?: string;
}

/** A compiled glyph: ink bitmap (w × h, row-major 0/1) placed at (xoff, yoff) from the pen / cell top. */
export interface Glyph {
  cp: number;
  w: number;
  h: number;
  xoff: number;
  yoff: number;
  adv: number;
  bits: Uint8Array;
  mark: boolean;
  /** Generated presentation form (PUA) or source glyph. */
  derived?: string;
}

export interface CompiledFont {
  id: string;
  name: string;
  size: number;
  line: number;
  baseline: number;
  spacing: number;
  zones: Zones;
  glyphs: Map<number, Glyph>;
}

export interface Diagnostic {
  path: string;
  message: string;
  severity: "error" | "warning";
}
