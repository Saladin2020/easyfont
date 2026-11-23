/** CLI smoke test: drive every command against a fresh workspace. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ws = mkdtempSync(path.join(os.tmpdir(), "easyfont-cli-"));
let failed = 0;
const run = (args, expect, opts = {}) => {
  let out = "";
  try {
    out = execFileSync("npx", ["tsx", "src/cli.ts", ...args, "--workspace", ws], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    if (!opts.fails) {
      console.error(`FAIL ${args.join(" ")}\n${out}`);
      failed++;
      return out;
    }
  }
  const ok = expect.test(out);
  console.log(`${ok ? "ok  " : "FAIL"} easyfont ${args.join(" ")}`);
  if (!ok) {
    console.error(out);
    failed++;
  }
  return out;
};
run(["init"], /Wrote 4 file/);
run(["info"], /makham-12\s+Makham 12 · มะขาม 12\s+12px/);
run(["list", "makham-8", "--marks"], /16 glyph\(s\)/);
run(["show", "ก"], /"char": "ก"/);
run(["check"], /✓ makham-12[\s\S]*✓ makham-8/);
run(["shape", "ปี่"], /U\+F702/);
run(["set-glyph", "€", ".###/#.../###./#.../.###", "--top", "9", "--font", "makham-12"], /Saved €/);
run(["set-glyph", "ก", "#", "--top", "40"], /below the cell/, { fails: true });
run(["render", "น้ำชา ปี่ ฟื้น\\nSelamat pagi €5", "--out", path.join(ws, "r.png"), "--scale", "2"], /2 line\(s\)/);
run(["render", "สวัสดีจ้ะ", "--dialogue", "ป้านูรุล", "--out", path.join(ws, "d.png")], /Wrote/);
run(["render", "-", "--glyphs", "--font", "makham-8", "--out", path.join(ws, "g.png")], /Wrote/);
run(["export"], /easyfont-bmfont[\s\S]*easyfont-godot[\s\S]*easyfont-pixi[\s\S]*easyfont-png/);
run(["export", "--preset", "bmfont", "--font", "makham-8", "--out", path.join(ws, "only8")], /makham-8 \(\d+ chars/);
if (!existsSync(path.join(ws, "only8", "makham-8.fnt"))) {
  console.error("FAIL export --out");
  failed++;
}
rmSync(ws, { recursive: true, force: true });
console.log(failed ? `CLI smoke FAILED (${failed})` : "CLI smoke OK");
process.exit(failed ? 1 : 0);
