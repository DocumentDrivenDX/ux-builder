/* The UX evaluation report, predicted against observed, and routing its
   findings (US-142; FEAT-018 GDL-59 to GDL-61; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { decisionAdd, findingIdFor, readState, testKit, validate } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { kitApp, SHEET } from "./kit-fixture.mjs";

const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const set = (a, path, value) => assert.equal(cli(a, ["state", "set", path, JSON.stringify(value)]).status, 0);

/* A chosen alternative, assumptions behind two predictions, a kit, an assessment run, and (unless observed is false) five sessions. */
function evalApp({ observed = true } = {}) {
  const a = kitApp();
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.map-first.json"), readFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json")));
  set(a, "alternatives[+]", { name: "map-first", file: "docs/ux-builder/blueprint/app.blueprint.map-first.json", status: "chosen", reason: "fewest steps", date: "2026-10-01" });
  set(a, "assumptions[+]", { text: "Anglers find a river from the map alone", status: "hypothesis", evidence: [], dimension: "task-effectiveness" });
  set(a, "assumptions[+]", { text: "People need no help to find Saved", status: "assumed", evidence: [], dimension: "discoverability" });
  set(a, "assumptions[+]", { text: "Location is available", status: "assumed", evidence: [] });
  testKit(a);
  const run = join(a, "docs/ux-builder/assessments/R-20261021T090000Z");
  mkdirSync(run, { recursive: true });
  writeFileSync(join(run, "metrics.json"), JSON.stringify({ schema: "metrics", version: 1, label: "agent-measured", note: "…", journeys: [
    { journey: "J-find", label: "agent-measured", completed: true, interactions: 4, moves: 3, shortestPath: 1, extraInteractions: 2, pathTaken: ["map", "detail", "map", "detail"], backtracks: 1, failedActions: 0, informationNotFound: [{ n: 2, what: "access" }], interfaceErrors: [], timePerStep: [] },
  ] }));
  writeFileSync(join(run, "coverage.json"), JSON.stringify({ schema: "coverage", version: 1, entries: [{ journey: "J-find", state: "S-find-empty", status: "assessed" }] }));
  if (observed) { writeFileSync(join(a, "sheet.csv"), SHEET); json(a, ["observe", "import", "sheet.csv", "--kit", "TK-1"]); }
  return a;
}
const section = (text, h) => text.slice(text.indexOf(`## ${h}\n`), text.indexOf("\n## ", text.indexOf(`## ${h}\n`) + 1));

