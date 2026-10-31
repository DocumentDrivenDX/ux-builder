/* Finish for me: every downstream artifact from the agent's draft, HELIX
   applied and marked assumed, a summary, and the checkpoints skipped
   (US-164-AC1 to AC4; FEAT-018 GDL-85; ADR-042). No browser: the audit
   and the wireframes are stubbed.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { finish, markAssumed, readState, reviewApprove, status, writeState } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { KIT_BP, kitApp } from "./kit-fixture.mjs";

const BP = "docs/ux-builder/blueprint/app.blueprint.json";
const clean = async () => ({ ran: true, pagesAudited: 1, errors: 0, warnings: 0, findings: [] });
const noWireframes = async () => ({ files: [] });
function app({ step = 2 } = {}) {
  const a = kitApp();
  const bp = structuredClone(KIT_BP);
  bp.screens[1].actions = [{ id: "save", label: "Save river", to: "saved" }];
  bp.tasks = bp.tasks.map((t, k) => ({ ...t, success: [k ? "US-002-AC1" : "US-001-AC2"] }));
  writeFileSync(join(a, BP), JSON.stringify(bp, null, 2));
  const s = readState(a);
  s.step = step;
  s.assumptions = [{ id: "A-1", text: "Anglers plan the night before", status: "hypothesis", evidence: [], section: "users" }];
  writeState(a, s);
  return a;
}
const run = (a, answer = "Just finish it for me") => finish(a, { answer, audit: clean, wireframes: noWireframes });

describe("US-164: finish for me", () => {
  // @covers US-164-AC1
  test("AC1: a blueprint with errors, or a job no task serves, is refused, naming each; nothing is written", async () => {
    const a = app();
    const bp = JSON.parse(readFileSync(join(a, BP), "utf8"));
    writeFileSync(join(a, BP), JSON.stringify({ ...bp, tasks: bp.tasks.slice(0, 1), journeys: bp.journeys.slice(0, 1) }));
    const before = readFileSync(join(a, ".ux-builder/design-state.json"), "utf8");
    await assert.rejects(run(a), /not drafted far enough.*Nothing was written.*J-2.*has no task serving it/s);
    assert.equal(readFileSync(join(a, ".ux-builder/design-state.json"), "utf8"), before);
    assert.ok(!existsSync(join(a, "docs/ux-builder/finish-summary.md")));
    const r = cli(a, ["finish", "--answer", "Finish it"]);
    assert.equal(r.status, 2);
  });

  // @covers US-164-AC2
  test("AC2: it writes the brief, a checked step prototype and a test kit, and applies HELIX documents marked assumed", async () => {
    const a = app();
    const r = await run(a);
    assert.ok(existsSync(join(a, "docs/ux-builder/brief.md")));
    assert.ok(existsSync(join(a, "docs/ux-builder/prototypes/step-2/index.html")));
    assert.ok(existsSync(join(a, "docs/ux-builder/prototypes/step-2/check-1.json")));
    assert.ok(readdirSync(join(a, "docs/ux-builder/tests")).some((d) => d.startsWith("TK-")));
    assert.ok(r.applied.length > 0, `HELIX documents applied: ${r.notDone.join("; ")}`);
    for (const f of r.applied) {
      const t = readFileSync(join(a, f), "utf8");
      assert.match(t, /^ux-builder:\n {2}assumed: true$/m, f);
      assert.match(t, /Generated or changed by the agent when the person asked it to finish/, f);
    }
  });

  test("marking a document assumed is done once, and works without frontmatter", () => {
    const once = markAssumed("---\nddx:\n  id: US-9\n---\n\n# US-9: A story\n\nText.\n");
    assert.match(once, /ddx:\n {2}id: US-9\nux-builder:\n {2}assumed: true\n---/);
    assert.equal(markAssumed(once), null);
    assert.match(markAssumed("# Plain\n"), /^---\nux-builder:\n {2}assumed: true\n---\n\n# Plain\n\n> Generated/);
  });

  // @covers US-164-AC3
  test("AC3: the summary lists what was confirmed, what was assumed, what to check first and what was not done", async () => {
    const a = app();
    reviewApprove(a, { kind: "job", answer: "Those are the jobs" });
    const r = await run(a);
    const t = readFileSync(join(a, r.summary), "utf8");
    for (const h of ["## What the person confirmed", "## What was assumed", "## What to check first", "## What was not done"]) assert.ok(t.includes(h), h);
    assert.match(t, /job:J-1: "Those are the jobs"/);
    assert.match(t, /A-1 \(hypothesis\): Anglers plan the night before/);
    assert.match(t, /What to check first\n\n- A-1: Anglers plan the night before/);
    assert.match(t, /Testing with people: no one has used the design yet/);
    assert.match(t, /"Just finish it for me"/);
  });

  // @covers US-164-AC4
  test("AC4: core checkpoints not answered are skipped with the reason, never passed; the state and status record the finish", async () => {
    const a = app();
    await run(a);
    const s = readState(a);
    for (const id of ["core-1", "core-2", "core-3"]) {
      const c = s.checkpoints.find((x) => x.id === id);
      assert.equal(c.status, "skipped", id);
      assert.equal(c.reason, "finished by the agent at the person's request");
    }
    assert.ok(!s.checkpoints.some((c) => c.status === "passed"));
    assert.deepEqual([s.finished.step, s.finished.answer], [2, "Just finish it for me"]);
    assert.match(status(a).text, /Finished by the agent at the person's request at step 2: everything after it is assumed/);
  });
});
