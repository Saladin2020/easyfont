#!/usr/bin/env node
/**
 * Easy Font MCP server (stdio by default; optional Streamable HTTP).
 *
 *   npx tsx src/mcp/server.ts
 *   npx tsx src/mcp/server.ts --http --port 8949
 *
 * Env: EASYFONT_WORKSPACE  absolute path to the workspace (default: cwd)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { cpLabel, parseChar } from "../shared/parse.js";
import { FORMAT } from "../shared/types.js";
import { EXPORT_PRESETS, exportFonts } from "../lib/export.js";
import { dialogueRaster, renderTextPng } from "../lib/render.js";
import { encodePng } from "../lib/png.js";
import { checkFont, fontIds, loadFont, loadFontStrict, resolveWorkspace, saveFont, setGlyph, shapeInfo, workspaceSummary } from "../lib/workspace.js";
import { isEntry, mcpErr as err, mcpMsg as msg, mcpText as text, parseMcpArgs, startHttp } from "./http.js";

export const MCP_TOOL_NAMES = ["workspace_info", "list_glyphs", "get_glyph", "set_glyph", "write_font", "check_font", "shape_text", "render_text", "export_fonts"] as const;

const IdSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, "Use a-z, 0-9, _ or -");

export const FORMAT_CHEATSHEET = `Source fonts/<id>.easyfont (${FORMAT}), plain text:
  header: format ${FORMAT} · id · name · th (Thai name) · size (px) · line (cell height) · baseline (row) · spacing · space (space advance)
  zones tone=<row> upper=<row> body=<row> lower=<row> lowshift=<rows a tone drops with no upper vowel> leftshift=<cols marks move over ป ฝ ฟ ฬ> lowerdrop=<rows ุ ู drop under ฎ ฏ>
  glyph: "g <char|U+XXXX> <top row> [mark] [dx=N]" then rows of # (ink) and . (blank), blank line ends it.
  marks (ั ิ ี ึ ื ็ ่ ้ ๊ ๋ ์ ํ ุ ู ฺ ๎) are zero-width and drawn right-aligned over the previous letter; draw tone marks at the tone zone.
  The shaper generates PUA presentation forms (low tones, left forms, tailless ญ ฐ = U+F70F/U+F700 — draw those two by hand).
Engines must shape text first: EasyFont.shape() in Godot, ef.shape() / ef.text() in Pixi, easyfont shape on the CLI.
Licence: fonts are SIL OFL 1.1; keep designs original (do not trace commercial fonts).`;

export function createEasyFontMcp(workspaceRoot: string): McpServer {
  const root = resolveWorkspace(workspaceRoot);
  const server = new McpServer({ name: "easyfont", version: "0.1.0" });
  const pick = async (id?: string) => {
    if (id) return id;
    const ids = await fontIds(root);
    return ids.find((x) => x.endsWith("12")) ?? ids[0] ?? "makham-12";
  };

  server.registerTool("workspace_info", { title: "Workspace info", description: "List the fonts (size, line height, glyph count), the Thai/Latin sample sentences and the source format. Call this first.", inputSchema: {} }, async () => text({ name: "easyfont", ...(await workspaceSummary(root)), format: FORMAT_CHEATSHEET }));

  server.registerTool(
    "list_glyphs",
    { title: "List glyphs", description: "Every drawn glyph of a font: character, code point, top row, size, advance, mark.", inputSchema: { font: IdSchema.optional(), marks: z.boolean().optional() } },
    async ({ font, marks }) => {
      try {
        const f = await loadFont(root, await pick(font));
        return text({ font: f.id, glyphs: f.source.glyphs.filter((g) => !marks || g.mark).map((g) => ({ char: String.fromCodePoint(g.cp), cp: cpLabel(g.cp), top: g.top, w: Math.max(...g.rows.map((r) => r.length)), h: g.rows.length, adv: f.font.glyphs.get(g.cp)?.adv ?? 0, mark: g.mark })) });
      } catch (e) {
        return err(msg(e));
      }
    },
  );

  server.registerTool(
    "get_glyph",
    { title: "Get glyph", description: "One glyph's # / . rows, top row and compiled metrics (also works for generated presentation forms like U+F70B).", inputSchema: { char: z.string().min(1), font: IdSchema.optional() } },
    async ({ char, font }) => {
      try {
        const f = await loadFont(root, await pick(font));
        const cp = parseChar(char);
        if (cp === null) return err(`Bad character "${char}" (one character or U+XXXX)`);
        const src = f.source.glyphs.find((g) => g.cp === cp);
        const c = f.font.glyphs.get(cp);
        if (!src && !c) return err(`${f.id} has no glyph ${cpLabel(cp)}`);
        return text({ font: f.id, char: String.fromCodePoint(cp), cp: cpLabel(cp), source: src ? { top: src.top, mark: src.mark, dx: src.dx, rows: src.rows } : null, compiled: c ? { w: c.w, h: c.h, xoff: c.xoff, yoff: c.yoff, adv: c.adv, derived: c.derived ?? null } : null });
      } catch (e) {
        return err(msg(e));
      }
    },
  );

  server.registerTool(
    "set_glyph",
    { title: "Draw glyph", description: "Replace or add one glyph (rows of # and .). Validates the whole font first; dryRun only validates; remove deletes it.", inputSchema: { char: z.string().min(1), rows: z.array(z.string().regex(/^[#.]+$/)).optional(), top: z.number().int().min(0).optional(), mark: z.boolean().optional(), dx: z.number().int().optional(), font: IdSchema.optional(), dryRun: z.boolean().optional(), remove: z.boolean().optional() } },
    async ({ char, rows, top, mark, dx, font, dryRun, remove }) => {
      try {
        if (!remove && (!rows?.length || top === undefined)) return err("rows and top are required (or remove: true)");
        const r = await setGlyph(root, await pick(font), char, remove ? null : { top: top!, rows: rows!, mark, dx }, { dryRun });
        return text({ saved: r.saved, file: r.file, errors: r.errors, warnings: r.warnings });
      } catch (e) {
        return err(msg(e));
      }
    },
  );

  server.registerTool(
    "write_font",
    { title: "Write font source", description: `Create or replace fonts/<id>.easyfont (whole source text), or read it (mode "read"). Refuses on parse errors; dryRun only validates.\n${FORMAT_CHEATSHEET}`, inputSchema: { id: IdSchema, source: z.string().optional(), mode: z.enum(["write", "read"]).optional(), dryRun: z.boolean().optional() } },
    async ({ id, source, mode, dryRun }) => {
      try {
        if (mode === "read") return text({ id, source: (await loadFont(root, id)).text });
        if (!source) return err("source is required for mode write");
        const r = await saveFont(root, id, source, { dryRun });
        return text({ saved: r.saved, file: r.file, errors: r.errors, warnings: r.warnings });
      } catch (e) {
        return err(msg(e));
      }
    },
  );

  server.registerTool(
    "check_font",
    { title: "Check font", description: "Parse errors, coverage (Thai U+0E01–0E5B, ASCII, punctuation) and Thai stacking (overlap, touching, floating or clipped marks) on the sample sentences plus your texts.", inputSchema: { font: IdSchema.optional(), texts: z.array(z.string()).optional() } },
    async ({ font, texts }) => {
      try {
        const ids = font ? [font] : await fontIds(root);
        const out = [];
        for (const id of ids) out.push(await checkFont(root, id, texts ?? []));
        return text({ ok: out.every((r) => r.ok), fonts: out });
      } catch (e) {
        return err(msg(e));
      }
    },
  );

  server.registerTool("shape_text", { title: "Shape Thai text", description: "The presentation-form code points a text becomes (what Godot / Pixi draw after EasyFont.shape).", inputSchema: { text: z.string() } }, async ({ text: t }) => text(shapeInfo(t)));

  server.registerTool(
    "render_text",
    { title: "Render text", description: "Render text in a font to a PNG (returned as an image); dialogue: speaker name draws it in a dialogue box; wrap: width in font pixels.", inputSchema: { text: z.string(), font: IdSchema.optional(), scale: z.number().int().min(1).max(8).optional(), wrap: z.number().int().min(16).optional(), dialogue: z.string().optional() } },
    async ({ text: t, font, scale, wrap, dialogue }) => {
      try {
        const f = await loadFontStrict(root, await pick(font));
        let png: Buffer;
        let missing: string[] = [];
        if (dialogue) {
          const r = dialogueRaster(f.font, dialogue, t, wrap ?? 320, scale ?? 3);
          png = encodePng(r.width, r.height, r.data);
        } else {
          const r = renderTextPng(f.font, t, { scale: scale ?? 3, maxWidth: wrap });
          png = r.png;
          missing = r.missing;
        }
        return { content: [{ type: "image" as const, data: png.toString("base64"), mimeType: "image/png" }, { type: "text" as const, text: JSON.stringify({ font: f.id, missing }) }] };
      } catch (e) {
        return err(msg(e));
      }
    },
  );

  server.registerTool(
    "export_fonts",
    { title: "Export fonts", description: `Write exports/easyfont-<preset>/: bmfont (.fnt + png), godot (project with EasyFont autoload, FontFile themes, parity test), pixi (BitmapFont runtime + demo), png (specimens, glyph sheets, dialogue previews), all.`, inputSchema: { preset: z.enum(EXPORT_PRESETS).optional(), fonts: z.array(IdSchema).optional() } },
    async ({ preset, fonts }) => {
      try {
        const r = await exportFonts(root, { preset: preset ?? "all", fonts });
        return text({ dirs: r.dirs, files: r.files.length, fonts: r.fonts, warnings: r.warnings });
      } catch (e) {
        return err(msg(e));
      }
    },
  );

  return server;
}

if (isEntry() >= 0) {
  const a = parseMcpArgs(process.argv.slice(isEntry() + 1), 8949);
  if (a.http) await startHttp(() => createEasyFontMcp(a.workspace), a.workspace, a.host, a.port);
  else await createEasyFontMcp(a.workspace).connect(new StdioServerTransport());
}
