/* ux-builder-learn: the learning report, beads and evaluation tasks
   (FEAT-016 TRC-08 to TRC-11; US-110, US-111).

     npm test

   The fixture store (fixtures/learn-store/) is two hand-written CONTRACT-007
   bundles, seeded with exactly one case of each TRC-09 signal:
   - acme E-20261001-matters-list: nav.compact-destinations fetched in
     guidance, then found by the first blueprint check (rule-broken);
   - acme E-20261005-matter-form: lint failed once, then passed (attempts);
     it resolved assessment finding F-1 (modal.dismiss);
   - acme E-20261010-matters-nav: get_pattern PrimaryNav asked three times
     (repeated guidance), a workaround decision around Sheet, and F-1
     regressed (reported by the audit too, so not assessment-not-audit);
   - globex E-20261003-pipeline-dashboard: lint found two hand-drawn SVGs
     (hand-built UI, Icon exists), and the assessment found text.line-length
     where the audit found nothing (assessment-not-audit);
   - globex E-20261012-quick-edit: abandoned, no signal.
   The tests pack one bundle as a .tgz and copy the other as a folder into a
   temporary store outside the repository. */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { analyse, beads, compareReplay, evals, grade, insideRepo, loadCatalogue, loadStore } from "../learn.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const FIX = join(ROOT, "tools/__tests__/fixtures/learn-store");
const LEARN = join(ROOT, "tools/learn.mjs");
const run = (...args) => spawnSync(process.execPath, [LEARN, ...args], { encoding: "utf8" });
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/* Client content that must never leave the store: app names, goal and why text, the transcript, screens. */
const FORBIDDEN = ["acme-client-portal", "globex-crm", "9b1d4c0e7a55f2e1", "5e77a0c3d2b91f48", "Jane Roe", "private notes", "litigation", "opposing counsel",
  "Globex sales", "TRANSCRIPT-ONLY", "Initech", "audit-report/index.html", "transcripts/", "matter-edit", "\"matters\""];

let tmp, store;
before(() => {
  tmp = mkdtempSync(join(tmpdir(), "learn-"));
  store = join(tmp, "store");
  mkdirSync(store);
  const t = spawnSync("tar", ["-czf", join(store, "acme.tgz"), "-C", join(FIX, "acme"), "."], { env: { ...process.env, COPYFILE_DISABLE: "1" } });
  assert.equal(t.status, 0, String(t.stderr));
  cpSync(join(FIX, "globex"), join(store, "clients", "globex"), { recursive: true });
});
after(() => rmSync(tmp, { recursive: true, force: true }));

const EXPECTED = [
  ["rule-broken-first-check", "nav.compact-destinations", "E-20261001-matters-list"],
  ["attempts-to-green", "lint", "E-20261005-matter-form"],
  ["workaround", "Sheet", "E-20261010-matters-nav"],
  ["hand-built-ui", "ux-builder/no-inline-svg -> Icon", "E-20261003-pipeline-dashboard"],
  ["assessment-not-audit", "text.line-length", "E-20261003-pipeline-dashboard"],
  ["regressed", "modal.dismiss", "E-20261010-matters-nav"],
  ["repeated-guidance", "get_pattern(PrimaryNav)", "E-20261010-matters-nav"],
];

