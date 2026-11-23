#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { serve } from "@hono/node-server";
import { Command } from "commander";
import open from "open";
import { createApp } from "./server/app.js";
import { defaultWebRoot } from "./server/base.js";
import { resolveToken } from "./shared/requestGuard.js";
import { cpLabel, parseChar } from "./shared/parse.js";
import { EXPORT_PRESETS, exportFonts, glyphSheetRaster, type ExportPreset } from "./lib/export.js";
import { encodePng } from "./lib/png.js";
import { dialogueRaster, renderTextPng } from "./lib/render.js";
import { checkFont, fontIds, initWorkspace, loadFont, loadFontStrict, resolveWorkspace, setGlyph, shapeInfo, workspaceSummary } from "./lib/workspace.js";

const program = new Command();

function workspaceOf(cli?: string): string {
  const v = cli?.trim() || process.env.EASYFONT_WORKSPACE?.trim() || process.env.EASYFONT_HOME?.trim() || process.cwd();
  return resolveWorkspace(v);
}
const fail = (e: unknown) => {
  console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
};
async function defaultFont(root: string, id?: string) {
  if (id) return id;
  const ids = await fontIds(root);
  return ids.find((x) => x.endsWith("12")) ?? ids[0] ?? "makham-12";
}

program.name("easyfont").description("Original Thai / Latin / Malay pixel bitmap fonts with correct Thai stacking → BMFont .fnt + PNG, Godot 4.3+ FontFile, PixiJS v8 BitmapFont").version("0.1.0");

program
  .command("init")
  .description("Create fonts/ with the sample fonts มะขาม 12 (dialogue) and มะขาม 8 (UI)")
  .option("--force", "Overwrite existing sample files")
  .option("--workspace <path>")
  .action(async (o: { force?: boolean; workspace?: string }) => {
    const root = workspaceOf(o.workspace);
    const files = await initWorkspace(root, { force: o.force });
    console.log(files.length ? `Wrote ${files.length} file(s) in ${root}:\n${files.map((f) => `  ${path.relative(root, f)}`).join("\n")}` : `Nothing to do (fonts/ already set up in ${root}; --force to overwrite)`);
  });

program
  .command("info")
  .description("Fonts in the workspace")
  .option("--json")
  .option("--workspace <path>")
  .action(async (o: { json?: boolean; workspace?: string }) => {
    const s = await workspaceSummary(workspaceOf(o.workspace));
    if (o.json) return console.log(JSON.stringify(s, null, 2));
    console.log(`Workspace ${s.workspace}`);
    for (const f of s.fonts) console.log("error" in f ? `  ${f.id}: ${f.error}` : `  ${f.id.padEnd(12)} ${f.name} · ${f.th}  ${f.size}px line ${f.line} base ${f.baseline}  ${f.glyphs} glyphs${f.errors ? `  ${f.errors} error(s)` : ""}`);
  });

program
  .command("list")
  .description("Glyphs of a font (character, code point, top row, width, mark)")
  .argument("[font]")
  .option("--marks", "Only combining marks")
  .option("--json")
  .option("--workspace <path>")
  .action(async (id: string | undefined, o: { marks?: boolean; json?: boolean; workspace?: string }) => {
    const root = workspaceOf(o.workspace);
    const f = await loadFont(root, await defaultFont(root, id));
    const rows = f.source.glyphs.filter((g) => !o.marks || g.mark).map((g) => ({ char: String.fromCodePoint(g.cp), cp: cpLabel(g.cp), top: g.top, rows: g.rows.length, width: Math.max(...g.rows.map((r) => r.length)), mark: g.mark, adv: f.font.glyphs.get(g.cp)?.adv ?? 0 }));
    if (o.json) return console.log(JSON.stringify(rows, null, 2));
    console.log(rows.map((r) => `${r.mark ? "◌" + r.char : r.char.padEnd(2)} ${r.cp} top ${r.top} ${r.width}×${r.rows} adv ${r.adv}${r.mark ? " mark" : ""}`).join("\n"));
    console.log(`${rows.length} glyph(s)`);
  });

