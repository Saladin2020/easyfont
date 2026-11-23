#!/usr/bin/env node
/**
 * Studio CLI wrapper around Easy Font (info / list / check / shape / render / set-glyph / export without MCP).
 *
 * Usage:
 *   node /workspace/indie-studio/tools/easyfont-cli.mjs <command> [options]
 *
 * Install:  EASYFONT_HOME, else this folder's easyfont/
 * The sample fonts live in the install (init copies them). Font sources and exports may be written under
 * /workspace/indie-studio/projects/<Name> (pre-allowed).
 * export --out (single preset) writes into that folder without deleting stale files; use a dedicated folder.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const HOME = path.resolve(process.env.EASYFONT_HOME?.trim() || path.join(here, "easyfont"));
const STUDIO_PROJECTS = path.resolve(here, "..", "projects");
const cli = path.join(HOME, "dist", "cli.js");

if (!existsSync(cli)) {
  console.error(`Easy Font CLI not found at ${cli}. Set EASYFONT_HOME and run npm ci && npm run build there.`);
  process.exit(1);
}

const env = {
  ...process.env,
  EASYFONT_HOME: HOME,
  EASYFONT_WORKSPACE: process.env.EASYFONT_WORKSPACE?.trim() || HOME,
};
const allowed = new Set(
  (env.EASYFONT_ALLOWED_DIRS ?? "")
    .split(path.delimiter)
    .map((s) => s.trim())
    .filter(Boolean),
);
allowed.add(STUDIO_PROJECTS);
env.EASYFONT_ALLOWED_DIRS = [...allowed].join(path.delimiter);

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: HOME,
  stdio: "inherit",
  env,
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
