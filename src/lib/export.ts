import path from "node:path";
import { SAMPLE_LATIN, SAMPLE_TH } from "../shared/check.js";
import { layoutText } from "../shared/layout.js";
import { shapeThai } from "../shared/shape.js";
import { EXPORT_PRESETS, type CompiledFont, type ExportPreset } from "../shared/types.js";
import { bmfontText, buildAtlas } from "./bmfont.js";
import { pkgRoot, resolveInside, RUNTIME_DIR, Writer } from "./fsx.js";
import { readdir } from "node:fs/promises";
import { encodePng } from "./png.js";
import { Raster } from "./raster.js";
import { dialogueRaster, renderTextRaster } from "./render.js";
import { dirs, fontIds, loadFontStrict, type LoadedFont } from "./workspace.js";
import { pickDefaultFont } from "../shared/defaults.js";

export { EXPORT_PRESETS, type ExportPreset };
export const VERSION = "0.1.0";

export interface ExportOptions {
  preset?: ExportPreset;
  out?: string;
  /** Fonts to export (default: all in fonts/). */
  fonts?: string[];
  trustedPaths?: boolean;
}

export interface ExportResult {
  dirs: string[];
  files: string[];
  fonts: Array<{ id: string; chars: number; atlas: string }>;
  warnings: string[];
}

/** Godot / Pixi parity cases: shaped code points for the samples plus tricky clusters. */
export const PARITY_TEXTS = [
  ...SAMPLE_TH,
  ...SAMPLE_LATIN,
  "กี่ ก่ ปี่ ป่ ฟื้น ฝั่ง ฬ้ ญุ ฐู ฎุ ฏู น้ำ ป่ำ ก็ ก์ กํ่ ก๎",
  "ก่ำ ปั๊ม ซื่อ ฤๅ ฦๅ ๆ ฯ",
  "A่ 5้ ่", // marks after non-letters
];

export function fontManifest(fonts: LoadedFont[]) {
  return {
    format: "easyfont-export/1",
    version: VERSION,
    default: fonts.length ? pickDefaultFont(fonts.map((f) => f.id)) : undefined,
    fonts: fonts.map((f) => ({ id: f.id, name: f.source.name, th: f.source.th, size: f.source.size, line: f.source.line, baseline: f.source.baseline, fnt: `${f.id}.fnt`, png: `${f.id}.png` })),
    samples: [...SAMPLE_TH.slice(0, 5), SAMPLE_LATIN[1]],
  };
}

async function writeBmfonts(w: Writer, fonts: LoadedFont[], sub: string, res: ExportResult) {
  for (const f of fonts) {
    const atlas = buildAtlas(f.font);
    await w.write(`${sub}${f.id}.png`, encodePng(atlas.width, atlas.height, atlas.data));
    await w.write(`${sub}${f.id}.fnt`, bmfontText(f.font, atlas, `${f.id}.png`));
    if (!res.fonts.some((x) => x.id === f.id)) res.fonts.push({ id: f.id, chars: atlas.chars.length, atlas: `${atlas.width}x${atlas.height}` });
  }
  for (const lic of (await readdir(path.join(pkgRoot, "samples"))).filter((f) => /^OFL(-[A-Za-z0-9]+)?\.txt$/.test(f))) await w.copy(path.join(pkgRoot, "samples", lic), `${sub}${lic}`);
  const m = fontManifest(fonts);
  await w.write(`${sub}fonts.json`, `${JSON.stringify(m, null, 2)}\n`);
}

