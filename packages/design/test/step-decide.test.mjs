/* Every step ends with the person's decision on its checked prototype:
   continue, revise or finish (US-163-AC4, AC5, AC7; FEAT-018 GDL-84;
   ADR-042). The audit runner is stubbed: no browser.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { metrics, readEvents, readState, reviewApprove, reviewMap, stepCheck, stepDecide, stepPrototype, writeState } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const clean = async () => ({ ran: true, pagesAudited: 1, errors: 0, warnings: 0, findings: [] });
function app({ step = 1, passed = [] } = {}) {
  const a = kitApp();
  const bp = structuredClone(KIT_BP);
  bp.screens[1].actions = [{ id: "save", label: "Save river", to: "saved" }];
  bp.tasks = bp.tasks.map((t, k) => ({ ...t, success: [k ? "US-002-AC1" : "US-001-AC2"] }));
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(bp, null, 2));
  const s = readState(a);
  s.step = step;
  s.activity = step <= 3 ? "define" : step <= 5 ? "explore" : step === 6 ? "experience" : "validate";
  s.checkpoints = passed.map((id) => ({ id, status: "passed", answer: "Yes", at: "2026-10-31T10:00:00.000Z" }));
  writeState(a, s);
  return a;
}
const checked = async (a) => { await stepPrototype(a); await stepCheck(a, { audit: clean }); await stepCheck(a, { nothingToFix: true }); };

describe("US-163: every step ends with the person's decision", () => {
  // @covers US-163-AC4
  test("AC4: decide is refused without a prototype, without its check, and without a second round", async () => {
    const a = app();
    assert.throws(() => stepDecide(a, { choice: "continue", answer: "Looks good" }), /needs a prototype of step 1.*Nothing was recorded/s);
    await stepPrototype(a);
    assert.throws(() => stepDecide(a, { choice: "continue", answer: "Looks good" }), /needs its check/);
    await stepCheck(a, { audit: clean });
    assert.throws(() => stepDecide(a, { choice: "continue", answer: "Looks good" }), /needs a second check/);
    const r = cli(a, ["step", "decide", "continue", "--answer", "Looks good"]);
    assert.equal(r.status, 2);
    await stepCheck(a, { nothingToFix: true });
    assert.equal(stepDecide(a, { choice: "continue", answer: "Looks good" }).choice, "continue");
    assert.throws(() => stepDecide(a, { choice: "maybe", answer: "Hm" }), /continue, revise, finish/);
  });

  // @covers US-163-AC5
  test("AC5: continue moves to the next step; at step 4 it answers core-2 and lands on step 5, not 6", async () => {
    const a = app();
    await checked(a);
    const r = stepDecide(a, { choice: "continue", answer: "On to users" });
    assert.equal(readState(a).step, 2);
    assert.match(r.now, /Step 2 of 8: Understand users/);
    const b = app({ step: 4, passed: ["core-1"] });
    await checked(b);
    assert.throws(() => stepDecide(b, { choice: "continue", answer: "Map first, go on" }), /core-2 cannot be passed yet/);
    assert.equal(metrics(b).turns, 0, "a refused decision records nothing");
    reviewMap(b);
    reviewApprove(b, { item: "map", answer: "The map is right", accept: reviewMap(b).exceptions.map((e) => e.id) });
    const r4 = stepDecide(b, { choice: "continue", answer: "Map first, go on" });
    assert.equal(r4.checkpoint, "core-2");
    const s = readState(b);
    assert.equal(s.step, 5);
    assert.equal(s.activity, "explore");
    assert.equal(s.checkpoints.find((c) => c.id === "core-2").answer, "Map first, go on");
  });

  // @covers US-163-AC5
  test("AC5: revise keeps the step and marks its prototype stale; finish names the finish command", async () => {
    const a = app({ step: 2, passed: [] });
    await checked(a);
    const r = stepDecide(a, { choice: "revise", answer: "Guests come in pairs, redo this" });
    assert.equal(readState(a).step, 2);
    assert.equal(readState(a).stepPrototypes["2"].stale, true);
    assert.match(r.next, /draw and check a new prototype/);
    assert.throws(() => stepDecide(a, { choice: "continue", answer: "ok" }), /needs a prototype of step 2/, "a stale prototype is drawn again first");
    await checked(a);
    assert.equal(readState(a).stepPrototypes["2"].stale, undefined);
    const f = stepDecide(a, { choice: "finish", answer: "Just finish it for me" });
    assert.match(f.next, /ux-builder-design finish --answer/);
    assert.equal(readState(a).step, 2);
  });

  // @covers US-163-AC7
  test("AC7: the decision is a decision turn, and the first one marks the prototype milestone", async () => {
    const a = app();
    await checked(a);
    stepDecide(a, { choice: "continue", answer: "Yes, go on" });
    const r = metrics(a);
    assert.equal(r.byKind.decision, 1);
    assert.notEqual(r.minutesToPrototype, null);
    assert.equal(readEvents(a).filter((e) => e.type === "milestone" && e.name === "prototype").length, 1);
    await checked(a);
    stepDecide(a, { choice: "continue", answer: "Again" });
    assert.equal(readEvents(a).filter((e) => e.type === "milestone" && e.name === "prototype").length, 1, "marked once");
  });
});

describe("US-163: the step commands' --json fits CONTRACT-008's output schema", () => {
  test("prototype --step, --check, --nothing-to-fix and step decide", async () => {
    const { default: Ajv2020 } = await import("ajv/dist/2020.js");
    const { readFileSync } = await import("node:fs");
    const OUTPUT = JSON.parse(readFileSync(new URL("../schema/output.schema.json", import.meta.url), "utf8"));
    const ajv = new Ajv2020({ strict: false });
    ajv.addSchema(OUTPUT);
    const valid = (name, data) => { const v = ajv.getSchema(`${OUTPUT.$id}#/$defs/${name}`); assert.ok(v(data), `${name}: ${JSON.stringify(v.errors)}`); };
    const a = app();
    const run = (args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
    valid("stepPrototype", run(["prototype", "--step"]));
    await stepCheck(a, { audit: clean });
    valid("stepCheck", run(["prototype", "--step", "--check", "--nothing-to-fix"]));
    valid("stepDecide", run(["step", "decide", "continue", "--answer", "Go on"]));
    valid("overview", run(["overview"]));
  });
});
