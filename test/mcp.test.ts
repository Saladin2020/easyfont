import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MCP_TOOL_NAMES, createEasyFontMcp } from "../src/mcp/server.js";
import { createApp } from "../src/server/app.js";
import { tempWorkspace } from "./helpers.js";

let root: string;
let cleanup: () => Promise<void>;
let client: Client;
beforeAll(async () => {
  ({ root, cleanup } = await tempWorkspace());
  const server = createEasyFontMcp(root);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: "test", version: "0.0.1" });
  await client.connect(b);
});
afterAll(async () => {
  await client.close();
  await cleanup();
});
const body = (res: unknown) => JSON.parse(((res as { content: Array<{ text: string }> }).content[0]!).text);

describe("MCP server", () => {
  it("lists the tools", async () => {
    expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual([...MCP_TOOL_NAMES].sort());
  });

  it("info → glyphs → draw (refused, dry run, saved) → check → shape → render → export", async () => {
    const info = body(await client.callTool({ name: "workspace_info", arguments: {} }));
    expect(info.fonts.map((f: { id: string }) => f.id)).toEqual(["makham-12", "makham-8"]);
    expect(info.format).toMatch(/easyfont\/1/);
    const marks = body(await client.callTool({ name: "list_glyphs", arguments: { font: "makham-8", marks: true } }));
    expect(marks.glyphs.length).toBe(16);
    const g = body(await client.callTool({ name: "get_glyph", arguments: { char: "U+F70B" } }));
    expect(g.compiled.derived).toBe("U+0E49 low");

    const refused = body(await client.callTool({ name: "set_glyph", arguments: { char: "ก", rows: ["#"], top: 40 } }));
    expect(refused.saved).toBe(false);
    expect(refused.errors[0].message).toMatch(/below the cell/);
    const dry = body(await client.callTool({ name: "set_glyph", arguments: { char: "€", rows: [".###", "#...", "###.", "#...", ".###"], top: 9, dryRun: true } }));
    expect(dry).toMatchObject({ saved: false, errors: [] });
    const saved = body(await client.callTool({ name: "set_glyph", arguments: { char: "€", rows: [".###", "#...", "###.", "#...", ".###"], top: 9 } }));
    expect(saved.saved).toBe(true);
    expect(body(await client.callTool({ name: "get_glyph", arguments: { char: "€" } })).source.top).toBe(9);

    const check = body(await client.callTool({ name: "check_font", arguments: { font: "makham-12", texts: ["ราคา 5€ ถูกมาก"] } }));
    expect(check.ok).toBe(true);
    expect(body(await client.callTool({ name: "shape_text", arguments: { text: "ปี่" } })).codepoints).toEqual(["U+0E1B", "U+F702", "U+F713"]);
    const img = await client.callTool({ name: "render_text", arguments: { text: "สวัสดีจ้ะ", dialogue: "ป้านูรุล", scale: 2 } });
    expect((img.content as Array<{ type: string }>)[0]!.type).toBe("image");
    const exp = body(await client.callTool({ name: "export_fonts", arguments: { preset: "bmfont", fonts: ["makham-8"] } }));
    expect(exp.fonts).toEqual([expect.objectContaining({ id: "makham-8" })]);
    const src = body(await client.callTool({ name: "write_font", arguments: { id: "makham-8", mode: "read" } }));
    expect(src.source).toMatch(/^# Makham 8/);
    const badFont = body(await client.callTool({ name: "write_font", arguments: { id: "broken", source: "format easyfont/1\nid broken\n" } }));
    expect(badFont.saved).toBe(false);
  }, 60_000);
});

describe("web API", () => {
  it("serves fonts, renders, saves glyphs and guards writes", async () => {
    const app = createApp({ workspaceRoot: root, webRoot: "/nonexistent", dev: true, host: "127.0.0.1" });
    const h = { host: "127.0.0.1:8948" };
    const ws = (await (await app.request("http://127.0.0.1/api/workspace", { headers: h })).json()) as { fonts: unknown[] };
    expect(ws.fonts.length).toBe(2);
    const f = (await (await app.request("http://127.0.0.1/api/font/makham-12", { headers: h })).json()) as { glyphs: unknown[]; zones: { tone: number } };
    expect(f.glyphs.length).toBeGreaterThan(185);
    const png = await app.request(`http://127.0.0.1/api/render/makham-12?text=${encodeURIComponent("น้ำ")}&scale=2`, { headers: h });
    expect(png.headers.get("content-type")).toBe("image/png");
    const save = await app.request("http://127.0.0.1/api/font/makham-12/glyph", { method: "POST", headers: { ...h, "content-type": "application/json", origin: "http://127.0.0.1:8948" }, body: JSON.stringify({ char: "~", top: 9, rows: [".#.#", "#.#."] }) });
    expect(((await save.json()) as { saved: boolean }).saved).toBe(true);
    const check = (await (await app.request("http://127.0.0.1/api/check/makham-12", { headers: h })).json()) as { ok: boolean };
    expect(check.ok).toBe(true);
    const evil = await app.request("http://127.0.0.1/api/font/makham-12", { method: "POST", headers: { ...h, origin: "https://evil.example", "content-type": "application/json" }, body: "{}" });
    expect(evil.status).toBe(403);
  });
});
