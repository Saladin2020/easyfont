/**
 * Thai shaper for bitmap fonts. Bitmap engines (BMFont, Godot FontFile, Pixi BitmapText) place one glyph after
 * another, so stacking is decided here: every Thai combining mark becomes a Private Use Area presentation form
 * that already sits at the right height and column.
 *
 *   tone mark, no upper vowel      → low form    (U+F70A–F70E)   ก่  sits right above the letter
 *   tone mark over an upper vowel  → high form   (U+F726–F72A)   กี่ stacks above the vowel
 *   tall letter ป ฝ ฟ ฬ            → left forms  (U+F701–F704, F710–F712, F705–F709, F713–F717)
 *   ญ ฐ + lower vowel             → tailless    (U+F70F, U+F700)
 *   ฎ ฏ + lower vowel             → low forms   (U+F718–F71A)
 *   ำ                              → ํ + า, nikhahit drawn under the tone mark (น้ำ)
 *
 * U+F700–F71A follow the Apple / Microsoft Thai PUA convention; U+F720–F72F are Easy Font's normal-position
 * copies so engines that group combining marks into graphemes (Pixi) still draw them one by one.
 */

export const TALL = new Set([0x0e1b, 0x0e1d, 0x0e1f, 0x0e2c]); // ป ฝ ฟ ฬ
export const TAIL = new Map([[0x0e0d, 0xf70f], [0x0e10, 0xf700]]); // ญ ฐ
export const DESC = new Set([0x0e0e, 0x0e0f]); // ฎ ฏ
export const UPPER = [0x0e31, 0x0e34, 0x0e35, 0x0e36, 0x0e37, 0x0e47, 0x0e4d]; // ั ิ ี ึ ื ็ ํ
export const TONES = [0x0e48, 0x0e49, 0x0e4a, 0x0e4b, 0x0e4c]; // ่ ้ ๊ ๋ ์
export const LOWER = [0x0e38, 0x0e39, 0x0e3a]; // ุ ู ฺ
export const YAMAKKAN = 0x0e4e;
export const SARA_AM = 0x0e33;
export const NIKHAHIT = 0x0e4d;
export const SARA_AA = 0x0e32;

/** Thai combining marks (zero width). */
export const isThaiMark = (cp: number) => UPPER.includes(cp) || TONES.includes(cp) || LOWER.includes(cp) || cp === YAMAKKAN;

/** Presentation forms: [kind, source code point, dx columns (× leftshift), dy rows (× lowshift | lowerdrop)]. */
export interface FormSpec {
  cp: number;
  src: number;
  left: boolean;
  low: boolean;
  lower?: boolean;
}

const forms: FormSpec[] = [];
// upper vowels: normal copies and left forms
const UPPER_NORMAL = [0xf720, 0xf721, 0xf722, 0xf723, 0xf724, 0xf725, 0xf72b];
const UPPER_LEFT = [0xf710, 0xf701, 0xf702, 0xf703, 0xf704, 0xf712, 0xf711];
UPPER.forEach((src, i) => {
  forms.push({ cp: UPPER_NORMAL[i]!, src, left: false, low: false });
  forms.push({ cp: UPPER_LEFT[i]!, src, left: true, low: false });
});
TONES.forEach((src, i) => {
  forms.push({ cp: 0xf726 + i, src, left: false, low: false }); // high
  forms.push({ cp: 0xf713 + i, src, left: true, low: false }); // high-left
  forms.push({ cp: 0xf70a + i, src, left: false, low: true }); // low
  forms.push({ cp: 0xf705 + i, src, left: true, low: true }); // low-left
});
forms.push({ cp: 0xf72c, src: YAMAKKAN, left: false, low: false });
LOWER.forEach((src, i) => {
  forms.push({ cp: 0xf72d + i, src, left: false, low: false });
  forms.push({ cp: 0xf718 + i, src, left: false, low: false, lower: true });
});
export const FORMS: readonly FormSpec[] = forms;

const upperIdx = (cp: number) => UPPER.indexOf(cp);

/** Shape Thai text into presentation forms. Other scripts pass through unchanged. */
export function shapeThai(text: string): string {
  const cps = [...text].map((c) => c.codePointAt(0)!);
  const out: number[] = [];
  let i = 0;
  while (i < cps.length) {
    const base = cps[i]!;
    // collect the marks (and sara am) that follow this letter
    let j = i + 1;
    const marks: number[] = [];
    let am = false;
    while (j < cps.length && (isThaiMark(cps[j]!) || cps[j] === SARA_AM)) {
      if (cps[j] === SARA_AM) {
        am = true;
        j++;
        break; // sara am ends the cluster
      }
      marks.push(cps[j]!);
      j++;
    }
    if (!marks.length && !am) {
      out.push(base);
      i++;
      continue;
    }
    const isBase = base >= 0x0e01 && base <= 0x0e2e;
    const tall = TALL.has(base);
    const lowers = marks.filter((m) => LOWER.includes(m));
    const uppers = marks.filter((m) => upperIdx(m) >= 0);
    if (am) uppers.push(NIKHAHIT);
    const tones = marks.filter((m) => TONES.includes(m) || m === YAMAKKAN);
    let b = base;
    if (lowers.length && TAIL.has(base)) b = TAIL.get(base)!;
    out.push(b);
    if (!isBase) {
      // marks after a non-letter (space, digit, Latin): normal copies, no stacking rules
      for (const m of marks) out.push(normalForm(m));
      if (am) out.push(SARA_AA);
      i = j;
      continue;
    }
    for (const m of lowers) out.push(DESC.has(base) ? 0xf718 + LOWER.indexOf(m) : 0xf72d + LOWER.indexOf(m));
    for (const m of uppers) out.push(tall ? UPPER_LEFT[upperIdx(m)]! : UPPER_NORMAL[upperIdx(m)]!);
    const hasUpper = uppers.length > 0;
    for (const m of tones) {
      if (m === YAMAKKAN) {
        out.push(0xf72c);
        continue;
      }
      const k = TONES.indexOf(m);
      out.push(hasUpper ? (tall ? 0xf713 : 0xf726) + k : (tall ? 0xf705 : 0xf70a) + k);
    }
    if (am) out.push(SARA_AA);
    i = j;
  }
  return String.fromCodePoint(...out);
}

function normalForm(m: number): number {
  const u = upperIdx(m);
  if (u >= 0) return UPPER_NORMAL[u]!;
  const t = TONES.indexOf(m);
  if (t >= 0) return 0xf726 + t;
  const l = LOWER.indexOf(m);
  if (l >= 0) return 0xf72d + l;
  return m === YAMAKKAN ? 0xf72c : m;
}

/** Inverse map for tests and the editor: presentation form → source character. */
export function unshape(text: string): string {
  const back = new Map<number, number>();
  for (const f of FORMS) back.set(f.cp, f.src);
  for (const [k, v] of TAIL) back.set(v, k);
  return String.fromCodePoint(...[...text].map((c) => back.get(c.codePointAt(0)!) ?? c.codePointAt(0)!));
}
