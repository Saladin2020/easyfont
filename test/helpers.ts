import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initWorkspace } from "../src/lib/workspace.js";

/** Fresh workspace with the sample fonts มะขาม 12 and มะขาม 8. */
export async function tempWorkspace(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "easyfont-test-"));
  await initWorkspace(root);
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}
