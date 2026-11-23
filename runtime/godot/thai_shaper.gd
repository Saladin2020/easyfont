class_name EasyThaiShaper
extends RefCounted
## Thai shaper for bitmap fonts — a line-for-line port of src/shared/shape.ts (parity-tested by test_font.gd).
## Bitmap fonts place one glyph after another, so every Thai combining mark becomes a Private Use Area
## presentation form that already sits at the right height and column (low tone marks, left forms over ป ฝ ฟ ฬ,
## tailless ญ ฐ, low ุ ู under ฎ ฏ, ำ split into ํ + า).

const TALL := [0x0E1B, 0x0E1D, 0x0E1F, 0x0E2C]
const TAIL := {0x0E0D: 0xF70F, 0x0E10: 0xF700}
const DESC := [0x0E0E, 0x0E0F]
const UPPER := [0x0E31, 0x0E34, 0x0E35, 0x0E36, 0x0E37, 0x0E47, 0x0E4D]
const TONES := [0x0E48, 0x0E49, 0x0E4A, 0x0E4B, 0x0E4C]
const LOWER := [0x0E38, 0x0E39, 0x0E3A]
const YAMAKKAN := 0x0E4E
const SARA_AM := 0x0E33
const NIKHAHIT := 0x0E4D
const SARA_AA := 0x0E32
const UPPER_NORMAL := [0xF720, 0xF721, 0xF722, 0xF723, 0xF724, 0xF725, 0xF72B]
const UPPER_LEFT := [0xF710, 0xF701, 0xF702, 0xF703, 0xF704, 0xF712, 0xF711]


static func is_mark(cp: int) -> bool:
	return UPPER.has(cp) or TONES.has(cp) or LOWER.has(cp) or cp == YAMAKKAN


static func _normal(m: int) -> int:
	var u := UPPER.find(m)
	if u >= 0:
		return UPPER_NORMAL[u]
	var t := TONES.find(m)
	if t >= 0:
		return 0xF726 + t
	var l := LOWER.find(m)
	if l >= 0:
		return 0xF72D + l
	return 0xF72C if m == YAMAKKAN else m


static func shape_codes(text: String) -> PackedInt32Array:
	var cps := PackedInt32Array()
	for i in text.length():
		cps.append(text.unicode_at(i))
	var out := PackedInt32Array()
	var i := 0
	var n := cps.size()
	while i < n:
		var base: int = cps[i]
		var j := i + 1
		var marks: Array[int] = []
		var am := false
		while j < n and (is_mark(cps[j]) or cps[j] == SARA_AM):
			if cps[j] == SARA_AM:
				am = true
				j += 1
				break
			marks.append(cps[j])
			j += 1
		if marks.is_empty() and not am:
			out.append(base)
			i += 1
			continue
		var is_base := base >= 0x0E01 and base <= 0x0E2E
		var tall := TALL.has(base)
		var lowers: Array[int] = []
		var uppers: Array[int] = []
		var tones: Array[int] = []
		for m in marks:
			if LOWER.has(m):
				lowers.append(m)
			if UPPER.has(m):
				uppers.append(m)
		if am:
			uppers.append(NIKHAHIT)
		for m in marks:
			if TONES.has(m) or m == YAMAKKAN:
				tones.append(m)
		var b := base
		if not lowers.is_empty() and TAIL.has(base):
			b = TAIL[base]
		out.append(b)
		if not is_base:
			for m in marks:
				out.append(_normal(m))
			if am:
				out.append(SARA_AA)
			i = j
			continue
		for m in lowers:
			out.append((0xF718 if DESC.has(base) else 0xF72D) + LOWER.find(m))
		for m in uppers:
			out.append(UPPER_LEFT[UPPER.find(m)] if tall else UPPER_NORMAL[UPPER.find(m)])
		var has_upper := not uppers.is_empty()
		for m in tones:
			if m == YAMAKKAN:
				out.append(0xF72C)
				continue
			var k := TONES.find(m)
			if has_upper:
				out.append((0xF713 if tall else 0xF726) + k)
			else:
				out.append((0xF705 if tall else 0xF70A) + k)
		if am:
			out.append(SARA_AA)
		i = j
	return out


static func shape(text: String) -> String:
	var s := ""
	for c in shape_codes(text):
		s += String.chr(c)
	return s
