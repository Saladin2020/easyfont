# `easyfont/1` source format

One plain-text file per font: `fonts/<id>.easyfont`. Lines starting with `#` followed by a space are comments.

## Header

| Key | Meaning |
|---|---|
| `format easyfont/1` | required |
| `id` | `^[a-z0-9][a-z0-9_-]*$`, must match the file name |
| `name` | font family name written to the `.fnt` (`info face=`) |
| `th` | Thai name (shown in the editor and manifests), e.g. `มะขาม 12` |
| `size` | nominal pixel size (Godot / Pixi font size) |
| `line` | cell height in rows (line height) |
| `baseline` | baseline row (BMFont `base`) |
| `spacing` | blank columns after every glyph (added to the advance) |
| `space` | advance of U+0020 (U+00A0 copies it; U+200B has advance 0) |
| `zones` | `tone=` `upper=` `body=` `lower=` rows (guides and checks), `lowshift=` rows a tone mark drops when there is no upper vowel, `leftshift=` columns marks move left over ป ฝ ฟ ฬ, `lowerdrop=` rows ุ ู ฺ drop under ฎ ฏ |

## Glyphs

```text
g <char | U+XXXX> <top row> [mark] [dx=N]
<rows of # and .>
<blank line>
```

- `top` is the row of the first bitmap row in the cell (0 = top of the line).
- Width is the right-most `#` column; leading `.` columns are kept (left side bearing).
- Advance = width + `spacing` + `dx` (letters); `dx` < 0 also shifts the ink left (used by ำ).
- `mark` glyphs have advance 0 and are drawn right-aligned over the previous glyph (`xoffset = −(width + spacing) + dx`).
  Mark the Thai combining characters: ั ิ ี ึ ื ็ ่ ้ ๊ ๋ ์ ํ ๎ ุ ู ฺ. Draw tone marks at the tone zone; the low
  forms are generated.
- Hand-draw U+F70F (ญ without tail) and U+F700 (ฐ without the lower part); `check` warns when they are missing.
- Any generated presentation form (U+F701–F72F) can be drawn by hand to override it.

## Validation

Errors: bad header values, unknown lines or options, duplicate glyphs, rows below the cell, id / file mismatch.
`check` adds coverage (Thai U+0E01–0E3A and U+0E3F–0E5B, printable ASCII, ‘ ’ “ ” – — … · × °) and the stacking
check on the Thai sample poem, the hard clusters (น้ำ ที่ ปี่ ฟื้น ปั้น ฝั่ง ฟ้า ปู่ ป๊อป กั๊ก ก๋วย เจี๊ยบ ชื่อ ขึ้น ญาติ
ฐาน ญุ ฐุ ฎุ ฏู ฤๅษี ฬ้า ปั๋ง), Malay and English: no mark may overlap or touch its letter, another mark or a
neighbour, sit beside its letter, float more than 2 rows away, or start above the cell.

## Exports

- `.fnt` is AngelCode BMFont text: `info face size`, `common lineHeight base scaleW scaleH pages=1`, one `char` per glyph
  (source glyphs + presentation forms; forms share their source's atlas cell), `kernings count=0`.
- The atlas PNG is white ink on transparent, packed in one power-of-two page.
- `fonts.json`: `{ format: "easyfont-export/1", default, fonts: [{ id, name, th, size, line, baseline, fnt, png }], samples }`.
