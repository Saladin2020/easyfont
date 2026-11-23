import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileFont } from "../src/shared/compile.js";
import { formatFont, parseFont } from "../src/shared/parse.js";
import { replaceGlyph } from "../src/lib/workspace.js";

const src12 = readFileSync("samples/fonts/makham-12.easyfont", "utf8");
const src8 = readFileSync("samples/fonts/makham-8.easyfont", "utf8");
const mini = `format easyfont/1
id mini
name Mini
size 8
line 12
baseline 9
zones tone=0 upper=2 body=5 lower=10 lowshift=2 leftshift=2

g ก 5
.##.
#..#
#..#

g U+0E48 0 mark
#
`;

describe("parse", () => {
  it("parses both sample fonts without errors", () => {
    for (const s of [src12, src8]) {
      const p = parseFont(s);
      expect(p.errors).toEqual([]);
      expect(p.font.glyphs.length).toBeGreaterThan(185);
    }
    const p = parseFont(src12);
    expect(p.font).toMatchObject({ id: "makham-12", th: "มะขาม 12", size: 12, line: 18, baseline: 15 });
  });

  it("reports bad lines with file:line", () => {
    const bad = mini.replace("format easyfont/1", "format nope").replace("g U+0E48 0 mark", "g U+0E48 0 marx") + "\ng ก 1\n#\n\nwhat is this\n\ng ข 11\n#\n#\n";
    const p = parseFont(bad, "x.easyfont");
    const msgs = p.errors.map((e) => `${e.path} ${e.message}`).join("\n");
    expect(msgs).toMatch(/x\.easyfont:1 format must be easyfont\/1/);
    expect(msgs).toMatch(/unknown glyph option "marx"/);
    expect(msgs).toMatch(/duplicate glyph U\+0E01/);
    expect(msgs).toMatch(/unknown line "what is this"/);
    expect(msgs).toMatch(/runs below the cell/);
  });

  it("formatFont round-trips", () => {
    const p = parseFont(src8);
    const again = parseFont(formatFont(p.font));
    expect(again.errors).toEqual([]);
    expect(again.font.glyphs.map((g) => [g.cp, g.top, g.rows.join("/"), g.mark, g.dx])).toEqual(p.font.glyphs.map((g) => [g.cp, g.top, g.rows.join("/"), g.mark, g.dx]));
  });

  it("compiles marks as zero-width, right-aligned over the previous letter", () => {
    const { font } = compileFont(parseFont(mini).font);
    const ko = font.glyphs.get(0x0e01)!;
    const ek = font.glyphs.get(0x0e48)!;
    expect(ko).toMatchObject({ w: 4, h: 3, adv: 5, yoff: 5, mark: false });
    expect(ek).toMatchObject({ w: 1, adv: 0, xoff: -2, mark: true });
    // generated low form drops by lowshift
    expect(font.glyphs.get(0xf70a)).toMatchObject({ yoff: 2, derived: "U+0E48 low" });
    expect(font.glyphs.get(0x20)!.adv).toBe(3);
  });

  it("replaceGlyph edits one block and keeps comments", () => {
    const withComment = `# my font\n${mini}`;
    const out = replaceGlyph(withComment, "ก", { top: 4, rows: ["###", "#.#"] });
    expect(out.startsWith("# my font\n")).toBe(true);
    const p = parseFont(out);
    expect(p.errors).toEqual([]);
    expect(p.font.glyphs.find((g) => g.cp === 0x0e01)).toMatchObject({ top: 4, rows: ["###", "#.#"] });
    const added = parseFont(replaceGlyph(out, "U+0E49", { top: 0, rows: ["##"], mark: true }));
    expect(added.font.glyphs.find((g) => g.cp === 0x0e49)?.mark).toBe(true);
    expect(() => replaceGlyph(out, "ab", { top: 0, rows: ["#"] })).toThrow(/Bad character/);
    expect(() => replaceGlyph(out, "ก", { top: 0, rows: ["#x"] })).toThrow(/Bad row/);
    expect(parseFont(replaceGlyph(out, "ก", null)).font.glyphs.some((g) => g.cp === 0x0e01)).toBe(false);
  });
});
