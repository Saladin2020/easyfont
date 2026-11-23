import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseBmfont } from "../src/lib/bmfont.js";
import { exportFonts, parityData } from "../src/lib/export.js";
import { loadFontStrict } from "../src/lib/workspace.js";
import { tempWorkspace } from "./helpers.js";

let root: string;
let cleanup: () => Promise<void>;
beforeAll(async () => ({ root, cleanup } = await tempWorkspace()));
afterAll(() => cleanup());

describe("export", () => {
  it("bmfont: .fnt + png with presentation forms, zero-width marks and the OFL", async () => {
    const r = await exportFonts(root, { preset: "bmfont" });
    const dir = r.dirs[0]!;
    for (const f of ["makham-12.fnt", "makham-12.png", "makham-8.fnt", "makham-8.png", "OFL.txt", "fonts.json"]) expect(existsSync(path.join(dir, f))).toBe(true);
    const fnt = parseBmfont(readFileSync(path.join(dir, "makham-12.fnt"), "utf8"));
    expect(fnt.info.face).toBe("Makham 12");
    expect(fnt.common).toMatchObject({ lineHeight: "18", base: "15" });
    expect(fnt.pages).toEqual(["makham-12.png"]);
    const ek = fnt.chars.get(0x0e48)!;
    expect(ek.xadvance).toBe(0);
    expect(ek.xoffset).toBeLessThan(0);
    for (const cp of [0xf70a, 0xf713, 0xf70f, 0xf700, 0xf718, 0xf72b, 0x0e01, 0x41, 0x20]) expect(fnt.chars.has(cp)).toBe(true);
    // a derived form shares its source's atlas cell
    expect([fnt.chars.get(0xf726)!.x, fnt.chars.get(0xf726)!.y]).toEqual([ek.x, ek.y]);
    expect(Number(fnt.common.scaleW) * Number(fnt.common.scaleH)).toBeLessThanOrEqual(256 * 256);
    expect(readFileSync(path.join(dir, "OFL.txt"), "utf8")).toMatch(/SIL Open Font License/);
    expect(r.fonts.map((f) => f.id)).toEqual(["makham-12", "makham-8"]);
  });

  it("godot, pixi and png presets", async () => {
    const r = await exportFonts(root, { preset: "all" });
    const [, godot, pixi, png] = r.dirs;
    for (const f of ["project.godot", "main.tscn", "test_font.gd", "easyfont/easyfont.gd", "easyfont/thai_shaper.gd", "easyfont/makham-12.fnt", "easyfont/makham-12.theme.tres", "easyfont/parity.json"]) expect(existsSync(path.join(godot!, f))).toBe(true);
    expect(readFileSync(path.join(godot!, "project.godot"), "utf8")).toMatch(/EasyFont="\*res:\/\/easyfont\/easyfont.gd"/);
    for (const f of ["index.html", "easyfont-pixi.js", "easyfont-core.js", "fonts/makham-8.fnt", "fonts/fonts.json"]) expect(existsSync(path.join(pixi!, f))).toBe(true);
    for (const f of ["makham-12-specimen.png", "makham-12-glyphs.png", "makham-8-dialogue.png"]) expect(existsSync(path.join(png!, f))).toBe(true);
  });

  it("parity data matches the TS shaper and font metrics", async () => {
    const f = await loadFontStrict(root, "makham-12");
    const p = parityData([f]);
    expect(p.shape.length).toBeGreaterThan(8);
    expect(p.shape.find((c) => c.text.startsWith("กี่"))!.codes.slice(0, 3)).toEqual([0x0e01, 0xf722, 0xf726]);
    expect(p.metrics["makham-12"]![String(0x0e01)]).toBe(f.font.glyphs.get(0x0e01)!.adv);
    expect(p.measure).toBeGreaterThan(20);
  });

  it("refuses output outside the workspace and unknown presets", async () => {
    await expect(exportFonts(root, { preset: "bmfont", out: "/tmp/../etc/easyfont" })).rejects.toThrow(/outside the workspace/);
    await expect(exportFonts(root, { preset: "nope" as never })).rejects.toThrow(/Unknown preset/);
    await expect(exportFonts(root, { preset: "all", out: "x" })).rejects.toThrow(/single preset/);
  });
});
