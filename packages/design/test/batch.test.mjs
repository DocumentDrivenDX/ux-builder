/* Steps 4 to 6 as one batch: the person's one answer, one record (US-173;
   FEAT-018 GDL-87; VIP List session 3).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { pendingReviews, readEvents, readState, stepBatch, writeState } from "../index.mjs";
import { approveAll, cli } from "./helpers.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const BP = "docs/ux-builder/blueprint/app.blueprint.json";
function atStep4() {
  const a = kitApp();
  approveAll(a);
  const near = structuredClone(KIT_BP);
  near.screens[0].title = "Rivers near you";
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.list.json"), JSON.stringify(KIT_BP, null, 2));
  writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.near.json"), JSON.stringify(near, null, 2));
  const s = readState(a);
  s.step = 4;
  s.checkpoints.push({ id: "core-1", status: "passed", answer: "Yes", at: "2026-10-31T10:00:00Z" });
  s.alternatives = [{ name: "list", file: "docs/ux-builder/blueprint/app.blueprint.list.json", status: "candidate" }, { name: "near", file: "docs/ux-builder/blueprint/app.blueprint.near.json", status: "candidate" }];
  s.questions = [{ id: "Q-1", text: "A list, or rivers near you?", status: "open" }];
  writeState(a, s);
  return a;
}
const ARGS = { answer: "Go with those three.", alternative: "near", modalities: ["responsive-web"], sizeClasses: ["compact", "large"], frame: "top-nav", theme: "plain" };

describe("US-173: steps 4 to 6 as one batch", () => {
  // @covers US-173-AC1
  test("one answer chooses the alternative, approves its decisions, records the modality and core-2, and moves to step 6", () => {
    const a = atStep4();
    const turnsBefore = readEvents(a).filter((e) => e.type === "turn").length;
    const r = stepBatch(a, ARGS);
    const s = readState(a);
    assert.equal(s.step, 6);
    assert.deepEqual(s.alternatives.map((x) => [x.name, x.status]), [["list", "rejected"], ["near", "chosen"]]);
    assert.equal(JSON.parse(readFileSync(join(a, BP), "utf8")).screens[0].title, "Rivers near you", "the blueprint is the chosen alternative");
    assert.deepEqual(r.decisions, ["ADR-001", "ADR-002"]);
    assert.equal(s.questions[0].status, "answered");
    assert.deepEqual(s.modality.modalities, ["responsive-web"]);
    assert.equal(s.modality.frame, "top-nav");
    assert.ok(s.checkpoints.some((c) => c.id === "core-2" && c.status === "passed"));
    assert.deepEqual(pendingReviews(a).map((p) => p.id), [], "nothing left to approve");
    assert.ok([4, 5].every((n) => s.stepPrototypes[n].batch && s.stepPrototypes[n].decision.answer === "Go with those three."));
    assert.match(s.next, /Build the app on plain .* step 6 prototype/);
    // One person turn, however many records.
    assert.equal(readEvents(a).filter((e) => e.type === "turn").length, turnsBefore + 1);
    // @covers US-174-AC5
    // Every event of the batch is a moment, not a bare date (session 4: a date read as midnight, 13 "active" minutes).
    assert.ok(readEvents(a).every((e) => /T\d\d:\d\d/.test(e.at)), readEvents(a).map((e) => e.at).join(" "));
  });

  // @covers US-173-AC2
  test("refused away from step 4, without the theme, the frame, or a choice between alternatives; nothing is recorded", () => {
    const a = atStep4();
    const before = readFileSync(join(a, ".ux-builder/design-state.json"), "utf8");
    assert.throws(() => stepBatch(a, { ...ARGS, alternative: undefined }), /needs --alternative: one of list, near/);
    assert.throws(() => stepBatch(a, { ...ARGS, theme: "" }), /needs --theme/);
    assert.throws(() => stepBatch(a, { ...ARGS, frame: undefined }), /needs --frame/);
    assert.equal(readFileSync(join(a, ".ux-builder/design-state.json"), "utf8"), before);
    const s = readState(a);
    s.step = 3;
    writeState(a, s);
    assert.throws(() => stepBatch(a, ARGS), /from step 4; the design is at step 3/);
  });

  test("the CLI takes the lists comma-separated", () => {
    const a = atStep4();
    const r = cli(a, ["step", "batch", "--answer", "Go with those", "--alternative", "list", "--modality", "responsive-web", "--size-classes", "compact,large", "--frame", "top-nav", "--theme", "plain"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Steps 4 and 5 recorded with one answer: list chosen, ADR-001 and ADR-002 approved/);
    assert.deepEqual(readState(a).modality.sizeClasses, ["compact", "large"]);
  });
});
