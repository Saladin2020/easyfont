/** Bundle src/shared/shape.ts into runtime/pixi/easyfont-core.js (the Pixi runtime uses the CLI shaper + line fitting).
 *   node scripts/build-core.mjs [--check]   (--check: exit 1 when the committed file is stale) */
import { readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const out = "runtime/pixi/easyfont-core.js";
const res = await build({ entryPoints: ["src/shared/core.ts"], bundle: true, format: "esm", platform: "neutral", write: false, legalComments: "none", target: "es2020" });
const body = `/* Easy Font core — generated from src/shared/core.ts (shape.ts + fit.ts) by scripts/build-core.mjs. Do not edit. MIT. */\n${res.outputFiles[0].text}`;
if (process.argv.includes("--check")) {
  // compare with LF line endings: a Windows checkout (core.autocrlf) turns the committed file into CRLF
  const lf = (t) => t.replace(/\r\n/g, "\n");
  const cur = readFileSync(out, "utf8");
  if (lf(cur) !== lf(body)) {
    console.error(`${out} is stale: run node scripts/build-core.mjs`);
    process.exit(1);
  }
  console.log(`${out} up to date`);
} else {
  writeFileSync(out, body);
  console.log(`wrote ${out} (${body.length} bytes)`);
}
