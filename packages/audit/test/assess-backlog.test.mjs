/* The ranked backlog: complete findings, real components, one finding per
   problem, the rubric (FEAT-009 FND-01 to FND-04; US-063; STP-063).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { prepared } from "./fixtures/run-package.mjs";

const made = [];
const pkg = (o) => { const p = prepared(o); made.push(p); return p; };
after(() => { for (const p of made) p.remove(); });
const UI = JSON.parse(readFileSync(fileURLToPath(new URL("../../ui/package.json", import.meta.url)), "utf8")).version;
const backlog = (p, findings) => p.write("backlog.json", { schema: "backlog", version: 1, findings, user_validation: [] });

describe("US-063: assess and prioritize each recommendation", () => {
  // @covers US-063-AC1
  test("AC1: every field; evidence or an uncertainty; a requirement or proposed criterion; a verification", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    backlog(p, [p.finding()]);
    assert.equal(p.cli("validate-report", p.dir).status, 0);
    const { verification, ...noVerify } = p.finding();
    backlog(p, [noVerify]);
    assert.match(p.cli("validate-report", p.dir).stdout, /needs "verification"/);
    backlog(p, [p.finding({ evidence_refs: [] })]);
    assert.match(p.cli("validate-report", p.dir).stdout, /has no evidence and no uncertainty label/);
    backlog(p, [p.finding({ evidence_refs: [], uncertainty: "reported by the agent from one look; not reproduced" })]);
    assert.equal(p.cli("validate-report", p.dir).status, 0, "an explicit uncertainty label stands in for evidence");
    backlog(p, [p.finding({ source_refs: [], expected_behavior_or_proposed_requirement: "It should confirm." })]);
    assert.match(p.cli("validate-report", p.dir).stdout, /cites no requirement and proposes no criterion/);
  });

  // @covers US-063-AC2
  test("AC2: components are the app's installed patterns and widgets, at its version", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const map = (m) => p.finding({ component_mapping: [{ kind: "pattern", version: UI, catalogue_ref: "catalogue.json#/patterns/WorkQueue", work: "composition", ...m }] });
    backlog(p, [map({ name: "WorkQueue" })]);
    assert.equal(p.cli("validate-report", p.dir).status, 0);
    backlog(p, [map({ name: "DataGridPro" })]);
    assert.match(p.cli("validate-report", p.dir).stdout, new RegExp(`DataGridPro is not in the app's installed @ux-builder/ui ${UI.replace(/\./g, "\\.")}`));
    backlog(p, [map({ name: "DataGridPro", work: "custom-gap" })]);
    assert.equal(p.cli("validate-report", p.dir).status, 0, "a custom gap names what is missing");
    backlog(p, [map({ name: "WorkQueue", version: "0.0.1" })]);
    assert.match(p.cli("validate-report", p.dir).stdout, new RegExp(`the app has @ux-builder/ui ${UI.replace(/\./g, "\\.")}, not 0\\.0\\.1`));
  });

  // @covers US-063-AC3
  test("AC3: one problem seen at several checkpoints is one finding with every evidence reference; different problems stay apart", () => {
    const p = pkg();
    for (const c of ["C-review-1", "C-review-2", "C-review-3"]) p.checkpointAt(c);
    const a1 = p.finding({ key: "no-confirmation", evidence_refs: ["checkpoints/C-review-1/screenshot.png"] });
    const a2 = p.finding({ key: "no-confirmation", evidence_refs: ["checkpoints/C-review-2/screenshot.png"] });
    const b = p.finding({ key: "approve-target-small", title: "The Approve button is small on a phone", evidence_refs: ["checkpoints/C-review-3/screenshot.png"] });
    backlog(p, [a1, a2, b]);
    assert.match(p.cli("validate-report", p.dir).stdout, /appears twice; merge them/);
    assert.equal(p.cli("merge", "--run", p.run).status, 0);
    const merged = p.read("backlog.json").findings;
    assert.equal(merged.length, 2);
    assert.deepEqual(merged[0].evidence_refs, ["checkpoints/C-review-1/screenshot.png", "checkpoints/C-review-2/screenshot.png"]);
    assert.notEqual(merged[0].id, merged[1].id, "same element, different problem: two findings");
    assert.equal(p.cli("validate-report", p.dir).status, 0);
  });

  // @covers US-063-AC4
  test("AC4: the rubric's priority, a confidence with its reason and an effort, apart; uncertain severe concerns are validation work", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    backlog(p, [p.finding({ priority: "P1", confidence: { level: "low", reason: "one ambiguous observation" } })]);
    assert.match(p.cli("validate-report", p.dir).stdout, /is a low-confidence P1: mark validation_work: true/);
    backlog(p, [p.finding({ priority: "P1", confidence: { level: "low", reason: "one ambiguous observation" }, validation_work: true, usage: "unknown" })]);
    assert.equal(p.cli("validate-report", p.dir).status, 0);
    backlog(p, [p.finding({ priority: "P5" })]);
    assert.equal(p.cli("validate-report", p.dir).status, 1, "P0 to P3 only");
    backlog(p, [p.finding({ confidence: { level: "high" } })]);
    assert.match(p.cli("validate-report", p.dir).stdout, /needs "reason"/);
  });
});
