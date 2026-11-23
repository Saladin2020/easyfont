"""Screenshot the web editor (needs `easyfont serve` running).

  python3 scripts/capture-ui.py [url] [out.png] [tab] [char]

tab: glyphs | preview | check | source. char: glyph to select on the glyphs tab (default ป).
"""
import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8948/"
out = sys.argv[2] if len(sys.argv) > 2 else "docs/assets/editor.png"
tab = sys.argv[3] if len(sys.argv) > 3 else "glyphs"
char = sys.argv[4] if len(sys.argv) > 4 else "ป"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.goto(url)
    pg.wait_for_timeout(1200)
    pg.locator(f"[data-tab={tab}]").click()
    pg.wait_for_timeout(600)
    if tab == "glyphs":
        pg.locator(".glyph-grid button", has_text=char).first.click()
        pg.wait_for_timeout(600)
    if tab == "preview" and char == "dialogue":
        pg.get_by_text("Dialogue box").click()
        pg.get_by_role("button", name="บทสนทนา").click()
    pg.wait_for_timeout(1200)
    pg.screenshot(path=out)
    b.close()
    print("errors:", errors)
    print(out)
