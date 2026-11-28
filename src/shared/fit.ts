/**
 * Measured line fitting for Thai (and mixed Thai / Latin) text.
 *
 * Thai is written without spaces between words, so breaking only at spaces (the old
 * runtime behaviour) never wraps a Thai sentence. Here break opportunities come from
 * Intl.Segmenter word boundaries ("th"), with a grapheme-cluster fallback so a
 * consonant never loses its vowels / tone marks across a line break, and a word that is
 * wider than the line is split between clusters.
 *
 * Pure functions: callers pass an advance-width function (font pixels per shaped char)
 * and a shaper, so this runs the same in the Pixi runtime, the CLI and the tests.
 */

export type Advance = (ch: string) => number;
export type Shaper = (s: string) => string;

const MARK = /[\u0e31\u0e34-\u0e3a\u0e47-\u0e4e]/;

/** Grapheme clusters: a base char plus the Thai combining marks after it. */
export function clusters(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    if (out.length && (MARK.test(ch) || ch === "\u0e33")) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

type Seg = { segment: string };
type SegmenterCtor = new (locale: string, opts: { granularity: "word" | "grapheme" }) => { segment(s: string): Iterable<Seg> };

function segmenter(): SegmenterCtor | undefined {
  const I = (globalThis as unknown as { Intl?: { Segmenter?: SegmenterCtor } }).Intl;
  return I?.Segmenter;
}

/**
 * Split text into unbreakable pieces. Breaks are allowed between pieces; spaces stay
 * attached to the piece before them (and are dropped at a line end).
 */
export function breakPieces(text: string): string[] {
  const S = segmenter();
  let words: string[];
  if (S) {
    try {
      words = [...new S("th", { granularity: "word" }).segment(text)].map((s) => s.segment);
    } catch {
      words = clusters(text);
    }
  } else {
    words = clusters(text);
  }
  // glue: spaces and closing punctuation to the previous piece, opening punctuation to the next
  const out: string[] = [];
  let carry = "";
  for (const w of words) {
    if (!w) continue;
    if (out.length && /^[\s)\]}»”’.,;:!?…/·ๆฯ%]+$/.test(w)) { out[out.length - 1] += w; continue; }
    if (/^[([{«“‘]+$/.test(w)) { carry += w; continue; }
    out.push(carry + w);
    carry = "";
  }
  if (carry) out.push(carry);
  return out;
}

function widthOf(s: string, adv: Advance, shape: Shaper): number {
  let w = 0;
  for (const ch of shape(s)) w += adv(ch);
  return w;
}

export interface WrapOptions {
  /** Keep at most this many lines; the last one is ellipsized when text remains. */
  maxLines?: number;
  /** Ellipsis string (default "…"; pass "..." when the font has no U+2026). */
  ellipsis?: string;
}

/** Cut text (by clusters) so text + ellipsis fits maxWidth. Returns the text unchanged when it already fits. */
export function ellipsize(text: string, adv: Advance, shape: Shaper, maxWidth: number, ellipsis = "…"): string {
  if (widthOf(text, adv, shape) <= maxWidth) return text;
  const cl = clusters(text);
  const ew = widthOf(ellipsis, adv, shape);
  let lo = 0, hi = cl.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (widthOf(cl.slice(0, mid).join(""), adv, shape) + ew <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return cl.slice(0, lo).join("").replace(/[\s·/,:;]+$/, "") + ellipsis;
}

/** Wrap text into lines no wider than maxWidth (font px). Returns UNSHAPED lines. */
export function wrapLines(text: string, adv: Advance, shape: Shaper, maxWidth: number, opts: WrapOptions = {}): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const piece of breakPieces(para)) {
      const trial = line + piece;
      if (!line || widthOf(trial.replace(/\s+$/, ""), adv, shape) <= maxWidth) {
        if (!line && widthOf(piece.replace(/\s+$/, ""), adv, shape) > maxWidth) {
          // a single piece wider than the line: split it between clusters
          let part = "";
          for (const c of clusters(piece)) {
            if (part && widthOf(part + c, adv, shape) > maxWidth) { lines.push(part); part = ""; }
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
          if (part && widthOf(part + c, adv, shape) > maxWidth) { lines.push(part); part = ""; }
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
    kept[max - 1] = ellipsize(rest, adv, shape, maxWidth, opts.ellipsis ?? "…");
    if (kept[max - 1] === rest) kept[max - 1] = ellipsize(rest + (opts.ellipsis ?? "…"), adv, shape, maxWidth, opts.ellipsis ?? "…");
    return kept;
  }
  return lines;
}
