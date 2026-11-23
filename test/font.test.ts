import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_TH } from "../src/shared/check.js";
import { layoutText } from "../src/shared/layout.js";
import { renderTextPng } from "../src/lib/render.js";
import { checkFont, COVERAGE, loadFont, setGlyph, workspaceSummary } from "../src/lib/workspace.js";
import { tempWorkspace } from "./helpers.js";

let root: string;
let cleanup: () => Promise<void>;
beforeAll(async () => ({ root, cleanup } = await tempWorkspace()));
afterAll(() => cleanup());

describe("sample fonts", () => {
  it("all sample fonts cover Thai, ASCII and punctuation and stack every sample correctly", async () => {
    for (const id of ["makham-12", "makham-16", "makham-8"]) {
      const c = await checkFont(root, id);
      expect(c.errors).toEqual([]);
      expect(c.missing).toEqual([]);
      expect(c.stacking).toEqual([]);
      expect(c.ok).toBe(true);
      expect(c.glyphs).toBeGreaterThan(COVERAGE.length - 2);
      expect(c.forms).toBeGreaterThanOrEqual(41);
    }
  });

  it("workspace summary lists the sample fonts", async () => {
    const s = await workspaceSummary(root);
    expect(s.fonts.map((f) => f.id)).toEqual(["makham-12", "makham-16", "makham-8"]);
    expect(s.fonts[0]).toMatchObject({ th: "มะขาม 12", size: 12 });
  });

  it("tone marks sit in the tone zone, above the letter body, inside the cell", async () => {
    const { font } = await loadFont(root, "makham-12");
    const lay = layoutText(font, "ก่ กี่ ปี่ ญุ ฎุ น้ำ");
    for (const p of lay.placed) {
      expect(p.y + p.g.yoff).toBeGreaterThanOrEqual(0);
      expect(p.g.yoff + p.g.h).toBeLessThanOrEqual(font.line);
    }
    const low = font.glyphs.get(0xf70a)!; // ่ low
    const high = font.glyphs.get(0xf726)!; // ่ high
    expect(low.yoff).toBeGreaterThan(high.yoff);
    expect(low.yoff + low.h).toBeLessThanOrEqual(font.zones.body);
  });

  it("wraps at spaces and renders a PNG", async () => {
    const { font } = await loadFont(root, "makham-12");
    const lay = layoutText(font, SAMPLE_TH[4]!, { maxWidth: 120 });
    expect(lay.lines).toBeGreaterThan(1);
    expect(lay.width).toBeLessThanOrEqual(130);
    const r = renderTextPng(font, "สวัสดี Selamat pagi", { scale: 2 });
    expect(r.png.subarray(1, 4).toString()).toBe("PNG");
    expect(r.missing).toEqual([]);
  });

  it("check finds a broken glyph", async () => {
    await setGlyph(root, "makham-8", "U+0E48", { top: 6, rows: ["#", "#"], mark: true });
    const c = await checkFont(root, "makham-8");
    expect(c.ok).toBe(false);
    expect(c.stacking.some((s) => s.kind === "overlap" || s.kind === "touch")).toBe(true);
  });
});
