/* From an insight to an experiment, through its checkpoints (US-145;
   FEAT-018 GDL-66 to GDL-69; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { decisionAdd, readState } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { kitApp } from "./kit-fixture.mjs";

const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const at = (s) => `2026-10-20T10:00:${String(s).padStart(2, "0")}Z`;
/* An app with insights (half of J-find abandoned at the map), a list-first alternative and a decision. */
function expApp() {
  const a = kitApp();
  const events = ["a", "b", "c", "d"].flatMap((s, i) => [
    { type: "journey-start", journey: "J-find", step: 1, screen: "map", at: at(0), session: s },
    { type: "step", journey: "J-find", step: 1, screen: "map", at: at(0), session: s },
    i < 2 ? { type: "abandon", journey: "J-find", step: 1, screen: "map", at: at(9), session: s } : { type: "complete", journey: "J-find", step: 1, screen: "map", at: at(9), session: s },
  ]);
  writeFileSync(join(a, "events.jsonl"), events.map((e) => JSON.stringify(e)).join("\n"));
  json(a, ["insights", "events.jsonl", "--date", "2026-10-23"]);
  const bp = JSON.parse(readFileSync(join(a, "app.blueprint.json"), "utf8"));
  writeFileSync(join(a, "app.blueprint.list-first.json"), JSON.stringify({ ...bp, destinations: [{ id: "find", label: "Find", screen: "saved" }, ...bp.destinations.slice(1)] }));
  decisionAdd(a, { question: "Show the map first?", options: ["Map first", "List first"], choice: "Map first", why: "Fewer steps" });
  return a;
}
const DIAG = ["diagnose", "--insight", "INS-2026-10-23", "--observation", "Half of J-find is abandoned on the map", "--explanation", "The map loads slowly on phones", "--explanation", "People expect a list of nearby rivers", "--hypothesis", "If the list comes first, then more people find a river, because they scan names faster than a map", "--alternative", "list-first"];
const start = (a, ...extra) => cli(a, ["experiment", "start", "--decision", "UXD-1", "--variant", "list-first", "--metric", "find-completion", "--guardrail", "time-to-river", "--duration", "14", ...extra]);

