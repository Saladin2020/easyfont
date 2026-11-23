import { useCallback, useEffect, useMemo, useState } from "react";
import { get, post, type Check, type FontData, type GlyphRow, type Workspace } from "./api";

type Tab = "glyphs" | "preview" | "check" | "source";
const TABS: Array<[Tab, string]> = [["glyphs", "Glyphs · ตัวอักษร"], ["preview", "Preview · ตัวอย่าง"], ["check", "Check · ตรวจ"], ["source", "Source"]];
const GROUPS: Array<[string, (g: GlyphRow) => boolean]> = [
  ["พยัญชนะ", (g) => g.cp >= 0x0e01 && g.cp <= 0x0e2e],
  ["สระ · วรรณยุกต์", (g) => (g.cp >= 0x0e2f && g.cp <= 0x0e4e) || g.mark],
  ["เลขไทย", (g) => g.cp >= 0x0e4f && g.cp <= 0x0e5b],
  ["Latin · Melayu", (g) => g.cp < 0x0e00],
  ["รูปพิเศษ (ไม่มีเชิง)", (g) => g.cp >= 0xe000 && g.cp <= 0xf8ff],
];
const rendUrl = (id: string, q: Record<string, string | number>) => `/api/render/${id}?${new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]))}&t=${Date.now()}`;

export function App() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [fontId, setFontId] = useState("");
  const [font, setFont] = useState<FontData | null>(null);
  const [tab, setTab] = useState<Tab>("glyphs");
  const [sel, setSel] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [rev, setRev] = useState(0);

  useEffect(() => {
    get<Workspace>("/api/workspace").then((w) => {
      setWs(w);
      setFontId(w.fonts.find((f) => f.id.endsWith("12"))?.id ?? w.fonts[0]?.id ?? "");
    }).catch((e) => setStatus(String(e)));
  }, []);
  const reload = useCallback(() => {
    if (!fontId) return;
    get<FontData>(`/api/font/${fontId}`).then((f) => {
      setFont(f);
      setSel((s) => s ?? f.glyphs.find((g) => g.char === "ก")?.cp ?? f.glyphs[0]?.cp ?? null);
    }).catch((e) => setStatus(String(e)));
    setRev((r) => r + 1);
  }, [fontId]);
  useEffect(reload, [reload]);

  if (!ws) return <div className="loading">Loading Easy Font… {status}</div>;
  return (
    <>
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" />
          <div>
            <h1 className="brand">Easy <span>Font</span></h1>
            <p className="brand-th">ฟอนต์พิกเซลไทย · สระและวรรณยุกต์ซ้อนถูกที่</p>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(([t, label]) => (
            <button key={t} data-tab={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{label}</button>
          ))}
          <select value={fontId} onChange={(e) => { setSel(null); setFontId(e.target.value); }}>
            {ws.fonts.map((f) => <option key={f.id} value={f.id}>{f.th || f.name} · {f.size}px</option>)}
          </select>
        </nav>
        <div className="status">{status}</div>
      </header>
      {font && tab === "glyphs" && <Glyphs font={font} sel={sel} setSel={setSel} onSaved={(m) => { setStatus(m); reload(); }} rev={rev} />}
      {font && tab === "preview" && <Preview font={font} ws={ws} rev={rev} setStatus={setStatus} />}
      {font && tab === "check" && <CheckTab font={font} rev={rev} />}
      {font && tab === "source" && <Source font={font} onSaved={(m) => { setStatus(m); reload(); }} />}
    </>
  );
}

