/* The state proof (FEAT-009 INS-03, INS-04, INS-06; US-062-AC3, AC4, AC6;
   STP-062): a browser started by `assess browser`, driven by a second
   Playwright client over CDP as an agent's driver would be, and inspected in
   place by `assess inspect --cdp` at three checkpoints; then the task goes
   on from the same state.

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./fixtures/assess-app/server.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(PKG, "cli.mjs");
const tmp = mkdtempSync(join(tmpdir(), "assess-cdp-"));
let app, browserProc, cdp, client, page;

const cli = (args) => new Promise((resolve) => {
  const c = spawn(process.execPath, [CLI, "assess", ...args], { cwd: PKG });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (code) => resolve({ code, stdout, stderr }));
});
const inspectAt = (id, match, extra = []) => cli(["inspect", "--cdp", cdp, "--page", match, "--checkpoint", id, "--journey", "J-new-entry", "--role", "tester", "--out", tmp, "--run", "R-proof", ...extra]);
const record = (id) => JSON.parse(readFileSync(join(tmp, "R-proof", "checkpoints", id, "inspection.json"), "utf8"));

before(async () => {
  app = await serve();
  browserProc = spawn(process.execPath, [CLI, "assess", "browser"], { cwd: PKG });
  cdp = await new Promise((resolve, reject) => {
    let out = "";
    browserProc.stdout.on("data", (d) => { out += d; const m = /"cdp":\s*"([^"]+)"/.exec(out); if (m) resolve(m[1]); });
    browserProc.on("exit", (c) => reject(new Error(`assess browser exited ${c}`)));
  });
  // The agent's driver: another process's view of the same browser.
  client = await chromium.connectOverCDP(cdp);
  const context = client.contexts()[0] ?? await client.newContext();
  page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
});
after(async () => {
  await client?.close();
  browserProc?.kill("SIGINT");
  await app?.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe("US-062: checks on the state just reached, in the agent's own browser", () => {
  // @covers US-062-AC6
  // @covers US-062-AC4
  test("AC6, AC4: a signed-in screen, an open dialog and a validation error are inspected in place, and the task goes on", async () => {
    // 1. Signed in.
    await page.goto(`${app.url}/`);
    await page.click("button:has-text(\"Sign in\")");
    await page.waitForURL(/\/home$/);
    const r1 = await inspectAt("C-new-entry-1", "/home", ["--step", "1", "--state", "success"]);
    assert.equal(r1.code, 0, r1.stderr + r1.stdout);
    const c1 = record("C-new-entry-1");
    assert.equal(c1.mode, "in-place");
    assert.match(c1.url, /\/home$/);
    assert.equal(await page.textContent("#who"), "Signed in as tester@example.test", "still signed in");

    // 2. An open dialog, part-edited.
    await page.click("#rename");
    await page.fill("#d-name", "Halvorsen v. Atlas (appeal)");
    const r2 = await inspectAt("C-new-entry-2", "/home", ["--step", "2", "--state", "success"]);
    assert.equal(r2.code, 0, r2.stderr);
    assert.equal(await page.evaluate(() => document.getElementById("d").open), true, "the dialog is still open");
    assert.equal(await page.inputValue("#d-name"), "Halvorsen v. Atlas (appeal)", "and still holds the edit");
    await page.click("#d-save");
    await page.waitForFunction(() => !document.getElementById("d").open);
    assert.equal(await page.textContent("#name"), "Halvorsen v. Atlas (appeal)", "the dialog's task completes");

    // 3. A validation error with the valid input kept.
    await page.click("text=New entry");
    await page.fill("#matter", "Okafor estate");
    await page.fill("#hours", "1.3");
    await page.click("button:has-text(\"Save entry\")");
    await page.waitForSelector("#hours-error");
    const r3 = await inspectAt("C-new-entry-3", "/new", ["--step", "3", "--state", "recoverable-error"]);
    assert.equal(r3.code, 0, r3.stderr);
    assert.equal(await page.inputValue("#matter"), "Okafor estate", "the valid value is kept");
    assert.equal(await page.inputValue("#hours"), "1.3");
    await page.fill("#hours", "1.25");
    await page.click("button:has-text(\"Save entry\")");
    await page.waitForSelector("#saved");
    assert.equal(await page.textContent("#saved"), "Okafor estate: 1.25 hours", "the task completes from the same state");

    // Every checkpoint's findings are linked to it, with its viewport and theme, and its screenshot exists (AC4).
    for (const [id, step, state] of [["C-new-entry-1", 1, "success"], ["C-new-entry-2", 2, "success"], ["C-new-entry-3", 3, "recoverable-error"]]) {
      const c = record(id);
      assert.ok(c.findings.length >= 1, `${id} has findings`);
      assert.ok(c.findings.some((f) => f.rule === "token-colors"), `${id} found the hard-coded colour`);
      for (const f of c.findings) {
        assert.deepEqual(f.checkpoint, { id, journey: "J-new-entry", step, role: "tester", state });
        assert.deepEqual(f.viewport, { width: 1280, height: 900 });
        assert.equal(f.theme, "praxis-carbon");
        assert.equal(f.finding_type, "deterministic");
      }
      assert.ok(existsSync(join(tmp, "R-proof", "checkpoints", id, c.screenshot)), `${id} screenshot`);
      assert.ok(existsSync(join(tmp, "R-proof", "checkpoints", id, "tree.yml")), `${id} tree`);
    }
    assert.ok(record("C-new-entry-2").findings.some((f) => f.rule === "token-colors"), "the dialog's page was inspected as it stood");
    const tree = (id) => readFileSync(join(tmp, "R-proof", "checkpoints", id, "tree.yml"), "utf8");
    assert.match(tree("C-new-entry-1"), /Signed in as tester/, "the evidence shows the signed-in screen");
    assert.match(tree("C-new-entry-2"), /dialog "Rename matter"/, "the evidence shows the open dialog");
    assert.match(tree("C-new-entry-3"), /Enter hours in quarters/, "the evidence shows the validation error");
    assert.match(tree("C-new-entry-3"), /Okafor estate/, "and the kept input");
  });

  // @covers US-062-AC3
  test("AC3: in place over CDP; a lost or ambiguous page and a replay that does not match are reported, not inspected", async () => {
    const lost = await inspectAt("C-new-entry-9", "/nowhere");
    assert.equal(lost.code, 1);
    assert.equal(record("C-new-entry-9").error, "lost");
    const second = await page.context().newPage();
    await second.goto(`${app.url}/home`);
    await page.goto(`${app.url}/home`);
    const two = await inspectAt("C-new-entry-8", "/home");
    assert.equal(two.code, 1);
    assert.equal(record("C-new-entry-8").error, "ambiguous");
    assert.match(record("C-new-entry-8").message, /2 pages match/);
    await second.close();
    assert.equal(await page.textContent("#who"), "Signed in as tester@example.test", "the agent's pages survive the inspector detaching");

    // Replay without signing in lands on the sign-in page: the expected state is not there.
    const steps = join(tmp, "steps.json");
    writeFileSync(steps, JSON.stringify({ baseUrl: app.url, steps: [{ goto: "/home" }], expect: { selector: "#who", text: "Signed in" } }));
    const bad = await cli(["inspect", "--replay", steps, "--checkpoint", "C-new-entry-7", "--out", tmp, "--run", "R-proof"]);
    assert.equal(bad.code, 1);
    const b = record("C-new-entry-7");
    assert.equal(b.mode, "replay");
    assert.equal(b.verified.passed, false);
    assert.deepEqual(b.findings, []);
    // Replay that signs in first matches, and is inspected.
    writeFileSync(steps, JSON.stringify({ baseUrl: app.url, steps: [{ goto: "/" }, { click: "button:has-text(\"Sign in\")" }, { waitFor: "#who" }], expect: { selector: "#who", text: "Signed in" } }));
    const good = await cli(["inspect", "--replay", steps, "--checkpoint", "C-new-entry-6", "--out", tmp, "--run", "R-proof"]);
    assert.equal(good.code, 0, good.stderr);
    assert.equal(record("C-new-entry-6").verified.passed, true);
    assert.ok(record("C-new-entry-6").findings.length >= 1);
  });
});
