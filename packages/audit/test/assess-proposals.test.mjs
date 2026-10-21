/* Proposed HELIX changes: aimed at artifacts, never applied, checked for
   conflicts (FEAT-009 DOC-01 to DOC-04, HLX-06; US-064; STP-064).

     npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { prepared } from "./fixtures/run-package.mjs";

const made = [];
const pkg = () => { const p = prepared(); made.push(p); p.checkpointAt("C-review-1"); p.write("backlog.json", { schema: "backlog", version: 1, findings: [p.finding()], user_validation: [] }); return p; };
after(() => { for (const p of made) p.remove(); });

describe("US-064: review exact requirement changes before implementation", () => {
  // @covers US-064-AC1
  test("AC1: a proposal targets an existing story by ddx.id, or a new instance named, numbered and drafted by the catalogue", () => {
    const p = pkg();
    const F = p.read("backlog.json").findings[0].id;
    const a = p.cli("propose", "--run", p.run, "--finding", F, "--target", "US-001", "--kind", "unmet-criterion", "--criterion", "Given an approval, when it is made, then a message names the entry and offers Undo.", "--test", "Approve an entry; the message names it and Undo returns it.");
    assert.equal(a.status, 0, a.stderr);
    const patch = readFileSync(join(p.dir, "proposals/P-1.patch"), "utf8");
    assert.match(patch, /^--- a\/docs\/helix\/01-frame\/user-stories\/US-001-review-a-queue\.md/m);
    assert.match(patch, /^\+- \[ \] \*\*US-001-AC3\*\* — Given an approval, when it is made, then a message names the entry and offers Undo\./m);
    const p1 = p.read("proposals.json").proposals[0];
    assert.deepEqual([p1.target.kind, p1.target.id, p1.target.type, p1.target.path, p1.criterion], ["existing", "US-001", "user-stories", "docs/helix/01-frame/user-stories/US-001-review-a-queue.md", "US-001-AC3"]);
    assert.match(p1.target.revision, /^[0-9a-f]{40}$/);
    const b = p.cli("propose", "--run", p.run, "--finding", F, "--new", "user-stories", "--title", "Undo an approval quickly", "--kind", "new-requirement", "--criterion", "Given an approval, when Undo is chosen within ten seconds, then the entry returns.", "--test", "Approve, then Undo; the entry is back.");
    assert.equal(b.status, 0, b.stderr);
    const p2 = p.read("proposals.json").proposals[1];
    assert.deepEqual([p2.target.kind, p2.target.id, p2.target.path], ["new", "US-004", "docs/helix/01-frame/user-stories/US-004-undo-an-approval-quickly.md"], "US-003 is taken by a file without frontmatter");
    const draft = readFileSync(join(p.dir, "proposals/P-2.patch"), "utf8");
    assert.match(draft, /^\+\+\+ b\/docs\/helix\/01-frame\/user-stories\/US-004-undo-an-approval-quickly\.md/m);
    assert.match(draft, /^\+  id: US-004$/m);
    assert.match(draft, /^\+# US-004: Undo an approval quickly$/m, "drafted from the catalogue's template");
    assert.deepEqual(p.read("backlog.json").findings[0].proposed_doc_changes, ["P-1", "P-2"]);
    assert.equal(p.cli("propose", "--run", p.run, "--finding", F, "--target", "US-099", "--criterion", "x", "--test", "y").status, 1);
  });

  // @covers US-064-AC2
  test("AC2: a proposal keeps its finding and evidence, says what kind of change it is, and carries its test change", () => {
    const p = pkg();
    const F = p.read("backlog.json").findings[0].id;
    p.cli("propose", "--run", p.run, "--finding", F, "--target", "US-001", "--kind", "new-requirement", "--criterion", "c", "--test", "t", "--test-file", "test/queue.test.mjs");
    const x = p.read("proposals.json").proposals[0];
    assert.deepEqual(x.findings, [F]);
    assert.deepEqual(x.evidence_refs, ["checkpoints/C-review-1/screenshot.png"]);
    assert.equal(x.change, "new-requirement");
    assert.deepEqual(x.test_change, { path: "test/queue.test.mjs", description: "t" });
    assert.equal(p.cli("validate-report", p.dir).status, 0);
  });

  // @covers US-064-AC3
  test("AC3: the assessment changes no governed file; a target changed since the proposal is a conflict", () => {
    const p = pkg();
    const F = p.read("backlog.json").findings[0].id;
    p.cli("propose", "--run", p.run, "--finding", F, "--target", "US-001", "--criterion", "c", "--test", "t");
    const clean = p.cli("check-writes", "--run", p.run);
    assert.equal(clean.status, 0, clean.stdout);
    assert.match(clean.stdout, /no file under the HELIX root or the app changed/);
    assert.equal(p.cli("apply-check", "P-1", "--run", p.run).status, 0);
    const story = join(p.r.dir, "docs/helix/01-frame/user-stories/US-001-review-a-queue.md");
    writeFileSync(story, readFileSync(story, "utf8") + "\n- [ ] **US-001-AC3** — Someone else's change.\n");
    const dirty = p.cli("check-writes", "--run", p.run);
    assert.equal(dirty.status, 1);
    assert.match(dirty.stdout, /changed: docs\/helix\/01-frame\/user-stories\/US-001-review-a-queue\.md/);
    const conflict = p.cli("apply-check", "P-1", "--run", p.run);
    assert.equal(conflict.status, 1);
    assert.match(conflict.stdout, /conflict: US-001/);
  });

  // @covers US-064-AC4
  test("AC4: each proposal's plan names its writes, the behaviour it keeps, its dependencies and its verification", () => {
    const p = pkg();
    const F = p.read("backlog.json").findings[0].id;
    p.cli("propose", "--run", p.run, "--finding", F, "--target", "US-001", "--criterion", "c", "--test", "Approve; the message shows.", "--test-file", "test/queue.test.mjs");
    const all = p.read("proposals.json");
    assert.deepEqual(Object.keys(all.proposals[0].plan).sort(), ["dependencies", "keeps", "verification", "writes"]);
    assert.deepEqual(all.proposals[0].plan.writes, ["docs/helix/01-frame/user-stories/US-001-review-a-queue.md", "test/queue.test.mjs"]);
    assert.match(all.proposals[0].plan.keeps, /every behavioural assertion of the existing tests/);
    delete all.proposals[0].plan.verification;
    p.write("proposals.json", all);
    assert.match(p.cli("validate-report", p.dir).stdout, /P-1's implementation plan needs "verification"/);
  });
});
