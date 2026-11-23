<!-- easy-suite:header:start -->
<p align="center">
  <a href="#easy-suite"><img src="docs/brand/banner-font.png" width="100%" alt="Easy Font: Thai pixel fonts with stacked vowels and tone marks" /></a>
</p>

<p align="center">
  <b>Easy Font</b> · ฟอนต์พิกเซลไทย สระไม่ชน · Thai pixel fonts with stacked vowels and tone marks<br />
  <sub>Part of <a href="#easy-suite"><b>Easy Suite</b></a>: Thai-friendly pixel-art game dev tools for Godot 4.3+ and PixiJS v8</sub>
</p>

<p align="center">
  <a href="https://github.com/Saladin2020/easyfont/actions/workflows/ci.yml"><img src="https://github.com/Saladin2020/easyfont/actions/workflows/ci.yml/badge.svg" alt="CI" /></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2e2014?style=flat-square" alt="MIT license" /></a> <img src="https://img.shields.io/badge/Godot-4.3%2B-478cbf?style=flat-square&logo=godotengine&logoColor=white" alt="Godot 4.3+" /> <img src="https://img.shields.io/badge/PixiJS-v8-e72264?style=flat-square" alt="PixiJS v8" /> <a href="docs/MCP.md"><img src="https://img.shields.io/badge/MCP-server-c45c26?style=flat-square" alt="MCP server" /></a> <img src="https://img.shields.io/badge/Thai-ready-f4ae3d?style=flat-square" alt="Thai-ready" />
</p>

<p align="center">
  <a href="https://github.com/Saladin2020/easysprite"><img src="docs/brand/logo-sprite-96.png" width="32" alt="Easy Sprite" title="Easy Sprite" /></a>
  <a href="https://github.com/Saladin2020/easyscene"><img src="docs/brand/logo-scene-96.png" width="32" alt="Easy Scene" title="Easy Scene" /></a>
  <a href="https://github.com/Saladin2020/easytilemap"><img src="docs/brand/logo-tilemap-96.png" width="32" alt="Easy Tilemap" title="Easy Tilemap" /></a>
  <a href="https://github.com/Saladin2020/easydialogue"><img src="docs/brand/logo-dialogue-96.png" width="32" alt="Easy Dialogue" title="Easy Dialogue" /></a>
  <a href="https://github.com/Saladin2020/easyquest"><img src="docs/brand/logo-quest-96.png" width="32" alt="Easy Quest" title="Easy Quest" /></a>
  <a href="https://github.com/Saladin2020/easyui"><img src="docs/brand/logo-ui-96.png" width="32" alt="Easy UI" title="Easy UI" /></a>
  <a href="https://github.com/Saladin2020/easysfx"><img src="docs/brand/logo-sfx-96.png" width="32" alt="Easy SFX" title="Easy SFX" /></a>
  <a href="https://github.com/Saladin2020/easyfx"><img src="docs/brand/logo-fx-96.png" width="32" alt="Easy FX" title="Easy FX" /></a>
  <a href="https://github.com/Saladin2020/easymusic"><img src="docs/brand/logo-music-96.png" width="32" alt="Easy Music" title="Easy Music" /></a>
  <a href="https://github.com/Saladin2020/easyanim"><img src="docs/brand/logo-anim-96.png" width="32" alt="Easy Anim" title="Easy Anim" /></a>
  <a href="https://github.com/Saladin2020/easyitems"><img src="docs/brand/logo-items-96.png" width="32" alt="Easy Items" title="Easy Items" /></a>
  <a href="https://github.com/Saladin2020/easysave"><img src="docs/brand/logo-save-96.png" width="32" alt="Easy Save" title="Easy Save" /></a>
  <a href="https://github.com/Saladin2020/easykit"><img src="docs/brand/logo-kit-96.png" width="32" alt="Easy Kit" title="Easy Kit" /></a>
  <a href="https://github.com/Saladin2020/easybattle"><img src="docs/brand/logo-battle-96.png" width="32" alt="Easy Battle" title="Easy Battle" /></a>
  <a href="https://github.com/Saladin2020/easyfont"><img src="docs/brand/logo-font-96.png" width="40" alt="Easy Font" title="Easy Font (this repo)" /></a>
  <a href="https://github.com/Saladin2020/easynpc"><img src="docs/brand/logo-npc-96.png" width="32" alt="Easy NPC" title="Easy NPC" /></a>
  <a href="https://github.com/Saladin2020/easyportrait"><img src="docs/brand/logo-portrait-96.png" width="32" alt="Easy Portrait" title="Easy Portrait" /></a>
  <a href="https://github.com/Saladin2020/easyship"><img src="docs/brand/logo-ship-96.png" width="32" alt="Easy Ship" title="Easy Ship" /></a>
