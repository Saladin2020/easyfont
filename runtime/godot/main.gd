extends Control
## Easy Font demo: dialogue box (default font, มะขาม 16), UI labels (8px), every sample sentence. Keys 1/2/3 switch ไทย / BM / EN.

const LINES := {
	"th": ["ป้านูรุล", "สวัสดีจ้ะ น้ำชาร้อนๆ ที่ร้านป้าเปิดแล้ว ปี่กับฟ้าก็มาช่วยปั้นขนมนะ"],
	"ms": ["Mak Cik Nurul", "Selamat pagi! Teh tarik panas sudah siap di gerai mak cik. Jumpa lagi di pasar malam."],
	"en": ["Auntie Nurul", "Good morning! The hot tea at my stall is ready — 50% off for early birds (today only)."],
}
var lang := "th"
var _box: Control


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color("#140e0a")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var big: String = EasyFont.default_font
	var y := 6
	var title := Label.new()
	EasyFont.apply(title, "Easy Font · %s / มะขาม 8" % EasyFont.fonts.get(big, {}).get("th", big), big, Color("#f4ae3d"))
	title.position = Vector2(8, y)
	add_child(title)
	y += EasyFont.line_of(big) + 2
	var data = JSON.parse_string(FileAccess.open(EasyFont.DIR + "fonts.json", FileAccess.READ).get_as_text())
	for s in data.get("samples", []):
		var l := Label.new()
		EasyFont.apply(l, s, "makham-8", Color("#f7ebd3"))
		l.position = Vector2(8, y)
		add_child(l)
		y += 15
	_build_box()


func _build_box() -> void:
	if _box:
		_box.queue_free()
	# every size comes from the font's line height, so the box fits มะขาม 16 (22 px) and มะขาม 12 (18 px)
	var big: String = EasyFont.default_font
	var lh := EasyFont.line_of(big)
	var top := lh - 6  # the name tag overlaps the frame by 6 px
	var body_y := lh + 4
	var hint_y := body_y + 2 * lh + 2
	var bottom := hint_y + EasyFont.line_of("makham-8") + 2
	_box = Control.new()
	_box.position = Vector2(8, 268 - bottom)
	add_child(_box)
	var frame := ColorRect.new()
	frame.color = Color("#523822")
	frame.position = Vector2(0, top)
	frame.size = Vector2(464, bottom - top)
	_box.add_child(frame)
	var panel := ColorRect.new()
	panel.color = Color("#2a1d13")
	panel.position = Vector2(2, top + 2)
	panel.size = Vector2(460, bottom - top - 4)
	_box.add_child(panel)
	var tag := ColorRect.new()
	tag.color = Color("#f4ae3d")
	tag.position = Vector2(10, 0)
	_box.add_child(tag)
	var who := Label.new()
	EasyFont.apply(who, LINES[lang][0], big, Color("#2a1606"))
	who.position = Vector2(15, 0)
	_box.add_child(who)
	tag.size = Vector2(EasyFont.measure(LINES[lang][0], big) + 10, lh)
	var body := Label.new()
	EasyFont.apply(body, "", big, Color("#f7ebd3"))
	body.text = EasyFont.wrap(LINES[lang][1], big, 440)
	body.position = Vector2(12, body_y)
	_box.add_child(body)
	var hint := Label.new()
	EasyFont.apply(hint, "1 ไทย · 2 Bahasa Melayu · 3 English", "makham-8", Color("#a08a6a"))
	hint.position = Vector2(300, hint_y)
	_box.add_child(hint)


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed:
		var k := {KEY_1: "th", KEY_2: "ms", KEY_3: "en"}
		if k.has(e.keycode):
			lang = k[e.keycode]
			_build_box()
