/** Sarabun Pixel 12 / 14: confusable Thai pairs stay apart (DSK-6 follow-up: ส read as ล in ท่องสามเมือง). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseFont } from "../src/shared/parse.js";

const PAIRS: Array<[string, string, number]> = [
  // [a, b, minimum differing ink pixels]
  ["ส", "ล", 6], ["ศ", "ล", 8], ["ศ", "ค", 4], ["ส", "ศ", 6], ["บ", "ป", 3], ["ด", "ต", 4], ["ข", "ช", 3], ["ท", "ฑ", 4], ["ษ", "ล", 8],
];

for (const size of [14, 12]) {
  const { font, errors } = parseFont(readFileSync(new URL(`../samples/fonts/sarabun-px-${size}.easyfont`, import.meta.url), "utf8"), `sarabun-px-${size}.easyfont`);
  const g = (ch: string) => {
    const x = font.glyphs.find((y) => y.cp === ch.codePointAt(0));
    if (!x) throw new Error(`missing ${ch}`);
    return x;
  };
  /** Ink as "row,col" in cell coordinates, right-aligned so glyphs of different widths line up on their stems. */
  const ink = (ch: string) => {
    const x = g(ch);
    const w = x.rows[0]!.length;
    const out = new Set<string>();
    x.rows.forEach((r, y) => [...r].forEach((c, col) => c === "#" && out.add(`${x.top + y},${col - w}`)));
    return out;
  };
  const diff = (a: string, b: string) => {
    const A = ink(a), B = ink(b);
    return [...A].filter((p) => !B.has(p)).length + [...B].filter((p) => !A.has(p)).length;
  };

  describe(`Sarabun Pixel ${size} confusable pairs`, () => {
    it("parses cleanly", () => expect(errors).toEqual([]));
    it.each(PAIRS)("%s vs %s differ by at least %i pixels", (a, b, min) => {
      expect(diff(a, b), `${a}/${b}`).toBeGreaterThanOrEqual(min);
    });
    it("ส and ศ carry the top-right tail (a row above ล / ค, on the right edge)", () => {
      for (const ch of ["ส", "ศ"]) {
        expect(g(ch).top, ch).toBe(g("ล").top - 1);
        expect(g(ch).rows[0], ch).toMatch(/^\.+#$/);
      }
      expect(g("ล").rows[0]).not.toMatch(/#$/);
      expect(g("ช").top, "ช tail").toBeLessThanOrEqual(g("ข").top - 2); // two-row tail over the stem
      expect(g("ป").top, "ป ascender").toBeLessThanOrEqual(g("บ").top - 3);
    });
  });
}
