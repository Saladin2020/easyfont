/**
 * Optional Godot check: GODOT=/path/to/godot npx vitest run test/godot.test.ts
 * Exports the Godot project, imports it headless (the .fnt files become FontFiles), then test_font.gd checks the
 * GDScript shaper against the TS one, the imported glyph advances, measure() and the demo scene.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exportFonts } from "../src/lib/export.js";
import { tempWorkspace } from "./helpers.js";

const GODOT = process.env.GODOT;
let root: string;
let cleanup: () => Promise<void>;
beforeAll(async () => {
  if (GODOT) ({ root, cleanup } = await tempWorkspace());
});
afterAll(() => cleanup?.());

describe.skipIf(!GODOT)("Godot export", () => {
  it("shaper parity, FontFile metrics and the demo scene", async () => {
    const out = path.join(root, "exports", "godot");
    await exportFonts(root, { preset: "godot", out });
    for (let i = 0; i < 2; i++) spawnSync(GODOT!, ["--headless", "--editor", "--quit", "--path", out], { encoding: "utf8", timeout: 240_000 });
    const run = spawnSync(GODOT!, ["--headless", "--path", out, "--script", "res://test_font.gd"], { encoding: "utf8", timeout: 180_000 });
    expect(run.stdout).not.toMatch(/^FAIL/m);
    expect(run.stdout).toMatch(/^P\| shape ok cases=\d+$/m);
    expect(run.stdout).toMatch(/^M\| metrics fonts=2 chars=\d+$/m);
    expect(run.stdout).toMatch(/^OK$/m);
  }, 900_000);
});