</p>
<!-- easy-suite:header:end -->

# Easy Font

**ฟอนต์พิกเซลไทย มะขาม 12 และ มะขาม 8 · สระและวรรณยุกต์ซ้อนถูกที่ · ไทย Bahasa Melayu English**  
Two original pixel bitmap fonts for games — **มะขาม 12 (Makham 12)** for dialogue and **มะขาม 8 (Makham 8)** for UI
labels — that cover every Thai character, Latin (English and Malay) and common punctuation, with **correct Thai
stacking**: tone marks drop when there is no upper vowel (ก่) and sit above one when there is (กี่), marks move left
over ป ฝ ฟ ฬ, ญ ฐ lose their tails over ุ ู, and ำ goes under the tone mark (น้ำ). Draw glyphs as `#`/`.` text
(`easyfont/1`), check them, and export **BMFont `.fnt` + PNG**, a **Godot 4.3+ FontFile** project with an `EasyFont`
autoload, and a **PixiJS v8 BitmapFont** runtime. CLI, web editor and MCP server; local only, no network.

<p align="center"><img src="docs/assets/makham-12-dialogue.png" width="70%" alt="Dialogue box in Makham 12: ป้านูรุล — สวัสดีจ้ะ น้ำชาร้อนๆ ที่ร้านป้าเปิดแล้ว" /></p>

| Godot 4.3 `EasyFont` demo (Thai) | PixiJS v8 BitmapText demo (Malay) |
|---|---|
| <img src="docs/assets/godot-demo-th.png" alt="Godot demo" /> | <img src="docs/assets/pixi-demo-ms.png" alt="Pixi demo" /> |

## The fonts

| Font | Size | Cell | Use | Glyphs |
|---|---|---|---|---|
| `makham-12` · มะขาม 12 | 12 px | 18 rows, baseline 15 | dialogue, titles | 193 drawn + 41 generated Thai presentation forms |
| `makham-16` · มะขาม 16 | 16 px | 22 rows, baseline 18 | dialogue that must read easily: 9-row Thai body, looped heads, 2 px letter gap | 193 drawn + 41 generated |
| `makham-8` · มะขาม 8 | 8 px | 15 rows, baseline 12 | HUD, menus, item counts | 193 drawn + 41 generated |

<p align="center"><img src="docs/assets/makham-12-specimen.png" width="88%" alt="Makham 12 specimen: Thai pangram poem, Malay and English" /></p>
<p align="center"><img src="docs/assets/makham-16-specimen.png" width="88%" alt="Makham 16 specimen" /></p>
<p align="center"><img src="docs/assets/makham-8-specimen.png" width="70%" alt="Makham 8 specimen" /></p>

มะขาม 12 and มะขาม 8 are drawn from scratch for Easy Suite (loopless Thai, 2×2 heads, square Latin); they are not traced from any font.
มะขาม 16 is a separate, opt-in font: a taller cell with looped Thai heads, tone marks stacked above upper vowels in
their own zones, and 2 px between letters. Its Thai is hand-drawn using Noto Sans Thai Looped (OFL) as a proportion
reference only, and its Latin and digits are the มะขาม 12 glyphs on the new baseline. Choosing it (`--font makham-16`)
changes nothing for projects that use มะขาม 12. All three fonts are released under the **SIL Open Font License 1.1** with no Reserved Font Name, so you can ship, modify and rename
them. The code is MIT.

## Quick start

