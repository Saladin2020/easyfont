import { describe, expect, it } from "vitest";
import { breakPieces, clusters, ellipsize, wrapLines } from "../src/shared/fit.js";
import { shapeThai } from "../src/shared/shape.js";

// monospace-ish advance: marks have no advance (like the bitmap fonts)
const adv = (ch: string) => (/[\u0e31\u0e34-\u0e3a\u0e47-\u0e4e]/.test(ch) || (ch.codePointAt(0)! >= 0xf700 && ch.codePointAt(0)! <= 0xf71a) ? 0 : 6);
const width = (s: string) => [...shapeThai(s)].reduce((w, c) => w + adv(c), 0);
const QUEST = "ภารกิจ: ท่องสามเมือง / คุยกับอาแปะเฮงที่ตลาดชินเฮง (0/3)";

describe("Thai line fitting", () => {
  it("keeps combining marks on their consonant", () => {
    expect(clusters("ที่น้ำ")).toEqual(["ที่", "น้ำ"]);
  });

  it("finds word breaks in Thai with no spaces", () => {
    const pieces = breakPieces("คุยกับอาแปะเฮงที่ตลาด");
    expect(pieces.length).toBeGreaterThan(2);
    expect(pieces.join("")).toBe("คุยกับอาแปะเฮงที่ตลาด");
  });

  it("wraps a long Thai quest line so every line fits the panel", () => {
    const lines = wrapLines(QUEST, adv, shapeThai, 150);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(width(l)).toBeLessThanOrEqual(150);
    expect(lines.join("").replace(/\s/g, "")).toBe(QUEST.replace(/\s/g, ""));
  });

  it("ellipsizes the last kept line when maxLines is reached", () => {
    const lines = wrapLines(QUEST + " " + QUEST, adv, shapeThai, 120, { maxLines: 2 });
    expect(lines).toHaveLength(2);
    expect(lines[1]!.endsWith("…")).toBe(true);
    for (const l of lines) expect(width(l)).toBeLessThanOrEqual(120);
  });

  it("splits a word wider than the line between clusters, never inside one", () => {
    const lines = wrapLines("กกกกกกกกกกกกกกกกกกกกที่", adv, shapeThai, 30);
    for (const l of lines) expect(width(l)).toBeLessThanOrEqual(30);
    expect(lines.some((l) => l.startsWith("\u0e35") || l.startsWith("\u0e48"))).toBe(false);
  });

  it("ellipsizes a single line to a width and leaves short text alone", () => {
    const s = ellipsize("ฤดูร้อน วันที่ 1 · ลมแรง · 09:41", adv, shapeThai, 100);
    expect(width(s)).toBeLessThanOrEqual(100);
    expect(s.endsWith("…")).toBe(true);
    expect(ellipsize("09:41", adv, shapeThai, 100)).toBe("09:41");
  });
});
