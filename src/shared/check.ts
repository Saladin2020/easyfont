import { layoutText, type Placed } from "./layout.js";
import { isThaiMark } from "./shape.js";
import type { CompiledFont } from "./types.js";

export interface StackIssue {
  text: string;
  cluster: string;
  kind: "missing" | "overlap" | "touch" | "floating" | "clipped";
  message: string;
}

/** Thai sentences that cover every consonant, vowel, tone mark and the hard stacks. */
export const SAMPLE_TH = [
  "เป็นมนุษย์สุดประเสริฐเลิศคุณค่า กว่าบรรดาฝูงสัตว์เดรัจฉาน",
  "จงฝ่าฟันพัฒนาวิชาการ อย่าล้างผลาญฤๅเข่นฆ่าบีฑาใคร",
  "ไม่ถือโทษโกรธแช่งซัดฮึดฮัดด่า หัดอภัยเหมือนกีฬาอัชฌาสัย",
  "ปฏิบัติประพฤติกฎกำหนดใจ พูดจาให้จ๊ะๆ จ๋าๆ น่าฟังเอยฯ",
  "น้ำ ที่ ปี่ ฟื้น ปั้น ฝั่ง ฟ้า ปู่ ป๊อป กั๊ก ก๋วย เจี๊ยบ ชื่อ ขึ้น ญาติ ฐาน ญุ ฐุ ฎุ ฏู ฤๅษี ฬ้า ปั๋ง",
  "สวัสดีครับ ร้านน้ำชาของป้านูรุลเปิดแล้ว ๑๒๓ บาท ฿๔๕",
];
export const SAMPLE_LATIN = ["The quick brown fox jumps over the lazy dog. 0123456789", "Selamat pagi! Terima kasih, jumpa lagi di pasar malam.", "“Hello,” she said — 50% off (today) & #1 @ market…"];

function inkSet(p: Placed): Set<string> {
  const s = new Set<string>();
  const ox = p.x + p.g.xoff;
  const oy = p.y + p.g.yoff;
  for (let y = 0; y < p.g.h; y++) for (let x = 0; x < p.g.w; x++) if (p.g.bits[y * p.g.w + x]) s.add(`${ox + x},${oy + y}`);
  return s;
}

const near = (a: Set<string>, b: Set<string>) => {
  for (const k of a) {
    const [x, y] = k.split(",").map(Number) as [number, number];
    if (b.has(`${x},${y - 1}`) || b.has(`${x},${y + 1}`) || b.has(`${x - 1},${y}`) || b.has(`${x + 1},${y}`)) return true;
  }
  return false;
};

/**
 * Lay out each text and check every Thai cluster: no missing glyphs, no mark overlapping or touching the letter,
 * another mark or the neighbours, marks over their own letter's columns and close to what they sit on (not
 * floating), and nothing above the cell.
 */
export function checkStacking(font: CompiledFont, texts: string[]): StackIssue[] {
  const issues: StackIssue[] = [];
  for (const text of texts) {
    const lay = layoutText(font, text);
    for (const m of lay.missing) issues.push({ text, cluster: m, kind: "missing", message: `no glyph for "${m}" (U+${m.codePointAt(0)!.toString(16).toUpperCase()})` });
    const sets = lay.placed.map(inkSet);
    const src = [...text];
    lay.placed.forEach((p, i) => {
      if (!p.g.mark) return;
      const base = lay.placed[p.base]!;
      const label = `${String.fromCodePoint(base.g.cp)}+U+${p.g.cp.toString(16).toUpperCase()}`;
      const cluster = src.find((c) => c.codePointAt(0) === base.g.cp) ? label : label;
      if (p.y + p.g.yoff < base.y) issues.push({ text, cluster, kind: "clipped", message: `${label} starts above the cell` });
      // overlap / touch with every other glyph on the line
      lay.placed.forEach((q, k) => {
        if (k === i || q.line !== p.line) return;
        const a = sets[i]!;
        const b = sets[k]!;
        let hit = false;
        for (const key of a) if (b.has(key)) hit = true;
        if (hit) issues.push({ text, cluster, kind: "overlap", message: `${label} overlaps ${String.fromCodePoint(q.g.cp)} (U+${q.g.cp.toString(16).toUpperCase()})` });
        else if (near(a, b)) issues.push({ text, cluster, kind: "touch", message: `${label} touches ${String.fromCodePoint(q.g.cp)} (U+${q.g.cp.toString(16).toUpperCase()})` });
      });
      // floating: horizontal overlap with the base letter's box, and a small vertical gap to what is below / above
      const bx0 = base.x + base.g.xoff;
      const bx1 = bx0 + base.g.w;
      const mx0 = p.x + p.g.xoff;
      const mx1 = mx0 + p.g.w;
      if (mx1 <= bx0 || mx0 >= bx1) issues.push({ text, cluster, kind: "floating", message: `${label} is beside its letter, not on it` });
      const myTop = p.y + p.g.yoff;
      const myBot = myTop + p.g.h;
      const isLower = myTop >= base.y + font.baseline;
      // nearest ink of the cluster (base or earlier marks) in the vertical direction
      let gap = Infinity;
      for (let k = p.base; k < i; k++) {
        const q = lay.placed[k]!;
        const qLower = k !== p.base && q.y + q.g.yoff >= base.y + font.baseline;
        if (qLower !== isLower && k !== p.base) continue;
        // the letter counts from its body top (tall letters' ascenders sit beside left-shifted marks)
        const qTop = k === p.base && !isLower ? Math.max(q.y + q.g.yoff, q.y + font.zones.body) : q.y + q.g.yoff;
        const qBot = qTop + q.g.h;
        const g = isLower ? myTop - qBot : qTop - myBot;
        if (g >= 0) gap = Math.min(gap, g);
      }
      if (gap !== Infinity && gap > 2) issues.push({ text, cluster, kind: "floating", message: `${label} floats ${gap} rows away from what it sits on` });
    });
  }
  return issues;
}

/** True when a code point is a Thai combining mark (for the editor). */
export const markish = isThaiMark;
