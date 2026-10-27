/* The UX quality rubric, predicted side (US-134; FEAT-018 GDL-37 to
   GDL-39; CONTRACT-008 Rubric).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { cli, tempApp } from "./helpers.mjs";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const st = ["empty", "loading", "error"];
const BP = {
  version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] },
  destinations: [{ id: "find", label: "Find", screen: "map" }],
  screens: [{ id: "map", title: "Map", pattern: "CollectionList", states: st, purpose: "Find a river", content: [{ label: "Rivers" }, { label: "Filters" }], actions: [{ id: "open", label: "Open", to: "detail", primary: true }] }, { id: "detail", title: "River", pattern: "RecordDetail", states: ["empty", "loading"], purpose: "Judge a river", content: [{ label: "Access" }] }],
  tasks: [{ id: "T-1", goal: "Find a river", success: ["US-001-AC1"], exceptions: ["No river nearby"] }],
  journeys: [{ id: "J-find", story: "US-001", task: "T-1", entry: "map", steps: [{ screen: "map", action: "open", decision: "Which river" }, { screen: "detail" }] }],
};
function app({ bp = BP, audit = { error: 0, warning: 1 }, judgments } = {}) {
  const a = tempApp({ state: judgments ? { alternatives: [{ name: "map-first", file: "docs/ux-builder/blueprint/app.blueprint.map-first.json", status: "candidate", judgments }] } : {} });
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(bp));
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.map-first.json"), JSON.stringify(bp));
  if (audit) { mkdirSync(join(a, "docs/ux-builder/audit-report"), { recursive: true }); writeFileSync(join(a, "docs/ux-builder/audit-report/report.json"), JSON.stringify({ summary: { ...audit, info: 0 } })); }
  return a;
}
const rubric = (a, ...args) => { const r = cli(a, ["rubric", ...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const dim = (r, id) => r.dimensions.find((d) => d.id === id);

describe("US-134: the rubric's predicted side", () => {
  // @covers US-134-AC1
  test("AC1: rubric.json holds exactly the nine dimensions, each with an ID, a question, measures and a cited source; task-effectiveness and accessibility are baselines", () => {
    const data = JSON.parse(readFileSync(`${ROOT}guidelines/rubric.json`, "utf8"));
    const v = new Ajv2020({ strict: true, allErrors: true }).compile(JSON.parse(readFileSync(`${ROOT}guidelines/schema/rubric.schema.json`, "utf8")));
    assert.ok(v(data), JSON.stringify(v.errors));
    assert.deepEqual(data.dimensions.map((d) => d.id), ["task-effectiveness", "task-efficiency", "cognitive-load", "discoverability", "learnability", "consistency", "accessibility", "error-recovery", "user-confidence"]);
    for (const d of data.dimensions) { assert.ok(d.question.endsWith("?")); assert.ok(d.measures.length); assert.ok(d.sources.length); }
    assert.deepEqual(data.dimensions.filter((d) => d.baseline).map((d) => d.id), ["task-effectiveness", "accessibility"]);
  });

  // @covers US-134-AC2
  test("AC2: each dimension shows a predicted value and its basis: computed with its measures, or a judgment with its reasoning", () => {
    const r = rubric(app({ judgments: [{ criterion: "Learnability", value: "high", reasoning: "One screen leads to the river." }] }), "--alternative", "map-first");
    assert.equal(r.alternative, "map-first");
    assert.deepEqual(dim(r, "task-efficiency").predicted, { value: "2 steps against a shortest 1; 0 required inputs", basis: "computed", measures: { steps: 2, shortestPath: 1, requiredInputs: 0 } });
    assert.deepEqual(dim(r, "cognitive-load").predicted.measures, { decisions: 1, steps: 2, contentPerScreen: 1.5, requiredInputs: 0 });
    assert.deepEqual(dim(r, "accessibility").predicted, { value: "0 audit errors", basis: "computed", measures: { auditErrors: 0, auditWarnings: 1 } });
    assert.match(dim(r, "error-recovery").predicted.value, /^1 of 2 screens declare an error state; 1 of 1 tasks name their exceptions$/);
    assert.deepEqual(dim(r, "learnability").predicted, { value: "high", basis: "judgment", reasoning: "One screen leads to the river." });
    for (const d of r.dimensions) assert.ok(["computed", "judgment", "to validate"].includes(d.predicted.basis), d.id);
  });

  // @covers US-134-AC3
  test("AC3: a dimension with no computed measure and no judgment shows to validate, never an estimate", () => {
    const r = rubric(app({ audit: null }));
    assert.deepEqual(dim(r, "user-confidence").predicted, { value: "to validate", basis: "to validate" });
    assert.deepEqual(dim(r, "learnability").predicted, { value: "to validate", basis: "to validate" });
    // With no audit report, accessibility is to validate too, and is not counted as a failure.
    assert.deepEqual(dim(r, "accessibility").predicted, { value: "to validate", basis: "to validate" });
    assert.equal(r.recommendable, true);
    // But an unchecked baseline is not a passed one, and the text says so.
    assert.deepEqual(r.unchecked, ["accessibility"]);
    assert.match(cli(app({ audit: null }), ["rubric"]).stdout, /Recommendable: no baseline fails\. Accessibility is not checked yet \(run the audit: npm run audit\)\./);
  });

  // @covers US-134-AC4
  test("AC4: the output has no overall or average score", () => {
    const r = rubric(app());
    const text = JSON.stringify(r);
    for (const k of ["overall", "average", "total", "\"score\""]) assert.ok(!text.toLowerCase().includes(k), k);
    assert.equal(r.dimensions.length, 9);
    assert.match(cli(app(), ["rubric"]).stdout, /No overall score is given\./);
  });

  // @covers US-134-AC5
  test("AC5: an alternative failing a baseline is not recommendable, naming the baseline, whatever else it scores", () => {
    let r = rubric(app({ audit: { error: 3, warning: 0 } }));
    assert.equal(r.recommendable, false);
    assert.equal(r.notRecommendable, "fails the baseline accessibility");
    const broken = structuredClone(BP);
    broken.journeys[0].steps[0].action = "nowhere";
    r = rubric(app({ bp: broken, audit: { error: 1, warning: 0 } }));
    assert.equal(r.notRecommendable, "fails the baselines task-effectiveness and accessibility");
    assert.match(cli(app({ audit: { error: 3, warning: 0 } }), ["rubric"]).stdout, /Not recommendable: fails the baseline accessibility\./);
  });
});
