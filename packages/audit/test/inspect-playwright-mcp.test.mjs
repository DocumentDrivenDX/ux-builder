/* The real driver: Playwright MCP connected to `assess browser` over CDP,
   driven through the MCP protocol as an agent would drive it, and the page
   it reached inspected in place (FEAT-009 INS-03, ADR-026 decision 4). This
   closes the gap the state proof left: there the driver was a second
   Playwright client, here it is @playwright/mcp itself.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { serve } from "./fixtures/assess-app/server.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
// Its bin, found through its package.json (cli.js is not an export).
const MCP_CLI = join(dirname(createRequire(import.meta.url).resolve("@playwright/mcp/package.json")), "cli.js");
const tmp = mkdtempSync(join(tmpdir(), "pw-mcp-"));
let app, browser, cdp, agent;

const cli = (args) => new Promise((resolve) => {
  const c = spawn(process.execPath, [join(PKG, "cli.mjs"), "assess", ...args], { cwd: PKG });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (code) => resolve({ code, stdout, stderr }));
});
const tool = async (name, args = {}) => {
  const r = await agent.callTool({ name, arguments: args });
  assert.ok(!r.isError, `${name}: ${JSON.stringify(r.content)}`);
  return r.content.map((c) => c.text ?? "").join("\n");
};

before(async () => {
  app = await serve();
  browser = spawn(process.execPath, [join(PKG, "cli.mjs"), "assess", "browser"], { cwd: PKG });
  cdp = await new Promise((resolve, reject) => {
    let out = "";
    browser.stdout.on("data", (d) => { out += d; const m = /"cdp":\s*"([^"]+)"/.exec(out); if (m) resolve(m[1]); });
    browser.on("exit", (c) => reject(new Error(`assess browser exited ${c}`)));
  });
  agent = new Client({ name: "assessment-agent", version: "1" });
  await agent.connect(new StdioClientTransport({ command: process.execPath, args: [MCP_CLI, "--cdp-endpoint", cdp, "--output-dir", join(tmp, "pw-mcp-output")] }));
});
after(async () => {
  await agent?.close();
  browser?.kill("SIGINT");
  await app?.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe("Playwright MCP as the agent's driver", () => {
  test("an agent signs in and opens a dialog through Playwright MCP; the audit inspects that state in place", async () => {
    const { tools } = await agent.listTools();
    for (const t of ["browser_navigate", "browser_click", "browser_snapshot"]) assert.ok(tools.some((x) => x.name === t), t);
    await tool("browser_navigate", { url: `${app.url}/` });
    const signIn = await tool("browser_snapshot");
    const ref = /button "Sign in" \[ref=([a-z0-9]+)\]/.exec(signIn)?.[1];
    assert.ok(ref, signIn);
    await tool("browser_click", { element: "Sign in button", target: ref });
    const home = await tool("browser_snapshot");
    assert.match(home, /Signed in as tester@example\.test/);
    const rename = /button "Rename matter" \[ref=([a-z0-9]+)\]/.exec(home)?.[1];
    assert.ok(rename, home);
    await tool("browser_click", { element: "Rename matter button", target: rename });
    // Playwright MCP's snapshot shows the open dialog by its role and heading.
    const OPEN = /- dialog \[ref=[a-z0-9]+\]:[\s\S]*heading "Rename matter"/;
    assert.match(await tool("browser_snapshot"), OPEN);

    const r = await cli(["inspect", "--cdp", cdp, "--page", "/home", "--checkpoint", "C-mcp-1", "--journey", "J-rename", "--step", "3", "--out", tmp, "--run", "R-mcp"]);
    assert.equal(r.code, 0, r.stderr + r.stdout);
    const rec = JSON.parse(readFileSync(join(tmp, "R-mcp/checkpoints/C-mcp-1/inspection.json"), "utf8"));
    assert.equal(rec.mode, "in-place");
    assert.ok(rec.findings.some((f) => f.rule === "token-colors"));
    assert.match(readFileSync(join(tmp, "R-mcp/checkpoints/C-mcp-1/tree.yml"), "utf8"), /dialog "Rename matter"/);
    assert.ok(existsSync(join(tmp, "R-mcp/checkpoints/C-mcp-1/screenshot.png")));
    // The agent's session goes on: the dialog is still open and the task can finish.
    const after = await tool("browser_snapshot");
    assert.match(after, OPEN);
    const save = /button "Save" \[ref=([a-z0-9]+)\]/.exec(after)?.[1];
    assert.ok(save, after);
    await tool("browser_click", { element: "Save button", target: save });
    assert.doesNotMatch(await tool("browser_snapshot"), OPEN);
  });
});