export async function exportFonts(root: string, opts: ExportOptions = {}): Promise<ExportResult> {
  const preset = opts.preset ?? "all";
  if (!EXPORT_PRESETS.includes(preset)) throw new Error(`Unknown preset ${preset} (${EXPORT_PRESETS.join(", ")})`);
  if (preset === "all" && opts.out) throw new Error("--out needs a single preset (bmfont, godot, pixi or png)");
  const ids = opts.fonts?.length ? opts.fonts : await fontIds(root);
  if (!ids.length) throw new Error("No fonts in fonts/ (run easyfont init)");
  const fonts = [];
  for (const id of ids) fonts.push(await loadFontStrict(root, id));
  const presets: ExportPreset[] = preset === "all" ? ["bmfont", "godot", "pixi", "png"] : [preset];
  const res: ExportResult = { dirs: [], files: [], fonts: [], warnings: fonts.flatMap((f) => f.warnings.map((x) => `${x.path}: ${x.message}`)) };
  for (const p of presets) {
    const out = opts.out ? (opts.trustedPaths ? path.resolve(root, opts.out) : resolveInside(root, opts.out)) : path.join(dirs(root).exports, `easyfont-${p}`);
    const w = new Writer(out);
    if (p === "bmfont") await writeBmfonts(w, fonts, "", res);
    if (p === "png") await exportPng(w, fonts);
    if (p === "pixi") await exportPixi(w, fonts, res);
    if (p === "godot") await exportGodot(w, fonts, res);
    res.dirs.push(out);
    res.files.push(...w.files);
  }
  return res;
}

// ---------------------------------------------------------------- PNG specimens
export function specimenRaster(f: LoadedFont, scale = 3): Raster {
  const lines = [`${f.source.name} · ${f.source.th}  (${f.source.size}px, line ${f.source.line})`, "", ...SAMPLE_TH, "", ...SAMPLE_LATIN];
  return renderTextRaster(f.font, lines.join("\n"), { scale, pad: 6 }).raster;
}

export function glyphSheetRaster(font: CompiledFont, scale = 4): Raster {
  const drawn = [...font.glyphs.values()].filter((g) => !g.derived && g.cp > 0x20 && g.cp !== 0xa0 && g.cp !== 0x200b);
  const cols = 16;
  const cw = Math.max(...drawn.map((g) => g.w)) + 6;
  const ch = font.line + 4;
  const r = new Raster(cols * cw, Math.ceil(drawn.length / cols) * ch, "#f7ebd3");
  drawn.forEach((g, i) => {
    const ox = (i % cols) * cw;
    const oy = Math.floor(i / cols) * ch;
    r.rect(ox, oy + 2 + font.baseline, cw - 1, 1, "#e6d3ae");
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.bits[y * g.w + x]) r.set(ox + 3 + x, oy + 2 + g.yoff + y, g.mark ? "#b8432f" : "#2a1606");
  });
  return r.scaled(scale);
}

async function exportPng(w: Writer, fonts: LoadedFont[]) {
  for (const f of fonts) {
    const s = specimenRaster(f, f.source.size <= 8 ? 4 : 3);
    await w.write(`${f.id}-specimen.png`, encodePng(s.width, s.height, s.data));
    const g = glyphSheetRaster(f.font);
    await w.write(`${f.id}-glyphs.png`, encodePng(g.width, g.height, g.data));
    const d = dialogueRaster(f.font, "ป้านูรุล", "สวัสดีจ้ะ น้ำชาร้อนๆ ที่ร้านป้าเปิดแล้ว ปี่กับฟ้าก็มาช่วยปั้นขนมนะ");
    await w.write(`${f.id}-dialogue.png`, encodePng(d.width, d.height, d.data));
  }
}

// ---------------------------------------------------------------- PixiJS
async function exportPixi(w: Writer, fonts: LoadedFont[], res: ExportResult) {
  await writeBmfonts(w, fonts, "fonts/", res);
  await w.copy(path.join(RUNTIME_DIR, "pixi", "easyfont-core.js"), "easyfont-core.js");
  await w.copy(path.join(RUNTIME_DIR, "pixi", "easyfont-pixi.js"), "easyfont-pixi.js");
  await w.write("index.html", pixiDemo());
  await w.write("README.txt", `Easy Font ${VERSION} — PixiJS v8 export
Serve this folder over HTTP (fetch needs it):  python3 -m http.server   then open index.html

  fonts/<id>.fnt + .png   BMFont (white ink; BitmapText fill tints it). Also usable from any BMFont engine.
  fonts/fonts.json        font list (id, size, line height) for loadEasyFonts()
  easyfont-core.js        the Thai shaper (same code as the CLI)
  easyfont-pixi.js        loadEasyFonts(PIXI, "fonts/fonts.json") → { text(str, {font, fill, scale, wrap}), shape, measure, wrap }
  fonts/OFL.txt           the fonts are SIL Open Font License 1.1; the code is MIT
`);
}

