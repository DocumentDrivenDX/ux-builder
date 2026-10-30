/* From an insight to an experiment, through its checkpoints (US-145;
   FEAT-018 GDL-66 to GDL-69; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentText, decisionAdd, readState, uiDecisions } from "../index.mjs";
import { approveAll, cli, fakeDdx } from "./helpers.mjs";
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
  const bp = JSON.parse(readFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8"));
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.list-first.json"), JSON.stringify({ ...bp, destinations: [{ id: "find", label: "Find", screen: "saved" }, ...bp.destinations.slice(1)] }));
  decisionAdd(a, { question: "Show the map first?", options: ["Map first", "List first"], choice: "Map first", why: "Fewer steps" });
  return a;
}
const DIAG = ["diagnose", "--insight", "2026-10-23", "--observation", "Half of J-find is abandoned on the map", "--explanation", "The map loads slowly on phones", "--explanation", "People expect a list of nearby rivers", "--hypothesis", "If the list comes first, then more people find a river, because they scan names faster than a map", "--alternative", "list-first"];
const start = (a, ...extra) => cli(a, ["experiment", "start", "--decision", "ADR-001", "--variant", "list-first", "--metric", "find-completion", "--guardrail", "time-to-river", "--duration", "14", ...extra]);

describe("US-145: run an experiment through its checkpoints", () => {
  // @covers US-145-AC1
  test("AC1: the diagnosis holds the observation, at least two explanations, the hypothesis and the alternative, linked to the insight", () => {
    const a = expApp();
    const r = json(a, DIAG);
    assert.equal(r.id, "D-1");
    assert.deepEqual(readState(a).diagnoses, [{ id: "D-1", insight: "2026-10-23", observation: "Half of J-find is abandoned on the map", explanations: ["The map loads slowly on phones", "People expect a list of nearby rivers"], hypothesis: "If the list comes first, then more people find a river, because they scan names faster than a map", alternative: "list-first" }]);
    const ins = readFileSync(join(a, "docs/ux-builder/runs/insights/2026-10-23/insights.md"), "utf8");
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
    const ddx = fakeDdx();
    json(a, DIAG);
    const r = start(a);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /checkpoint experiment has not been answered for this experiment/);
    assert.deepEqual(ddx.calls(), [], "no bead is created");
    assert.deepEqual(readState(a).experiments, []);
    // A skipped checkpoint is not an answer.
    assert.equal(cli(a, ["state", "checkpoint", "experiment", "--skip", "--reason", "later"]).status, 0);
    assert.equal(start(a).status, 2);
  });

  // @covers US-145-AC3
  test("AC3: after the checkpoint, experiment start creates a DDx bead with the hypothesis, variant, metrics, duration and stopping rule, running in the design state", () => {
    const a = expApp();
    const ddx = fakeDdx();
    json(a, DIAG);
    approveAll(a);
    assert.equal(cli(a, ["state", "checkpoint", "experiment", "--answer", "Yes, two weeks on 10% of people"]).status, 0);
    const r = JSON.parse(start(a, "--json").stdout);
    assert.equal(r.bead, "exp-1");
    const [create] = ddx.calls();
    assert.deepEqual(create.slice(0, 3), ["bead", "create", "Experiment: list-first for ADR-001"]);
    const arg = (k) => create[create.indexOf(k) + 1];
    assert.equal(arg("--labels"), "kind:experiment,area:ui");
    assert.equal(arg("--set"), "decision=ADR-001");
    const d = arg("--description");
    assert.match(d, /^Hypothesis: If the list comes first, then more people find a river, because they scan names faster than a map \(from D-1 on the 2026-10-23 insights\)$/m);
    assert.match(d, /^Variant: list-first \(docs\/ux-builder\/blueprint\/app\.blueprint\.list-first\.json\)/m);
    assert.match(d, /^Success metric: find-completion\nGuardrails: time-to-river\nDuration: 14 days, from \d{4}-\d{2}-\d{2}\nStopping rule: Stop after 14 days, or sooner if a guardrail gets worse by more than its tolerance\.$/m);
    assert.deepEqual(readState(a).experiments, [{ id: "exp-1", status: "running", decision: "ADR-001", variant: "list-first", metric: "find-completion", guardrails: ["time-to-river"] }]);
    assert.equal(existsSync(join(a, "docs/ux-builder/experiments")), false, "no experiment document of ux-builder's own");
    // The next experiment needs its own answer.
    assert.equal(start(a).status, 2);
    // Without DDx, it says to install it.
    process.env.UX_BUILDER_DDX = join(a, "no-such-ddx");
    cli(a, ["state", "checkpoint", "experiment", "--answer", "Yes"]);
    assert.match(start(a).stderr, /DDx is not installed: experiments are DDx beads/);
  });

  // @covers US-145-AC4
  test("AC4: experiment end compares task success and each guardrail, closes the bead with the result, proposes the decision's Validation and asks release", () => {
    const run = (result, metrics) => {
      const a = expApp();
      const ddx = fakeDdx();
      if (metrics) { mkdirSync(join(a, "docs/helix/06-iterate/metrics"), { recursive: true }); writeFileSync(join(a, "docs/helix/06-iterate/metrics/time-to-river.yaml"), metrics); }
      json(a, DIAG); approveAll(a); cli(a, ["state", "checkpoint", "experiment", "--answer", "Yes"]); start(a);
      writeFileSync(join(a, "result.json"), JSON.stringify(result));
      return { a, ddx, r: json(a, ["experiment", "end", "exp-1", "--result", "result.json"]) };
    };
    const { a, ddx, r } = run({ metric: "find-completion", control: 0.5, variant: 0.68, guardrails: [{ metric: "time-to-river", control: 42, variant: 38, better: "lower" }] });
    assert.equal(r.supported, true);
    assert.deepEqual(r.guardrails, [{ metric: "time-to-river", control: 42, variant: 38, better: "lower", held: true }]);
    assert.match(r.next, /^Ask checkpoint release: "Release list-first to everyone\?"/);
    const [, update, close] = ddx.calls();
    assert.deepEqual(close, ["bead", "close", "exp-1"]);
    assert.match(update[4], /- find-completion: control 0\.5, variant 0\.68 \(improved\)\n- Guardrail time-to-river: control 42, variant 38 \(held\)\n- Hypothesis: supported/);
    // The variant beat the decision, so the decision's ADR is proposed refuted, citing the experiment.
    assert.match(currentText(a, uiDecisions(a)[0].path).text, /\*\*Result\*\*: refuted\n\*\*Evidence\*\*: DDx experiment exp-1 \(list-first: supported\)/);
    const s = readState(a);
    assert.deepEqual(s.experiments[0], { id: "exp-1", status: "ended", decision: "ADR-001", variant: "list-first", metric: "find-completion", guardrails: ["time-to-river"], result: "supported" });
    assert.equal(s.next, r.next);
    // A guardrail that got worse: the hypothesis is not supported, whatever the success metric did; the decision held.
    const w = run({ control: 0.5, variant: 0.7, guardrails: [{ metric: "time-to-river", control: 42, variant: 60, better: "lower" }] });
    assert.equal(w.r.hypothesis, "not supported: a guardrail got worse");
    assert.match(w.r.next, /Keep the current design, or try another alternative\?/);
    assert.equal(w.r.decision.status, "tested");
    // A change within the guardrail's tolerance holds: the result's own, else HELIX's metric definition's.
    const tol = run({ control: 0.5, variant: 0.7, guardrails: [{ metric: "time-to-river", control: 40, variant: 43, better: "lower", tolerance: "10%" }] });
    assert.equal(tol.r.supported, true);
    assert.ok(tol.r.result.includes("- Guardrail time-to-river: control 40, variant 43 (held, within the tolerance 10%)"));
    const e = run({ control: 0.5, variant: 0.7, guardrails: [{ metric: "time-to-river", control: 40, variant: 43, better: "lower" }] }, "name: time-to-river\nunit: seconds\ndirection: lower\ntolerance: 2s\n");
    assert.equal(e.r.supported, false);
    assert.ok(e.r.result.some((l) => l.includes("(got worse by more than the tolerance 2s; lower is better)")));
  });

  // @covers US-145-AC5
  test("AC5: metrics HELIX does not define are written only as proposed metric-definition patches", () => {
    const a = expApp();
    fakeDdx();
    mkdirSync(join(a, "docs/helix/06-iterate/metrics"), { recursive: true });
    writeFileSync(join(a, "docs/helix/06-iterate/metrics/time-to-river.yaml"), "name: time-to-river\nunit: seconds\ndirection: lower\n");
    approveAll(a); cli(a, ["state", "checkpoint", "experiment", "--answer", "Yes"]);
    const r = JSON.parse(start(a, "--json").stdout);
    assert.deepEqual(r.proposed, ["docs/ux-builder/helix-proposals/metrics/find-completion.patch"]);
    const patch = readFileSync(join(a, r.proposed[0]), "utf8");
    assert.match(patch, /^--- \/dev\/null\n\+\+\+ b\/docs\/helix\/06-iterate\/metrics\/find-completion\.yaml/);
    assert.match(patch, /^\+name: find-completion$/m);
    assert.match(patch, /^\+last_verified: null$/m);
    assert.deepEqual(readdirSync(join(a, "docs/helix/06-iterate/metrics")), ["time-to-river.yaml"], "HELIX is not written");
  });
});
