import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkStacking, SAMPLE_LATIN, SAMPLE_TH, type StackIssue } from "../shared/check.js";
import { compileFont, missingChars } from "../shared/compile.js";
import { cpLabel, parseChar, parseFont } from "../shared/parse.js";
import { shapeThai } from "../shared/shape.js";
import type { CompiledFont, Diagnostic, FontSource } from "../shared/types.js";
import { assertSafeId, pkgRoot, resolveWorkspace, SAMPLES_DIR } from "./fsx.js";

export { resolveWorkspace };

export const dirs = (root: string) => ({ fonts: path.join(root, "fonts"), exports: path.join(root, "exports") });

/** Characters a finished Easy Font covers: Thai (U+0E01–0E5B), printable ASCII, common punctuation. */
export const COVERAGE = (() => {
  const s: number[] = [];
  for (let c = 0x0e01; c <= 0x0e3a; c++) s.push(c);
  for (let c = 0x0e3f; c <= 0x0e5b; c++) s.push(c);
  for (let c = 0x21; c <= 0x7e; c++) s.push(c);
  s.push(0x2018, 0x2019, 0x201c, 0x201d, 0x2013, 0x2014, 0x2026, 0xb7, 0xd7, 0xb0);
  return s;
})();

export async function initWorkspace(root: string, opts: { force?: boolean } = {}) {
  const d = dirs(root);
  await mkdir(d.fonts, { recursive: true });
  const written: string[] = [];
  for (const f of await readdir(path.join(SAMPLES_DIR, "fonts"))) {
    const dst = path.join(d.fonts, f);
    if (existsSync(dst) && !opts.force) continue;
    await copyFile(path.join(SAMPLES_DIR, "fonts", f), dst);
    written.push(dst);
  }
  // OFL.txt (the มะขาม fonts) + OFL-<Source>.txt for fonts rasterized from an open-licensed TTF (Sarabun Pixel)
  for (const lic of (await readdir(path.join(pkgRoot, "samples"))).filter((f) => /^OFL(-[A-Za-z0-9]+)?\.txt$/.test(f))) {
    const dst = path.join(d.fonts, lic);
    if (existsSync(dst) && !opts.force) continue;
    await copyFile(path.join(pkgRoot, "samples", lic), dst);
    written.push(dst);
  }
  return written;
}

export const fontFile = (root: string, id: string) => path.join(dirs(root).fonts, `${assertSafeId(id, "font id")}.easyfont`);

export async function fontIds(root: string): Promise<string[]> {
  if (!existsSync(dirs(root).fonts)) return [];
  return (await readdir(dirs(root).fonts)).filter((f) => f.endsWith(".easyfont")).map((f) => f.slice(0, -9)).filter((id) => /^[a-z0-9][a-z0-9_-]*$/.test(id)).sort();
}

export interface LoadedFont {
  id: string;
  file: string;
  text: string;
  source: FontSource;
  font: CompiledFont;
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

export async function loadFont(root: string, id: string): Promise<LoadedFont> {
  const file = fontFile(root, id);
  if (!existsSync(file)) throw new Error(`No font "${id}" (fonts/${id}.easyfont). Fonts: ${(await fontIds(root)).join(", ") || "none — run easyfont init"}`);
  const text = await readFile(file, "utf8");
  return fromText(id, file, text);
}

export function fromText(id: string, file: string, text: string): LoadedFont {
  const p = parseFont(text, `fonts/${id}.easyfont`);
  const c = compileFont(p.font);
  if (p.font.id && p.font.id !== id) p.errors.push({ path: `fonts/${id}.easyfont`, message: `id "${p.font.id}" does not match the file name`, severity: "error" });
  return { id, file, text, source: p.font, font: c.font, errors: p.errors, warnings: [...p.warnings, ...c.warnings] };
}

export async function loadFontStrict(root: string, id: string): Promise<LoadedFont> {
  const f = await loadFont(root, id);
  if (f.errors.length) throw new Error(`fonts/${id}.easyfont has errors:\n${f.errors.map((e) => `  ${e.path}: ${e.message}`).join("\n")}`);
  return f;
}

export async function saveFont(root: string, id: string, text: string, opts: { dryRun?: boolean } = {}) {
  const file = fontFile(root, id);
  const f = fromText(id, file, text);
  if (f.errors.length || opts.dryRun) return { saved: false, file, errors: f.errors, warnings: f.warnings };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text.endsWith("\n") ? text : `${text}\n`);
  return { saved: true, file, errors: [], warnings: f.warnings };
}

