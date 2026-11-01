/* Moving an app's own design documents into HELIX (US-149-AC7; ADR-042
   decision 9; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentText, needsTable, readState, sectionOf, segmentsTable, uiDecisions } from "../index.mjs";
import { cli, helixApp } from "./helpers.mjs";

const put = (a, p, t) => { mkdirSync(join(a, p, ".."), { recursive: true }); writeFileSync(join(a, p), t); };
const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const D = "docs/ux-builder";
/* An app with HELIX and every kind of document ux-builder used to keep. */
function before() {
  const a = helixApp();
  writeFileSync(join(a, ".ux-builder/design-state.json"), JSON.stringify({ ...JSON.parse(readFileSync(join(a, ".ux-builder/design-state.json"), "utf8")), principles: [{ id: "PR-1", text: "No mandatory account creation", status: "assumed", rule: { kind: "no-step-before", patterns: ["SignIn"] } }] }));
  put(a, `${D}/jobs.md`, "---\nux:\n  id: jobs\n  type: jobs\n---\n\n# Jobs\n\n## Jobs\n\n| ID | Job | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|---|\n| J-1 | Find a river | high | EV-1 | high | confirmed |\n| J-2 | Go back to a river | medium | none | low | hypothesis |\n");
  put(a, `${D}/users.md`, "---\nux:\n  id: users\n  type: users\n---\n\n# Target users\n\n## Users\n\n| ID | User | Context | Needs | Jobs | Evidence | Confidence | Status |\n|---|---|---|---|---|---|---|---|\n| U-1 | Weekend anglers | On a phone at the river | None known | J-1 high, J-2 low | none | low | hypothesis |\n");
  put(a, `${D}/decisions/UXD-1.md`, "---\nux:\n  id: UXD-1\n  type: ux-decision\n  status: tested\n  validated:\n    status: tested\n    date: 2026-10-20\n    evidence: UER-1\n  links:\n    - kind: informed_by\n      to: prd\n---\n\n# UXD-1: Map first?\n\n## Question\n\nMap first?\n\n## Alternatives\n\n- Map first\n- List first\n\n## Recommendation\n\nMap first\n\n## Rationale\n\n- Anglers think in places\n\n## Assumptions\n\n- Location is available\n\n## Validation\n\n- **Status**: tested\n- **Required**: a usability test\n");
  put(a, `${D}/evidence/EV-1.md`, "---\nux:\n  id: EV-1\n  type: research-evidence\n  kind: interview\n  date: 2026-10-12\n  source: \"shared drive\"\n  participants:\n    P1: angler\n---\n\n# EV-1: interviews with anglers\n\n## Source\n\n- kept elsewhere\n\n## Excerpts\n\n- P1: \"I plan the night before\"\n\n## Claims\n\n| ID | Claim | Source | Basis | Confidence | Direction | Verified | Contradicting | Unknown |\n|---|---|---|---|---|---|---|---|---|\n| C1 | Anglers plan the night before | P1 at 00:04 | observed | medium | no | yes | – | – |\n\n## Synthesis notes\n\n- None.\n");
  put(a, `${D}/tests/TK-1/scenarios.md`, "# Scenarios\n");
  put(a, `${D}/tests/TK-1/findings.json`, JSON.stringify({ kit: "TK-1", findings: [] }));
  put(a, `${D}/evaluations/UER-1.md`, "# UER-1\n");
  put(a, `${D}/insights/INS-2026-10-23.md`, "# INS\n");
  put(a, `${D}/insights/INS-2026-10-23.json`, "{}");
  put(a, `${D}/experiments/EXP-1.md`, "# EXP-1\n");
  put(a, `${D}/baseline.md`, "# Baseline\n");
  return a;
}

describe("US-149: an app's own design documents move into HELIX", () => {
  // @covers US-149-AC7
  test("AC7: migrate proposes jobs, users, decisions, evidence and principles into HELIX, moves kits, reports, insights, experiments and the baseline to run output, and removes the originals; --dry-run changes nothing; without HELIX they wait", () => {
    const a = before();
    const dry = json(a, ["migrate", "--dry-run"]);
    assert.equal(dry.documents.proposals.length, 5);
    assert.ok(existsSync(join(a, `${D}/jobs.md`)), "the dry run changes nothing");
    const r = json(a, ["migrate"]);
    assert.equal(r.migrated, true);
    // Into HELIX, as proposals.
    assert.deepEqual(Object.values(needsTable(a)).map((n) => [n.job, n.importance, n.evidence, n.status]), [["Find a river", "high", "research", "confirmed"], ["Go back to a river", "medium", "none", "hypothesis"]]);
    assert.deepEqual(Object.values(segmentsTable(a)).map((u) => [u.user, u.needs]), [["Weekend anglers", "Find a river, Go back to a river"]]);
    const [adr] = uiDecisions(a);
    assert.deepEqual([adr.title, adr.status], ["Map first?", "tested"]);
    const plan = currentText(a, "docs/helix/01-frame/research/research.md").text;
    assert.match(sectionOf(plan, "Sources", 3), /\| interviews with anglers \| interview \| 2026-10-12 \| shared drive; not copied here \|/);
    assert.match(sectionOf(plan, "Excerpts", 3), /^- P1 \(interviews with anglers\): "I plan the night before"$/m);
    assert.match(sectionOf(plan, "Claims", 3), /^\| Anglers plan the night before \| P1 at 00:04 \| observed \| medium \| – \| yes \|/m);
    assert.match(currentText(a, "docs/helix/01-frame/principles.md").text, /## Experience Principles\n\n- No mandatory account creation/);
    assert.deepEqual(readState(a).principles, []);
    // Run output, out of the repository.
    for (const p of ["runs/studies/tk-1/findings.json", "runs/evaluations/uer-1/report.md", "runs/insights/2026-10-23/insights.md", "runs/insights/2026-10-23/insights.json", "runs/experiments/EXP-1.md", "runs/baseline.md"]) assert.ok(existsSync(join(a, D, p)), p);
    // The originals are gone.
    for (const p of ["jobs.md", "users.md", "decisions", "evidence", "tests", "evaluations", "insights", "experiments", "baseline.md"]) assert.ok(!existsSync(join(a, D, p)), p);
    assert.equal(cli(a, ["validate"]).status, 0, cli(a, ["validate"]).stdout);
    // Once moved, there is nothing left to migrate.
    assert.match(cli(a, ["migrate"]).stdout, /Nothing to migrate/);
  });

  // @covers US-149-AC7
  test("AC7: without HELIX, the documents wait and migrate says to run HELIX's frame; the run output still moves", () => {
    const a = before();
    rmSync(join(a, ".helix.yml"));
    const r = json(a, ["migrate"]);
    assert.match(r.documents.waiting ?? "", /HELIX/);
    assert.ok(existsSync(join(a, `${D}/runs/baseline.md`)));
    assert.ok(existsSync(join(a, `${D}/jobs.md`)), "the documents stay until HELIX can take them");
  });
});
