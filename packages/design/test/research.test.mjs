/* Hypotheses (US-124; FEAT-018 GDL-17): proposed user needs stay
   labelled hypotheses, with no evidence.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { cli, tempApp } from "./helpers.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const jobs = (rows) => `---\nux:\n  id: jobs\n  type: jobs\n---\n\n# Jobs to be done\n\n## Jobs\n\n| ID | Job | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
function app(rows) {
  const a = tempApp();
  mkdirSync(join(a, "docs/ux-builder"), { recursive: true });
  writeFileSync(join(a, "docs/ux-builder/jobs.md"), jobs(rows));
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
  test("AC2: a jobs table of hypotheses with no evidence passes, and each is reported as a hypothesis", () => {
    const a = app(["| J-1 | Discover nearby rivers | high | none | low | hypothesis |", "| J-2 | Find access points | high | none | low | hypothesis |"]);
    const r = cli(a, ["validate"]);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /note {4}docs\/ux-builder\/jobs\.md: J-1 is a hypothesis: Discover nearby rivers/);
    assert.match(r.stdout, /note {4}docs\/ux-builder\/jobs\.md: J-2 is a hypothesis: Find access points/);
  });

  // @covers US-124-AC3
  test("AC3: a hypothesis that lists an evidence source fails, naming the job and the field", () => {
    const a = app(["| J-1 | Discover nearby rivers | high | EV-1 | low | hypothesis |"]);
    mkdirSync(join(a, "docs/ux-builder/evidence"), { recursive: true });
    writeFileSync(join(a, "docs/ux-builder/evidence/EV-1.md"), "---\nux:\n  id: EV-1\n  type: research-evidence\n  kind: interview\n  participants: {}\n---\n\n# EV-1\n\n## Source\n\n- x\n\n## Excerpts\n\n- None.\n\n## Synthesis notes\n\n- None.\n");
    const r = cli(a, ["validate"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /docs\/ux-builder\/jobs\.md: J-1: evidence lists a source, but status is hypothesis/);
  });

  // @covers US-124-AC4
  test("AC4: status --json counts jobs by status, and every hypothesis has confidence low or none", () => {
    const a = app(["| J-1 | Discover nearby rivers | high | none | low | hypothesis |", "| J-2 | Find access points | high | none | low | hypothesis |"]);
    let out = JSON.parse(cli(a, ["status", "--json"]).stdout);
    assert.deepEqual(out.jobs.byStatus, { hypothesis: 2 });
    assert.deepEqual(out.jobs.hypotheses, [{ id: "J-1", confidence: "low" }, { id: "J-2", confidence: "low" }]);
    // Before a jobs table exists, the design state's job points are counted, with no confidence yet.
    const b = tempApp({ state: { assumptions: [{ id: "A-1", text: "J-1: Discover rivers", status: "hypothesis", evidence: [], section: "jobs" }] } });
    out = JSON.parse(cli(b, ["status", "--json"]).stdout);
    assert.deepEqual(out.jobs, { from: "design state", byStatus: { hypothesis: 1 }, hypotheses: [{ id: "A-1", confidence: null }] });
    assert.match(cli(a, ["status"]).stdout, /Jobs: 2 hypothesis\./);
  });
});