program
  .command("show")
  .description("Print one glyph as # / . rows (with its compiled metrics) as JSON")
  .argument("<char>", "Character or U+XXXX")
  .option("--font <id>")
  .option("--workspace <path>")
  .action(async (ch: string, o: { font?: string; workspace?: string }) => {
    const root = workspaceOf(o.workspace);
    const f = await loadFont(root, await defaultFont(root, o.font));
    const cp = parseChar(ch);
    if (cp === null) throw new Error(`Bad character "${ch}"`);
    const src = f.source.glyphs.find((g) => g.cp === cp);
    const c = f.font.glyphs.get(cp);
    if (!src && !c) throw new Error(`${f.id} has no glyph ${cpLabel(cp)}`);
    console.log(JSON.stringify({ font: f.id, char: String.fromCodePoint(cp), cp: cpLabel(cp), source: src ? { top: src.top, mark: src.mark, dx: src.dx, rows: src.rows } : null, compiled: c ? { w: c.w, h: c.h, xoff: c.xoff, yoff: c.yoff, adv: c.adv, mark: c.mark, derived: c.derived ?? null } : null }, null, 2));
  });

program
  .command("set-glyph")
  .description("Draw (replace or add) one glyph: rows of # and . separated by /")
  .argument("<char>", "Character or U+XXXX")
  .argument("<rows>", "e.g. .##./#..#/#..#/.##.")
  .requiredOption("--top <n>", "Top row in the cell")
  .option("--font <id>")
  .option("--mark", "Zero-width combining mark (drawn right-aligned over the previous letter)")
  .option("--dx <n>", "Column offset", "0")
  .option("--dry-run")
  .option("--workspace <path>")
  .action(async (ch: string, rows: string, o: { top: string; font?: string; mark?: boolean; dx: string; dryRun?: boolean; workspace?: string }) => {
    const root = workspaceOf(o.workspace);
    const id = await defaultFont(root, o.font);
    const r = await setGlyph(root, id, ch, { top: Number(o.top), rows: rows.split("/"), mark: o.mark, dx: Number(o.dx) }, { dryRun: o.dryRun });
    if (r.errors.length) throw new Error(r.errors.map((e) => `${e.path}: ${e.message}`).join("\n"));
    console.log(r.saved ? `Saved ${ch} in ${path.relative(root, r.file)}` : `OK (dry run): ${ch} would be saved in ${path.relative(root, r.file)}`);
  });

program
  .command("check")
  .description("Parse errors, coverage (Thai, ASCII, punctuation) and Thai stacking on the sample sentences")
  .argument("[font]", "Font id (default: every font)")
  .option("--text <s...>", "Extra texts to check")
  .option("--json")
  .option("--workspace <path>")
  .action(async (id: string | undefined, o: { text?: string[]; json?: boolean; workspace?: string }) => {
    const root = workspaceOf(o.workspace);
    const ids = id ? [id] : await fontIds(root);
    const res = [];
    for (const x of ids) res.push(await checkFont(root, x, o.text ?? []));
    if (o.json) console.log(JSON.stringify(res, null, 2));
    else
      for (const r of res) {
        console.log(`${r.ok ? "✓" : "✗"} ${r.id}: ${r.glyphs} glyphs + ${r.forms} Thai presentation forms · ${r.samples} sample lines`);
        for (const e of r.errors) console.log(`  error ${e.path}: ${e.message}`);
        for (const w of r.warnings) console.log(`  warning ${w.path}: ${w.message}`);
        if (r.missing.length) console.log(`  missing ${r.missing.length}: ${r.missing.join(" ")}`);
        for (const s of r.stacking) console.log(`  ${s.kind} ${s.cluster}: ${s.message}`);
      }
    if (res.some((r) => !r.ok)) process.exitCode = 1;
  });

program
  .command("shape")
  .description("Show the presentation forms a Thai text becomes (what the engines draw)")
  .argument("<text>")
  .option("--workspace <path>", "(ignored; shaping needs no workspace)")
  .action((text: string) => console.log(JSON.stringify(shapeInfo(text), null, 2)));

