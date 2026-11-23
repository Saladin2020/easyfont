import { Hono } from "hono";
import { SAMPLE_LATIN, SAMPLE_TH } from "../shared/check.js";
import { EXPORT_PRESETS, exportFonts, glyphSheetRaster, type ExportPreset } from "../lib/export.js";
import { encodePng } from "../lib/png.js";
import { dialogueRaster, renderTextPng } from "../lib/render.js";
import { checkFont, loadFont, loadFontStrict, saveFont, setGlyph, shapeInfo, workspaceSummary } from "../lib/workspace.js";
import { errMsg, useGuard, useWeb, type BaseOptions } from "./base.js";

export type CreateAppOptions = BaseOptions;
const bytes = (buf: Buffer) => new Uint8Array(buf);

export function createApp(o: CreateAppOptions): Hono {
  const app = new Hono();
  const root = o.workspaceRoot;
  useGuard(app, o);
  app.get("/api/workspace", async (c) => c.json({ ...(await workspaceSummary(root)), presets: EXPORT_PRESETS }));
  app.get("/api/font/:id", async (c) => {
    try {
      const f = await loadFont(root, c.req.param("id"));
      const glyphs = f.source.glyphs.map((g) => ({ cp: g.cp, char: String.fromCodePoint(g.cp), top: g.top, rows: g.rows, mark: g.mark, dx: g.dx, adv: f.font.glyphs.get(g.cp)?.adv ?? 0 }));
      return c.json({ id: f.id, name: f.source.name, th: f.source.th, size: f.source.size, line: f.source.line, baseline: f.source.baseline, zones: f.source.zones, glyphs, text: f.text, errors: f.errors, warnings: f.warnings });
    } catch (e) {
      return c.json({ error: errMsg(e) }, 404);
    }
  });
  app.post("/api/font/:id", async (c) => {
    try {
      const b = (await c.req.json()) as { text?: string; dryRun?: boolean };
      if (typeof b.text !== "string") return c.json({ error: "text is required" }, 400);
      const r = await saveFont(root, c.req.param("id"), b.text, { dryRun: b.dryRun });
      return c.json(r, r.errors.length ? 400 : 200);
    } catch (e) {
      return c.json({ error: errMsg(e) }, 400);
    }
  });
  app.post("/api/font/:id/glyph", async (c) => {
    try {
      const b = (await c.req.json()) as { char: string; top: number; rows: string[]; mark?: boolean; dx?: number; remove?: boolean };
      const r = await setGlyph(root, c.req.param("id"), b.char, b.remove ? null : { top: Number(b.top), rows: b.rows, mark: b.mark, dx: b.dx });
      return c.json(r, r.errors.length ? 400 : 200);
    } catch (e) {
      return c.json({ error: errMsg(e) }, 400);
    }
  });
  app.get("/api/check/:id", async (c) => {
    try {
      return c.json(await checkFont(root, c.req.param("id")));
    } catch (e) {
      return c.json({ error: errMsg(e) }, 404);
    }
  });
  app.get("/api/samples", (c) => c.json({ th: SAMPLE_TH, latin: SAMPLE_LATIN }));
  app.get("/api/shape", (c) => c.json(shapeInfo(c.req.query("text") ?? "")));
  app.get("/api/render/:id", async (c) => {
    try {
      const f = await loadFontStrict(root, c.req.param("id"));
      const text = c.req.query("text") ?? "";
      const scale = Number(c.req.query("scale") ?? 3);
      let png: Buffer;
      if (c.req.query("glyphs")) {
        const r = glyphSheetRaster(f.font, scale);
        png = encodePng(r.width, r.height, r.data);
      } else if (c.req.query("dialogue")) {
        const r = dialogueRaster(f.font, c.req.query("dialogue")!, text, Number(c.req.query("wrap") ?? 320), scale);
        png = encodePng(r.width, r.height, r.data);
      } else png = renderTextPng(f.font, text, { scale, color: c.req.query("color") ?? "#2a1606", bg: c.req.query("bg") ?? "#f7ebd3", maxWidth: c.req.query("wrap") ? Number(c.req.query("wrap")) : undefined }).png;
      return c.body(bytes(png), 200, { "content-type": "image/png", "cache-control": "no-store" });
    } catch (e) {
      return c.json({ error: errMsg(e) }, 400);
    }
  });
  app.post("/api/export", async (c) => {
    try {
      const b = (await c.req.json().catch(() => ({}))) as { preset?: ExportPreset; fonts?: string[] };
      const r = await exportFonts(root, { preset: b.preset ?? "all", fonts: b.fonts });
      return c.json({ dirs: r.dirs, files: r.files.length, fonts: r.fonts, warnings: r.warnings });
    } catch (e) {
      return c.json({ error: errMsg(e) }, 400);
    }
  });
  useWeb(app, o);
  return app;
}
