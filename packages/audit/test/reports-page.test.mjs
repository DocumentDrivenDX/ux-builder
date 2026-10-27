/* One page for every report, and a doctor for the installed packages
   (US-158): docs/ux-builder/reports.html says what the UI audit and each
   usability assessment are and links them, rewritten whenever either
   writes its report; `ux-builder-audit reports` rewrites it; `doctor`
   lists the @ux-builder versions and flags those that do not agree.

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { audit, VERSION } from "../audit.mjs";
import { report as assessReport } from "../assess/report.mjs";
import { doctor, satisfies } from "../doctor.mjs";
import { writeReports } from "../report.mjs";
import { appOfReport, landingPage, WHAT } from "../reports.mjs";
import { modalityApps } from "./fixtures/modality-apps.mjs";

const CLI = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const tmp = realpathSync(mkdtempSync(join(tmpdir(), "audit-reports-")));
after(() => rmSync(tmp, { recursive: true, force: true }));
const cli = (cwd, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
const json = (file, data) => { mkdirSync(join(file, ".."), { recursive: true }); writeFileSync(file, JSON.stringify(data, null, 2)); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

/* An audit report as the audit writes it: two themes, an error and a warning. */
const AUDIT = {
  tool: "@ux-builder/audit", version: "0.5.2", versions: { "@ux-builder/audit": "0.5.2", "@ux-builder/ui": "0.12.1", "@ux-builder/tokens": "1.7.0" },
  generatedAt: "2026-10-26T10:00:00.000Z", urls: ["http://localhost:5173/"], rules: { contrast: "x", reflow: "x", "token-colors": "x", fonts: "x" },
  runs: [{ url: "http://localhost:5173/", theme: "praxis-carbon", appearance: "light" }, { url: "http://localhost:5173/", theme: "praxis-fluent", appearance: "light" }],
  pages: [], verdicts: {}, findings: [{ id: 1, check: "contrast", severity: "error", url: "http://localhost:5173/", message: "m", runs: [] }, { id: 2, check: "reflow", severity: "warning", url: "http://localhost:5173/", message: "m", runs: [] }],
  summary: { error: 1, warning: 1, info: 0, byRule: { contrast: 1, reflow: 1 } },
};
/* An app on the current layout, with two assessment runs; the newer walked one journey with a screenshot. */
function app(name = "app") {
  const dir = join(tmp, name);
  mkdirSync(join(dir, "docs/ux-builder/blueprint"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name }));
  const runs = join(dir, "docs/ux-builder/assessments");
  json(join(runs, "R-20261020T090000Z/run.json"), { schema: "run", version: 1, id: "R-20261020T090000Z", startedAt: "2026-10-20T09:00:00.000Z", versions: { ui: "0.11.0", audit: "0.5.0" }, config: { journeys: ["J-old"] } });
  const r = join(runs, "R-20261026T120000Z");
  json(join(r, "run.json"), { schema: "run", version: 1, id: "R-20261026T120000Z", startedAt: "2026-10-26T12:00:00.000Z", versions: { ui: "0.12.1", tokens: "1.7.0", audit: "0.5.2" }, config: { journeys: ["J-review"] } });
  json(join(r, "walkthrough.json"), { schema: "walkthrough", version: 1, journeys: [{ id: "J-review", status: "completed", steps: [{ n: 1, action: "Open the queue", screen: "queue", checkpoint: "C-review-1", status: "done" }, { n: 2, action: "Approve the first entry", status: "done" }] }] });
  json(join(r, "backlog.json"), { schema: "backlog", version: 1, findings: [{ id: "F-1" }, { id: "F-2" }, { id: "F-3" }] });
  mkdirSync(join(r, "checkpoints/C-review-1"), { recursive: true });
  writeFileSync(join(r, "checkpoints/C-review-1/screenshot.png"), PNG);
  return dir;
}