function Glyphs({ font, sel, setSel, onSaved, rev }: { font: FontData; sel: number | null; setSel: (c: number) => void; onSaved: (m: string) => void; rev: number }) {
  const g = font.glyphs.find((x) => x.cp === sel) ?? null;
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [top, setTop] = useState(0);
  const [err, setErr] = useState("");
  const W = Math.max(12, font.size + 4);
  useEffect(() => {
    if (!g) return;
    const rows = Array.from({ length: font.line }, (_, y) => Array.from({ length: W }, (_, x) => g.rows[y - g.top]?.[x] === "#"));
    setGrid(rows);
    setTop(g.top);
    setErr("");
  }, [g, font.line, W]);
  const toggle = (x: number, y: number) => setGrid((G) => G.map((r, yy) => r.map((v, xx) => (xx === x && yy === y ? !v : v))));
  const save = async () => {
    if (!g) return;
    const inked = grid.map((r, y) => (r.some(Boolean) ? y : -1)).filter((y) => y >= 0);
    if (!inked.length) return setErr("Draw at least one pixel");
    const y0 = Math.min(...inked);
    const y1 = Math.max(...inked);
    const right = Math.max(...grid.map((r) => r.lastIndexOf(true))) + 1;
    const rows = grid.slice(y0, y1 + 1).map((r) => r.slice(0, right).map((v) => (v ? "#" : ".")).join(""));
    try {
      await post(`/api/font/${font.id}/glyph`, { char: `U+${g.cp.toString(16).toUpperCase().padStart(4, "0")}`, top: y0, rows, mark: g.mark, dx: g.dx });
      setTop(y0);
      onSaved(`Saved ${g.char} (${rows.length} rows from row ${y0})`);
    } catch (e) {
      setErr(String(e));
    }
  };
  const z = font.zones;
  return (
    <main className="layout font">
      <section className="panel list">
        {GROUPS.map(([label, f]) => (
          <div key={label}>
            <h3>{label}</h3>
            <div className="glyph-grid">
              {font.glyphs.filter(f).map((x) => (
                <button key={x.cp} className={x.cp === sel ? "on" : ""} title={`U+${x.cp.toString(16).toUpperCase()}`} onClick={() => setSel(x.cp)}>{glyphLabel(x)}</button>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="panel preview">
        {g && (
          <>
            <div className="toolbar">
              <b className="big">{glyphLabel(g)}</b>
              <span className="mono">U+{g.cp.toString(16).toUpperCase().padStart(4, "0")} · top {top} · advance {g.adv}{g.mark ? " · mark (zero width)" : ""}</span>
              <button className="primary" onClick={save}>Save glyph</button>
              {err && <span className="err">{err}</span>}
            </div>
            <div className="pixel-wrap">
              <div className="pixel" style={{ gridTemplateColumns: `repeat(${W}, 22px)` }}>
                {grid.map((r, y) => r.map((v, x) => (
                  <div key={`${x},${y}`} data-x={x} data-y={y} className={`px${v ? " on" : ""}${y === font.baseline ? " base" : ""}${y === z.body ? " body" : ""}${y === z.upper ? " upper" : ""}${y === z.tone ? " tone" : ""}${y === z.lower ? " lower" : ""}`} onMouseDown={() => toggle(x, y)} />
                )))}
              </div>
              <ul className="legend">
                <li className="tone">tone row {z.tone}</li>
                <li className="upper">upper vowels {z.upper}</li>
                <li className="body">body (x-height) {z.body}</li>
                <li className="base">baseline {font.baseline}</li>
                <li className="lower">lower vowels {z.lower}</li>
              </ul>
            </div>
          </>
        )}
      </section>
      <section className="panel side">
        <h4>In context</h4>
        {g && <img className="ctx" alt="" src={rendUrl(font.id, { text: context(g), scale: 4 }) + `&r=${rev}`} />}
        <h4>Glyph sheet</h4>
        <img className="ctx" alt="" src={rendUrl(font.id, { glyphs: 1, scale: 2 }) + `&r=${rev}`} />
      </section>
    </main>
  );
}

const PUA_LABEL: Record<number, string> = { 0xf70f: "ญ⁻", 0xf700: "ฐ⁻" };
const glyphLabel = (g: GlyphRow) => PUA_LABEL[g.cp] ?? (g.mark ? `◌${g.char}` : g.char);

function context(g: GlyphRow): string {
  if (g.cp === 0xf70f) return "ญ ญุ ญู ญาติ";
  if (g.cp === 0xf700) return "ฐ ฐุ ฐู ฐาน";
  if (g.mark) return ["ก", "ป", "ฟ", "น", "ญ"].map((b) => b + g.char).join(" ") + (g.cp >= 0x0e48 && g.cp <= 0x0e4b ? ` กี${g.char} ปิ${g.char}` : "");
  if (g.cp >= 0x0e01 && g.cp <= 0x0e2e) return `${g.char} ${g.char}ี่ ${g.char}ุ ${g.char}้ำ ${g.char}ั๊`;
  return `${g.char}${g.char} a${g.char}b ก${g.char}ข`;
}

function Preview({ font, ws, rev, setStatus }: { font: FontData; ws: Workspace; rev: number; setStatus: (s: string) => void }) {
  const [text, setText] = useState(ws.samples.th.join("\n"));
  const [scale, setScale] = useState(3);
  const [dialogue, setDialogue] = useState(false);
  const [speaker, setSpeaker] = useState("ป้านูรุล");
  const [shape, setShape] = useState("");
  const url = useMemo(() => rendUrl(font.id, dialogue ? { text, scale, dialogue: speaker, wrap: 320 } : { text, scale }) + `&r=${rev}`, [font.id, text, scale, dialogue, speaker, rev]);
  useEffect(() => {
    const first = text.split("\n")[0] ?? "";
    get<{ codepoints: string[] }>(`/api/shape?text=${encodeURIComponent(first.slice(0, 40))}`).then((s) => setShape(s.codepoints.join(" "))).catch(() => {});
  }, [text]);
  const exp = async (preset: string) => {
    try {
      const r = await post<{ dirs: string[]; files: number }>("/api/export", { preset });
      setStatus(`Exported ${r.files} files → ${r.dirs.join(", ")}`);
    } catch (e) {
      setStatus(String(e));
    }
  };
  return (
    <main className="layout one">
      <section className="panel preview">
        <div className="toolbar">
          {[["ไทย", ws.samples.th.join("\n")], ["Melayu", ws.samples.latin[1]!], ["English", `${ws.samples.latin[0]}\n${ws.samples.latin[2]}`], ["บทสนทนา", "สวัสดีจ้ะ น้ำชาร้อนๆ ที่ร้านป้าเปิดแล้ว ปี่กับฟ้าก็มาช่วยปั้นขนมนะ"]].map(([l, t]) => (
            <button key={l} onClick={() => setText(t!)}>{l}</button>
          ))}
          <label>Scale <input type="range" min={1} max={6} value={scale} onChange={(e) => setScale(Number(e.target.value))} /> {scale}×</label>
          <label><input type="checkbox" checked={dialogue} onChange={(e) => setDialogue(e.target.checked)} /> Dialogue box</label>
          {dialogue && <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} />}
        </div>
        <textarea className="text-in" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
        <div className="stage-wrap"><img className="stage-canvas" alt="preview" src={url} /></div>
        <p className="mono faint">shaped: {shape}</p>
        <h4>Export</h4>
        <div className="export-grid">
          {[["bmfont", ".fnt + PNG"], ["godot", "FontFile + EasyFont autoload"], ["pixi", "BitmapFont + runtime"], ["png", "specimens"]].map(([p, d]) => (
            <button key={p} onClick={() => exp(p!)}><b>{p}</b><small>{d}</small></button>
          ))}
        </div>
      </section>
    </main>
  );
}

function CheckTab({ font, rev }: { font: FontData; rev: number }) {
  const [c, setC] = useState<Check | null>(null);
  useEffect(() => void get<Check>(`/api/check/${font.id}`).then(setC), [font.id, rev]);
  if (!c) return <div className="loading">Checking…</div>;
  return (
    <main className="layout one">
      <section className="panel diag">
        <h2>{c.ok ? "✓" : "✗"} {font.th} · {font.name}</h2>
        <p>{c.glyphs} drawn glyphs + {c.forms} generated Thai presentation forms · {c.samples} sample lines checked for overlap, touching, floating and clipped marks</p>
        {c.errors.map((e, i) => <p key={`e${i}`} className="err">{e.path}: {e.message}</p>)}
        {c.warnings.map((e, i) => <p key={`w${i}`} className="warn">{e.path}: {e.message}</p>)}
        <p>{c.missing.length ? <span className="warn">Missing {c.missing.length}: {c.missing.join(" ")}</span> : "Coverage: every Thai character, printable ASCII and common punctuation ✓"}</p>
        {c.stacking.length ? c.stacking.map((s, i) => <p key={`s${i}`} className="err">{s.kind} {s.cluster}: {s.message}</p>) : <p>Stacking: no issues ✓</p>}
        <img className="stage-canvas" alt="" src={rendUrl(font.id, { text: "น้ำ ที่ ปี่ ฟื้น ปั้น ฝั่ง ฟ้า ปู่ ป๊อป กั๊ก ก๋วย\nเจี๊ยบ ชื่อ ขึ้น ญาติ ฐาน ญุ ฐุ ฎุ ฏู ฤๅษี ฬ้า ปั๋ง", scale: 4 })} />
      </section>
    </main>
  );
}

function Source({ font, onSaved }: { font: FontData; onSaved: (m: string) => void }) {
  const [text, setText] = useState(font.text);
  const [err, setErr] = useState<string[]>([]);
  useEffect(() => setText(font.text), [font.text]);
  const save = async () => {
    const r = await fetch(`/api/font/${font.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }).then((x) => x.json() as Promise<{ saved?: boolean; errors?: Array<{ path: string; message: string }>; error?: string }>);
    if (r.saved) {
      setErr([]);
      onSaved(`Saved fonts/${font.id}.easyfont`);
    } else setErr(r.error ? [r.error] : (r.errors ?? []).map((e) => `${e.path}: ${e.message}`));
  };
  return (
    <main className="layout one">
      <section className="panel preview">
        <div className="toolbar"><b>fonts/{font.id}.easyfont</b><button className="primary" onClick={save}>Save</button>{err.map((e) => <span key={e} className="err">{e}</span>)}</div>
        <textarea className="source" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
      </section>
    </main>
  );
}
