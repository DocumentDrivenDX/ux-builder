/* The assessment walks the blueprint's journeys (FEAT-012 ASM-01; ADR-030;
   US-088; CONTRACT-006 journeys[].blueprint, blueprint).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { stringify } from "yaml";
import { load, validate } from "../assess/manifest.mjs";
import { makeRepo } from "./fixtures/helix-repo.mjs";
import { prepared } from "./fixtures/run-package.mjs";

const made = [];
after(() => { for (const p of made) p.remove(); });

const BLUEPRINT = {
  version: 1, kind: "app", name: "Review app", supports: ["compact", "medium"],
  destinations: [{ id: "work", label: "Work", screen: "queue" }],
  screens: [
    { id: "queue", title: "Entries", pattern: "WorkQueue", states: ["empty", "error"], actions: [{ id: "open", label: "Open entry", to: "entry" }] },
    { id: "entry", title: "Entry", pattern: "WorkQueue", actions: [{ id: "approve", label: "Approve", to: "queue", primary: true }, { id: "reject", label: "Reject", to: "queue", destructive: "undo" }] },
  ],
  journeys: [{
    id: "J-review", story: "US-001", criteria: ["US-001-AC2"], entry: "queue",
    steps: [{ screen: "queue", action: "open" }, { screen: "entry", action: "approve", state: "loading" }, { screen: "queue", expect: "empty" }],
    alternates: [
      { from: 0, steps: [{ screen: "queue", state: "error" }], reason: "the queue cannot load" },
      { from: 1, steps: [{ screen: "entry", action: "reject" }, { screen: "queue" }], reason: "the reviewer rejects" },
    ],
  }],
};
const manifest = (journeys, extra = {}) => ({ version: 1, app: { name: "Review app" }, run: { baseUrl: "http://127.0.0.1:4173/", environment: "local" }, roles: [{ id: "reviewer", auth: "none" }], journeys, restrictions: { writes: "report-only" }, ...extra });
const check = (data, files = { "app.blueprint.json": JSON.stringify(BLUEPRINT) }) => {
  const r = makeRepo({ files });
  made.push(r);
  writeFileSync(join(r.dir, "ux-assessment.yml"), stringify(data));
  return validate(load(join(r.dir, "ux-assessment.yml")));
};

describe("US-088: the assessment walks the blueprint's journeys", () => {
  // @covers US-088-AC1
  test("AC1: a journey that names a blueprint journey takes its story, criteria, entry and steps from the blueprint, and validates", () => {
    const v = check(manifest([{ blueprint: "J-review", role: "reviewer", priority: "critical" }]));
    assert.deepEqual(v.problems, []);
    const j = v.resolved.journeys[0];
    assert.deepEqual([j.id, j.story, j.criteria, j.entry, j.entryKind], ["J-review", "US-001", ["US-001-AC2"], "queue", "screen"]);
    assert.deepEqual(j.steps, BLUEPRINT.journeys[0].steps);
    // collect and plan use them: the criteria traced are the blueprint's, and the plan has its steps.
    const p = prepared({ files: { "app.blueprint.json": JSON.stringify(BLUEPRINT) }, manifest: { journeys: [{ blueprint: "J-review", role: "reviewer", priority: "critical" }] } });
    made.push(p);
    assert.deepEqual(p.read("traceability.json").journeys.map((x) => [x.id, x.story, x.criteria.map((c) => c.id)]), [["J-review", "US-001", ["US-001-AC2"]]]);
    const pj = p.read("plan.json").journeys[0];
    assert.deepEqual([pj.blueprint, pj.story, pj.goal, pj.entry, pj.entryKind], ["J-review", "US-001", "Review a queue", "queue", "screen"]);
    assert.deepEqual(pj.steps.map((s) => [s.n, s.screen, s.action ?? null]), [[1, "queue", "open"], [2, "entry", "approve"], [3, "queue", null]]);
    assert.equal(p.cli("validate-report", p.dir).status, 0);
    // The blueprint may live elsewhere: the manifest's blueprint field names it.
    const moved = check(manifest([{ blueprint: "J-review", role: "reviewer", priority: "critical" }], { blueprint: "design/flow.json" }), { "design/flow.json": JSON.stringify(BLUEPRINT) });
    assert.deepEqual(moved.problems, []);
    assert.match(moved.resolved.blueprintFile, /design\/flow\.json$/);
  });

  // @covers US-088-AC2
  test("AC2: a journey with both blueprint and its own story or entry is refused, naming both definitions", () => {
    const v = check(manifest([{ blueprint: "J-review", story: "US-001", entry: "/queue", role: "reviewer", priority: "critical" }]));
    assert.deepEqual(v.problems.map((p) => p.path), ["/journeys/0"]);
    assert.match(v.problems[0].message, /gives both definitions: blueprint journey "J-review" and its own story, entry; a journey is defined once/);
    const one = check(manifest([{ id: "J-mine", blueprint: "J-review", entry: "/queue", role: "reviewer", priority: "critical" }]));
    assert.match(one.problems[0].message, /blueprint journey "J-review" and its own entry/);
  });

  // @covers US-088-AC3
  test("AC3: a blueprint journey the app's blueprint lacks is refused, naming the missing ID", () => {
    const v = check(manifest([{ blueprint: "J-approve", role: "reviewer", priority: "critical" }]));
    assert.deepEqual(v.problems.map((p) => [p.path, p.message]), [["/journeys/0/blueprint", 'no journey "J-approve" in the app\'s blueprint (app.blueprint.json); it has J-review']]);
    // No blueprint at all: refused; journeys of the manifest's own still work.
    const none = check(manifest([{ blueprint: "J-review", role: "reviewer", priority: "critical" }, { id: "J-undo", story: "US-002", priority: "important", role: "reviewer", entry: "/queue" }]), {});
    assert.deepEqual(none.problems.map((p) => p.path), ["/journeys/0/blueprint"]);
    assert.match(none.problems[0].message, /"J-review" cannot be resolved: the app has no blueprint \(app\.blueprint\.json does not exist/);
    // A blueprint journey whose story HELIX lacks is refused like a manifest's own.
    const lost = check(manifest([{ blueprint: "J-review", role: "reviewer", priority: "critical" }]), { "app.blueprint.json": JSON.stringify({ ...BLUEPRINT, journeys: [{ ...BLUEPRINT.journeys[0], story: "US-404", criteria: undefined }] }) });
    assert.match(lost.problems[0].message, /no story US-404 in the flow "helix" .*from blueprint journey J-review/);
  });

  // @covers US-088-AC4
  test("AC4: plan turns each alternate into a walkthrough of a journey-and-state pair", () => {
    const p = prepared({ files: { "app.blueprint.json": JSON.stringify(BLUEPRINT) }, manifest: { journeys: [{ blueprint: "J-review", role: "reviewer", priority: "critical" }] } });
    made.push(p);
    const pj = p.read("plan.json").journeys[0];
    assert.deepEqual(pj.alternates.map((a) => [a.n, a.fromStep, a.state, a.pair, a.applies, a.reason]), [
      [1, 1, "recoverable-error", "S-review-recoverable-error", true, "the queue cannot load"],
      [2, 2, "success", "S-review-success", true, "the reviewer rejects"],
    ]);
    assert.deepEqual(pj.alternates[1].steps.map((s) => [s.n, s.screen, s.action ?? null]), [[1, "entry", "reject"], [2, "queue", null]]);
    // Every alternate's pair is in the starting coverage matrix.
    const cov = p.read("coverage.json").entries;
    for (const a of pj.alternates) assert.ok(cov.some((e) => e.journey === "J-review" && e.state === a.state && e.status === "not-assessed"), a.pair);
    assert.equal(p.cli("validate-report", p.dir).status, 0);
  });
});