describe("US-158: one page for every report, and a doctor for the versions", () => {
  // @covers US-158-AC1
  test("AC1: reports.html lists the latest UI audit and each assessment run newest first, with the latest run's journeys step by step, what each report is, and the versions that wrote it", () => {
    const a = app("landing");
    const out = join(a, "docs/ux-builder/audit-report");
    mkdirSync(out, { recursive: true });
    assert.equal(appOfReport(out), a);
    assert.equal(appOfReport(join(a, "docs/ux-builder/assessments/R-20261026T120000Z")), a);
    assert.equal(appOfReport(join(tmp, "elsewhere/out")), null, "a report written anywhere else is left alone");
    // Writing the UI audit's report refreshes the page.
    writeReports(AUDIT, out);
    const file = join(a, "docs/ux-builder/reports.html");
    assert.ok(existsSync(file));
    const { path, html, reports } = landingPage(a);
    assert.equal(path, file);
    assert.equal(readFileSync(file, "utf8"), html);
    assert.deepEqual(reports.audit, {
      kind: "audit", what: WHAT.audit, date: "2026-10-26T10:00:00.000Z", themes: 2, checks: { pass: 2, warn: 1, fail: 1 }, findings: { error: 1, warning: 1, info: 0 },
      link: "audit-report/index.html", versions: { "@ux-builder/audit": "0.5.2", "@ux-builder/ui": "0.12.1", "@ux-builder/tokens": "1.7.0" },
    });
    assert.deepEqual(reports.assessments.map((r) => [r.id, r.findings, r.journeys.map((j) => [j.id, j.steps.length])]), [["R-20261026T120000Z", 3, [["J-review", 2]]], ["R-20261020T090000Z", 0, [["J-old", 0]]]]);
    assert.deepEqual(reports.assessments[0].versions, { "@ux-builder/ui": "0.12.1", "@ux-builder/tokens": "1.7.0", "@ux-builder/audit": "0.5.2" });
    assert.equal(reports.assessments[0].journeys[0].steps[0].screenshot, "assessments/R-20261026T120000Z/checkpoints/C-review-1/screenshot.png");
    assert.match(html, /UI audit: the running app in every theme, against the rules\./);
    assert.match(html, /Usability assessment: each journey from your user stories, walked step by step\./);
    assert.match(html, /<a href="audit-report\/index\.html">open the UI audit<\/a>/);
    assert.match(html, /2 themes · checks <span class="pass">2 pass<\/span>, <span class="warn">1 warn<\/span>, <span class="fail">1 fail<\/span>/);
    assert.ok(html.indexOf("R-20261026T120000Z") < html.indexOf("R-20261020T090000Z"), "newest run first");
    assert.match(html, /<img src="assessments\/R-20261026T120000Z\/checkpoints\/C-review-1\/screenshot\.png" alt="Step 1: Open the queue"/);
    assert.match(html, /Written by <code>@ux-builder\/audit 0\.5\.2<\/code>, <code>@ux-builder\/ui 0\.12\.1<\/code>/);
    // Writing an assessment run's report refreshes it too, now linking that report.
    assessReport(join(a, "docs/ux-builder/assessments/R-20261026T120000Z"));
    const again = readFileSync(file, "utf8");
    assert.match(again, /<a href="assessments\/R-20261026T120000Z\/report\.html">open<\/a>/);
    // An app on the old layout keeps the page at its top.
    const old = join(tmp, "old");
    mkdirSync(join(old, "audit-report"), { recursive: true });
    writeFileSync(join(old, "package.json"), "{}");
    writeFileSync(join(old, "app.blueprint.json"), "{}");
    writeReports(AUDIT, join(old, "audit-report"));
    assert.ok(existsSync(join(old, "reports.html")));
    assert.match(readFileSync(join(old, "reports.html"), "utf8"), /No usability assessment yet/);
  });

  // @covers US-158-AC1
  test("AC1: the UI audit records the @ux-builder versions that wrote it", async () => {
    const apps = await modalityApps();
    try {
      const r = await audit({ urls: [apps.url("/web.html")], themes: ["praxis-carbon"], appearances: ["light"], contrast: false, cwd: fileURLToPath(new URL("..", import.meta.url)) });
      assert.equal(r.versions["@ux-builder/audit"], VERSION);
      assert.match(r.versions["@ux-builder/ui"], /^\d+\.\d+\.\d+/);
      assert.match(r.versions["@ux-builder/tokens"], /^\d+\.\d+\.\d+/);
    } finally { apps.close(); }
  });

  // @covers US-158-AC2
  test("AC2: `ux-builder-audit reports` (re)writes the page and prints its path", () => {
    const a = app("command");
    const r = cli(a, "reports");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), join(a, "docs/ux-builder/reports.html"));
    assert.match(readFileSync(r.stdout.trim(), "utf8"), /No UI audit yet/);
    const other = cli(tmp, "reports", a);
    assert.equal(other.stdout.trim(), join(a, "docs/ux-builder/reports.html"), "the app can be named");
    assert.match(cli(tmp, "--help").stdout, /ux-builder-audit reports \[--open\]/);
    assert.match(cli(tmp, "reports", "--help").stdout, /--open opens it/);
  });

  // @covers US-158-AC3
  test("AC3: `ux-builder-audit doctor` lists the installed @ux-builder versions and flags those whose ranges are not met", () => {
    for (const [v, r, ok] of [["0.12.1", "^0.12.1", true], ["0.13.0", "^0.12.1", false], ["1.7.0", "^1.6.0", true], ["2.0.0", "^1.6.0", false], ["0.5.2", "~0.5.0", true], ["0.6.0", "~0.5.0", false], ["1.2.3", ">=1.2.0 <2", true], ["1.2.3", "1.x", true], ["1.0.0-rc.1", "^1.0.0", false], ["0.0.3", "^0.0.3", true], ["0.0.4", "^0.0.3", false], ["3.0.0", "^1 || ^3", true], ["1.0.0", "*", true], ["1.0.0", "workspace:*", true]]) {
      assert.equal(satisfies(v, r), ok, `${v} ${r}`);
    }
    const a = join(tmp, "doctor");
    const pkg = (name, data) => json(join(a, "node_modules/@ux-builder", name, "package.json"), { name: `@ux-builder/${name}`, ...data });
    json(join(a, "package.json"), { name: "d", dependencies: { "@ux-builder/ui": "^0.11.0" }, devDependencies: { "@ux-builder/audit": "^0.5.2" } });
    pkg("ui", { version: "0.11.0", dependencies: { "@ux-builder/tokens": "^1.6.0" } });
    pkg("tokens", { version: "1.7.0" });
    pkg("audit", { version: "0.5.2", dependencies: { "@ux-builder/ui": "^0.12.1", "@ux-builder/tokens": "^1.6.0" } });
    let r = cli(a, "doctor");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /@ux-builder\/audit\s+0\.5\.2\s+\(package\.json: \^0\.5\.2\)/);
    assert.match(r.stdout, /@ux-builder\/tokens\s+1\.7\.0/);
    assert.match(r.stdout, /Incoherent: 1 range not met\./);
    assert.match(r.stdout, /@ux-builder\/audit 0\.5\.2 needs @ux-builder\/ui \^0\.12\.1, but 0\.11\.0 is installed/);
    const j = JSON.parse(cli(a, "doctor", "--json").stdout);
    assert.deepEqual(j.packages.map((p) => [p.name, p.version]), [["@ux-builder/audit", "0.5.2"], ["@ux-builder/tokens", "1.7.0"], ["@ux-builder/ui", "0.11.0"]]);
    assert.deepEqual(j.problems.map((p) => [p.package, p.needs, p.range, p.installed, p.via]), [["@ux-builder/audit", "@ux-builder/ui", "^0.12.1", "0.11.0", "dependencies"]]);
    assert.equal(j.coherent, false);
    // Matching versions: coherent, exit 0.
    pkg("ui", { version: "0.12.1", dependencies: { "@ux-builder/tokens": "^1.6.0" } });
    json(join(a, "package.json"), { name: "d", dependencies: { "@ux-builder/ui": "^0.12.1" }, devDependencies: { "@ux-builder/audit": "^0.5.2" } });
    r = cli(a, "doctor");
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /Coherent: every @ux-builder package's ranges are met\./);
    assert.equal(doctor(a).coherent, true);
    // A package the app names but has not installed is flagged.
    json(join(a, "package.json"), { name: "d", dependencies: { "@ux-builder/design": "^0.4.0" } });
    assert.match(cli(a, "doctor").stdout, /The app's package\.json needs @ux-builder\/design \^0\.4\.0, and it is not installed/);
    assert.match(cli(tmp, "doctor", "--help").stdout, /Exit 1 when they are not/);
  });
});
