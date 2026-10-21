/* Journey plans and walkthrough records, and the browser's limits (FEAT-009
   JRN-01 to JRN-05, ENV-01 to ENV-03; US-060; STP-060).

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { prepared } from "./fixtures/run-package.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/ui.css": join(PKG, "../ui/dist/ui.css") };
const made = [];
const pkg = (o) => { const p = prepared(o); made.push(p); return p; };
let server, base;
before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/queue") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<!doctype html><html lang="en" data-theme="praxis-carbon" data-appearance="light"><head><meta charset="utf-8"><title>Queue</title><link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/ui.css"></head><body><main><h1>Queue</h1><p id="who">Signed in as reviewer@example.test</p><p>Account 4417-2210 is flagged</p></main></body></html>`); return; }
    const file = FILES[path];
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.close(); for (const p of made) p.remove(); });

const steps = (s) => ({ schema: "walkthrough", version: 1, journeys: [{ id: "J-review", status: "partial", steps: s }] });

describe("US-060: see what the agent attempted and observed", () => {
  // @covers US-060-AC1
  test("AC1: each journey is planned from its story, criteria and the tests it can reuse", () => {
    const p = pkg();
    const j = p.read("plan.json").journeys.find((x) => x.id === "J-review");
    assert.deepEqual([j.role, j.fixture, j.entry, j.story, j.goal], ["reviewer", "queue", "/queue", "US-001", "Review a queue"]);
    assert.deepEqual(j.criteria.map((c) => [c.id, c.text]), [["US-001-AC1", "Given entries, when the queue opens, then they are listed."], ["US-001-AC2", "Given an entry, when it is approved, then it leaves the queue."]]);
    assert.deepEqual(j.expected, j.criteria.map((c) => c.text));
    assert.deepEqual(j.reuses, ["test/queue.test.mjs"]);
  });

  // @covers US-060-AC2
  test("AC2: a visual judgment needs a screenshot; DOM text alone is not enough", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const step = (basis) => ({ n: 1, action: "open the queue", url: "/queue", checkpoint: "C-review-1", status: "done", observation: { text: "The approve button is hard to find", basis, visual: true } });
    p.write("walkthrough.json", steps([step(["dom-text"])]));
    assert.match(p.cli("validate-report", p.dir).stdout, /makes a visual judgment without a screenshot/);
    p.write("walkthrough.json", steps([step(["screenshot", "tree"])]));
    assert.equal(p.cli("validate-report", p.dir).status, 0);
  });

  // @covers US-060-AC3
  test("AC3: a checkpoint step has its URL, observation and evidence; judgments stay apart from deterministic results", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    p.write("walkthrough.json", steps([{ n: 1, action: "open the queue", checkpoint: "C-review-1", status: "done" }]));
    assert.match(p.cli("validate-report", p.dir).stdout, /step 1's checkpoint needs its URL and observation/);
    p.write("walkthrough.json", steps([{ n: 1, action: "open the queue", url: "/queue", checkpoint: "C-review-9", status: "done", observation: { text: "Listed", basis: ["tree"] } }]));
    assert.match(p.cli("validate-report", p.dir).stdout, /C-review-9 is not a checkpoint in the package/);
    p.write("walkthrough.json", steps([{ n: 1, action: "open the queue", url: "/queue", checkpoint: "C-review-1", status: "done", observation: { text: "Three entries listed", basis: ["screenshot", "tree"] }, judgment: "The oldest entry should be first" }]));
    assert.equal(p.cli("validate-report", p.dir).status, 0);
    assert.deepEqual(p.read("checkpoints/C-review-1/inspection.json").findings, [], "the judgment is not mixed into the inspection's deterministic findings");
  });

  // @covers US-060-AC4
  test("AC4: a blocked or unassessed step has a reason and no observation", () => {
    const p = pkg();
    p.write("walkthrough.json", steps([{ n: 1, action: "simulate an expired session", status: "blocked", observation: { text: "Saw an error", basis: ["screenshot"] } }]));
    const out = p.cli("validate-report", p.dir).stdout;
    assert.match(out, /step 1 is blocked without a reason/);
    assert.match(out, /step 1 is blocked but records an observation/);
    p.write("walkthrough.json", steps([{ n: 1, action: "simulate an expired session", status: "blocked", reason: "the manifest declares no fixture that expires a session" }]));
    assert.equal(p.cli("validate-report", p.dir).status, 0);
  });

  // @covers US-060-AC5
  test("AC5: a host outside run.origins cannot load; fixtures reset; evidence is masked; off-origin pages are not inspected", async () => {
    const p = pkg({ manifest: { run: { baseUrl: `${base}/`, environment: "local" }, evidence: { redact: { selectors: ["#who"], text: ["\\d{4}-\\d{4}"] } } } });
    // The fixture's reset runs between scenarios.
    assert.equal(p.cli("reset", "--fixture", "queue").status, 0);
    assert.equal(readFileSync(join(p.r.dir, "reset.flag"), "utf8"), "reset");
    const child = spawn(process.execPath, [join(PKG, "cli.mjs"), "assess", "browser", "--manifest", "ux-assessment.yml"], { cwd: p.r.dir });
    const cdp = await new Promise((resolve, reject) => { let out = ""; child.stdout.on("data", (d) => { out += d; const m = /"cdp":\s*"([^"]+)"/.exec(out); if (m) resolve(m[1]); }); child.on("exit", (c) => reject(new Error(`browser exited ${c}`))); });
    const client = await chromium.connectOverCDP(cdp);
    try {
      const page = await (client.contexts()[0] ?? await client.newContext()).newPage();
      await page.goto(`${base}/queue`);
      assert.equal(await page.textContent("h1"), "Queue", "the allowed origin loads");
      const other = await page.context().newPage();
      // localhost is the same server, but not the manifest's origin: the browser refuses to resolve it.
      await assert.rejects(other.goto(base.replace("127.0.0.1", "localhost") + "/queue"), /ERR_NAME_NOT_RESOLVED/);
      const inspect = (args) => new Promise((resolve) => { const c = spawn(process.execPath, [join(PKG, "cli.mjs"), "assess", "inspect", "--manifest", "ux-assessment.yml", "--cdp", cdp, "--run", p.run, ...args], { cwd: p.r.dir }); let o = ""; c.stdout.on("data", (d) => { o += d; }); c.on("close", (code) => resolve({ code, o })); });
      const off = await inspect(["--page", "chrome-error", "--checkpoint", "C-review-2"]);
      assert.equal(off.code, 1);
      assert.match(off.o, /blocked: restricted/);
      assert.equal(p.read("checkpoints/C-review-2/inspection.json").error, "restricted");
      await other.close();
      const ok = await inspect(["--page", "/queue", "--checkpoint", "C-review-1"]);
      assert.equal(ok.code, 0, ok.o);
      const tree = readFileSync(join(p.dir, "checkpoints/C-review-1/tree.yml"), "utf8");
      assert.match(tree, /Account \*\*\* is flagged/, "text masked in the tree");
      assert.ok(!tree.includes("4417-2210"));
      assert.ok(existsSync(join(p.dir, "checkpoints/C-review-1/screenshot.png")), "the screenshot, with #who masked by Playwright");
    } finally {
      await client.close();
      child.kill("SIGINT");
    }
  });
});