/** Replace (or append) one glyph block in the source text, keeping everything else (comments, order) as written. */
export function replaceGlyph(text: string, ch: string, block: { top: number; rows: string[]; mark?: boolean; dx?: number } | null): string {
  const cp = parseChar(ch);
  if (cp === null) throw new Error(`Bad character "${ch}" (one character or U+XXXX)`);
  for (const r of block?.rows ?? []) if (!/^[#.]+$/.test(r)) throw new Error(`Bad row "${r}" (use # and .)`);
  const lines = text.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = /^g\s+(\S+)/.exec(lines[i]!.trim());
    if (m && parseChar(m[1]!) === cp) {
      start = i;
      break;
    }
  }
  const tok = block?.mark || cp < 0x21 || (cp >= 0xe000 && cp <= 0xf8ff) || cp === 0x23 ? cpLabel(cp) : String.fromCodePoint(cp);
  const head = block ? [`g ${tok} ${block.top}${block.mark ? " mark" : ""}${block.dx ? ` dx=${block.dx}` : ""}`, ...block.rows] : [];
  if (start < 0) {
    if (!block) throw new Error(`No glyph ${cpLabel(cp)} to delete`);
    const body = text.replace(/\s*$/, "");
    return `${body}\n\n${head.join("\n")}\n`;
  }
  let end = start + 1;
  while (end < lines.length && /^[#.]+$/.test(lines[end]!.trim()) && !lines[end]!.trim().startsWith("# ")) end++;
  lines.splice(start, end - start, ...head);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

export async function setGlyph(root: string, id: string, ch: string, block: { top: number; rows: string[]; mark?: boolean; dx?: number } | null, opts: { dryRun?: boolean } = {}) {
  const f = await loadFont(root, id);
  return saveFont(root, id, replaceGlyph(f.text, ch, block), opts);
}

export interface FontCheck {
  id: string;
  ok: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  glyphs: number;
  forms: number;
  missing: string[];
  stacking: StackIssue[];
  samples: number;
}

export async function checkFont(root: string, id: string, extra: string[] = []): Promise<FontCheck> {
  const f = await loadFont(root, id);
  const drawn = new Set(f.source.glyphs.map((g) => g.cp));
  const missing = COVERAGE.filter((c) => !drawn.has(c) && !(c === 0x0e33 && drawn.has(0x0e4d) && drawn.has(0x0e32))).map((c) => String.fromCodePoint(c));
  const texts = [...SAMPLE_TH, ...SAMPLE_LATIN, ...extra];
  const stacking = f.errors.length ? [] : checkStacking(f.font, texts);
  const forms = [...f.font.glyphs.values()].filter((g) => g.derived).length;
  return { id, ok: !f.errors.length && !stacking.length && !missing.length, errors: f.errors, warnings: f.warnings, glyphs: f.source.glyphs.length, forms, missing, stacking, samples: texts.length };
}

export async function workspaceSummary(root: string) {
  const fonts = [];
  for (const id of await fontIds(root)) {
    try {
      const f = await loadFont(root, id);
      fonts.push({ id, name: f.source.name, th: f.source.th, size: f.source.size, line: f.source.line, baseline: f.source.baseline, glyphs: f.source.glyphs.length, errors: f.errors.length, file: `fonts/${id}.easyfont` });
    } catch (e) {
      fonts.push({ id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { workspace: root, fonts, samples: { th: SAMPLE_TH, latin: SAMPLE_LATIN } };
}

/** Code points of a text after Thai shaping (handy for engines and tests). */
export function shapeInfo(text: string) {
  const shaped = shapeThai(text);
  return { shaped, codepoints: [...shaped].map((c) => cpLabel(c.codePointAt(0)!)) };
}

export { missingChars };
