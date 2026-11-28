/* Easy Font core — generated from src/shared/core.ts (shape.ts + fit.ts) by scripts/build-core.mjs. Do not edit. MIT. */
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

// src/shared/fit.ts
var MARK = /[\u0e31\u0e34-\u0e3a\u0e47-\u0e4e]/;
function clusters(text) {
  const out = [];
  for (const ch of text) {
    if (out.length && (MARK.test(ch) || ch === "\u0E33")) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}
function segmenter() {
  const I = globalThis.Intl;
  return I?.Segmenter;
}
function breakPieces(text) {
  const S = segmenter();
  let words;
  if (S) {
    try {
      words = [...new S("th", { granularity: "word" }).segment(text)].map((s) => s.segment);
    } catch {
      words = clusters(text);
    }
  } else {
    words = clusters(text);
  }
  const out = [];
  let carry = "";
  for (const w of words) {
    if (!w) continue;
    if (out.length && /^[\s)\]}»”’.,;:!?…/·ๆฯ%]+$/.test(w)) {
      out[out.length - 1] += w;
      continue;
    }
    if (/^[([{«“‘]+$/.test(w)) {
      carry += w;
      continue;
    }
    out.push(carry + w);
    carry = "";
  }
  if (carry) out.push(carry);
  return out;
}
function widthOf(s, adv, shape) {
  let w = 0;
  for (const ch of shape(s)) w += adv(ch);
  return w;
}
function ellipsize(text, adv, shape, maxWidth, ellipsis = "\u2026") {
  if (widthOf(text, adv, shape) <= maxWidth) return text;
  const cl = clusters(text);
  const ew = widthOf(ellipsis, adv, shape);
  let lo = 0, hi = cl.length;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (widthOf(cl.slice(0, mid).join(""), adv, shape) + ew <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return cl.slice(0, lo).join("").replace(/[\s·/,:;]+$/, "") + ellipsis;
}
function wrapLines(text, adv, shape, maxWidth, opts = {}) {
  const lines = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const piece of breakPieces(para)) {
      const trial = line + piece;
      if (!line || widthOf(trial.replace(/\s+$/, ""), adv, shape) <= maxWidth) {
        if (!line && widthOf(piece.replace(/\s+$/, ""), adv, shape) > maxWidth) {
          let part = "";
          for (const c of clusters(piece)) {
            if (part && widthOf(part + c, adv, shape) > maxWidth) {
              lines.push(part);
              part = "";
            }
            part += c;
          }
          line = part;
        } else line = trial;
        continue;
      }
      lines.push(line.replace(/\s+$/, ""));
      line = piece.replace(/^\s+/, "");
      if (widthOf(line.replace(/\s+$/, ""), adv, shape) > maxWidth) {
        let part = "";
        for (const c of clusters(line)) {
          if (part && widthOf(part + c, adv, shape) > maxWidth) {
            lines.push(part);
            part = "";
          }
          part += c;
        }
        line = part;
      }
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  const max = opts.maxLines ?? 0;
  if (max > 0 && lines.length > max) {
    const kept = lines.slice(0, max);
    const rest = lines.slice(max - 1).join(" ");
    kept[max - 1] = ellipsize(rest, adv, shape, maxWidth, opts.ellipsis ?? "\u2026");
    if (kept[max - 1] === rest) kept[max - 1] = ellipsize(rest + (opts.ellipsis ?? "\u2026"), adv, shape, maxWidth, opts.ellipsis ?? "\u2026");
    return kept;
  }
  return lines;
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
  breakPieces,
  clusters,
  ellipsize,
  isThaiMark,
  shapeThai,
  unshape,
  wrapLines
};
