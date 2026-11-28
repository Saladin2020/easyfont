/**
 * Easy Font for PixiJS v8 — Thai-correct pixel bitmap text.
 *
 *   import { loadEasyFonts } from "./easyfont-pixi.js";
 *   const ef = await loadEasyFonts(PIXI, "fonts/fonts.json");
 *   const t = ef.text("น้ำชาร้อนๆ", { font: "makham-16", fill: 0xf7ebd3, scale: 3, wrap: 300 });
 *   // fit a HUD line: wrap Thai at word boundaries (Intl.Segmenter), at most 2 lines, "…" when cut
 *   const q = ef.text(longQuest, { font: "makham-8", wrap: 180, maxLines: 2 });
 *   const one = ef.ellipsize(name, "makham-8", 90);   // single line, ellipsized to 90 font px
 *   app.stage.addChild(t);
 *   t.text = ef.shape("ปี่ฟื้น");      // always shape before setting text yourself
 *
 * Fonts are BMFont .fnt + PNG (white ink, tinted by fill). Thai stacking is solved by easyfont-core.js (the same
 * shaper as the Easy Font CLI), which maps combining marks to presentation forms in the font.
 * MIT. Fonts: SIL OFL 1.1.
 */
import { shapeThai, wrapLines, ellipsize as fitEllipsis } from "./easyfont-core.js";

export { shapeThai };

export async function loadEasyFonts(PIXI, manifestUrl = "fonts/fonts.json") {
  const base = new URL(manifestUrl, location.href);
  const manifest = await (await fetch(base)).json();
  const fonts = {};
  for (const f of manifest.fonts) {
    const bf = await PIXI.Assets.load(new URL(f.fnt, base).href);
    for (const p of bf.pages ?? []) if (p.texture?.source) p.texture.source.scaleMode = "nearest";
    fonts[f.id] = { ...f, family: bf.fontFamily ?? f.name, bitmap: bf };
  }
  const pick = (id) => fonts[id ?? manifest.default] ?? Object.values(fonts)[0];
  /** Width in font pixels of a (shaped) text, measured from the .fnt advances. */
  const measure = (text, id) => {
    const f = pick(id);
    let w = 0;
    for (const ch of shapeThai(text)) w += f.bitmap.chars[ch]?.xAdvance ?? 0;
    return w;
  };
  const advOf = (id) => {
    const f = pick(id);
    return (ch) => f.bitmap.chars[ch]?.xAdvance ?? 0;
  };
  const ellipsisFor = (id) => (pick(id).bitmap.chars["\u2026"] ? "\u2026" : "...");
  /**
   * Fit text into lines no wider than maxWidth font pixels. Thai breaks at word boundaries
   * (Intl.Segmenter), spaces and U+200B still break, and an over-long word splits between
   * clusters. opts.maxLines keeps that many lines and ellipsizes the last. Returns shaped text with \n.
   */
  const wrap = (text, id, maxWidth, opts = {}) =>
    wrapLines(String(text).replace(/\u200b/g, " "), advOf(id), shapeThai, maxWidth, { maxLines: opts.maxLines, ellipsis: ellipsisFor(id) })
      .map(shapeThai)
      .join("\n");
  /** One line, cut with an ellipsis so it is no wider than maxWidth font pixels. Returns shaped text. */
  const ellipsize = (text, id, maxWidth) => shapeThai(fitEllipsis(String(text), advOf(id), shapeThai, maxWidth, ellipsisFor(id)));
  /** Lines the text would take at maxWidth (for sizing panels before drawing). */
  const lines = (text, id, maxWidth, opts = {}) => wrap(text, id, maxWidth, opts).split("\n").length;
  /**
   * A BitmapText in an Easy Font. opts: font, fill, scale (integer), wrap (max width in font pixels),
   * maxLines (with wrap: keep that many lines, ellipsize the rest), fit (single line, ellipsize to this width).
   */
  const text = (str, opts = {}) => {
    const f = pick(opts.font);
    const body = opts.wrap ? wrap(str, f.id, opts.wrap, { maxLines: opts.maxLines }) : opts.fit ? ellipsize(str, f.id, opts.fit) : shapeThai(str);
    const t = new PIXI.BitmapText({ text: body, style: { fontFamily: f.family, fontSize: f.size, fill: opts.fill ?? 0xffffff } });
    t.roundPixels = true;
    // Pixi shifts BMFont text down by lineHeight − base; undo it so y is the cell top, as in Godot and the CLI
    t.pivot.y = f.bitmap.baseLineOffset ?? 0;
    if (opts.scale) t.scale.set(opts.scale);
    return t;
  };
  return { fonts, manifest, text, shape: shapeThai, measure, wrap, ellipsize, lines };
}
