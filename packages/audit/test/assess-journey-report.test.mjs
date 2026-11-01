/* The assessment's report by journey, as a HELIX artifact (FEAT-015
   RPT-05, RPT-08; US-102; CONTRACT-006 "Journey-first report, HELIX
   artifact and pace"): journey → state → step → finding, each finding with
   its rule (or heuristic), evidence, severity 0 to 4 and fix.

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { byJourney, load } from "../assess/report.mjs";
import { ruleOf, severityOf } from "../assess/rules.mjs";
import { prepared } from "./fixtures/run-package.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const RULES = JSON.parse(readFileSync(join(PKG, "../ui/catalogue.json"), "utf8")).interaction.rules;
const DISMISS = RULES.find((r) => r.id === "modal.dismiss");
const made = [];
after(() => { for (const p of made) p.remove(); });

/* A walked run: J-review in success (two steps, the first with two
   findings, one of them a heuristic) and empty (one finding at no step). */
function walked(files = {}) {
  const p = prepared({ files });
  made.push(p);
  p.checkpointAt("C-review-1");
  p.checkpointAt("C-review-2");
  const obs = { text: "seen", basis: ["screenshot"], visual: true };
  p.write("walkthrough.json", { schema: "walkthrough", version: 1, journeys: [{ id: "J-review", status: "completed", steps: [
    { n: 1, action: "Open the queue", status: "done", url: "/queue", checkpoint: "C-review-1", observation: obs },
    { n: 2, action: "Open entry 1", status: "done", url: "/entry/1", checkpoint: "C-review-2", observation: obs },
  ] }] });
  const cov = p.read("coverage.json");
  for (const e of cov.entries) if (e.journey === "J-review" && ["success", "empty"].includes(e.state)) Object.assign(e, { status: "assessed", outcome: "issue", evidence: ["checkpoints/C-review-1/screenshot.png"] });
  p.write("coverage.json", cov);
  const f = {
    dialog: p.finding({ title: "The reject dialog cannot be closed", key: "dismiss", rule: "modal.dismiss", heuristic: undefined, priority: "P1", recommendation: "Use the SDK's Dialog, which closes on Escape and has a Cancel button." }),
    status: p.finding({ title: "Approving gives no confirmation", key: "status", priority: "P2" }),
    empty: p.finding({ title: "The empty queue says nothing", key: "empty", state_id: "S-review-empty", priority: "P3", severity: 0, evidence_refs: [], uncertainty: "seen once" }),
  };
  p.write("backlog.json", { schema: "backlog", version: 1, findings: Object.values(f), user_validation: [] });
  return { p, f };
}

const block = (md, id) => md.slice(md.indexOf(`(${id})\n`), md.indexOf("\n###", md.indexOf(`(${id})\n`)));