describe("US-110: learn from episodes across apps", () => {
  // @covers US-110-AC1
  test("the report lists each signal with counts, its episodes and apps, by modality and pattern", () => {
    const out = join(tmp, "out-ac1");
    const r = run("--store", store, "--out", out);
    assert.equal(r.status, 0, r.stderr);
    const rep = readJson(join(out, "learn.json"));
    assert.equal(rep.episodes, 5);
    assert.equal(rep.apps, 2);
    assert.deepEqual(rep.signals.map((s) => s.id), EXPECTED.map((e) => e[0]));
    const broken = rep.signals[0].groups[0];
    assert.equal(broken.key, "nav.compact-destinations");
    assert.equal(broken.count, 1);
    assert.equal(broken.fetchedIn, 1);
    assert.deepEqual(broken.byModality, { "responsive-web": 1 });
    assert.deepEqual(broken.byPattern, { AppShell: 1, ListDetail: 1, PrimaryNav: 1 });
    assert.match(broken.episodes[0].app, /^A-[0-9a-f]{10}$/);
    // A change episode takes its app's modality from the app's create episode.
    assert.deepEqual(rep.signals[1].groups[0].byModality, { "responsive-web": 1 });
    assert.deepEqual(rep.signals[1].groups[0].byPattern, { FormPage: 1 });
    assert.deepEqual(rep.signals[4].groups[0].byModality, { "hybrid-chat": 1 });
    // Attempts to green, for every check, per modality and pattern.
    const formLint = rep.attempts.find((a) => a.check === "lint" && a.pattern === "FormPage");
    assert.deepEqual([formLint.modality, formLint.episodes, formLint.mean, formLint.max], ["responsive-web", 1, 2, 2]);
    const md = readFileSync(join(out, "learn.md"), "utf8");
    for (const s of rep.signals) assert.ok(md.includes(s.title), s.title);
    assert.ok(md.includes("E-20261001-matters-list"));
    for (const f of FORBIDDEN) { assert.ok(!md.includes(f), `learn.md contains ${f}`); assert.ok(!JSON.stringify(rep).includes(f), `learn.json contains ${f}`); }
  });

  // @covers US-110-AC2
  test("a store seeded with one case of each signal finds each and no other", () => {
    const { episodes } = loadStore(store);
    const rep = analyse(episodes, loadCatalogue(), { episodes: 3, apps: 2 });
    const found = rep.signals.flatMap((s) => s.groups.flatMap((g) => g.episodes.map((e) => [s.id, g.key, e.episode])));
    assert.deepEqual(found, EXPECTED);
  });

  // @covers US-110-AC3
  test("--beads files one bead per signal over the threshold, with counts and a lesson and no client content", () => {
    // The fixture has one episode per signal: under the default threshold, no bead.
    const none = run("--store", store, "--out", join(tmp, "out-ac3a"), "--beads", "--dry-run");
    assert.equal(none.status, 0, none.stderr);
    assert.deepEqual(JSON.parse(none.stdout.slice(none.stdout.indexOf("{"), none.stdout.lastIndexOf("}") + 1)).beads, []);

    const r = run("--store", store, "--out", join(tmp, "out-ac3b"), "--beads", "--dry-run", "--threshold-episodes", "1", "--threshold-apps", "1");
    assert.equal(r.status, 0, r.stderr);
    const list = JSON.parse(r.stdout.slice(r.stdout.indexOf("{"), r.stdout.lastIndexOf("}") + 1)).beads;
    assert.equal(list.length, EXPECTED.length);
    for (const b of list) {
      assert.equal(b.type, "task");
      assert.equal(b.labels, "feat:FEAT-016,learned");
      assert.match(b.description, /Evidence: 1 episodes across 1 apps, \d+ occurrences/);
      assert.match(b.description, /Lesson: /);
      const text = JSON.stringify(b);
      for (const f of [...FORBIDDEN, "E-2026", tmp, "A-"]) assert.ok(!text.includes(f), `bead ${b.key} contains ${f}`);
    }

    // The default threshold: three episodes across two apps.
    const ep = (id, app) => ({ id, app, modality: "responsive-web", start: { at: id }, startedAt: id, guidance: [], decisions: [], outcome: null, end: null,
      checks: [{ seq: 1, kind: "check", check: "audit", attempt: 1, status: "fail", findings: [] }, { seq: 2, kind: "check", check: "audit", attempt: 2, status: "pass", findings: [] }] });
    const two = analyse([ep("E-1", "A-1"), ep("E-2", "A-1"), ep("E-3", "A-1")], loadCatalogue(), { episodes: 3, apps: 2 });
    assert.equal(beads(two).length, 0, "three episodes in one app are under the threshold");
    const three = analyse([ep("E-1", "A-1"), ep("E-2", "A-1"), ep("E-3", "A-2")], loadCatalogue(), { episodes: 3, apps: 2 });
    assert.deepEqual(beads(three).map((b) => b.key), ["attempts-to-green/audit"]);
  });

  // @covers US-110-AC4
  test("a store or output inside this repository is refused", () => {
    const r = run("--store", FIX, "--out", join(tmp, "out-ac4"));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /inside this repository/);
    const o = run("--store", store, "--out", join(ROOT, "learn-out-never"));
    assert.equal(o.status, 1);
    assert.ok(insideRepo(join(ROOT, "tools")));
    assert.ok(!insideRepo(store));
  });
});