describe("US-142: read the UX evaluation report with predicted and observed results", () => {
  // @covers US-142-AC1
  test("AC1: report writes UER-<n>.md with method, tasks, findings by journey, corrections, the rubric's predicted and observed columns, and what was not tested", () => {
    const a = evalApp();
    // P2's session transcript, from the kit: its quotes are evidence beside P2's findings.
    writeFileSync(join(a, "p2.txt"), "[00:01:00] P2: Which of these is public?\n");
    json(a, ["transcript", "add", "p2.txt", "--session", "S-2", "--kit", "TK-1", "--consent-confirmed", "--cite", "00:01:00"]);
    const r = json(a, ["report"]);
    assert.equal(r.path, "docs/ux-builder/evaluations/UER-1.md");
    assert.equal(r.approach, "mixed");
    const t = readFileSync(join(a, r.path), "utf8");
    assert.match(t, /^---\nux:\n {2}id: UER-1\n {2}type: usability-evaluation-report\n {2}links:\n {4}- kind: informed_by\n {6}to: TK-1\n---/);
    assert.match(section(t, "Method"), /\*\*Approach\*\*: mixed\n- \*\*Sources\*\*: 5 test sessions \(TK-1\); assessment run R-20261021T090000Z; the rubric's predictions/);
    assert.match(section(t, "Tasks and journeys"), /\| TK-1 task 1 \| J-find \| US-001-AC1, US-001-AC2 \|/);
    assert.match(section(t, "Measures"), /\| TK-1 task 1 \(J-find\) \| 60% completed, median 180 s, 60% with errors, 4 assists \(5 sessions\) \|/);
    assert.match(section(t, "Measures"), /\| J-find \(agent-measured\) \| completed, 3 moves against a shortest 1, 1 backtracks \|/);
    assert.match(section(t, "Measures"), /- access points unclear \(3 sessions;/);
    assert.match(section(t, "Rubric"), /^\| Dimension \| Predicted \| Agent-measured \| Observed \|$/m);
    assert.match(section(t, "Rubric"), /\| Task efficiency \| .* \(computed\) \| 2 moves over the shortest paths; 1 backtracks \| median 95 s a task \|/);
    assert.match(section(t, "Findings by journey"), new RegExp(`### J-find\\n\\n- \\*\\*${findingIdFor("TK-1", "P2", 1)}\\*\\* \\(human observation\\) Severity 3: access points unclear \\(did not complete in 240 s, 2 errors, 1 assist; "Could not tell which access point was public"\\)\\. Evidence: TK-1 task 1, P2 \\(docs/ux-builder/tests/TK-1/findings\\.json\\); transcript EV-1\\.`));
    assert.match(section(t, "Recommendations"), /^1\. Correct: access points unclear \(F-[0-9a-f]{8}, human observation\)\. Route it at checkpoint core-3: `ux-builder-design route F-[0-9a-f]{8}`\./m);
    assert.match(section(t, "Not tested"), /- Consistency: no human observation/);
    assert.match(section(t, "State coverage"), /\| J-find \| assessed \| not tested \| not tested \|/);
    // A second evaluation gets the next number and follows the first.
    const r2 = json(a, ["report"]);
    assert.equal(r2.path, "docs/ux-builder/evaluations/UER-2.md");
    assert.match(readFileSync(join(a, r2.path), "utf8"), / {4}- kind: follows\n {6}to: UER-1\n/);
  });

  // @covers US-142-AC2
  test("AC2: a contradicted prediction is highlighted, and the assumptions behind it become refuted", () => {
    const a = evalApp();
    const r = json(a, ["report"]);
    assert.deepEqual(r.contradicted, ["task-effectiveness", "error-recovery"]);
    const t = readFileSync(join(a, r.path), "utf8");
    assert.match(section(t, "Rubric"), /^\| \*\*Task effectiveness\*\* \(baseline\) \| .* \| 67% of 9 attempts completed \(5 sessions\) — \*\*contradicts the prediction\*\* \|$/m);
    assert.match(section(t, "Executive summary"), /\*\*Contradicted predictions\*\*: task-effectiveness, error-recovery/);
    const s = readState(a).assumptions;
    // A supported prediction confirms its assumption; one with no dimension is left alone.
    assert.deepEqual(s.map((x) => [x.id, x.status]), [["A-1", "refuted"], ["A-2", "confirmed"], ["A-3", "assumed"]]);
    assert.deepEqual(s[0].evidence, ["UER-1", "TK-1"]);
    assert.match(t, /- A-1 \(task-effectiveness\): hypothesis → refuted/);
    // A baseline people contradicted is not met, whatever was predicted.
    const rub = json(a, ["rubric"]);
    assert.equal(rub.recommendable, false);
    assert.equal(rub.notRecommendable, "people contradicted the baseline task-effectiveness");
    assert.match(t, /Not recommendable: people contradicted the baseline task-effectiveness\./);
  });

  // @covers US-142-AC3
  test("AC3: with no human observations the observed column says so, and nothing is refuted or confirmed", () => {
    const a = evalApp({ observed: false });
    const before = readState(a).assumptions;
    const r = json(a, ["report"]);
    assert.equal(r.observed, false);
    assert.equal(r.approach, "automated-assessment");
    const rows = section(readFileSync(join(a, r.path), "utf8"), "Rubric").split("\n").filter((l) => /^\| (?!Dimension|---)/.test(l));
    assert.ok(rows.length >= 7);
    for (const row of rows) assert.match(row, /\| no human evidence yet \|$/);
    assert.deepEqual(readState(a).assumptions, before);
    assert.match(cli(a, ["report"]).stdout, /No human evidence yet: the observed column says so\./);
  });

  // @covers US-142-AC4
  test("AC4: findings chosen at core-3 are routed as a proposed patch to HELIX's improvement backlog, and the decision moves to tested or refuted", () => {
    const a = evalApp();
    json(a, ["report"]);
    const d = decisionAdd(a, { question: "Show the map first?", options: ["Map first", "List first"], choice: "Map first", why: "Fewer steps" });
    const f1 = findingIdFor("TK-1", "P2", 1), f2 = findingIdFor("TK-1", "P5", 2);
    let r = json(a, ["route", f1, f2, "--decision", d.id, "--status", "refuted"]);
    assert.equal(r.patch, "docs/ux-builder/helix-proposals/backlog/improvement-backlog.patch");
    assert.deepEqual(r.target, { path: "docs/helix/06-iterate/improvement-backlog.md", kind: "new" });
    const patch = readFileSync(join(a, r.patch), "utf8");
    assert.match(patch, /^--- \/dev\/null\n\+\+\+ b\/docs\/helix\/06-iterate\/improvement-backlog\.md/);
    assert.match(patch, new RegExp(`^\\+\\| 1 \\| P1 \\| access points unclear \\| .* \\| ${f1} in UER-1 \\| J-find; human observation \\| high \\| unknown \\| open \\|$`, "m"));
    assert.match(patch, new RegExp(`^\\+\\| 2 \\| P1 \\| saved list hidden \\|.*${f2} in UER-1`, "m"));
    assert.equal(r.decision.status, "refuted");
    assert.equal(r.decision.evidence, "UER-1");
    assert.match(readFileSync(join(a, "docs/ux-builder/decisions/UXD-1.md"), "utf8"), /status: refuted/);
    assert.ok(!existsSync(join(a, "docs/helix/06-iterate/improvement-backlog.md")), "HELIX is changed only by applying the patch");
    // With an existing backlog, the rows go after its last row; a finding already listed is left out.
    mkdirSync(join(a, "docs/helix/06-iterate"), { recursive: true });
    writeFileSync(join(a, "docs/helix/06-iterate/improvement-backlog.md"), `---\nddx:\n  id: improvement-backlog\n  type: improvement-backlog\n---\n\n# Improvement Backlog\n\n## Backlog Items\n\n| Rank | Priority | Item | Evidence | Tracker or Follow-Up Target | Why Now | Confidence | Effort | Status |\n|------|----------|------|----------|-----------------------------|---------|------------|--------|--------|\n| 1 | P2 | Older item | x | ${f2} | y | low | S | open |\n`);
    r = json(a, ["route", f1, f2]);
    assert.equal(r.target.kind, "existing");
    const p2 = readFileSync(join(a, r.patch), "utf8");
    assert.match(p2, new RegExp(`^\\+\\| 2 \\| P1 \\| access points unclear .*${f1}`, "m"));
    assert.doesNotMatch(p2, /^\+.*saved list hidden/m);
    assert.equal(cli(a, ["route", "F-nope"]).status, 2);
  });

  // @covers US-142-AC5
  test("AC5: validate checks a written report against the template's sections and its frontmatter links", () => {
    const a = evalApp();
    const r = json(a, ["report"]);
    assert.deepEqual(validate(a).problems.filter((p) => p.path === r.path), []);
    const file = join(a, r.path);
    const text = readFileSync(file, "utf8");
    writeFileSync(file, text.replace(/## Not tested[\s\S]*$/, "").replace("to: TK-1", "to: TK-9"));
    const v = cli(a, ["validate"]);
    assert.equal(v.status, 1);
    assert.match(v.stdout, /docs\/ux-builder\/evaluations\/UER-1\.md: missing the section "## Not tested"/);
    assert.match(v.stdout, /docs\/ux-builder\/evaluations\/UER-1\.md: link to TK-9 \(informed_by\) does not resolve/);
  });
});
