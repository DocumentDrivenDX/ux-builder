/* The PRD's User Needs, rated for importance and evidence (US-126;
   FEAT-018 GDL-20, GDL-21; ADR-042).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentText, needsTable, sectionOf } from "../index.mjs";
import { cli, helixApp } from "./helpers.mjs";

const PRD = "docs/helix/01-frame/prd.md";
const STUDY = "---\nddx:\n  id: research-anglers\n  type: research-plan\n---\n\n# Research plan: anglers\n";
function app() {
  const a = helixApp();
  mkdirSync(join(a, "docs/helix/01-frame/research"), { recursive: true });
  writeFileSync(join(a, "docs/helix/01-frame/research/anglers.md"), STUDY);
  return a;
}
/* The PRD with these User Needs rows, applied. */
const withNeeds = (a, rows) => writeFileSync(join(a, PRD), `---\nddx:\n  id: prd\n  type: prd\n---\n\n# PRD\n\n## Users and Scope\n\n### User Needs\n\n| Need | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|\n${rows.join("\n")}\n`);
const v = (a) => { const r = cli(a, ["validate"]); return { status: r.status, out: r.stdout }; };

describe("US-126: the PRD's User Needs", () => {
  // @covers US-126-AC1
  test("AC1: need add proposes a row of the PRD's User Needs, named by the need, with its importance, evidence, confidence and status, each its own field", () => {
    const a = app();
    const r = JSON.parse(cli(a, ["need", "add", "--need", "Discover nearby rivers", "--importance", "high", "--evidence", "anglers", "--confidence", "high", "--status", "validated", "--json"]).stdout);
    assert.deepEqual({ need: r.need, key: r.key, path: r.path }, { need: "Discover nearby rivers", key: "discover-nearby-rivers", path: PRD });
    assert.ok(!readFileSync(join(a, PRD), "utf8").includes("Discover"), "HELIX is written only by applying the proposal");
    const table = sectionOf(currentText(a, PRD).text, "User Needs", 3);
    assert.equal(table, "| Need | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|\n| Discover nearby rivers | high | anglers | high | validated |");
    // The same need again replaces its row; another importance or confidence is refused.
    cli(a, ["need", "add", "--need", "Discover nearby rivers", "--importance", "medium", "--evidence", "anglers", "--confidence", "medium", "--status", "validated"]);
    assert.equal(Object.keys(needsTable(a)).length, 1);
    assert.equal(needsTable(a)["discover-nearby-rivers"].importance, "medium");
    assert.match(cli(a, ["need", "add", "--need", "Find access", "--importance", "urgent"]).stderr, /--importance is high, medium or low, not "urgent"/);
    assert.match(cli(a, ["need", "add", "--need", "Find access", "--importance", "high", "--confidence", "sure"]).stderr, /--confidence is high, medium or low, not "sure"/);
    assert.equal(cli(a, ["validate"]).status, 0, cli(a, ["validate"]).stdout);
  });

  // @covers US-126-AC2
  test("AC2: a need citing a study that does not exist fails validate, naming the need and the source", () => {
    const a = app();
    withNeeds(a, ["| Discover nearby rivers | high | anglers, nope | high | validated |"]);
    const r = v(a);
    assert.equal(r.status, 1);
    assert.match(r.out, /docs\/helix\/01-frame\/prd\.md: need "Discover nearby rivers": evidence nope is not a study \(docs\/helix\/01-frame\/research\/\)/);
  });

  // @covers US-126-AC3
  test("AC3: confidence above low with no evidence is refused by need add, and fails validate when written by hand", () => {
    const a = app();
    assert.match(cli(a, ["need", "add", "--need", "Discover nearby rivers", "--importance", "high", "--confidence", "high", "--status", "validated"]).stderr, /confidence high needs at least one evidence source \(a study\)/);
    withNeeds(a, ["| Discover nearby rivers | high | none | high | validated |"]);
    const r = v(a);
    assert.equal(r.status, 1);
    assert.match(r.out, /need "Discover nearby rivers": confidence high needs at least one evidence source \(a study\)/);
  });

  // @covers US-126-AC4
  test("AC4: a task citing a low-confidence need is warned about, naming the task and the need", () => {
    const a = app();
    withNeeds(a, ["| Discover nearby rivers | high | anglers | high | validated |", "| Compare river conditions | medium | none | low | assumed |"]);
    writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify({ tasks: [{ id: "compare", goal: "Compare two rivers", needs: ["Compare river conditions"] }] }));
    const r = v(a);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /warning docs\/ux-builder\/blueprint\/app\.blueprint\.json: compare relies on the need "Compare river conditions", whose confidence is low/);
    assert.match(r.out, /note {4}docs\/helix\/01-frame\/prd\.md: need "Compare river conditions" is assumed/);
  });

  // @covers US-126-AC5
  test("AC5: a task citing a need the PRD lacks fails, naming the task and the need", () => {
    const a = app();
    withNeeds(a, ["| Discover nearby rivers | high | anglers | high | validated |"]);
    writeFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify({ tasks: [{ id: "find", goal: "Find a river", needs: ["Discover nearby rivers", "Rate rivers"] }] }));
    const r = v(a);
    assert.equal(r.status, 1);
    assert.match(r.out, /docs\/ux-builder\/blueprint\/app\.blueprint\.json: find cites the need Rate rivers, which the PRD's User Needs does not have/);
  });
});