function pixiDemo(): string {
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>Easy Font · PixiJS demo</title>
  <style>
    html, body { margin: 0; min-height: 100vh; background: #140e0a; color: #f7ebd3; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
    button { background: #3a2819; color: #f7ebd3; border: 1px solid #523822; padding: 3px 10px; cursor: pointer; }
    button.on { background: #f4ae3d; color: #2a1606; }
    canvas { image-rendering: pixelated; }
  </style>
</head>
<body>
  <div><button data-lang="th">ไทย</button> <button data-lang="ms">Bahasa Melayu</button> <button data-lang="en">English</button></div>
  <div id="stage"></div>
  <script type="module">
    async function pixi() {
      try { await import("./pixi.min.js"); if (globalThis.PIXI) return globalThis.PIXI; } catch {}
      return await import("https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs");
    }
    const PIXI = await pixi();
    const { loadEasyFonts } = await import("./easyfont-pixi.js");
    const S = 2;
    const app = new PIXI.Application();
    await app.init({ width: 480 * S, height: 270 * S, background: "#140e0a", antialias: false, resolution: 1 });
    document.getElementById("stage").appendChild(app.canvas);
    const ef = await loadEasyFonts(PIXI, "fonts/fonts.json");
    const LINES = {
      th: ["ป้านูรุล", "สวัสดีจ้ะ น้ำชาร้อนๆ ที่ร้านป้าเปิดแล้ว ปี่กับฟ้าก็มาช่วยปั้นขนมนะ"],
      ms: ["Mak Cik Nurul", "Selamat pagi! Teh tarik panas sudah siap di gerai mak cik. Jumpa lagi di pasar malam."],
      en: ["Auntie Nurul", "Good morning! The hot tea at my stall is ready — 50% off for early birds (today only)."],
    };
    const small = Object.keys(ef.fonts).find((k) => ef.fonts[k].size <= 8) ?? ef.manifest.default;
    const big = ef.manifest.default;
    let lang = new URLSearchParams(location.search).get("lang") ?? "th";
    const draw = () => {
      app.stage.removeChildren().forEach((c) => c.destroy({ children: true }));
      const root = new PIXI.Container();
      root.scale.set(S);
      app.stage.addChild(root);
      // every size comes from the font's line height, so the box fits มะขาม 16 (22 px) and มะขาม 12 (18 px)
      const lh = ef.fonts[big].line, sh = ef.fonts[small].line;
      const title = ef.text("Easy Font · " + (ef.fonts[big].th || big) + " / มะขาม 8", { font: big, fill: 0xf4ae3d });
      title.position.set(8, 6);
      root.addChild(title);
      ef.manifest.samples.forEach((s, i) => {
        const t = ef.text(s, { font: small, fill: 0xf7ebd3 });
        t.position.set(8, 8 + lh + i * sh);
        root.addChild(t);
      });
      const top = lh - 6, bodyY = lh + 4, hintY = bodyY + 2 * lh + 2, bottom = hintY + sh + 2;
      const box = new PIXI.Container();
      box.position.set(8, 268 - bottom);
      const [who, line] = LINES[lang];
      box.addChild(new PIXI.Graphics().rect(0, top, 464, bottom - top).fill(0x523822).rect(2, top + 2, 460, bottom - top - 4).fill(0x2a1d13).rect(10, 0, ef.measure(who, big) + 10, lh).fill(0xf4ae3d));
      const name = ef.text(who, { font: big, fill: 0x2a1606 });
      name.position.set(15, 0);
      const body = ef.text(line, { font: big, fill: 0xf7ebd3, wrap: 440 });
      body.position.set(12, bodyY);
      const hint = ef.text("1 ไทย · 2 Bahasa Melayu · 3 English", { font: small, fill: 0xa08a6a });
      hint.position.set(300, hintY);
      box.addChild(name, body, hint);
      root.addChild(box);
      document.querySelectorAll("[data-lang]").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
      window.__font = { ef, lang, lines: body.text.split("\\n").length };
    };
    document.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { lang = b.dataset.lang; draw(); }));
    addEventListener("keydown", (e) => { const k = { 1: "th", 2: "ms", 3: "en" }[e.key]; if (k) { lang = k; draw(); } });
    draw();
    window.__ready = true;
  </script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- Godot
export function parityData(fonts: LoadedFont[]) {
  const shape = PARITY_TEXTS.map((text) => ({ text, codes: [...shapeThai(text)].map((c) => c.codePointAt(0)!) }));
  const metrics: Record<string, Record<string, number>> = {};
  const probe = [...new Set([..."กขปฝฟฬญฐฎฏอaAgW.!", ...shapeThai("ปี่ ฟื้น ญุ ฐู ฎุ น้ำ ก่")])].map((c) => c.codePointAt(0)!);
  for (const f of fonts) metrics[f.id] = Object.fromEntries(probe.filter((cp) => f.font.glyphs.has(cp)).map((cp) => [String(cp), f.font.glyphs.get(cp)!.adv]));
  const def = fonts.find((f) => f.id === pickDefaultFont(fonts.map((x) => x.id))) ?? fonts[0]!;
  const lay = layoutText(def.font, "สวัสดีครับ");
  const measure = lay.placed.reduce((s, p) => s + p.g.adv, 0);
  return { shape, metrics, measure };
}

async function exportGodot(w: Writer, fonts: LoadedFont[], res: ExportResult) {
  const g = path.join(RUNTIME_DIR, "godot");
  await writeBmfonts(w, fonts, "easyfont/", res);
  for (const f of fonts) {
    await w.write(`easyfont/${f.id}.theme.tres`, `[gd_resource type="Theme" load_steps=2 format=3]

[ext_resource type="FontFile" path="res://easyfont/${f.id}.fnt" id="1"]

[resource]
default_font = ExtResource("1")
default_font_size = ${f.source.size}
`);
  }
  await w.write("easyfont/parity.json", `${JSON.stringify(parityData(fonts))}\n`);
  for (const f of ["easyfont.gd", "thai_shaper.gd"]) await w.copy(path.join(g, f), `easyfont/${f}`);
  for (const f of ["main.gd", "test_font.gd", "capture.gd"]) await w.copy(path.join(g, f), f);
  await w.write("main.tscn", `[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://main.gd" id="1"]

[node name="Main" type="Control"]
layout_mode = 3
anchors_preset = 0
offset_right = 480.0
offset_bottom = 270.0
script = ExtResource("1")
`);
  await w.write("project.godot", `; Engine configuration file.
config_version=5

[application]

config/name="Easy Font demo"
run/main_scene="res://main.tscn"
config/features=PackedStringArray("4.3")

[autoload]

EasyFont="*res://easyfont/easyfont.gd"

[display]

window/size/viewport_width=480
window/size/viewport_height=270
window/size/window_width_override=1440
window/size/window_height_override=810
window/stretch/mode="viewport"
window/stretch/scale_mode="integer"

[rendering]

textures/canvas_textures/default_texture_filter=0
renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
`);
  await w.write("README.txt", `Easy Font ${VERSION} — Godot 4.3+ export
Open this folder in Godot 4.3+ and press F5 (keys 1/2/3 switch ไทย / Bahasa Melayu / English), or copy easyfont/ into
your game and add  Project Settings → Autoload → res://easyfont/easyfont.gd  as "EasyFont".

  easyfont/<id>.fnt + .png    BMFont; Godot imports it as a FontFile (pixel-exact, no filtering)
  easyfont/<id>.theme.tres    Theme with the font as default (or set it on Easy UI's teak theme)
  easyfont/easyfont.gd        EasyFont autoload: shape(text), font(id), apply(label, text, id), measure, wrap, theme
  easyfont/thai_shaper.gd     EasyThaiShaper — Thai vowel / tone-mark stacking (parity-tested with the CLI)
  test_font.gd                godot --headless --path . --script res://test_font.gd   → prints OK
  capture.gd                  screenshot of the demo (needs a renderer)

Always pass Thai text through EasyFont.shape() (apply() does it for you). Turn Label autowrap off and use
EasyFont.wrap(text, id, width) — it breaks at spaces and U+200B (zero-width space) between Thai words.
Fonts: SIL Open Font License 1.1 (easyfont/OFL.txt). Code: MIT.
`);
}
