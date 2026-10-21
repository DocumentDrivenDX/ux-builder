/* assess collect: the requirements-to-evidence map (FEAT-009 TRC-01, TRC-02,
   TRC-04, HLX-04, HLX-05; US-058-AC1, AC2, AC4; STP-058).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { makeRepo } from "./fixtures/helix-repo.mjs";

const CLI = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const repos = [];
after(() => { for (const r of repos) r.remove(); });
const HELIX_ID = /^(US|FEAT|ADR|SD|TD|TP|STP|CONTRACT|POC|SPIKE|DEL)-\d+/;

function collected(opts = {}, manifest = {}) {
  const r = makeRepo(opts);
  repos.push(r);
  writeFileSync(join(r.dir, "ux-assessment.yml"), stringify({
    version: 1, app: { name: "Review app" },
    run: { baseUrl: "http://127.0.0.1:4173/", environment: "local" },
    roles: [{ id: "reviewer", auth: "none" }],
    journeys: [
      { id: "J-review", story: "US-001", priority: "critical", role: "reviewer", entry: "/", tests: [{ file: "e2e/approve.spec.mjs", title: "approves" }] },
      { id: "J-undo", story: "US-002", priority: "important", role: "reviewer", entry: "/" },
    ],
    restrictions: { writes: "report-only" },
    ...manifest,
  }));
  const out = spawnSync(process.execPath, [CLI, "assess", "collect", "--run", "R-20261020T120000Z"], { cwd: r.dir, encoding: "utf8" });
  const read = (f) => JSON.parse(readFileSync(join(r.dir, "ux-assessment", "R-20261020T120000Z", f), "utf8"));
  return { r, out, read };
}

describe("US-058: trace each assessed journey to product intent", () => {
  // @covers US-058-AC1
  test("AC1: every instance is listed with its ID, type, path, hash and revision; criteria with their IDs", () => {
    const { r, out, read } = collected();
    assert.equal(out.status, 0, out.stderr + out.stdout);
    const req = read("requirements.json");
    assert.equal(req.schema, "requirements");
    const rev = execFileSync("git", ["-C", r.dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    assert.equal(req.documents.length, 6);
    for (const d of req.documents) {
      assert.equal(d.hash, createHash("sha256").update(readFileSync(join(r.dir, d.path))).digest("hex"), d.path);
      assert.equal(d.revision, rev, d.path);
    }
    const us1 = req.documents.find((d) => d.id === "US-001");
    assert.deepEqual([us1.type, us1.typedBy, us1.path], ["user-stories", "frontmatter", "docs/helix/01-frame/user-stories/US-001-review-a-queue.md"]);
    assert.equal(req.documents.find((d) => d.path.endsWith("US-003-untyped.md")).typedBy, "location");
    assert.deepEqual(req.criteria.filter((c) => c.story === "US-001").map((c) => [c.id, c.text]), [["US-001-AC1", "Given entries, when the queue opens, then they are listed."], ["US-001-AC2", "Given an entry, when it is approved, then it leaves the queue."]]);
    assert.deepEqual(req.features.map((f) => f.id), ["FEAT-001"]);
    assert.deepEqual(req.stories.find((s) => s.id === "US-001").feature, "FEAT-001");
    assert.deepEqual(req.goals, [{ text: "Reviewers clear the queue before prebill.", source: "docs/helix/00-discover/product-vision.md" }]);
    assert.deepEqual(req.roles, [{ name: "Reviewer", source: "docs/helix/01-frame/prd.md" }]);
    const run = read("run.json");
    assert.equal(run.app.commit, rev);
    assert.deepEqual([run.helix.flow, run.helix.root, run.helix.catalog.source], ["helix", "docs/helix", "repository"]);
    assert.deepEqual(run.stages.map((s) => [s.stage, s.status]), [["collect", "completed"]]);
  });

  // @covers US-058-AC2
  test("AC2: criteria are explicit by @covers or the manifest, otherwise uncovered", () => {
    const { read } = collected();
    const t = read("traceability.json").journeys;
    const review = Object.fromEntries(t.find((j) => j.id === "J-review").criteria.map((c) => [c.id, c]));
    assert.equal(review["US-001-AC1"].link, "explicit");
    assert.deepEqual(review["US-001-AC1"].tests.map((x) => [x.file, x.via]), [["test/queue.test.mjs", "covers"], ["e2e/approve.spec.mjs", "manifest"]]);
    assert.equal(review["US-001-AC2"].link, "explicit", "mapped by the manifest");
    assert.deepEqual(review["US-001-AC2"].tests, [{ file: "e2e/approve.spec.mjs", title: "approves", via: "manifest" }]);
    const undo = t.find((j) => j.id === "J-undo").criteria;
    assert.deepEqual(undo.map((c) => [c.id, c.link]), [["US-002-AC1", "uncovered"]]);
  });

  // @covers US-058-AC4
  test("AC4: missing documents, missing IDs and dangling citations are reported; assessment IDs never look like HELIX's", () => {
    const { read } = collected({ omit: ["docs/helix/01-frame/prd.md"], files: { "test/stray.test.mjs": "// @" + "covers US-001-AC9\n" } });
    const p = read("requirements.json").problems;
    assert.ok(p.some((x) => x.kind === "missing-type" && x.type === "prd" && x.required), JSON.stringify(p));
    assert.ok(p.some((x) => x.kind === "no-id" && x.path.endsWith("US-003-untyped.md")));
    assert.ok(p.some((x) => x.kind === "dangling-citation" && /US-001-AC9/.test(x.detail)));
    assert.ok(p.some((x) => x.kind === "dangling-link" && /prd/.test(x.detail)), "FEAT-001 links to the missing PRD");
    const run = read("run.json");
    const made = [run.id, ...read("traceability.json").journeys.map((j) => j.id)];
    for (const id of made) {
      assert.match(id, /^(R|J|S|C|F|P)-/, id);
      assert.doesNotMatch(id, HELIX_ID, id);
    }
  });
  // @covers US-058-AC3
  test("AC3: a conflict the alignment review records qualifies the conclusions that rely on it", () => {
    const { r } = collected();
    const run = join(r.dir, "ux-assessment", "R-20261020T120000Z");
    writeFileSync(join(run, "alignment.json"), JSON.stringify({ schema: "alignment", version: 1, source: "helix align, 2026-10-20", conflicts: [{ ids: ["US-002"], detail: "US-002 and FEAT-001 disagree on whether approvals can be undone" }] }));
    const finding = (over = {}) => ({
      id: "F-undo-missing", run_id: "R-20261020T120000Z", title: "Undo is not offered", finding_type: "observed", journey_id: "J-undo", state_id: "S-undo-success", role: "reviewer",
      source_refs: ["US-002"], test_refs: [], evidence_refs: [], uncertainty: "seen once; not yet reproduced", observed_behavior: "No Undo after approving.",
      expected_behavior_or_proposed_requirement: "US-002-AC1", recommendation: "Show an Undo toast.", component_mapping: [], priority: "P1",
      confidence: { level: "medium", reason: "one observation" }, effort: "S", dependencies: [], verification: "Approve, then Undo; the entry returns.", proposed_doc_changes: [], status: "open", ...over,
    });
    const report = (f) => { writeFileSync(join(run, "backlog.json"), JSON.stringify({ schema: "backlog", version: 1, findings: [f] })); return spawnSync(process.execPath, [CLI, "assess", "validate-report", run], { encoding: "utf8" }); };
    const bare = report(finding());
    assert.equal(bare.status, 1);
    assert.match(bare.stdout, /F-undo-missing relies on US-002, which the alignment review found in conflict/);
    assert.equal(report(finding({ qualified: ["alignment"] })).status, 0, "qualified, it stands; the rest of the assessment is unaffected");
  });
});
