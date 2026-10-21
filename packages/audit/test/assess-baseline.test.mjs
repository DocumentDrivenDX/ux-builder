/* assess baseline: the app's tests and the audit, recorded before any change
   (FEAT-009 BAS-01 to BAS-04, ENV-03; US-059; STP-059).

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { NOTE } from "../assess/baseline.mjs";
import { makeRepo } from "./fixtures/helix-repo.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const CLI = join(PKG, "cli.mjs");
const FILES = { "/themes.css": join(PKG, "../tokens/dist/themes.css"), "/fonts.css": join(PKG, "../tokens/dist/fonts.css"), "/ui.css": join(PKG, "../ui/dist/ui.css") };
const LONG = "Entries flagged by the time rules wait here for a partner to review them before prebill closes on Friday afternoon, ".repeat(4);
const PAGES = {
  "/sdk.html": `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title><link rel="stylesheet" href="/themes.css"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/ui.css"></head>
<body style="margin:0"><div data-theme="praxis-carbon" data-appearance="light" style="padding:var(--piq-space-5);background:var(--piq-color-ground);color:var(--piq-color-text);font-family:var(--piq-font-body)"><main><h1>Queue</h1><p style="border-radius:3px">Odd corner</p></main></div></body></html>`,
  "/plain.html": `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body><main><h1>Legacy queue</h1><button style="width:12px;height:12px">x</button><p>${LONG}</p></main></body></html>`,
};
let server, base, repo;
// A value the test log prints; it is referenced as a role's credential, so it must be masked.
const SECRET_VALUE = "fixture-session-7f3a9c";

before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (PAGES[path]) { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGES[path]); return; }
    const file = FILES[path] ?? (path.startsWith("/fonts/") ? join(PKG, "../tokens/dist", path) : null);
    if (!file || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": { ".css": "text/css", ".woff2": "font/woff2" }[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  repo = makeRepo({ files: { "reports/unit.xml": '<testsuites><testsuite name="a" tests="5" failures="1" errors="0" skipped="1"></testsuite></testsuites>' } });
  writeFileSync(join(repo.dir, "ux-assessment.yml"), stringify({
    version: 1, app: { name: "Review app" },
    run: { baseUrl: `${base}/`, environment: "local" },
    roles: [{ id: "reviewer", auth: { env: "FIXTURE_SESSION" } }],
    journeys: [{ id: "J-review", story: "US-001", priority: "critical", role: "reviewer", entry: "/sdk.html" }],
    tests: [
      { id: "passing", command: `node -e "console.log('session ' + process.env.FIXTURE_SESSION)"`, report: { format: "junit", path: "reports/unit.xml" } },
      { id: "failing", command: `node -e "process.exit(3)"` },
      { id: "missing", command: "sh -c 'definitely-not-a-command-ux-builder'" },
    ],
    audit: { urls: ["/sdk.html", "/plain.html"], widths: [1280], themes: ["praxis-carbon"], appearances: ["light"], off: ["token-radii", "no-such-check"] },
    restrictions: { writes: "report-only" },
  }));
});
after(() => { server?.close(); repo?.remove(); });

const runBaseline = () => new Promise((resolve) => {
  const c = spawn(process.execPath, [CLI, "assess", "baseline", "--run", "R-20261020T130000Z"], { cwd: repo.dir, env: { ...process.env, FIXTURE_SESSION: SECRET_VALUE } });
  let stdout = "", stderr = "";
  c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
  c.on("close", (code) => resolve({ code, stdout, stderr }));
});

describe("US-059: tell old failures from redesign regressions", () => {
  let result, record, dir;
  before(async () => {
    result = await runBaseline();
    dir = join(repo.dir, "ux-assessment", "R-20261020T130000Z");
    record = JSON.parse(readFileSync(join(dir, "baseline.json"), "utf8"));
  });

  // @covers US-059-AC1
  test("AC1: each command's outcome, duration and counts; logs masked; not run apart from failed", () => {
    assert.equal(result.code, 0, result.stderr + result.stdout);
    const by = Object.fromEntries(record.tests.map((t) => [t.id, t]));
    assert.equal(by.passing.status, "passed");
    assert.deepEqual(by.passing.counts, { passed: 3, failed: 1, skipped: 1 });
    assert.equal(by.failing.status, "failed");
    assert.equal(by.failing.exitCode, 3);
    assert.equal(by.failing.counts, "unknown", "no report: unknown, never zero");
    assert.equal(by.missing.status, "not-run");
    assert.equal(by.missing.reason, "command not found");
    for (const t of record.tests) assert.ok(Number.isInteger(t.durationMs) && t.durationMs >= 0);
    const log = readFileSync(join(dir, by.passing.log), "utf8");
    assert.match(log, /session \*\*\*/);
    assert.ok(!log.includes(SECRET_VALUE), "the referenced credential is masked");
  });

  // @covers US-059-AC2
  test("AC2: the audit report, the installed versions, and the checks turned off or unsupported", () => {
    assert.ok(existsSync(join(dir, record.audit.report)));
    const audit = JSON.parse(readFileSync(join(dir, record.audit.report), "utf8"));
    assert.ok(audit.runs.length >= 1);
    assert.deepEqual(record.audit.off, ["token-radii", "no-such-check"]);
    assert.deepEqual(record.audit.unsupported, ["no-such-check"]);
    assert.ok(!audit.findings.some((f) => f.rule === "token-radii"), "the check was off");
    assert.match(record.versions.audit, /^\d+\.\d+\.\d+/);
    assert.equal(record.versions.ui, null, "the fixture app installs no @ux-builder/ui of its own");
    assert.match(record.versions.uiUsedByAudit, /^\d+\.\d+\.\d+/, "so the audit's own copy, recorded");
  });

  // @covers US-059-AC3
  test("AC3: a page not on the SDK is still inspected; its adoption gaps are counted apart", () => {
    assert.deepEqual(record.audit.pagesNotOnSdk, [`${base}/plain.html`]);
    const asIs = JSON.parse(readFileSync(join(dir, record.audit.asIs), "utf8")).findings;
    assert.ok(asIs.some((f) => f.rule === "line-length"), "usability findings on the plain page");
    assert.ok(asIs.some((f) => f.rule === "target-size"));
    assert.ok(!asIs.some((f) => ["token-colors", "token-fonts", "sdk-widgets", "foreign-components"].includes(f.rule)), "no conformance findings in the as-is pass");
    assert.ok(record.audit.findings.sdkAdoption >= 1, "theme-applied: the page has no theme");
    assert.ok(record.audit.findings.usability >= 2);
  });

  // @covers US-059-AC4
  test("AC4: failures stay recorded and the record says tests passing is not usability", () => {
    assert.ok(record.tests.some((t) => t.status === "failed"));
    assert.equal(record.note, NOTE);
    assert.equal(NOTE, "Passing functional tests do not show that usability criteria are met.");
    const run = JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
    assert.deepEqual(run.stages.map((s) => [s.stage, s.status]), [["baseline", "completed"]]);
  });

  // @covers US-059-AC4
  test("AC4: compared with a later run, every failure of the earlier baseline is still listed, with its later status", async () => {
    const later = join(repo.dir, "ux-assessment", "R-20261021T130000Z");
    mkdirSync(later, { recursive: true });
    writeFileSync(join(later, "run.json"), JSON.stringify({ schema: "run", version: 1, id: "R-20261021T130000Z", stages: [] }));
    // In the later run, "failing" now passes and "missing" was not declared.
    writeFileSync(join(later, "baseline.json"), JSON.stringify({ schema: "baseline", version: 1, tests: [{ id: "passing", command: "x", status: "passed", counts: "unknown", log: "logs/passing.log" }, { id: "failing", command: `node -e "process.exit(3)"`, status: "passed", counts: "unknown", log: "logs/failing.log" }], audit: null, note: NOTE }));
    const c = spawnSync(process.execPath, [CLI, "assess", "compare", dir, later], { cwd: repo.dir, encoding: "utf8" });
    assert.equal(c.status, 0, c.stderr);
    const cmp = JSON.parse(readFileSync(join(later, "comparison.json"), "utf8"));
    assert.equal(cmp.baseline.run, "R-20261020T130000Z");
    const earlier = record.tests.filter((t) => t.status !== "passed");
    assert.deepEqual(cmp.baseline.failures.map((f) => [f.test, f.status, f.later]), earlier.map((t) => [t.id, t.status, t.id === "failing" ? "passed" : "not-run"]), "every earlier failure, with its status now");
    assert.equal(spawnSync(process.execPath, [CLI, "assess", "report", later], { cwd: repo.dir }).status, 0);
    const md = readFileSync(join(later, "report.md"), "utf8");
    assert.match(md, /Baseline failure from R-20261020T130000Z: `node -e "process\.exit\(3\)"` failed; in this run's baseline: passed/);
    assert.match(md, /Passing functional tests do not show that usability criteria are met\./);
  });
});
