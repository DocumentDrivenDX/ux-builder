/* Hypotheses (US-124; FEAT-018 GDL-17): proposed user needs stay
   labelled hypotheses, with no evidence.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { cli, helixApp, tempApp } from "./helpers.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const PRD = "docs/helix/01-frame/prd.md";
/* An app whose PRD has these User Needs rows (applied). */
function app(rows) {
  const a = helixApp();
  writeFileSync(join(a, PRD), `---\nddx:\n  id: prd\n  type: prd\n---\n\n# PRD\n\n## Users and Scope\n\n### User Needs\n\n| Need | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|\n${rows.join("\n")}\n`);
  return a;
}

describe("US-124: hypotheses", () => {
  // @covers US-124-AC1
  test("AC1: the skill's research section proposes segments, jobs, motivations, frustrations, contexts and accessibility needs, each a hypothesis with no evidence", () => {
    const s = SKILL.slice(SKILL.indexOf("## Understand users"), SKILL.indexOf("## Checkpoints"));
    assert.match(s, /propose the user segments, jobs to be done, motivations, frustrations,\s+usage contexts and accessibility needs/);
    assert.match(s, /Mark every item \*hypothesis\*, with\s+no evidence/);
  });

  // @covers US-124-AC2
  test("AC2: User Needs that are assumed, with no evidence, pass, and each is reported as assumed", () => {
    const a = app(["| Discover nearby rivers | high | none | low | assumed |", "| Find access points | high | none | low | assumed |"]);
    const r = cli(a, ["validate"]);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /note {4}docs\/helix\/01-frame\/prd\.md: need "Discover nearby rivers" is assumed/);
    assert.match(r.stdout, /note {4}docs\/helix\/01-frame\/prd\.md: need "Find access points" is assumed/);
  });

  // @covers US-124-AC3
  test("AC3: an assumed need that lists an evidence source fails, naming the need and the field", () => {
    const a = app(["| Discover nearby rivers | high | anglers | low | assumed |"]);
    mkdirSync(join(a, "docs/helix/01-frame/research"), { recursive: true });
    writeFileSync(join(a, "docs/helix/01-frame/research/anglers.md"), "---\nddx:\n  id: research-anglers\n  type: research-plan\n---\n\n# Research plan: anglers\n");
    const r = cli(a, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /docs\/helix\/01-frame\/prd\.md: need "Discover nearby rivers": evidence lists a source, but status is assumed/);
  });

  // @covers US-124-AC4
  test("AC4: status --json counts needs by status, and every assumed one has confidence low or none", () => {
    const a = app(["| Discover nearby rivers | high | none | low | assumed |", "| Find access points | high | none | low | assumed |"]);
    let out = JSON.parse(cli(a, ["status", "--json"]).stdout);
    assert.deepEqual(out.jobs.byStatus, { hypothesis: 2 });
    assert.deepEqual(out.jobs.hypotheses, [{ id: "Discover nearby rivers", confidence: "low" }, { id: "Find access points", confidence: "low" }]);
    // Before a jobs table exists, the design state's job points are counted, with no confidence yet.
    const b = tempApp({ state: { assumptions: [{ id: "A-1", text: "J-1: Discover rivers", status: "hypothesis", evidence: [], section: "jobs" }] } });
    out = JSON.parse(cli(b, ["status", "--json"]).stdout);
    assert.deepEqual(out.jobs, { from: "design state", byStatus: { hypothesis: 1 }, hypotheses: [{ id: "A-1", confidence: null }] });
    assert.match(cli(a, ["status"]).stdout, /Jobs: 2 hypothesis\./);
  });
});
