/* The coverage matrix, heuristics and claims about people (FEAT-009 COV-01
   to COV-03; US-061; STP-061).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { prepared } from "./fixtures/run-package.mjs";

const made = [];
const pkg = (o) => { const p = prepared(o); made.push(p); return p; };
after(() => { for (const p of made) p.remove(); });

describe("US-061: inspect coverage instead of a false pass", () => {
  // @covers US-061-AC1
  test("AC1: every planned pair is in the matrix with a reason; an assessed pair needs an outcome and evidence", () => {
    const p = pkg();
    const cov = p.read("coverage.json").entries;
    assert.equal(cov.length, 14, "two journeys × seven state classes");
    const review = cov.filter((e) => e.journey === "J-review");
    assert.deepEqual(review.filter((e) => e.status === "not-assessed").map((e) => e.state), ["success", "empty", "recoverable-error"]);
    assert.deepEqual(review.find((e) => e.state === "ai"), { journey: "J-review", state: "ai", status: "not-applicable", reason: "no model" });
    assert.ok(cov.every((e) => e.reason));
    assert.equal(p.cli("validate-report", p.dir).status, 0);
    // Leaving a pair out, or calling one assessed without evidence, fails.
    p.write("coverage.json", { schema: "coverage", version: 1, entries: cov.slice(1) });
    assert.match(p.cli("validate-report", p.dir).stdout, /J-review × success is planned but missing from the matrix/);
    p.write("coverage.json", { schema: "coverage", version: 1, entries: cov.map((e, i) => (i === 0 ? { ...e, status: "assessed", outcome: "issue", reason: "walked" } : e)) });
    assert.equal(p.cli("validate-report", p.dir).status, 1, "assessed without evidence");
    p.write("coverage.json", { schema: "coverage", version: 1, entries: cov.map((e, i) => (i === 0 ? { ...e, status: "assessed", outcome: "issue", reason: "walked", evidence: ["checkpoints/C-review-1"] } : e)) });
    assert.match(p.cli("validate-report", p.dir).stdout, /checkpoints\/C-review-1 is not in the package/);
    p.checkpointAt("C-review-1");
    assert.equal(p.cli("validate-report", p.dir).status, 0);
  });

  // @covers US-061-AC2
  test("AC2: a heuristic concern is a proposed criterion, reported as a recommendation", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const bad = p.finding({ finding_type: "heuristic", source_refs: [], title: "Bulk approve is missing", key: "bulk", expected_behavior_or_proposed_requirement: "Reviewers must be able to approve many entries at once." });
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [bad], user_validation: [] });
    assert.match(p.cli("validate-report", p.dir).stdout, /is a heuristic concern: state it as "Proposed criterion: …"/);
    const good = p.finding({ finding_type: "heuristic", source_refs: [], title: "Bulk approve is missing", key: "bulk", expected_behavior_or_proposed_requirement: "Proposed criterion: Given ten flagged entries, when the reviewer selects them, then one action approves them all." });
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [good], user_validation: [] });
    assert.equal(p.cli("validate-report", p.dir).status, 0);
    assert.equal(p.cli("report", p.dir).status, 0);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    assert.match(md, /## Recommendations \(UX heuristics, not existing obligations\)[\s\S]*Bulk approve is missing/);
    assert.doesNotMatch(/## Findings against the app.s requirements\n([\s\S]*?)\n## /.exec(md)?.[1] ?? "", /Bulk approve is missing/, "not listed among the app's requirements");
  });

  // @covers US-061-AC3
  test("AC3: claims about people are listed for representative users, and never stated as found", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [p.finding()] });
    assert.match(p.cli("validate-report", p.dir).stdout, /needs "user_validation"/);
    const claims = [{ claim: "Reviewers trust the queue's ordering", why: "The ordering rule is not explained on screen.", method: "Five-reviewer task study" }];
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [p.finding({ finding_type: "real-user", title: "Reviewers are confused by the queue" })], user_validation: claims });
    assert.match(p.cli("validate-report", p.dir).stdout, /typed real-user without evidence from real users/);
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [p.finding()], user_validation: claims });
    assert.equal(p.cli("validate-report", p.dir).status, 0);
    p.cli("report", p.dir);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    assert.match(md, /## Needs representative users\n\nThe assessment makes none of these claims[\s\S]*Reviewers trust the queue's ordering/);
  });
});
