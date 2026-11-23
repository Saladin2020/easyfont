---
name: easyfont-thai-pixel-fonts
description: >-
  Use when a game needs Thai (plus English / Malay) pixel text that stacks vowels and tone marks correctly: the
  มะขาม 12 dialogue and มะขาม 8 UI bitmap fonts, BMFont .fnt + PNG, a Godot 4.3+ FontFile with the EasyFont
  autoload, or a PixiJS v8 BitmapFont; also for drawing or fixing glyphs and checking Thai stacking. Not for vector
  (TTF/OTF) fonts or non-Thai scripts beyond Latin.
---
# Easy Font Thai pixel fonts

Read `/workspace/indie-studio/tools/EASYFONT.md` for paths and commands; format: `…/tools/easyfont/docs/FORMAT.md`.

## Steps

1. **Init.** `init --workspace <project>/fonts-src` copies มะขาม 12 / มะขาม 8 and the OFL.
2. **Check your text.** `check --text "<every line the game shows>"` must print ✓ (no missing glyphs, no stacking
   issues). Draw missing glyphs with `set-glyph` (or MCP `set_glyph`, `dryRun` first).
3. **Look.** `render "<text>" --dialogue <speaker> --out shot.png` and open the PNG.
4. **Export.** `export --preset godot` (run `test_font.gd` headless → `OK`) or `--preset pixi`.
5. **Wire.** Godot: autoload `EasyFont`, always `EasyFont.apply()` / `EasyFont.shape()`, Label autowrap off +
   `EasyFont.wrap()`. Pixi: `loadEasyFonts()` → `ef.text()`. Put U+200B between Thai words where lines may break.

## Rules

- Keep glyphs original (never trace commercial fonts); ship `OFL.txt` with the fonts.
- Thai settlement and character names stay in Thai script in Thai text.
- Do not push or change the upstream repo; ask before any push or merge.
