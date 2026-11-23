extends Node
## Easy Font autoload ("EasyFont"). Thai-correct pixel bitmap fonts for Labels, RichTextLabels and buttons.
##   EasyFont.shape("น้ำ")                 → text with Thai presentation forms (always shape before display)
##   EasyFont.font("makham-12")            → FontFile (imported from the BMFont .fnt)
##   EasyFont.apply($Label, "สวัสดี", "makham-12")   → font, size and shaped text in one call
##   EasyFont.theme("makham-12")           → a Theme with the font as default (or merge into Easy UI's theme)
## Easy Dialogue / Easy UI call EasyFont.shape() when this autoload exists.

const DIR := "res://easyfont/"
var fonts := {}  # id → {name, th, size, line, baseline, fnt}
var default_font := ""
var _cache := {}


func _ready() -> void:
	var f := FileAccess.open(DIR + "fonts.json", FileAccess.READ)
	if f == null:
		push_warning("EasyFont: %sfonts.json missing" % DIR)
		return
	var data = JSON.parse_string(f.get_as_text())
	if typeof(data) != TYPE_DICTIONARY:
		return
	for e in data.get("fonts", []):
		fonts[e["id"]] = e
	default_font = data.get("default", "" if fonts.is_empty() else fonts.keys()[0])


func shape(text: String) -> String:
	return EasyThaiShaper.shape(text)


func font(id: String = "") -> FontFile:
	if id == "":
		id = default_font
	if _cache.has(id):
		return _cache[id]
	if not fonts.has(id):
		push_warning("EasyFont: unknown font %s" % id)
		return null
	var res: FontFile = load(DIR + fonts[id]["fnt"])
	_cache[id] = res
	return res


func size_of(id: String = "") -> int:
	if id == "":
		id = default_font
	return int(fonts.get(id, {}).get("size", 12))


func apply(node: Control, text: String, id: String = "", color := Color(-1, 0, 0)) -> void:
	var fnt := font(id)
	if fnt == null:
		return
	node.add_theme_font_override("font" if not node is RichTextLabel else "normal_font", fnt)
	node.add_theme_font_size_override("font_size" if not node is RichTextLabel else "normal_font_size", size_of(id))
	if color.r >= 0:
		node.add_theme_color_override("font_color" if not node is RichTextLabel else "default_color", color)
	if "text" in node:
		node.text = shape(text)


func theme(id: String = "") -> Theme:
	var t := Theme.new()
	t.default_font = font(id)
	t.default_font_size = size_of(id)
	return t


## Width in pixels of a text (after shaping) in a font.
func measure(text: String, id: String = "") -> int:
	var fnt := font(id)
	if fnt == null:
		return 0
	var w := 0
	var sz := size_of(id)
	for c in EasyThaiShaper.shape_codes(text):
		w += int(fnt.get_char_size(c, sz).x)
	return w


## Word-wrap at spaces and U+200B (zero-width space — put one between Thai words where a line may break).
## Returns shaped text with "\n" line breaks; set it on a Label with autowrap off.
func wrap(text: String, id: String, max_width: int) -> String:
	var fnt := font(id)
	if fnt == null:
		return shape(text)
	var sz := size_of(id)
	var out := ""
	for para in text.split("\n"):
		var codes := EasyThaiShaper.shape_codes(para)
		var line := ""
		var word := ""
		var line_w := 0
		var word_w := 0
		for c in codes:
			var ch := String.chr(c)
			var adv := int(fnt.get_char_size(c, sz).x)
			if c == 0x20 or c == 0x200B:
				if line_w + word_w > max_width and line != "":
					out += line.strip_edges(false, true) + "\n"
					line = ""
					line_w = 0
				line += word + (ch if c == 0x20 else "")
				line_w += word_w + (adv if c == 0x20 else 0)
				word = ""
				word_w = 0
			else:
				word += ch
				word_w += adv
		if line_w + word_w > max_width and line != "":
			out += line.strip_edges(false, true) + "\n"
			line = ""
		out += line + word + "\n"
	return out.substr(0, out.length() - 1)
