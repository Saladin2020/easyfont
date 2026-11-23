import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkStacking } from "../src/shared/check.js";
import { compileFont } from "../src/shared/compile.js";
import { layoutText } from "../src/shared/layout.js";
import { parseFont } from "../src/shared/parse.js";

const src = readFileSync(new URL("../samples/fonts/makham-16.easyfont", import.meta.url), "utf8");
const { font: source, errors } = parseFont(src, "makham-16.easyfont");
const { font } = compileFont(source);
const g = (ch: string) => {
  const x = source.glyphs.find((y) => y.cp === ch.codePointAt(0));
  if (!x) throw new Error(`missing ${ch}`);
  return x;
};
const CONSONANTS = [..."กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮ"];
const TALL = new Set([..."ปฝฟฬ"]);
const BELOW = new Set([..."ญฎฏฐฤฦ"]); // parts below the baseline
/** Thai letters without a head loop. */
const NO_LOOP = new Set([..."กธ"]);

/** Enclosed empty pixels (holes) in a glyph: '.' cells not reachable from outside the bitmap. */
function holes(rows: string[]): number {
  const h = rows.length + 2, w = Math.max(...rows.map((r) => r.length)) + 2;
  const at = (y: number, x: number) => (y >= 1 && y < h - 1 && rows[y - 1]![x - 1] === "#");
  const seen = new Set<string>(["0,0"]);
  const q: Array<[number, number]> = [[0, 0]];
  while (q.length) {
    const [y, x] = q.pop()!;
    for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ny = y + dy, nx = x + dx, k = `${ny},${nx}`;
      if (ny < 0 || nx < 0 || ny >= h || nx >= w || seen.has(k) || at(ny, nx)) continue;
      seen.add(k);
      q.push([ny, nx]);
    }
  }
  let n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (!at(y, x) && !seen.has(`${y},${x}`)) n++;
  return n;
}

const PARAGRAPH = [
  "สวัสดีครับ วันนี้ไปซื้อขนมที่ตลาดน้ำกับน้องสาว",
  "พี่ชายไปเที่ยวเชียงใหม่ ส่วนแม่อยู่บ้านทำกับข้าว",
  "ข้อความนี้ต้องอ่านง่าย ไม่มีสระหรือวรรณยุกต์ชนกัน",
  "กี่ ปี่ ฟื้น ที่นี่ น้ำ ปู่ ญุ ฐู ฎุ ฏู สุ้ม จั๊ก ชื่อ ซื้อ ไม้ ป๋า ศิลป์ ฝั่ง ฟ้า ฬ่ ปั้น กึ๋น",
  CONSONANTS.join(" "),
  CONSONANTS.filter((c) => c !== "ฤ" && c !== "ฦ").map((c) => `${c}ี่ ${c}ุ้`).join(" "),
];

describe("มะขาม 16 (makham-16): taller, looped, opt-in", () => {
  it("parses cleanly with its own metrics (makham-12 is untouched)", () => {
    expect(errors).toEqual([]);
    expect(source).toMatchObject({ id: "makham-16", size: 16, line: 22, baseline: 18, spacing: 2 });
    expect(source.zones).toMatchObject({ tone: 0, upper: 4, body: 9, lower: 19, lowshift: 5, leftshift: 2 });
  });

  it("puts every consonant on the 9-row body (tall letters from row 5, tails below the baseline)", () => {
    for (const c of CONSONANTS) {
      const x = g(c);
      expect(x.top, c).toBe(TALL.has(c) ? 5 : 9);
      const bottom = x.top + x.rows.length; // first row below the glyph
      if (BELOW.has(c)) expect(bottom, c).toBeGreaterThan(18);
      else expect(bottom, c).toBe(18);
    }
  });

  it("draws a closed head loop on every consonant that has one", () => {
    for (const c of CONSONANTS) {
      if (NO_LOOP.has(c)) continue;
      expect(holes(g(c).rows), c).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps marks in their own zones: tones 0-2 (low 5-7), upper vowels 4-7, lower vowels 19-21", () => {
    for (const cp of [0x0e48, 0x0e49, 0x0e4a, 0x0e4b, 0x0e4c]) {
      const x = source.glyphs.find((y) => y.cp === cp)!;
      expect(x.top).toBe(0);
      expect(x.rows.length).toBeLessThanOrEqual(3);
    }
    for (const cp of [0x0e31, 0x0e34, 0x0e35, 0x0e36, 0x0e37, 0x0e47, 0x0e4d]) {
      const x = source.glyphs.find((y) => y.cp === cp)!;
      expect(x.top).toBeGreaterThanOrEqual(4);
      expect(x.top + x.rows.length).toBeLessThanOrEqual(8);
    }
    for (const cp of [0x0e38, 0x0e39, 0x0e3a]) expect(source.glyphs.find((y) => y.cp === cp)!.top).toBe(19);
  });

  it("stacks a long paragraph (every consonant, tone over upper vowel, lower vowels) with no collisions", () => {
    expect(checkStacking(font, PARAGRAPH).map((i) => `${i.kind}: ${i.message}`)).toEqual([]);
  });

  it("leaves at least one empty column between letters", () => {
    for (const line of PARAGRAPH) {
      const lay = layoutText(font, line);
      const bases = lay.placed.filter((p) => !p.g.mark && p.g.w > 0);
      for (let i = 1; i < bases.length; i++) {
        const a = bases[i - 1]!, b = bases[i]!;
        if (a.y !== b.y) continue;
        expect(b.x + b.g.xoff - (a.x + a.g.xoff + a.g.w), `${String.fromCodePoint(a.g.cp)}${String.fromCodePoint(b.g.cp)}`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
