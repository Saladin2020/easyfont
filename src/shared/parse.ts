import { FORMAT, type Diagnostic, type FontSource, type GlyphSrc, type Zones } from "./types.js";

const DEFAULT_ZONES: Zones = { tone: 0, upper: 4, body: 8, lower: 16, lowshift: 4, leftshift: 2, lowerdrop: 0 };

/** "ก" or "U+0E01" → code point. */
export function parseChar(tok: string): number | null {
  const m = /^U\+([0-9A-Fa-f]{4,6})$/.exec(tok);
  if (m) return parseInt(m[1]!, 16);
  const cps = [...tok];
  return cps.length === 1 ? cps[0]!.codePointAt(0)! : null;
}

export const cpLabel = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

/** Parse an `.easyfont` source. Errors carry `<file>:<line>` paths. */
export function parseFont(text: string, file = "font.easyfont"): { font: FontSource; errors: Diagnostic[]; warnings: Diagnostic[] } {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];
  const err = (line: number, message: string) => errors.push({ path: `${file}:${line}`, message, severity: "error" });
  const font: FontSource = { format: "", id: "", name: "", th: "", size: 0, line: 0, baseline: 0, spacing: 1, space: 3, zones: { ...DEFAULT_ZONES }, glyphs: [], text };
  const lines = text.split(/\r?\n/);
  let cur: GlyphSrc | null = null;
  const seen = new Map<number, number>();
  const finish = () => {
    if (!cur) return;
    if (!cur.rows.length) err(cur.line, `glyph ${cpLabel(cur.cp)} has no rows`);
    else if (!cur.rows.some((r) => r.includes("#"))) warnings.push({ path: `${file}:${cur.line}`, message: `glyph ${cpLabel(cur.cp)} is empty`, severity: "warning" });
    font.glyphs.push(cur);
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const n = i + 1;
    const raw = lines[i]!;
    const t = raw.trim();
    if (cur) {
      if (t === "") {
        finish();
        continue;
      }
      if (/^[#.]+$/.test(t) && !t.startsWith("# ")) {
        cur.rows.push(t);
        continue;
      }
      finish();
    }
    if (t === "" || t.startsWith("#")) continue;
    const [key, ...rest] = t.split(/\s+/);
    const val = rest.join(" ");
    switch (key) {
      case "format":
        font.format = val;
        if (val !== FORMAT) err(n, `format must be ${FORMAT}`);
        break;
      case "id":
        font.id = val;
        if (!/^[a-z0-9][a-z0-9_-]*$/.test(val)) err(n, "id must match ^[a-z0-9][a-z0-9_-]*$");
        break;
      case "name":
        font.name = val;
        break;
      case "th":
        font.th = val;
        break;
      case "size":
      case "line":
      case "baseline":
      case "spacing":
      case "space": {
        const v = Number(val);
        if (!Number.isInteger(v) || v < 0 || v > 256) err(n, `${key} must be an integer 0..256`);
        else (font as unknown as Record<string, number>)[key] = v;
        break;
      }
      case "zones":
        for (const kv of rest) {
          const [k, v] = kv.split("=");
          if (!(k! in DEFAULT_ZONES) || !Number.isInteger(Number(v))) err(n, `bad zone "${kv}" (tone, upper, body, lower, lowshift, leftshift, lowerdrop)`);
          else (font.zones as unknown as Record<string, number>)[k!] = Number(v);
        }
        break;
      case "g": {
        const cp = parseChar(rest[0] ?? "");
        const top = Number(rest[1]);
        if (cp === null) {
          err(n, `bad character "${rest[0]}" (one character or U+XXXX)`);
          break;
        }
        if (!Number.isInteger(top) || top < 0) err(n, "glyph top row must be an integer ≥ 0");
        let dx = 0;
        let mark = false;
        for (const o of rest.slice(2)) {
          if (o === "mark") mark = true;
          else if (/^dx=-?\d+$/.test(o)) dx = Number(o.slice(3));
          else err(n, `unknown glyph option "${o}" (mark, dx=N)`);
        }
        if (seen.has(cp)) err(n, `duplicate glyph ${cpLabel(cp)} "${String.fromCodePoint(cp)}" (also on line ${seen.get(cp)})`);
        seen.set(cp, n);
        cur = { cp, top: Number.isInteger(top) ? top : 0, rows: [], mark, dx, line: n };
        break;
      }
      default:
        err(n, `unknown line "${t.slice(0, 40)}"`);
    }
  }
  finish();
  if (!font.id) err(1, "missing id");
  if (!font.size) err(1, "missing size");
  if (!font.line) err(1, "missing line");
  if (!font.baseline || font.baseline > font.line) err(1, "baseline must be 1..line");
  for (const g of font.glyphs) {
    if (g.top + g.rows.length > font.line) err(g.line, `glyph ${cpLabel(g.cp)} "${String.fromCodePoint(g.cp)}" runs below the cell (top ${g.top} + ${g.rows.length} rows > line ${font.line})`);
  }
  return { font, errors, warnings };
}

/** Serialize back to `.easyfont` text (used by the editor when glyphs change). */
export function formatFont(f: FontSource): string {
  const z = f.zones;
  const out = [
    `# ${f.name}${f.th ? ` · ${f.th}` : ""} — Easy Font source (${FORMAT})`,
    `format ${FORMAT}`,
    `id ${f.id}`,
    `name ${f.name}`,
    ...(f.th ? [`th ${f.th}`] : []),
    `size ${f.size}`,
    `line ${f.line}`,
    `baseline ${f.baseline}`,
    `spacing ${f.spacing}`,
    `space ${f.space}`,
    `zones tone=${z.tone} upper=${z.upper} body=${z.body} lower=${z.lower} lowshift=${z.lowshift} leftshift=${z.leftshift} lowerdrop=${z.lowerdrop}`,
    "",
  ];
  for (const g of f.glyphs) {
    const ch = String.fromCodePoint(g.cp);
    const tok = g.mark || g.cp < 0x21 || (g.cp >= 0xe000 && g.cp <= 0xf8ff) || /\s/.test(ch) ? cpLabel(g.cp) : ch;
    out.push(`g ${tok} ${g.top}${g.mark ? " mark" : ""}${g.dx ? ` dx=${g.dx}` : ""}`, ...g.rows, "");
  }
  return out.join("\n");
}
