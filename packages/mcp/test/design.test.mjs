/* The guided design loop's MCP tools (US-116-AC2; ADR-036 rule 2): they
   return exactly what the ux-builder-design commands print with --json.

     npm test --workspace @ux-builder/mcp */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import * as design from "@ux-builder/design";
import { createServer } from "../server.mjs";

const CLI = fileURLToPath(new URL("../../design/cli.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "mcp-design-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

/* Two identical apps: one changed through MCP, one through the CLI. */
function app(name) {
  const dir = join(tmp, name);
  mkdirSync(join(dir, ".ux-builder"), { recursive: true });
  writeFileSync(join(dir, "package.json"), "{}");
  writeFileSync(join(dir, ".ux-builder/design-state.json"), design.serialize({ ...design.emptyState(), next: "Interview two anglers" }));
  return dir;
}
const viaMcp = app("mcp");
const viaCli = app("cli");
const cli = (...args) => { const r = spawnSync(process.execPath, [CLI, ...args, "--json"], { cwd: viaCli, encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };

let client;
const call = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); assert.ok(!r.isError, r.content?.[0]?.text); return JSON.parse(r.content[0].text); };
before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(undefined, undefined, undefined, undefined, undefined, undefined, { trace: null, appDir: viaMcp, design }).connect(a);
  client = new Client({ name: "test", version: "1" });
  await client.connect(b);
});

describe("US-116: the design tools equal the CLI", () => {
  // @covers US-116-AC2
  test("AC2: get_design_state and update_design_state return what state get --json and state set --json return", async () => {
    assert.deepEqual(await call("get_design_state", {}), cli("state", "get"));
    assert.deepEqual(await call("get_design_state", { path: "next" }), cli("state", "get", "next"));
    const value = { text: "Location is available", section: "constraints" };
    assert.deepEqual(await call("update_design_state", { path: "assumptions[+]", value }), cli("state", "set", "assumptions[+]", JSON.stringify(value)));
    assert.deepEqual(await call("update_design_state", { path: "next", value: "Compare flows" }), cli("state", "set", "next", '"Compare flows"'));
    // Both apps now hold the same state, and design_status agrees with status --json (paths aside).
    assert.deepEqual(await call("get_design_state", {}), cli("state", "get"));
    assert.deepEqual(await call("design_status", {}), cli("status"));
  });

  test("a value the schema refuses is an error naming the path, as the CLI's exit 2 is", async () => {
    const r = await client.callTool({ name: "update_design_state", arguments: { path: "mode", value: "sideways" } });
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /mode: must be one of full, change/);
  });
});