describe("US-111: replay episodes as evaluation tasks", () => {
  // @covers US-111-AC1
  test("--evals turns each finished episode into a task with goal, starting commit, modality and outcome to beat", () => {
    const out = join(tmp, "out-evals");
    const r = run("--store", store, "--out", out, "--evals");
    assert.equal(r.status, 0, r.stderr);
    const index = readJson(join(out, "evals/index.json"));
    assert.deepEqual(index.tasks.map((t) => t.task).sort(), ["E-20261005-matter-form", "E-20261010-matters-nav"]);
    assert.deepEqual(index.skipped.map((s) => s.episode).sort(), ["E-20261001-matters-list", "E-20261003-pipeline-dashboard"]);
    assert.deepEqual(index.notFinished.map((s) => s.episode), ["E-20261012-quick-edit"]);
    assert.match(r.stdout, /2 skipped \(no starting commit\)/);
    const form = readJson(join(out, "evals/E-20261005-matter-form.json"));
    assert.equal(form.startCommit, "base0005");
    assert.equal(form.startCommitFrom, "change.parent");
    assert.equal(form.goal.text, "Edit form for a matter with opposing counsel");
    assert.equal(form.modality, "responsive-web");
    assert.deepEqual(form.outcome.checksToGreen, { lint: 2 });
    const nav = readJson(join(out, "evals/E-20261010-matters-nav.json"));
    assert.equal(nav.startCommit, "base0010");
    assert.equal(nav.startCommitFrom, "start.commit");
    assert.deepEqual(nav.outcome, { checksToGreen: { lint: 1, audit: 1 }, audit: { findings: { "modal.dismiss": 1 } }, assessment: { open: [{ id: "F-1", rule: "modal.dismiss" }] } });
    assert.deepEqual(readdirSync(join(out, "evals")).sort(), ["E-20261005-matter-form.json", "E-20261010-matters-nav.json", "index.json"]);
  });

  // @covers US-111-AC2
  test("replay-result writes the replay's outcome beside the original's", () => {
    const { episodes } = loadStore(store);
    const task = evals(episodes, loadCatalogue()).tasks.find((t) => t.task === "E-20261010-matters-nav");
    const dir = join(tmp, "replay");
    mkdirSync(dir);
    writeFileSync(join(dir, "task.json"), JSON.stringify(task));
    const result = { v: 1, task: task.task, sdk: { "@ux-builder/ui": "0.9.0" }, agent: { name: "claude-code", model: "m" },
      checksToGreen: { lint: 2, audit: 1 }, audit: { status: "pass", findings: {} }, assessment: { open: [] } };
    writeFileSync(join(dir, "result.json"), JSON.stringify(result));
    const r = run("replay-result", "--task", join(dir, "task.json"), "--result", join(dir, "result.json"));
    assert.equal(r.status, 0, r.stderr);
    const c = readJson(join(dir, "result.compare.json"));
    const row = (f) => c.rows.find((x) => x.field === f);
    assert.deepEqual(row("checksToGreen.lint"), { field: "checksToGreen.lint", original: 1, replay: 2, result: "worse" });
    assert.deepEqual(row("checksToGreen.audit"), { field: "checksToGreen.audit", original: 1, replay: 1, result: "same" });
    assert.deepEqual(row("audit.modal.dismiss"), { field: "audit.modal.dismiss", original: 1, replay: 0, result: "better" });
    assert.deepEqual(row("assessment.open"), { field: "assessment.open", original: 1, replay: 0, result: "better" });
    assert.equal(c.verdict, "worse");
    assert.deepEqual(c.sdk, { original: { "@ux-builder/ui": "0.8.0" }, replay: { "@ux-builder/ui": "0.9.0" } });
    assert.match(readFileSync(join(dir, "result.compare.md"), "utf8"), /\| checksToGreen.lint \| 1 \| 2 \| worse \|/);
    // Never green is the worst result.
    assert.equal(compareReplay(task, { ...result, checksToGreen: { lint: null, audit: 1 } }).rows[1].result, "worse");
  });

  // @covers US-111-AC3
  test("grade gives each replay its share on SDK widgets and role tokens and the matching patterns used", () => {
    const tasks = [{ task: "T-1", patterns: ["ListDetail", "FormPage"], outcome: {} }, { task: "T-2", patterns: ["Dashboard"], outcome: {} }];
    const results = [
      // 20 components; lint finds 1 foreign import and 1 hard-coded value, the audit 1 SDK-widget finding: 2 off the SDK (the larger), 90%.
      { task: "T-1", components: 20, patterns: ["ListDetail", "FormPage", "AppShell"], layoutCss: 0, audit: { status: "warn", findings: { "sdk-widgets": 1, contrast: 3 } },
        lint: { findings: [{ ruleId: "ux-builder/no-foreign-ui", count: 1 }, { ruleId: "ux-builder/no-hard-coded-values", count: 1 }, { ruleId: "ux-builder/ai-neutral-voice", count: 4 }] } },
      // 10 components, 3 inline SVGs: 70%; the pattern is missing and there is layout CSS.
      { task: "T-2", components: 10, patterns: ["Grid"], layoutCss: 2, audit: { status: "pass", findings: {} }, lint: { findings: [{ ruleId: "ux-builder/no-inline-svg", count: 3 }] } },
    ];
    const dir = join(tmp, "grade");
    mkdirSync(join(dir, "tasks"), { recursive: true });
    mkdirSync(join(dir, "results"), { recursive: true });
    tasks.forEach((t) => writeFileSync(join(dir, "tasks", `${t.task}.json`), JSON.stringify(t)));
    results.forEach((x) => writeFileSync(join(dir, "results", `${x.task}.json`), JSON.stringify(x)));
    const r = run("grade", "--tasks", join(dir, "tasks"), "--results", join(dir, "results"), "--out", join(dir, "graded"));
    assert.equal(r.status, 0, r.stderr);
    const g = readJson(join(dir, "graded/grade.json"));
    const [a, b] = g.rows;
    assert.deepEqual([a.sdkShare, a.offSdk, a.us014, a.patternMatch, a.us031], [0.9, { lint: 2, audit: 1, counted: 2 }, true, 1, true]);
    assert.deepEqual([b.sdkShare, b.us014, b.patternMatch, b.layoutCss, b.us031], [0.7, false, 0, 2, false]);
    assert.equal(g.summary.meanSdkShare, 0.8);
    assert.deepEqual([g.summary.us014.compliant, g.summary.us031.compliant, g.summary.us031.passes], [1, 1, null]);
    assert.match(readFileSync(join(dir, "graded/grade.md"), "utf8"), /\| T-1 \| 20 \| 2 \| 90% \| 2\/2 \| 0 \| pass \| yes \| yes \|/);
    // Missing counts are unknown, not passing.
    assert.equal(grade(tasks, [{ task: "T-1", patterns: ["ListDetail", "FormPage"] }]).rows[0].us031, null);
  });
});
