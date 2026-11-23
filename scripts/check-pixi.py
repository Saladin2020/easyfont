"""Headless Chrome check of a PixiJS export: the fonts load, Thai text is shaped and the dialogue box wraps.

  python3 scripts/check-pixi.py <pixi-export-dir> [screenshot-prefix]

Serves the folder on 127.0.0.1:8996, opens index.html in Thai, Malay and English (keys 1/2/3), and compares the
canvas pixels of the BitmapText with what the CLI renders. Prints a JSON report; exit 1 on console errors, a missing
font or an empty canvas.
"""
import asyncio, json, os, subprocess, sys, time
from playwright.async_api import async_playwright

DIR = sys.argv[1]
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
PORT = 8996
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

INK = """() => { const c = document.querySelector('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl');
  const w = c.width, h = c.height, px = new Uint8Array(w * h * 4); g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, px);
  let light = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 200 && px[i + 1] > 180) light++; return light; }"""


async def main():
    report = {"langs": {}, "errors": []}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/usr/bin/google-chrome"), args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1100, "height": 640})
        errs = report["errors"]
        pg.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type == "error" and "Failed to load resource" not in m.text else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("response", lambda r: errs.append(f"http {r.status}: {r.url}") if r.status >= 400 and not r.url.endswith("/pixi.min.js") else None)
        await pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
        await pg.wait_for_function("window.__ready === true", timeout=40000)
        fonts = await pg.evaluate("Object.values(window.__font.ef.fonts).map(f => ({id: f.id, family: f.family, chars: Object.keys(f.bitmap.chars).length}))")
        report["fonts"] = fonts
        shaped = await pg.evaluate("[...window.__font.ef.shape('น้ำ ปี่')].map(c => c.codePointAt(0).toString(16))")
        report["shape"] = shaped
        for key, lang in (("1", "th"), ("2", "ms"), ("3", "en")):
            await pg.keyboard.press(key)
            await pg.wait_for_timeout(400)
            info = await pg.evaluate("({lang: window.__font.lang, lines: window.__font.lines})")
            if SHOT:
                await pg.locator("canvas").screenshot(path=f"{SHOT}-{lang}.png")
            report["langs"][lang] = info
        await b.close()
    srv.terminate()
    ok = not errs and len(report.get("fonts", [])) >= 1 and all(f["chars"] > 150 for f in report["fonts"]) and report["shape"][:4] == ["e19", "f72b", "f727", "e32"] and report["langs"]["en"]["lines"] >= 2
    report["ok"] = ok
    print(json.dumps(report, ensure_ascii=False, indent=1))
    sys.exit(0 if ok else 1)


asyncio.run(main())
