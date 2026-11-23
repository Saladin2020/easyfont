extends SceneTree
## Screenshot of the demo (needs a renderer):  xvfb-run godot --path . --script res://capture.gd -- out=/tmp/easyfont.png lang=th

var _frame := 0
var _args := {}


func _init() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.split("=", true, 1)
		_args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	await process_frame
	var main = load("res://main.tscn").instantiate()
	main.lang = _args.get("lang", "th")
	get_root().add_child(main)


func _process(_d: float) -> bool:
	_frame += 1
	if _frame == 8:
		get_root().get_texture().get_image().save_png(_args.get("out", "/tmp/easyfont-godot.png"))
		print("saved")
		return true
	return false
