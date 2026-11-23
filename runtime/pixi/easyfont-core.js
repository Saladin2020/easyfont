/* Easy Font core — generated from src/shared/shape.ts by scripts/build-core.mjs. Do not edit. MIT. */
// src/shared/shape.ts
var TALL = /* @__PURE__ */ new Set([3611, 3613, 3615, 3628]);
var TAIL = /* @__PURE__ */ new Map([[3597, 63247], [3600, 63232]]);
var DESC = /* @__PURE__ */ new Set([3598, 3599]);
var UPPER = [3633, 3636, 3637, 3638, 3639, 3655, 3661];
var TONES = [3656, 3657, 3658, 3659, 3660];
var LOWER = [3640, 3641, 3642];
var YAMAKKAN = 3662;
var SARA_AM = 3635;
var NIKHAHIT = 3661;
var SARA_AA = 3634;
var isThaiMark = (cp) => UPPER.includes(cp) || TONES.includes(cp) || LOWER.includes(cp) || cp === YAMAKKAN;
var forms = [];
var UPPER_NORMAL = [63264, 63265, 63266, 63267, 63268, 63269, 63275];
var UPPER_LEFT = [63248, 63233, 63234, 63235, 63236, 63250, 63249];
UPPER.forEach((src, i) => {
  forms.push({ cp: UPPER_NORMAL[i], src, left: false, low: false });
  forms.push({ cp: UPPER_LEFT[i], src, left: true, low: false });
});
TONES.forEach((src, i) => {
  forms.push({ cp: 63270 + i, src, left: false, low: false });
  forms.push({ cp: 63251 + i, src, left: true, low: false });
  forms.push({ cp: 63242 + i, src, left: false, low: true });
  forms.push({ cp: 63237 + i, src, left: true, low: true });
});
forms.push({ cp: 63276, src: YAMAKKAN, left: false, low: false });
LOWER.forEach((src, i) => {
  forms.push({ cp: 63277 + i, src, left: false, low: false });
  forms.push({ cp: 63256 + i, src, left: false, low: false, lower: true });
});
var FORMS = forms;
var upperIdx = (cp) => UPPER.indexOf(cp);
function shapeThai(text) {
  const cps = [...text].map((c) => c.codePointAt(0));
  const out = [];
  let i = 0;
  while (i < cps.length) {
    const base = cps[i];
    let j = i + 1;
    const marks = [];
    let am = false;
    while (j < cps.length && (isThaiMark(cps[j]) || cps[j] === SARA_AM)) {
      if (cps[j] === SARA_AM) {
        am = true;
        j++;
        break;
      }
      marks.push(cps[j]);
      j++;
    }
    if (!marks.length && !am) {
      out.push(base);
      i++;
      continue;
    }
    const isBase = base >= 3585 && base <= 3630;
    const tall = TALL.has(base);
    const lowers = marks.filter((m) => LOWER.includes(m));
    const uppers = marks.filter((m) => upperIdx(m) >= 0);
    if (am) uppers.push(NIKHAHIT);
    const tones = marks.filter((m) => TONES.includes(m) || m === YAMAKKAN);
    let b = base;
    if (lowers.length && TAIL.has(base)) b = TAIL.get(base);
    out.push(b);
    if (!isBase) {
      for (const m of marks) out.push(normalForm(m));
      if (am) out.push(SARA_AA);
      i = j;
      continue;
    }
    for (const m of lowers) out.push(DESC.has(base) ? 63256 + LOWER.indexOf(m) : 63277 + LOWER.indexOf(m));
    for (const m of uppers) out.push(tall ? UPPER_LEFT[upperIdx(m)] : UPPER_NORMAL[upperIdx(m)]);
    const hasUpper = uppers.length > 0;
    for (const m of tones) {
      if (m === YAMAKKAN) {
        out.push(63276);
        continue;
      }
      const k = TONES.indexOf(m);
      out.push(hasUpper ? (tall ? 63251 : 63270) + k : (tall ? 63237 : 63242) + k);
    }
    if (am) out.push(SARA_AA);
    i = j;
  }
  return String.fromCodePoint(...out);
}
function normalForm(m) {
  const u = upperIdx(m);
  if (u >= 0) return UPPER_NORMAL[u];
  const t = TONES.indexOf(m);
  if (t >= 0) return 63270 + t;
  const l = LOWER.indexOf(m);
  if (l >= 0) return 63277 + l;
  return m === YAMAKKAN ? 63276 : m;
}
function unshape(text) {
  const back = /* @__PURE__ */ new Map();
  for (const f of FORMS) back.set(f.cp, f.src);
  for (const [k, v] of TAIL) back.set(v, k);
  return String.fromCodePoint(...[...text].map((c) => back.get(c.codePointAt(0)) ?? c.codePointAt(0)));
}
export {
  DESC,
  FORMS,
  LOWER,
  NIKHAHIT,
  SARA_AA,
  SARA_AM,
  TAIL,
  TALL,
  TONES,
  UPPER,
  YAMAKKAN,
  isThaiMark,
  shapeThai,
  unshape
};
