import { describe, expect, it } from "vitest";
import { shapeThai, unshape } from "../src/shared/shape.js";

const cps = (s: string) => [...shapeThai(s)].map((c) => c.codePointAt(0)!.toString(16).toUpperCase());

describe("Thai shaper", () => {
  it("drops tone marks when there is no upper vowel, stacks them above one when there is", () => {
    expect(cps("ก่")).toEqual(["E01", "F70A"]);
    expect(cps("กี่")).toEqual(["E01", "F722", "F726"]);
    expect(cps("กั๊ก")).toEqual(["E01", "F720", "F728", "E01"]);
  });
  it("moves marks left over ป ฝ ฟ ฬ", () => {
    expect(cps("ป่")).toEqual(["E1B", "F705"]);
    expect(cps("ปี่")).toEqual(["E1B", "F702", "F713"]);
    expect(cps("ฟื้น")).toEqual(["E1F", "F704", "F714", "E19"]);
  });
  it("uses tailless ญ ฐ and low lower vowels under ฎ ฏ", () => {
    expect(cps("ญุ")).toEqual(["F70F", "F72D"]);
    expect(cps("ฐู")).toEqual(["F700", "F72E"]);
    expect(cps("ฎุ")).toEqual(["E0E", "F718"]);
    expect(cps("ฏู")).toEqual(["E0F", "F719"]);
    expect(cps("ญา")).toEqual(["E0D", "E32"]); // tail stays without a lower vowel
  });
  it("splits sara am into nikhahit + sara aa, under the tone mark", () => {
    expect(cps("น้ำ")).toEqual(["E19", "F72B", "F727", "E32"]);
    expect(cps("ป่ำ")).toEqual(["E1B", "F711", "F713", "E32"]);
    expect(cps("กำ")).toEqual(["E01", "F72B", "E32"]);
  });
  it("leaves Latin and marks after non-letters alone (normal copies)", () => {
    expect(shapeThai("Selamat pagi!")).toBe("Selamat pagi!");
    expect(cps("A่")).toEqual(["41", "F726"]);
  });
  it("unshape restores the source text", () => {
    for (const t of ["น้ำ ที่ ปี่ ฟื้น ปั้น", "ญุ ฐู ฎุ ฏู ก๎ ก์", "เป็นมนุษย์สุดประเสริฐ"]) expect(unshape(shapeThai(t)).replace(/\u0e4d\u0e32/g, "\u0e33").replace(/\u0e4d([\u0e48-\u0e4b])\u0e32/g, "$1\u0e33")).toBe(t);
  });
});
