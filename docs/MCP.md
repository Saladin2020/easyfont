# Easy Font MCP server

```bash
npx tsx src/mcp/server.ts --workspace /path/to/workspace            # stdio
npx tsx src/mcp/server.ts --http --port 8949 --workspace …          # Streamable HTTP on 127.0.0.1:8949/mcp
```

Env `EASYFONT_WORKSPACE` sets the workspace when `--workspace` is not given.

| Tool | Arguments | Returns |
|---|---|---|
| `workspace_info` | — | fonts (size, line, baseline, glyph count), sample sentences, format cheat-sheet |
| `list_glyphs` | `font?`, `marks?` | every drawn glyph: char, code point, top, size, advance, mark |
| `get_glyph` | `char` (character or U+XXXX), `font?` | source rows and compiled metrics (also generated forms) |
| `set_glyph` | `char`, `rows[]`, `top`, `mark?`, `dx?`, `font?`, `dryRun?`, `remove?` | `{ saved, file, errors, warnings }` — refuses when the font would not parse |
| `write_font` | `id`, `source?`, `mode? write|read`, `dryRun?` | whole-source write or read |
| `check_font` | `font?`, `texts?[]` | `{ ok, fonts: [{ errors, warnings, missing, stacking, glyphs, forms }] }` |
| `shape_text` | `text` | `{ shaped, codepoints }` — what Godot / Pixi draw |
| `render_text` | `text`, `font?`, `scale?`, `wrap?`, `dialogue?` | PNG image (+ missing characters) |
| `export_fonts` | `preset? bmfont|godot|pixi|png|all`, `fonts?[]` | `{ dirs, files, fonts, warnings }` |

Default font: `makham-16` (มะขาม 16), then `makham-12` if a workspace has no มะขาม 16, then the first font.
