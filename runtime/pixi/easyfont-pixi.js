/**
 * Easy Font for PixiJS v8 — Thai-correct pixel bitmap text.
 *
 *   import { loadEasyFonts } from "./easyfont-pixi.js";
 *   const ef = await loadEasyFonts(PIXI, "fonts/fonts.json");
 *   const t = ef.text("น้ำชาร้อนๆ", { font: "makham-16", fill: 0xf7ebd3, scale: 3, wrap: 300 });
 *   app.stage.addChild(t);
 *   t.text = ef.shape("ปี่ฟื้น");      // always shape before setting text yourself
 *
 * Fonts are BMFont .fnt + PNG (white ink, tinted by fill). Thai stacking is solved by easyfont-core.js (the same
 * shaper as the Easy Font CLI), which maps combining marks to presentation forms in the font.
 * MIT. Fonts: SIL OFL 1.1.
 */
import { shapeThai } from "./easyfont-core.js";

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
  /** Break at spaces / U+200B so no line is wider than maxWidth font pixels. Returns shaped text with \n. */
  const wrap = (text, id, maxWidth) => {
    const f = pick(id);
    const adv = (ch) => f.bitmap.chars[ch]?.xAdvance ?? 0;
    return text
      .split("\n")
      .map((para) => {
        const out = [];
        let line = "";
        let lineW = 0;
        for (const word of shapeThai(para).split(/(?<=[ \u200b])/)) {
          let w = 0;
          for (const ch of word.replace(/[ \u200b]$/, "")) w += adv(ch);
          if (line && lineW + w > maxWidth) {
            out.push(line.replace(/[ \u200b]+$/, ""));
            line = "";
            lineW = 0;
          }
          line += word.replace(/\u200b$/, "");
          lineW += w + (word.endsWith(" ") ? adv(" ") : 0);
        }
        out.push(line);
        return out.join("\n");
      })
      .join("\n");
  };
  /** A BitmapText in an Easy Font. opts: font, fill, scale (integer), wrap (max width in font pixels). */
  const text = (str, opts = {}) => {
    const f = pick(opts.font);
    const t = new PIXI.BitmapText({ text: opts.wrap ? wrap(str, f.id, opts.wrap) : shapeThai(str), style: { fontFamily: f.family, fontSize: f.size, fill: opts.fill ?? 0xffffff } });
    t.roundPixels = true;
    // Pixi shifts BMFont text down by lineHeight − base; undo it so y is the cell top, as in Godot and the CLI
    t.pivot.y = f.bitmap.baseLineOffset ?? 0;
    if (opts.scale) t.scale.set(opts.scale);
    return t;
  };
  return { fonts, manifest, text, shape: shapeThai, measure, wrap };
}