```bash
npm install
npx tsx src/cli.ts init --workspace ~/my-fonts          # fonts/makham-12, makham-16, makham-8 (.easyfont), OFL.txt
npx tsx src/cli.ts check --workspace ~/my-fonts         # coverage + stacking on every sample sentence
npx tsx src/cli.ts render "น้ำชา ปี่ ฟื้น\nSelamat pagi" --out shot.png --scale 4 --workspace ~/my-fonts
npx tsx src/cli.ts export --workspace ~/my-fonts        # exports/easyfont-{bmfont,godot,pixi,png}/
npx tsx src/cli.ts serve --workspace ~/my-fonts         # web editor on http://127.0.0.1:8948
```

Other commands: `info`, `list [font] [--marks]`, `show <char>`, `set-glyph <char> <rows> --top N [--mark]`,
`shape <text>` (prints the presentation forms an engine draws).

## How Thai stacking works

Bitmap engines (BMFont readers, Godot `FontFile`, Pixi `BitmapText`) place one glyph after another, so the stacking
is decided before drawing. `shapeThai()` (TypeScript, with a line-for-line GDScript port, parity-tested) turns every
combining mark into a Private Use Area presentation form that already sits at the right height and column:

| Case | Example | Form |
|---|---|---|
| tone mark, no upper vowel | ก่ ก้ | low tone U+F70A–F70E (drops by `lowshift`) |
| tone mark over an upper vowel | กี่ กั๊ | high tone U+F726–F72A |
| tall letters ป ฝ ฟ ฬ | ปี่ ฟื้น ป่ | left forms U+F701–F717 (move by `leftshift`) |
| ญ ฐ + lower vowel | ญุ ฐู | hand-drawn tailless U+F70F / U+F700 |
| ฎ ฏ + lower vowel | ฎุ ฏู | U+F718–F71A (drop by `lowerdrop`) |
| sara am | น้ำ ป่ำ | ํ + tone + า (nikhahit under the tone) |

U+F700–F71A follow the common Thai PUA convention; U+F720–F72F are Easy Font's normal-position copies so engines that
group combining marks into graphemes still draw each mark. Forms are generated from the drawn marks (draw one to
override). `check` lays out the Thai sample poem and hard clusters and reports any mark that overlaps, touches,
floats away from or clips above its letter.

## Source format (`easyfont/1`)

```text
format easyfont/1
id makham-12
name Makham 12
th มะขาม 12
size 12
line 18          # cell height
baseline 15
spacing 1
space 4
zones tone=0 upper=4 body=8 lower=16 lowshift=4 leftshift=2 lowerdrop=0

g ก 8            # character (or U+XXXX), top row
.####.
##...#
#....#

g U+0E48 0 mark  # zero width, right-aligned over the previous letter
#
#
```

Full reference: [docs/FORMAT.md](docs/FORMAT.md).

## Export

| Preset | Output |
|---|---|
| `bmfont` | `<id>.fnt` (AngelCode text) + `<id>.png` (white ink, tint it) + `fonts.json` + `OFL.txt` — Godot, Pixi, Phaser, LibGDX, Love2D… |
| `godot` | Godot 4.3+ project: `easyfont/<id>.fnt` (imports as `FontFile`), `<id>.theme.tres`, `EasyFont` autoload (`shape`, `font`, `apply`, `measure`, `wrap`, `theme`), `EasyThaiShaper`, demo scene, `test_font.gd` |
| `pixi` | `loadEasyFonts(PIXI, "fonts/fonts.json")` → `text(str, {font, fill, scale, wrap})`, `shape`, `measure`, `wrap`; demo `index.html` |
| `png` | specimens, glyph sheets and dialogue-box previews |

```gdscript
# Godot: always shape Thai text (apply() does it), turn Label autowrap off and wrap with EasyFont
EasyFont.apply($Name, "ป้านูรุล", "makham-12", Color("#2a1606"))
$Body.text = EasyFont.wrap("สวัสดีจ้ะ น้ำชาร้อนๆ ที่ร้านป้าเปิดแล้ว", "makham-12", 440)
```

Line breaks: Thai has no spaces between words, so put U+200B (zero-width space) where a line may break; `wrap()`
breaks at spaces and U+200B in the CLI, Godot and Pixi alike.

**With the other Easy tools:** Easy Dialogue boxes and Easy UI panels call `EasyFont.shape()` when the autoload is
present (set `easyfont/<id>.theme.tres` as the font of the Easy UI teak theme); Easy Battle damage numbers and menus
read well in มะขาม 8.

