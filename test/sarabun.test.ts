/** DSK-6: Sarabun Pixel 12 / 14, a more legible Thai + Latin font rasterized from Sarabun (OFL), license shipped. */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { layoutText } from "../src/shared/layout.js";
import { exportFonts } from "../src/lib/export.js";
import { loadFont } from "../src/lib/workspace.js";
import { tempWorkspace } from "./helpers.js";

let root: string;
let cleanup: () => Promise<void>;
beforeAll(async () => ({ root, cleanup } = await tempWorkspace()));
afterAll(() => cleanup());

const IDS = ["sarabun-px-12", "sarabun-px-14"];

describe("Sarabun Pixel", () => {
  it("installs with its OFL license next to the fonts and exports it with them", async () => {
    expect(existsSync(path.join(root, "fonts", "OFL-Sarabun.txt"))).toBe(true);
    expect(readFileSync(path.join(root, "fonts", "OFL-Sarabun.txt"), "utf8")).toMatch(/Sarabun Project Authors[\s\S]*SIL Open Font License/);
    const r = await exportFonts(root, { preset: "pixi" });
    const pixi = r.dirs?.find?.((d: string) => d.includes("pixi")) ?? path.join(root, "exports", "easyfont-pixi");
    for (const f of ["fonts/sarabun-px-14.fnt", "fonts/sarabun-px-14.png", "fonts/sarabun-px-12.fnt", "fonts/OFL-Sarabun.txt", "fonts/OFL.txt"]) {
      expect(existsSync(path.join(pixi, f)), f).toBe(true);
    }
  });

  it("stacks Thai: tone above the upper vowel, low tone without one, lower vowels under the baseline", async () => {
    for (const id of IDS) {
      const { font } = await loadFont(root, id);
      const rows = (text: string) => layoutText(font, text).placed.map((p) => ({ cp: p.g.cp ?? 0, top: p.y + p.g.yoff, bottom: p.y + p.g.yoff + p.g.h - 1 }));
      const [ki, sara, tone] = rows("กี่");
      expect(tone!.bottom, `${id} กี่`).toBeLessThan(sara!.top); // ่ above ี
      expect(sara!.bottom).toBeLessThan(ki!.top);
      const [k2, low] = rows("ก่");
      expect(low!.bottom).toBeLessThan(k2!.top);
      expect(low!.top).toBeGreaterThan(tone!.top); // dropped when there is no upper vowel
      const [, u] = rows("กุ");
      expect(u!.top).toBeGreaterThan(font.baseline - 1);
      for (const p of layoutText(font, "น้ำ ปี่ ฟื้น ญุ ฐู ฎุ ก๋วย เจี๊ยบ").placed) {
        expect(p.y + p.g.yoff).toBeGreaterThanOrEqual(0);
        expect(p.y + p.g.yoff + p.g.h).toBeLessThanOrEqual(font.line);
      }
    }
  });

  it("keeps ต distinct from ด (hand pixel edit over the rasterizer)", async () => {
    for (const id of IDS) {
      const { font } = await loadFont(root, id);
      const to = font.glyphs.get(0x0e15)!;
      const do_ = font.glyphs.get(0x0e14)!;
      expect(JSON.stringify(to.rows ?? to)).not.toEqual(JSON.stringify(do_.rows ?? do_));
    }
  });

  it("is bigger than มะขาม 8 for HUD text", async () => {
    const small = (await loadFont(root, "makham-8")).font;
    const sb = (await loadFont(root, "sarabun-px-12")).font;
    const w = (f: typeof sb) => layoutText(f, "เข้าเมืองตลาดซินเฮงเพื่อเริ่ม").width;
    expect(w(sb)).toBeGreaterThan(w(small));
  });
});
