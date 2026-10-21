/* One complete assessment, as an agent following the ux-builder-assess skill
   runs it (FEAT-009 AGW-01 to AGW-04; US-057; STP-057).

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { makeRepo } from "./fixtures/helix-repo.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(PKG, "cli.mjs");
const SKILL = readFileSync(join(PKG, "skill/ux-builder-assess/SKILL.md"), "utf8");
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css") };
const PAGE = `<!doctype html><html lang="en" data-theme="praxis-carbon" data-appearance="light"><head><meta charset="utf-8"><title>Queue</title><link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/ui.css"></head>
<body style="margin:0;font-family:var(--piq-font-body);color:var(--piq-color-text);background:var(--piq-color-ground)"><main><h1>Queue</h1><p id="who" style="color:#ff00aa">Signed in</p></main></body></html>`;
let server, base;
const repos = [];
before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/" || path === "/queue") { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGE); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".woff2": "font/woff2" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.close(); for (const r of repos) r.remove(); });

const cli = (cwd, args) => new Promise((resolve) => {
  const c = spawn(process.execPath, [CLI, "assess", ...args], { cwd });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (code) => resolve({ code, stdout, stderr }));
});
function app(run = {}, extra = {}) {
  const r = makeRepo({ files: {
    // The app's own installed @ux-builder/ui, a different version from this package's.
    "node_modules/@ux-builder/ui/package.json": JSON.stringify({ name: "@ux-builder/ui", version: "9.8.7" }),
  } });
  repos.push(r);
  writeFileSync(join(r.dir, "ux-assessment.yml"), stringify({
    version: 1, app: { name: "Review app" },
    run: { baseUrl: `${base}/`, environment: "local", ...run },
    roles: [{ id: "reviewer", auth: "none" }],
    journeys: [{ id: "J-review", story: "US-001", priority: "critical", role: "reviewer", entry: "/queue" }],
    tests: [{ id: "unit", command: `node -e "process.exit(0)"` }],
    audit: { urls: ["/queue"], themes: ["praxis-carbon"], appearances: ["light"] },
    restrictions: { writes: "report-only" },
    ...extra,
  }));
  return r;
}
const stage = (r, run, name) => read(r, run, "run.json").stages.find((s) => s.stage === name);
const read = (r, run, f) => JSON.parse(readFileSync(join(r.dir, "ux-assessment", run, f), "utf8"));

describe("US-057: one complete assessment from a coding agent", () => {
  // @covers US-057-AC1
  test("AC1: the skill prescribes the stages in order, and running them writes the package", async () => {
    const order = ["assess validate", "assess collect", "alignment.json", "assess baseline", "assess browser", "assess inspect", "assess validate-report"].map((s) => SKILL.indexOf(s));
    assert.ok(order.every((i) => i >= 0), `the skill names every stage: ${order}`);
    assert.deepEqual([...order].sort((a, b) => a - b), order, "in order");
    for (const f of ["coverage.json", "backlog.json", "proposals/"]) assert.ok(SKILL.includes(f), f);
    assert.match(SKILL, /Never change the app's code or anything under its HELIX\s+root/);
    const r = app();
    const run = "R-20261020T140000Z";
    for (const args of [["validate"], ["collect", "--run", run], ["baseline", "--run", run]]) {
      const out = await cli(r.dir, args);
      assert.equal(out.code, 0, `${args[0]}: ${out.stderr}${out.stdout}`);
    }
    for (const f of ["run.json", "requirements.json", "traceability.json", "baseline.json"]) assert.ok(existsSync(join(r.dir, "ux-assessment", run, f)), f);
    assert.deepEqual(read(r, run, "run.json").stages.map((s) => [s.stage, s.status]), [["collect", "completed"], ["baseline", "completed"]]);
    const v = await cli(r.dir, ["validate-report", join("ux-assessment", run)]);
    assert.equal(v.code, 0, v.stdout + v.stderr);
  });

  // @covers US-057-AC2
  test("AC2: an app that does not start blocks the stage, with its reason; nothing counts as assessed", async () => {
    const r = app({ start: `node -e "process.exit(1)"`, ready: { url: "http://127.0.0.1:9/" } });
    const run = "R-20261020T150000Z";
    const out = await cli(r.dir, ["baseline", "--run", run]);
    assert.equal(out.code, 1);
    const stage = read(r, run, "run.json").stages.find((s) => s.stage === "baseline");
    assert.equal(stage.status, "blocked");
    assert.match(stage.reason, /exited \(1\) before/);
    const b = read(r, run, "baseline.json");
    assert.equal(b.audit, null, "no audit result is claimed");
    assert.deepEqual(b.tests.map((t) => t.status), ["passed"], "the tests that did run are still recorded");
    assert.ok(!existsSync(join(r.dir, "ux-assessment", run, "coverage.json")));
  });

  // @covers US-057-AC2
  test("AC2: no browser at the endpoint blocks the walkthrough, with its reason; no pair counts as assessed and the gate fails", async () => {
    const r = app();
    const run = "R-20261020T151000Z";
    for (const args of [["collect", "--run", run], ["plan", "--run", run]]) assert.equal((await cli(r.dir, args)).code, 0);
    const out = await cli(r.dir, ["inspect", "--manifest", "ux-assessment.yml", "--run", run, "--cdp", "http://127.0.0.1:9", "--page", "/queue", "--checkpoint", "C-review-1"]);
    assert.equal(out.code, 1);
    assert.equal(read(r, run, "checkpoints/C-review-1/inspection.json").error, "no-browser");
    const s = stage(r, run, "walkthrough");
    assert.equal(s.status, "blocked");
    assert.match(s.reason, /^no browser at http:\/\/127\.0\.0\.1:9/);
    assert.ok(!read(r, run, "coverage.json").entries.some((e) => e.status === "assessed"));
    const g = await cli(r.dir, ["gate", join("ux-assessment", run)]);
    assert.equal(g.code, 1);
    assert.match(g.stdout, /blocked stage walkthrough: no browser/);
  });

  // @covers US-057-AC2
  test("AC2: an authentication barrier blocks the journey's pairs, with the reason; the plan stage is partial", async () => {
    const r = app({}, { roles: [{ id: "reviewer", auth: { env: "UX_BUILDER_TEST_UNSET_SESSION" } }] });
    const run = "R-20261020T152000Z";
    assert.equal((await cli(r.dir, ["collect", "--run", run])).code, 0);
    const out = await cli(r.dir, ["plan", "--run", run]);
    assert.equal(out.code, 1, "the stage could not complete");
    assert.match(out.stderr, /plan partial: J-review: authentication barrier: role reviewer's credential variable UX_BUILDER_TEST_UNSET_SESSION is not set/);
    const entries = read(r, run, "coverage.json").entries;
    assert.ok(entries.filter((e) => e.status !== "not-applicable").every((e) => e.status === "blocked" && /authentication barrier/.test(e.reason)));
    assert.ok(!entries.some((e) => e.status === "assessed"));
    assert.equal(stage(r, run, "plan").status, "partial");
    assert.equal((await cli(r.dir, ["validate-report", join("ux-assessment", run)])).code, 0);
  });

  // @covers US-057-AC2
  test("AC2: a time or step limit reached stops the step, with its reason; the walkthrough is partial", async () => {
    const steps = (r) => { writeFileSync(join(r.dir, "steps.json"), JSON.stringify({ baseUrl: base, steps: [{ goto: "/queue" }], expect: { selector: "#who", text: "Signed in" } })); return "steps.json"; };
    // The run's minutes: spent before the first checkpoint.
    const t = app({}, { limits: { runMinutes: 0.0001 } });
    const runT = "R-20261020T153000Z";
    assert.equal((await cli(t.dir, ["collect", "--run", runT])).code, 0);
    await new Promise((res) => setTimeout(res, 20));
    const late = await cli(t.dir, ["inspect", "--manifest", "ux-assessment.yml", "--run", runT, "--replay", steps(t), "--checkpoint", "C-review-1"]);
    assert.equal(late.code, 1);
    const rec = read(t, runT, "checkpoints/C-review-1/inspection.json");
    assert.deepEqual([rec.error, rec.findings], ["limit", []]);
    assert.match(rec.message, /^blocked: limit — the run's 0\.0001 minutes \(limits\.runMinutes\) are spent; not taken/);
    assert.equal(stage(t, runT, "walkthrough").status, "partial");
    const b = await cli(t.dir, ["browser", "--manifest", "ux-assessment.yml", "--run", runT]);
    assert.equal(b.code, 1, "the browser does not start once the run's time is spent");
    assert.match(b.stderr, /blocked: limit/);
    // Steps: a replay of one action and its inspection take two; the next checkpoint would pass the limit of two.
    const s = app({}, { limits: { steps: 2 } });
    const runS = "R-20261020T154000Z";
    assert.equal((await cli(s.dir, ["collect", "--run", runS])).code, 0);
    const first = await cli(s.dir, ["inspect", "--manifest", "ux-assessment.yml", "--run", runS, "--replay", steps(s), "--checkpoint", "C-review-1", "--journey", "J-review"]);
    assert.equal(first.code, 0, first.stderr);
    assert.equal(read(s, runS, "checkpoints/C-review-1/inspection.json").steps, 2);
    const next = await cli(s.dir, ["inspect", "--manifest", "ux-assessment.yml", "--run", runS, "--replay", steps(s), "--checkpoint", "C-review-2", "--journey", "J-review"]);
    assert.equal(next.code, 1);
    assert.match(read(s, runS, "checkpoints/C-review-2/inspection.json").message, /blocked: limit — 2 of the run's 2 steps \(limits\.steps\) are taken/);
    assert.equal(stage(s, runS, "walkthrough").status, "partial");
    // A journey's minutes run from its first checkpoint.
    const j = app({}, { limits: { journeyMinutes: 1 } });
    const runJ = "R-20261020T155000Z";
    assert.equal((await cli(j.dir, ["collect", "--run", runJ])).code, 0);
    const old = join(j.dir, "ux-assessment", runJ, "checkpoints", "C-review-1");
    mkdirSync(old, { recursive: true });
    writeFileSync(join(old, "inspection.json"), JSON.stringify({ schema: "inspection", version: 1, checkpoint: { id: "C-review-1", journey: "J-review" }, inspectedAt: new Date(Date.now() - 120_000).toISOString(), steps: 1, mode: "in-place", findings: [] }));
    const over = await cli(j.dir, ["inspect", "--manifest", "ux-assessment.yml", "--run", runJ, "--replay", steps(j), "--checkpoint", "C-review-2", "--journey", "J-review"]);
    assert.equal(over.code, 1);
    assert.match(read(j, runJ, "checkpoints/C-review-2/inspection.json").message, /J-review's 1 minutes \(limits\.journeyMinutes\) are spent/);
  });

  // @covers US-057-AC3
  test("AC3: no MCP server is needed, and every command's finding is labelled deterministic", async () => {
    const r = app();
    const run = "R-20261020T160000Z";
    const steps = join(r.dir, "steps.json");
    writeFileSync(steps, JSON.stringify({ baseUrl: base, steps: [{ goto: "/queue" }], expect: { selector: "#who", text: "Signed in" } }));
    const out = await cli(r.dir, ["inspect", "--replay", steps, "--checkpoint", "C-review-1", "--journey", "J-review", "--run", run]);
    assert.equal(out.code, 0, out.stderr);
    const f = read(r, run, "checkpoints/C-review-1/inspection.json").findings;
    assert.ok(f.length >= 1 && f.every((x) => x.finding_type === "deterministic"));
    assert.match(SKILL, /Everything above works without `@ux-builder\/mcp`/);
  });

  // @covers US-057-AC4
  test("AC4: the SDK version reported is the app's installed one", async () => {
    const r = app();
    const run = "R-20261020T170000Z";
    assert.equal((await cli(r.dir, ["collect", "--run", run])).code, 0);
    assert.equal(read(r, run, "run.json").versions.ui, "9.8.7");
  });

  test("the CI workflow example only runs subcommands that exist", async () => {
    const { parse } = await import("yaml");
    const wf = parse(readFileSync(join(PKG, "examples/ux-assessment.workflow.yml"), "utf8"));
    const runs = wf.jobs.assess.steps.map((s) => s.run).filter((r) => r?.includes("ux-builder-audit assess"));
    assert.ok(runs.length >= 6);
    const help = await cli(PKG, ["--help"]);
    for (const r of runs) { const sub = /assess (\S+)/.exec(r)[1]; assert.match(help.stderr, new RegExp(`^\\s+${sub}\\b`, "m"), sub); }
  });
});