## Web editor

`serve` opens a glyph editor: every glyph grouped (consonants, vowels and tone marks, Thai digits, Latin, tailless
forms), a pixel grid with the tone / upper / body / baseline / lower guide rows, the glyph in context (ปี่ ป้ำ ปุ…),
a live preview with a dialogue-box mode, the stacking check and the source text.

<p align="center"><img src="docs/assets/editor-glyphs.png" width="88%" alt="Easy Font glyph editor" /></p>

## MCP server

`npm run mcp` (stdio) or `npm run mcp:http` (port 8949). Tools: `workspace_info`, `list_glyphs`, `get_glyph`,
`set_glyph` (validates, `dryRun`), `write_font`, `check_font`, `shape_text`, `render_text` (returns a PNG) and
`export_fonts`. See [docs/MCP.md](docs/MCP.md).

## Ports

| | Port |
|---|---|
| Web editor / API | 8948 |
| MCP Streamable HTTP | 8949 |
| Vite dev UI | 5194 |

Everything binds to 127.0.0.1; a non-loopback `--host` needs the printed token.

## Development

```bash
npm test                                                 # vitest
GODOT=/path/to/godot npx vitest run test/godot.test.ts   # headless Godot: shaper parity, FontFile metrics, demo scene
npm run typecheck
npm run smoke                                            # CLI + MCP (stdio and HTTP)
npm run check:pixi -- exports/easyfont-pixi shot         # headless Chrome: fonts load, Thai shaped, text wraps
node scripts/build-core.mjs                              # after editing src/shared/shape.ts
```

<!-- easy-suite:table:start -->
## Easy Suite

<img src="docs/brand/logo-suite-96.png" width="48" align="right" alt="Easy Suite" />

Eighteen small, local-first tools that share one look (teak, lantern gold, Kanit, 16/48px pixels), one
workflow (CLI · web editor · MCP server) and the same targets (**Godot 4.3+** and **PixiJS v8**).
ชุดเครื่องมือทำเกมพิกเซลสไตล์ไทย ใช้ร่วมกันได้ทั้งชุด · the samples share one multicultural southern Thai village.