describe("US-102: read the assessment report by journey", () => {
  // @covers US-102-AC1
  test("AC1: the report lists each journey, the states it was walked in, its steps, and under each step its findings", () => {
    const { p, f } = walked();
    assert.equal(p.cli("report", p.dir).status, 0);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    const at = (s) => { const i = md.indexOf(s); assert.ok(i >= 0, `report.md has ${s}`); return i; };
    const order = [at("## Findings by journey"), at("### J-review — Review a queue (US-001)"), at("States walked: success (assessed: issue), empty (assessed: issue)"), at("#### State: success"), at("##### Step 1: Open the queue — /queue"), at(`(${f.dialog.id})`), at("##### Step 2: Open entry 1 — /entry/1"), at("#### State: empty"), at("##### General"), at(`(${f.empty.id})`), at("### J-undo")];
    assert.deepEqual([...order].sort((a, b) => a - b), order, "journey → state → step → finding");
    // Both findings citing C-review-1 are at step 1; step 2 has none.
    const step1 = md.slice(at("##### Step 1"), at("##### Step 2"));
    assert.ok(step1.includes(`(${f.dialog.id})`) && step1.includes(`(${f.status.id})`));
    assert.match(md.slice(at("##### Step 2"), at("#### State: empty")), /No findings at this step\./);
    assert.ok(md.indexOf(`(${f.dialog.id})`) < md.indexOf(`(${f.status.id})`), "severer first");
    // As data: the same order.
    const [j] = byJourney(load(p.dir));
    assert.deepEqual(j.states.map((s) => [s.state, s.steps.map((x) => [x.step.n, x.findings.map((y) => y.id)]), s.general.map((y) => y.id)]), [["success", [[1, [f.dialog.id, f.status.id]], [2, []]], []], ["empty", [], [f.empty.id]]]);
    const html = readFileSync(join(p.dir, "report.html"), "utf8");
    assert.match(html, new RegExp(`<h6 id="${f.dialog.id}">`), "each finding is an anchor");
    assert.ok(html.indexOf("State: success") < html.indexOf("Step 1: Open the queue"));
  });

  // @covers US-102-AC2
  test("AC2: each finding states its rule ID and full statement (or heuristic and source), the evidence, severity 0 to 4 and the fix", () => {
    const { p, f } = walked();
    p.cli("report", p.dir);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    const d = block(md, f.dialog.id);
    assert.ok(d.includes(`- **Rule** \`modal.dismiss\`: ${DISMISS.statement}`), d);
    for (const s of DISMISS.sources) assert.ok(d.includes(`[${s.title}](${s.url})`), s.title);
    assert.match(d, /severity 3 \(major\)/);
    assert.match(d, /- \*\*Fix\*\*: Use the SDK's Dialog/);
    assert.match(d, /- \*\*Evidence\*\*: `checkpoints\/C-review-1\/screenshot\.png`/);
    const h = block(md, f.status.id);
    assert.match(h, /- \*\*Heuristic\*\*: Visibility of system status — source: Nielsen Norman Group: 10 Usability Heuristics/);
    assert.match(h, /severity 2 \(minor\)/);
    assert.match(block(md, f.empty.id), /severity 0 \(not a usability problem\)[\s\S]*- \*\*Evidence\*\*: none — seen once/);
    assert.match(readFileSync(join(p.dir, "report.html"), "utf8"), /<img src="checkpoints\/C-review-1\/screenshot\.png"/, "the screenshot is shown");
    // Nielsen's scale from the priority: P0 4, P1 3, P2 2, P3 1; the finding's own when it gives one.
    assert.deepEqual(["P0", "P1", "P2", "P3"].map((priority) => severityOf({ priority })), [4, 3, 2, 1]);
    assert.equal(severityOf({ priority: "P1", severity: 0 }), 0);
    assert.deepEqual(ruleOf({ rule: "modal.dismiss" }, new Map(RULES.map((r) => [r.id, r]))).statement, DISMISS.statement);
    assert.deepEqual(ruleOf({ rule: "consistency-and-standards" }), { kind: "heuristic", name: "consistency-and-standards", source: null }, "an ID not in the catalogue is a heuristic's name");
  });

  // @covers US-102-AC3
  test("AC3: report.md is a ux-builder usability assessment report with ux-builder: frontmatter naming its journeys and stories, run output rather than a HELIX document", () => {
    const { p } = walked();
    p.cli("report", p.dir);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    assert.match(md, /^---\nux-builder:\n  id: R-20261021T090000Z\n  type: usability-assessment-report\n  status: draft\n  stories:\n    - US-001\n    - US-002\n  journeys:\n    - J-review\n    - J-undo\n---\n/);
    assert.doesNotMatch(md, /^ddx:|usability-evaluation-report/m, "it claims no HELIX type");
    assert.match(md, /Kept as: a ux-builder usability assessment report, run output listed on reports\.html rather than a HELIX document/);
    assert.doesNotMatch(readFileSync(join(p.dir, "report.html"), "utf8"), /<p>---<\/p>|<p>ux-builder:<\/p>|  type: usability/, "the frontmatter is not shown in the HTML");
  });

  // @covers US-102-AC4
  test("AC4: validate-report fails a finding that names neither a rule nor a heuristic", () => {
    const { p, f } = walked();
    assert.equal(p.cli("validate-report", p.dir).status, 0, p.cli("validate-report", p.dir).stdout);
    const bare = { ...f.status, heuristic: undefined };
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [f.dialog, bare], user_validation: [] });
    const r = p.cli("validate-report", p.dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, new RegExp(`backlog.json /findings/1  ${f.status.id} names neither a rule nor a heuristic`));
    assert.doesNotMatch(r.stdout, new RegExp(`${f.dialog.id} names neither`));
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [f.dialog, { ...bare, heuristic: { name: "Error prevention" } }], user_validation: [] });
    assert.match(p.cli("validate-report", p.dir).stdout, /\/findings\/1\/heuristic  needs "source"/, "a heuristic names its source");
  });
});