program
  .command("render")
  .description("Render text to a PNG (pixel-exact, scaled)")
  .argument("<text>", "Text (\\n for new lines)")
  .requiredOption("--out <file.png>")
  .option("--font <id>")
  .option("--scale <n>", "Integer scale", "3")
  .option("--color <hex>", "Ink", "#2a1606")
  .option("--bg <hex>", "Background (or 'none')", "#f7ebd3")
  .option("--wrap <px>", "Wrap width in font pixels (breaks at spaces / U+200B)")
  .option("--dialogue <speaker>", "Draw it in a dialogue box with this speaker name")
  .option("--glyphs", "Render the glyph sheet instead of text")
  .option("--workspace <path>")
  .action(async (text: string, o: { out: string; font?: string; scale: string; color: string; bg: string; wrap?: string; dialogue?: string; glyphs?: boolean; workspace?: string }) => {
    const root = workspaceOf(o.workspace);
    const f = await loadFontStrict(root, await defaultFont(root, o.font));
    const t = text.replace(/\\n/g, "\n");
    let png: Buffer;
    let info = "";
    if (o.glyphs) {
      const r = glyphSheetRaster(f.font, Number(o.scale));
      png = encodePng(r.width, r.height, r.data);
    } else if (o.dialogue) {
      const r = dialogueRaster(f.font, o.dialogue, t, Number(o.wrap ?? 320), Number(o.scale));
      png = encodePng(r.width, r.height, r.data);
    } else {
      const r = renderTextPng(f.font, t, { scale: Number(o.scale), color: o.color, bg: o.bg === "none" ? null : o.bg, maxWidth: o.wrap ? Number(o.wrap) : undefined });
      png = r.png;
      info = ` ${r.width}×${r.height}, ${r.lines} line(s)${r.missing.length ? `, missing: ${r.missing.join(" ")}` : ""}`;
    }
    const out = path.resolve(o.out);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, png);
    console.log(`Wrote ${out}${info}`);
  });

program
  .command("export")
  .description(`Export fonts: ${EXPORT_PRESETS.join(" | ")} (default all → exports/easyfont-<preset>/)`)
  .option("--preset <p>", "bmfont | godot | pixi | png | all", "all")
  .option("--font <ids...>", "Only these fonts")
  .option("--out <dir>", "Output folder (single preset)")
  .option("--workspace <path>")
  .action(async (o: { preset: string; font?: string[]; out?: string; workspace?: string }) => {
    const root = workspaceOf(o.workspace);
    const r = await exportFonts(root, { preset: o.preset as ExportPreset, fonts: o.font, out: o.out ? path.resolve(o.out) : undefined, trustedPaths: true });
    for (const d of r.dirs) console.log(`Exported ${d}`);
    console.log(`Fonts: ${r.fonts.map((f) => `${f.id} (${f.chars} chars, atlas ${f.atlas})`).join(", ")} · ${r.files.length} files`);
    for (const w of r.warnings) console.log(`  warning: ${w}`);
  });

program
  .command("serve")
  .description("Web editor + API (default http://127.0.0.1:8948)")
  .option("--port <n>", "Port", "8948")
  .option("--host <h>", "Host", "127.0.0.1")
  .option("--dev", "API only (use the Vite UI on :5194)")
  .option("--no-open")
  .option("--workspace <path>")
  .action(async (o: { port: string; host: string; dev?: boolean; open: boolean; workspace?: string }) => {
    const root = workspaceOf(o.workspace);
    const token = resolveToken(o.host);
    const app = createApp({ workspaceRoot: root, webRoot: defaultWebRoot(), dev: o.dev, host: o.host, token });
    serve({ fetch: app.fetch, port: Number(o.port), hostname: o.host });
    const url = `http://${o.host === "0.0.0.0" ? "127.0.0.1" : o.host}:${o.port}/${token ? `?token=${token}` : ""}`;
    console.log(`Easy Font ${o.dev ? "API" : "editor"} on http://${o.host}:${o.port} · workspace ${root}`);
    if (token) console.log(`Token (needed off loopback): ${token}`);
    if (o.open && !o.dev && process.stdout.isTTY) await open(url).catch(() => {});
  });

program.parseAsync().catch(fail);