| | Tool | What it does | Repo |
|:-:|---|---|---|
| <img src="docs/brand/logo-sprite-96.png" width="40" alt="" /> | [**Easy Sprite**](https://github.com/Saladin2020/easysprite) | Compose modular 48px chibi characters (top-down + side-view) and export sheets. | [`easysprite`](https://github.com/Saladin2020/easysprite) |
| <img src="docs/brand/logo-scene-96.png" width="40" alt="" /> | [**Easy Scene**](https://github.com/Saladin2020/easyscene) | Side-view levels: parallax layers, 16px autotiles, Thai town props. | [`easyscene`](https://github.com/Saladin2020/easyscene) |
| <img src="docs/brand/logo-tilemap-96.png" width="40" alt="" /> | [**Easy Tilemap**](https://github.com/Saladin2020/easytilemap) | Top-down 16px maps: blob-47 autotiles, objects, collision, spawns. | [`easytilemap`](https://github.com/Saladin2020/easytilemap) |
| <img src="docs/brand/logo-dialogue-96.png" width="40" alt="" /> | [**Easy Dialogue**](https://github.com/Saladin2020/easydialogue) | Branching `.ezd` dialogue with Thai-safe text, portraits and choices. | [`easydialogue`](https://github.com/Saladin2020/easydialogue) |
| <img src="docs/brand/logo-quest-96.png" width="40" alt="" /> | [**Easy Quest**](https://github.com/Saladin2020/easyquest) | Text `.ezq` quests: steps, flags, items, rewards, linked to dialogue. | [`easyquest`](https://github.com/Saladin2020/easyquest) |
| <img src="docs/brand/logo-ui-96.png" width="40" alt="" /> | [**Easy UI**](https://github.com/Saladin2020/easyui) | Nine-slice pixel UI kit: panels, bars, inventory, menus, 30 icons. | [`easyui`](https://github.com/Saladin2020/easyui) |
| <img src="docs/brand/logo-sfx-96.png" width="40" alt="" /> | [**Easy SFX**](https://github.com/Saladin2020/easysfx) | Deterministic 8-bit SFX and 4-channel chiptune loops, typing blips. | [`easysfx`](https://github.com/Saladin2020/easysfx) |
| <img src="docs/brand/logo-fx-96.png" width="40" alt="" /> | [**Easy FX**](https://github.com/Saladin2020/easyfx) | Pixel particles: sparks, fire, rain, lanterns, Raya pelita; sheets + Godot particles. | [`easyfx`](https://github.com/Saladin2020/easyfx) |
| <img src="docs/brand/logo-music-96.png" width="40" alt="" /> | [**Easy Music**](https://github.com/Saladin2020/easymusic) | Seeded Thai loop music: ranat, khong wong, saw, khim, pi, kompang; seamless WAV/OGG loops. | [`easymusic`](https://github.com/Saladin2020/easymusic) |
| <img src="docs/brand/logo-anim-96.png" width="40" alt="" /> | [**Easy Anim**](https://github.com/Saladin2020/easyanim) | Cutscene timelines: actors, camera, dialogue, FX and music cues; Godot + Pixi runners. | [`easyanim`](https://github.com/Saladin2020/easyanim) |
| <img src="docs/brand/logo-items-96.png" width="40" alt="" /> | [**Easy Items**](https://github.com/Saladin2020/easyitems) | Item database, shops, inventory, loot tables and crafting; 44 starter items with pixel icons. | [`easyitems`](https://github.com/Saladin2020/easyitems) |
| <img src="docs/brand/logo-save-96.png" width="40" alt="" /> | [**Easy Save**](https://github.com/Saladin2020/easysave) | Versioned save slots with migrations and checksums; Thai / English / Malay string tables. | [`easysave`](https://github.com/Saladin2020/easysave) |
| <img src="docs/brand/logo-kit-96.png" width="40" alt="" /> | [**Easy Kit**](https://github.com/Saladin2020/easykit) | One command drives the Easy tools into a playable Godot 4.3+ and PixiJS game (portraits, schedules, battles, Thai pixel font) and ships it with Easy Ship; unified MCP server and `doctor`. | [`easykit`](https://github.com/Saladin2020/easykit) |
| <img src="docs/brand/logo-battle-96.png" width="40" alt="" /> | [**Easy Battle**](https://github.com/Saladin2020/easybattle) | Turn-based battles: party, bestiary, skills, statuses, bosses; seeded simulator; Godot + Pixi runtimes. | [`easybattle`](https://github.com/Saladin2020/easybattle) |
| <img src="docs/brand/logo-font-96.png" width="40" alt="" /> | **Easy Font** ← you are here | Pixel bitmap fonts for Thai, Latin and Malay: stacking vowels and tones, BMFont / TTF for Godot + Pixi. | [`easyfont`](https://github.com/Saladin2020/easyfont) |
| <img src="docs/brand/logo-npc-96.png" width="40" alt="" /> | [**Easy NPC**](https://github.com/Saladin2020/easynpc) | NPC daily schedules with A* on Easy Tilemap maps, day / night, affinity, dialogue and quest hooks. | [`easynpc`](https://github.com/Saladin2020/easynpc) |
| <img src="docs/brand/logo-portrait-96.png" width="40" alt="" /> | [**Easy Portrait**](https://github.com/Saladin2020/easyportrait) | 64×64 dialogue portraits with 9 emotions, blink and talk frames, from Easy Sprite characters. | [`easyportrait`](https://github.com/Saladin2020/easyportrait) |
| <img src="docs/brand/logo-ship-96.png" width="40" alt="" /> | [**Easy Ship**](https://github.com/Saladin2020/easyship) | Toolchain doctor, web / Windows / Linux / Android builds, itch.io zips and butler plans; dry run by default. | [`easyship`](https://github.com/Saladin2020/easyship) |
<!-- easy-suite:table:end -->

## Credits

มะขาม 12 and มะขาม 8 are original designs, © 2026 Salahuddin Benno and the Easy Suite contributors, SIL OFL 1.1
(`samples/OFL.txt`). See [CREDITS.md](CREDITS.md). Code: MIT.
