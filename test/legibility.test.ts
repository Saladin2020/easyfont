import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseFont } from "../src/shared/parse.js";

const src = readFileSync(new URL("../samples/fonts/makham-12.easyfont", import.meta.url), "utf8");
const { font, errors } = parseFont(src, "makham-12.easyfont");
const g = (ch: string) => {
  const glyph = font.glyphs.find((x) => x.cp === ch.codePointAt(0));
  if (!glyph) throw new Error(`missing ${ch}`);
  return glyph;
};
/** Ink pixels as "row,col" in cell coordinates. */
const ink = (ch: string) => {
  const x = g(ch);
  const out = new Set<string>();
  x.rows.forEach((r, y) => [...r].forEach((c, col) => c === "#" && out.add(`${x.top + y},${col}`)));
  return out;
};
const diff = (a: string, b: string) => {
  const A = ink(a), B = ink(b);
  return [...A].filter((p) => !B.has(p)).length + [...B].filter((p) => !A.has(p)).length;
};

describe("มะขาม 12 legibility (ช น ส ร์)", () => {
  it("parses cleanly", () => expect(errors).toEqual([]));

  it("keeps the metrics the runtimes rely on (top row, advance width, row count)", () => {
    const metrics: Record<string, [number, number, number]> = {
      "ข": [8, 6, 7], "ฃ": [8, 6, 7], "ช": [8, 7, 7], "ซ": [8, 7, 7], "น": [8, 6, 7], "ส": [8, 6, 7], "\u0E4C": [0, 3, 3],
    };
    for (const [ch, [top, width, rows]] of Object.entries(metrics)) {
      expect([g(ch).top, g(ch).rows[0]!.length, g(ch).rows.length], ch).toEqual([top, width, rows]);
    }
  });

  it("ช differs clearly from บ and ข: a forked top-right flag, not a plain stem", () => {
    expect(diff("ช", "บ")).toBeGreaterThanOrEqual(8);
    expect(diff("ช", "ข")).toBeGreaterThanOrEqual(6);
    expect(g("ช").rows[0]).toMatch(/#\.#$/); // stem and flag tip on the top row
    expect(g("บ").rows.at(-1)).toMatch(/#####/); // บ keeps its flat base
    expect(g("ช").rows.at(-1)).not.toMatch(/#####/);
  });

  it("น, ส and ช are distinct from each other and from บ", () => {
    for (const [a, b] of [["น", "บ"], ["ส", "บ"], ["น", "ส"], ["ช", "น"], ["ช", "ส"], ["น", "ณ"]]) {
      expect(diff(a!, b!), `${a}/${b}`).toBeGreaterThanOrEqual(6);
    }
  });

  it("ข (and ฃ) differ clearly from บ: a pointed, rounded base instead of บ's flat one", () => {
    expect(diff("ข", "บ")).toBeGreaterThanOrEqual(5);
    expect(diff("ฃ", "บ")).toBeGreaterThanOrEqual(8);
    for (const ch of ["ข", "ฃ"]) {
      expect(g(ch).rows.at(-1), ch).toBe("...#..");
      expect(g(ch).rows.at(-2), ch).toBe("..#.#.");
    }
    expect(diff("ข", "ช")).toBeGreaterThanOrEqual(6);
    expect(diff("ข", "ฃ")).toBeGreaterThanOrEqual(2);
  });

  it("thanthakhat ์ no longer looks like sara i ิ", () => {
    expect(diff("\u0E4C", "\u0E34")).toBeGreaterThanOrEqual(6);
    expect(g("\u0E4C").rows).toEqual(["..#", "##.", "##."]);
  });
});
