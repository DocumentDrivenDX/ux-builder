/* Runs: the readable report, the run record, comparison across runs, and
   reruns without duplicates (FEAT-009 RUN-01 to RUN-04; US-065; STP-065).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { stringify, parse } from "yaml";
import { merge } from "../assess/plan.mjs";
import { prepared } from "./fixtures/run-package.mjs";

const made = [];
const pkg = (o) => { const p = prepared(o); made.push(p); return p; };
after(() => { for (const p of made) p.remove(); });

/* A second run in the same repository, collected and planned. */
function again(p, run) {
  for (const args of [["collect", "--run", run], ["plan", "--run", run]]) assert.equal(p.cli(...args).status, 0);
  const dir = join(p.r.dir, "ux-assessment", run);
  const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  const write = (f, d) => writeFileSync(join(dir, f), JSON.stringify(d, null, 2));
  return { dir, read, write };
}
const assessed = (entries, journey, states) => entries.map((e) => (e.journey === journey && states.includes(e.state) ? { ...e, status: "assessed", outcome: "issue", reason: "walked", evidence: [] } : e));

describe("US-065: compare assessments and hand work to an agent", () => {
  // @covers US-065-AC1
  test("AC1: a readable report, an evidence index and schema-valid records", () => {
    const p = pkg();
    p.checkpointAt("C-review-1");
    const f = p.finding();
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [f], user_validation: [{ claim: "Reviewers feel confident approving", why: "Needs people." }] });
    p.write("coverage.json", { schema: "coverage", version: 1, entries: p.read("coverage.json").entries.map((e, i) => (i === 0 ? { ...e, status: "assessed", outcome: "issue", reason: "walked", evidence: ["checkpoints/C-review-1"] } : e)) });
    assert.equal(p.cli("report", p.dir).status, 0);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    for (const h of ["## Summary", "## What was checked", "## Findings against the app's requirements", "## Needs representative users"]) assert.ok(md.includes(h), h);
    assert.match(md, /A clean audit is not proof of usability/);
    assert.match(md, /1 of 14 journey × state pairs assessed/);
    const html = readFileSync(join(p.dir, "report.html"), "utf8");
    assert.match(html, /<img src="checkpoints\/C-review-1\/screenshot\.png"/, "the evidence is shown, not just named");
    assert.equal(p.cli("report", p.dir, "--self-contained").status, 0);
    assert.match(readFileSync(join(p.dir, "report.html"), "utf8"), /<img src="data:image\/png;base64,/, "self-contained: embedded");
    const ev = p.read("evidence.json").files;
    assert.deepEqual(ev.find((x) => x.path === "checkpoints/C-review-1/screenshot.png").referencedBy.sort(), [f.id, "coverage J-review × success"].sort());
    assert.equal(p.cli("validate-report", p.dir).status, 0);
  });

  // @covers US-065-AC2
  test("AC2: the run record holds the commit, revisions, manifest version, versions, agent and model, configuration and time", () => {
    const p = pkg();
    const run = p.read("run.json");
    assert.equal(run.app.commit, execFileSync("git", ["-C", p.r.dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim());
    assert.ok(run.documents.length && run.documents.every((d) => /^[0-9a-f]{40}$/.test(d.revision)));
    assert.equal(run.manifest.version, 1);
    assert.match(run.versions.audit, /^\d+\.\d+\.\d+/);
    assert.deepEqual(run.agent, { name: "test-agent", model: "test-model" });
    assert.deepEqual(run.config.scope, { app: "Review app", flow: null, journeys: ["J-review", "J-undo"] });
    assert.ok(Date.parse(run.startedAt));
  });

  // @covers US-065-AC3
  test("AC3: findings across runs are new, persistent, resolved, regressed or not rechecked; an unassessed state never resolves", () => {
    const p = pkg();
    const A = p.finding({ key: "a", title: "A" }), B = p.finding({ key: "b", title: "B", state_id: "S-review-empty" }), C = p.finding({ key: "c", title: "C", journey_id: "J-undo", state_id: "S-undo-ai" });
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [A, B, C], user_validation: [] });
    const r2 = again(p, "R-20261021T100000Z");
    const D = p.finding({ key: "d", title: "D", run_id: "R-20261021T100000Z" });
    r2.write("backlog.json", { schema: "backlog", version: 1, findings: [{ ...A, run_id: "R-20261021T100000Z" }, D], user_validation: [] });
    r2.write("coverage.json", { schema: "coverage", version: 1, entries: assessed(r2.read("coverage.json").entries, "J-review", ["success", "empty"]) });
    const c = p.cli("compare", p.dir, r2.dir);
    assert.equal(c.status, 0, c.stderr);
    const st = Object.fromEntries(r2.read("comparison.json").findings.map((f) => [f.id, f.status]));
    assert.deepEqual([st[A.id], st[B.id], st[C.id], st[D.id]], ["persistent", "resolved", "not-rechecked", "new"]);
    // B comes back in a third run: regressed.
    const r3 = again(p, "R-20261021T110000Z");
    r3.write("backlog.json", { schema: "backlog", version: 1, findings: [B], user_validation: [] });
    assert.equal(p.cli("compare", r2.dir, r3.dir).status, 0);
    assert.equal(r3.read("comparison.json").findings.find((f) => f.id === B.id).status, "regressed");
    // Runs of a different scope are not compared.
    const m = parse(readFileSync(join(p.r.dir, "ux-assessment.yml"), "utf8"));
    m.journeys = m.journeys.slice(0, 1);
    writeFileSync(join(p.r.dir, "ux-assessment.yml"), stringify(m));
    const r4 = again(p, "R-20261021T120000Z");
    const refused = p.cli("compare", r3.dir, r4.dir);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /different scopes/);
  });

  // @covers US-065-AC4
  test("AC4: a rerun's findings keep their IDs, so nothing is duplicated; blocked stages are reported apart from findings", () => {
    const p = pkg();
    const f = p.finding();
    const rerun = { ...p.finding({ run_id: "R-20261021T100000Z", evidence_refs: ["checkpoints/C-review-2/screenshot.png"] }) };
    assert.equal(rerun.id, f.id, "the same problem has the same ID in a rerun");
    assert.equal(merge([f, rerun]).length, 1);
    p.checkpointAt("C-review-1");
    p.write("backlog.json", { schema: "backlog", version: 1, findings: [p.finding({ priority: "P1" })], user_validation: [] });
    const run = p.read("run.json");
    run.stages.push({ stage: "walkthrough", status: "blocked", reason: "the browser driver could not connect" });
    p.write("run.json", run);
    p.cli("report", p.dir);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    assert.match(md, /Stages that did not complete \(reported apart from findings\): walkthrough blocked — the browser driver could not connect/);
    const g = p.cli("gate", p.dir, "--fail-on", "P1");
    assert.equal(g.status, 1);
    assert.match(g.stdout, /open P1/);
    assert.match(g.stdout, /blocked stage walkthrough/);
    run.stages.pop(); p.write("run.json", run);
    assert.equal(p.cli("gate", p.dir, "--fail-on", "P0").status, 0, "nothing open at P0, no blocked stage");
  });
});
