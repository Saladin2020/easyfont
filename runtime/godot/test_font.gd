extends SceneTree
## Headless check:  godot --headless --path . --script res://test_font.gd   → prints OK
## 1. the GDScript shaper matches the TypeScript one on every parity case (easyfont/parity.json)
## 2. each imported FontFile has the same advances as the compiled font
## 3. the demo scene builds


func _init() -> void:
	await process_frame
	var ef = get_root().get_node_or_null("EasyFont")
	if ef == null:
		print("FAIL no EasyFont autoload")
		quit(1)
		return
	var parity = JSON.parse_string(FileAccess.open("res://easyfont/parity.json", FileAccess.READ).get_as_text())
	var bad := 0
	for c in parity["shape"]:
		var got := EasyThaiShaper.shape_codes(c["text"])
		var want: Array = c["codes"]
		var same := got.size() == want.size()
		if same:
			for k in got.size():
				if got[k] != int(want[k]):
					same = false
					break
		if not same:
			bad += 1
			print("FAIL shape %s got %s want %s" % [c["text"], got, want])
	print("P| shape ok cases=%d" % parity["shape"].size() if bad == 0 else "FAIL shape mismatches=%d" % bad)
	var chars := 0
	for id in parity["metrics"]:
		var fnt: FontFile = ef.font(id)
		if fnt == null:
			print("FAIL font %s did not load" % id)
			continue
		var sz: int = ef.size_of(id)
		for k in parity["metrics"][id]:
			var want_adv := int(parity["metrics"][id][k])
			var got_adv := int(fnt.get_char_size(int(k), sz).x)
			chars += 1
			if got_adv != want_adv:
				bad += 1
				print("FAIL metric %s U+%X got %d want %d" % [id, int(k), got_adv, want_adv])
	print("M| metrics fonts=%d chars=%d" % [parity["metrics"].size(), chars])
	var w: int = ef.measure("สวัสดีครับ", ef.default_font)
	print("W| measure=%d want=%d" % [w, int(parity["measure"])])
	if w != int(parity["measure"]):
		bad += 1
	var scene: PackedScene = load("res://main.tscn")
	var main := scene.instantiate()
	get_root().add_child(main)
	await process_frame
	print("S| scene children=%d" % main.get_child_count())
	if bad == 0:
		print("OK")
	quit(0 if bad == 0 else 1)