describe("US-145: run an experiment through its checkpoints", () => {
  // @covers US-145-AC1
  test("AC1: the diagnosis holds the observation, at least two explanations, the hypothesis and the alternative, linked to the insight", () => {
    const a = expApp();
    const r = json(a, DIAG);
    assert.equal(r.id, "D-1");
    assert.deepEqual(readState(a).diagnoses, [{ id: "D-1", insight: "INS-2026-10-23", observation: "Half of J-find is abandoned on the map", explanations: ["The map loads slowly on phones", "People expect a list of nearby rivers"], hypothesis: "If the list comes first, then more people find a river, because they scan names faster than a map", alternative: "list-first" }]);
    const ins = readFileSync(join(a, "docs/ux/insights/INS-2026-10-23.md"), "utf8");
    assert.match(ins, /## Diagnosis\n\n### D-1\n\n- \*\*Observation\*\*: Half of J-find is abandoned on the map\n- \*\*Explanation 1\*\*: The map loads slowly on phones\n- \*\*Explanation 2\*\*: People expect a list of nearby rivers\n- \*\*Hypothesis\*\*: If the list comes first/);
    // One explanation is not a diagnosis; an unknown alternative is refused.
    const one = cli(a, DIAG.filter((x, i) => !(DIAG[i - 1] === "--explanation" && x === "The map loads slowly on phones") && !(x === "--explanation" && DIAG[i + 1] === "The map loads slowly on phones")));
    assert.equal(one.status, 2);
    assert.match(one.stderr, /at least two --explanation/);
    assert.equal(cli(a, [...DIAG.slice(0, -1), "nope"]).status, 2);
    assert.equal(readState(a).diagnoses.length, 1);
  });

  // @covers US-145-AC2
  test("AC2: without an answered experiment checkpoint, experiment start refuses and names the checkpoint", () => {
    const a = expApp();
    json(a, DIAG);
    const r = start(a);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /checkpoint experiment has not been answered for this experiment/);
    assert.equal(existsSync(join(a, "docs/ux/experiments")), false);
    assert.deepEqual(readState(a).experiments, []);
    // A skipped checkpoint is not an answer.
    assert.equal(cli(a, ["state", "checkpoint", "experiment", "--skip", "--reason", "later"]).status, 0);
    assert.equal(start(a).status, 2);
  });

  // @covers US-145-AC3
  test("AC3: after the checkpoint, experiment start writes EXP-<n>.md with the variant, metric, guardrails and duration, running in the design state", () => {
    const a = expApp();
    json(a, DIAG);
    assert.equal(cli(a, ["state", "checkpoint", "experiment", "--answer", "Yes, two weeks on 10% of people"]).status, 0);
    const r = JSON.parse(start(a, "--json").stdout);
    assert.equal(r.path, "docs/ux/experiments/EXP-1.md");
    const t = readFileSync(join(a, r.path), "utf8");
    assert.match(t, /status: running/);
    assert.match(t, / {4}- kind: tests\n {6}to: UXD-1\n {4}- kind: informed_by\n {6}to: INS-2026-10-23/);
    assert.match(t, /## Hypothesis\n\nIf the list comes first, then more people find a river, because they scan names faster than a map \(tests UXD-1; from D-1 on INS-2026-10-23\)/);
    assert.match(t, /## Variant\n\nlist-first \(`app\.blueprint\.list-first\.json`\)/);
    assert.match(t, /- \*\*Success\*\*: find-completion\n- \*\*Guardrails\*\*: time-to-river/);
    assert.match(t, /## Duration\n\n14 days/);
    assert.deepEqual(readState(a).experiments, [{ id: "EXP-1", status: "running", decision: "UXD-1", variant: "list-first" }]);
    assert.equal(cli(a, ["validate"]).status, 0, cli(a, ["validate"]).stdout);
    // The next experiment needs its own answer.
    assert.equal(start(a).status, 2);
  });

  // @covers US-145-AC4
  test("AC4: experiment end compares task success and each guardrail, records the result against the hypothesis and asks release", () => {
    const a = expApp();
    json(a, DIAG);
    cli(a, ["state", "checkpoint", "experiment", "--answer", "Yes"]);
    start(a);
    writeFileSync(join(a, "result.json"), JSON.stringify({ metric: "find-completion", control: 0.5, variant: 0.68, guardrails: [{ metric: "time-to-river", control: 42, variant: 38, better: "lower" }] }));
    const r = json(a, ["experiment", "end", "EXP-1", "--result", "result.json"]);
    assert.equal(r.supported, true);
    assert.deepEqual(r.guardrails, [{ metric: "time-to-river", control: 42, variant: 38, better: "lower", held: true }]);
    assert.match(r.next, /^Ask checkpoint release: "Release list-first to everyone\?"/);
    const t = readFileSync(join(a, "docs/ux/experiments/EXP-1.md"), "utf8");
    assert.match(t, /status: ended/);
    assert.match(t, /## Result\n\n- \*\*find-completion\*\*: control 0\.5, variant 0\.68 \(improved\)\n- \*\*Guardrail time-to-river\*\*: control 42, variant 38 \(held\)\n- \*\*Hypothesis\*\*: supported/);
    const s = readState(a);
    assert.deepEqual(s.experiments[0], { id: "EXP-1", status: "ended", decision: "UXD-1", variant: "list-first", result: "supported" });
    assert.equal(s.next, r.next);
    // A guardrail that got worse: the hypothesis is not supported, whatever the success metric did.
    const b = expApp();
    json(b, DIAG); cli(b, ["state", "checkpoint", "experiment", "--answer", "Yes"]); start(b);
    writeFileSync(join(b, "result.json"), JSON.stringify({ control: 0.5, variant: 0.7, guardrails: [{ metric: "time-to-river", control: 42, variant: 60, better: "lower" }] }));
    const w = json(b, ["experiment", "end", "EXP-1", "--result", "result.json"]);
    assert.equal(w.hypothesis, "not supported: a guardrail got worse");
    assert.match(w.next, /Keep the current design, or try another alternative\?/);
    // A change within the guardrail's tolerance holds: the result's own, else HELIX's metric definition's.
    const c = expApp();
    json(c, DIAG); cli(c, ["state", "checkpoint", "experiment", "--answer", "Yes"]); start(c);
    writeFileSync(join(c, "result.json"), JSON.stringify({ control: 0.5, variant: 0.7, guardrails: [{ metric: "time-to-river", control: 40, variant: 43, better: "lower", tolerance: "10%" }] }));
    const tol = json(c, ["experiment", "end", "EXP-1", "--result", "result.json"]);
    assert.equal(tol.supported, true);
    assert.match(readFileSync(join(c, "docs/ux/experiments/EXP-1.md"), "utf8"), /- \*\*Guardrail time-to-river\*\*: control 40, variant 43 \(held, within the tolerance 10%\)/);
    const e = expApp();
    mkdirSync(join(e, "docs/helix/06-iterate/metrics"), { recursive: true });
    writeFileSync(join(e, "docs/helix/06-iterate/metrics/time-to-river.yaml"), "name: time-to-river\nunit: seconds\ndirection: lower\ntolerance: 2s\n");
    json(e, DIAG); cli(e, ["state", "checkpoint", "experiment", "--answer", "Yes"]); start(e);
    writeFileSync(join(e, "result.json"), JSON.stringify({ control: 0.5, variant: 0.7, guardrails: [{ metric: "time-to-river", control: 40, variant: 43, better: "lower" }] }));
    assert.equal(json(e, ["experiment", "end", "EXP-1", "--result", "result.json"]).supported, false);
    assert.match(readFileSync(join(e, "docs/ux/experiments/EXP-1.md"), "utf8"), /\(got worse by more than the tolerance 2s; lower is better\)/);
  });

  // @covers US-145-AC5
  test("AC5: metrics HELIX does not define are written only as proposed metric-definition patches", () => {
    const a = expApp();
    mkdirSync(join(a, "docs/helix/06-iterate/metrics"), { recursive: true });
    writeFileSync(join(a, "docs/helix/06-iterate/metrics/time-to-river.yaml"), "name: time-to-river\nunit: seconds\ndirection: lower\n");
    cli(a, ["state", "checkpoint", "experiment", "--answer", "Yes"]);
    const r = JSON.parse(start(a, "--json").stdout);
    assert.deepEqual(r.proposed, ["helix-proposals/metrics/find-completion.patch"]);
    const patch = readFileSync(join(a, r.proposed[0]), "utf8");
    assert.match(patch, /^--- \/dev\/null\n\+\+\+ b\/docs\/helix\/06-iterate\/metrics\/find-completion\.yaml/);
    assert.match(patch, /^\+name: find-completion$/m);
    assert.match(patch, /^\+last_verified: null$/m);
    assert.deepEqual(readdirSync(join(a, "docs/helix/06-iterate/metrics")), ["time-to-river.yaml"], "HELIX is not written");
  });
});
