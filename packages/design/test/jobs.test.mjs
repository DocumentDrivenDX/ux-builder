/* The evidence-linked jobs table (US-126; FEAT-018 GDL-20, GDL-21).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { exampleFile } from "../index.mjs";
import { cli, putUiAdr, tempApp } from "./helpers.mjs";

const jobs = (rows) => `---\nux:\n  id: jobs\n  type: jobs\n---\n\n# Jobs to be done\n\n## Jobs\n\n| ID | Job | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
const evidence = "---\nddx:\n  id: research-anglers\n  type: research-plan\n---\n\n# Research plan: anglers\n\n## Research Methods\n\n### Sources\n\n| Source | Kind | Date | Where it is kept |\n|---|---|---|---|\n| interview 1 | interview | 2026-10-12 | shared drive |\n";

function app(rows, { ev = true } = {}) {
  const a = tempApp();
  mkdirSync(join(a, "docs/helix/01-frame/research"), { recursive: true }); writeFileSync(join(a, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  writeFileSync(join(a, "docs/ux-builder/jobs.md"), jobs(rows));
  if (ev) writeFileSync(join(a, "docs/helix/01-frame/research/anglers.md"), evidence);
  return a;
}
const v = (a) => { const r = cli(a, ["validate"]); return { status: r.status, out: r.stdout }; };

describe("US-126: jobs", () => {
  // @covers US-126-AC1
  test("AC1: every job has a unique J- ID, an importance, a confidence and an evidence list, each its own field", () => {
    assert.equal(v(app(["| J-1 | Discover nearby rivers | high | anglers | high | confirmed |"])).status, 0);
    const r = v(app(["| J-1 | Discover nearby rivers | high | anglers | high | confirmed |", "| J-1 | Find access | urgent | anglers | sure | confirmed |", "| Find | x | high | none | low | hypothesis |"]));
    assert.equal(r.status, 1);
    assert.match(r.out, /J-1 is used by more than one job/);
    assert.match(r.out, /J-1: importance is "urgent"; use high, medium or low/);
    assert.match(r.out, /J-1: confidence is "sure"; use high, medium or low/);
    assert.match(r.out, /job row "Find" needs an ID J-<n>/);
  });

  // @covers US-126-AC2
  test("AC2: a job citing nope, which does not exist, fails naming the job and the source", () => {
    const r = v(app(["| J-1 | Discover nearby rivers | high | anglers, nope | high | confirmed |"]));
    assert.equal(r.status, 1);
    assert.match(r.out, /docs\/ux-builder\/jobs\.md: J-1: evidence nope is not a study \(docs\/helix\/01-frame\/research\/\)/);
  });

  // @covers US-126-AC3
  test("AC3: high confidence with no evidence fails: confidence above low needs a source", () => {
    const r = v(app(["| J-1 | Discover nearby rivers | high | none | high | confirmed |"]));
    assert.equal(r.status, 1);
    assert.match(r.out, /J-1: confidence high needs at least one evidence source \(a study\)/);
  });

  // @covers US-126-AC4
  test("AC4: a task or a decision record citing a low-confidence job is warned about, naming the item and the job", () => {
    const a = app(["| J-1 | Discover nearby rivers | high | anglers | high | confirmed |", "| J-3 | Compare river conditions | medium | none | low | hypothesis |"]);
    writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify({ tasks: [{ id: "T-2", goal: "Compare two rivers", jobs: ["J-3"] }] }));
    const adr = putUiAdr(a, { why: "Supports immediate exploration and J-3." });
    const r = v(a);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /warning docs\/ux-builder\/blueprint\/app\.blueprint\.json: T-2 relies on J-3 \("Compare river conditions"\), whose confidence is low/);
    assert.ok(r.out.includes(`warning ${adr}: ADR-001 relies on J-3 ("Compare river conditions"), whose confidence is low`), r.out);
  });

  // @covers US-126-AC5
  test("AC5: a task citing a job jobs.md lacks fails, naming the task and the ID", () => {
    const a = app(["| J-1 | Discover nearby rivers | high | anglers | high | confirmed |"]);
    writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify({ tasks: [{ id: "T-1", goal: "Find a river", jobs: ["J-1", "J-7"] }] }));
    const r = v(a);
    assert.equal(r.status, 1);
    assert.match(r.out, /docs\/ux-builder\/blueprint\/app\.blueprint\.json: T-1 cites J-7, which docs\/ux-builder\/jobs\.md does not have/);
  });
});
