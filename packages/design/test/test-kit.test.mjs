/* The usability test kit (US-140; FEAT-018 GDL-54; CONTRACT-008
   Commands; ADR-042): the study's plan, and its run output.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentText, goalText, sectionOf, testKit } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { kitApp } from "./kit-fixture.mjs";

const PLAN = "docs/helix/01-frame/research/rivers.md";
const RUN = "docs/ux-builder/runs/studies/rivers";
const plan = (a) => currentText(a, PLAN).text;
const KIT = ["test-kit", "--study", "rivers"];

describe("US-140: get a usability test kit from the journeys", () => {
  // @covers US-140-AC1
  test("AC1: test-kit proposes the study's scenarios, success criteria and screener for its research plan, and writes the session materials as run output", () => {
    const a = kitApp();
    let r = cli(a, [...KIT, "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepEqual({ study: out.study, path: out.path, run: out.run }, { study: "rivers", path: PLAN, run: RUN });
    for (const f of ["tasks.json", "script.md", "consent.md", "observations.csv"]) assert.ok(existsSync(join(a, RUN, f)), f);
    assert.ok(!existsSync(join(a, PLAN)), "HELIX is written only by applying the proposal");
    for (const h of ["Scenarios", "Success Criteria", "Screener"]) assert.match(plan(a), new RegExp(`^### ${h}$`, "m"), h);
    r = cli(a, KIT);
    assert.match(r.stdout, /^Proposed the rivers study's scenarios, success criteria and screener for docs\/helix\/01-frame\/research\/rivers\.md; wrote docs\/ux-builder\/runs\/studies\/rivers\/: 2 tasks \(J-find, J-saved\)\./);
    assert.equal(cli(a, ["test-kit"]).status, 2, "a kit belongs to a study");
    // Run output is not a ux-builder document, and the plan passes validate.
    const v = JSON.parse(cli(a, ["validate", "--json"]).stdout);
    assert.deepEqual(v.documents.filter((d) => d.path.startsWith("docs/ux-builder/runs/")), []);
    assert.deepEqual(v.problems, []);
  });

  // @covers US-140-AC2
  test("AC2: a scenario is the user's goal, with no screen, pattern or control name from the blueprint", () => {
    const a = kitApp();
    testKit(a, { study: "rivers" });
    const rows = sectionOf(plan(a), "Scenarios", 3).split("\n").filter((l) => /^\| J-/.test(l)).map((l) => l.split("|")[2]);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /Find a river to fish this weekend\./);
    for (const row of rows) for (const w of ["River map", "River details", "Saved", "CollectionList", "RecordDetail", "Open river details", "Save river", "map", "detail"]) assert.ok(!new RegExp(`\\b${w}\\b`).test(row), `"${w}" in: ${row}`);
    assert.ok(!/River map|Open river details/.test(readFileSync(join(a, RUN, "script.md"), "utf8")));
    // A one-word title or label is the user's own word too, and the goal is said to them, in the second person.
    const bp = { screens: [{ id: "river", title: "River", pattern: "RecordDetail", actions: [{ id: "back", label: "Back" }] }, { id: "saved", title: "Saved", pattern: "CollectionList" }] };
    assert.equal(goalText("Go back to a river I saved", bp), "go back to a river you saved");
    assert.equal(goalText("Find a river with public access near me", bp), "find a river with public access near you");
  });

  // @covers US-140-AC3
  test("AC3: each scenario's success criteria list the journey's acceptance criteria by ID", () => {
    const a = kitApp();
    const kit = JSON.parse(cli(a, [...KIT, "--json"]).stdout);
    assert.deepEqual(kit.tasks[0].criteria.map((c) => c.id), ["US-001-AC1", "US-001-AC2"]);
    assert.match(kit.tasks[0].criteria[0].text, /they find one with access/);
    const criteria = sectionOf(plan(a), "Success Criteria", 3);
    assert.match(criteria, /^\| J-find \| The participant can find a river to fish this weekend, unaided\. \| US-001-AC1, US-001-AC2 \|$/m);
    // A journey with no criteria: the row says they are missing, and the command warns.
    assert.match(criteria, /^\| J-saved \| .* \| missing: the journey names no acceptance criteria \|$/m);
    assert.deepEqual(kit.warnings, ["J-saved names no acceptance criteria: task 2 has no success criteria"]);
    assert.match(cli(a, KIT).stdout, /warning: J-saved names no acceptance criteria/);
  });

  // @covers US-140-AC4
  test("AC4: --journey keeps only the named journeys; an unknown journey exits 2 naming it", () => {
    const a = kitApp();
    const r = JSON.parse(cli(a, [...KIT, "--journey", "J-saved", "--json"]).stdout);
    assert.deepEqual(r.tasks.map((t) => t.journey), ["J-saved"]);
    assert.doesNotMatch(sectionOf(plan(a), "Scenarios", 3), /J-find/);
    const b = kitApp();
    const bad = cli(b, [...KIT, "--journey", "J-nope"]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /no journey J-nope in docs\/ux-builder\/blueprint\/app\.blueprint\.json; it has J-find, J-saved/);
    assert.ok(!existsSync(join(b, RUN)), "nothing written");
  });

  // @covers US-140-AC5
  test("AC5: the screener asks about the brief's target users; the observation sheet has a row per task with its columns", () => {
    const a = kitApp();
    testKit(a, { study: "rivers" });
    const screener = sectionOf(plan(a), "Screener", 3);
    assert.match(screener, /- \*\*Include\*\*: weekend anglers new to the area; fly-fishing guides/);
    assert.match(screener, /- Does this describe you: weekend anglers new to the area\? \(yes \/ no\)/);
    assert.match(screener, /- Does this describe you: fly-fishing guides\? \(yes \/ no\)/);
    const sheet = readFileSync(join(a, RUN, "observations.csv"), "utf8").trim().split("\n");
    assert.deepEqual(sheet[0].split(","), ["participant", "task", "completed", "seconds", "errors", "assists", "remark", "problem", "user"]);
    assert.deepEqual(sheet.slice(1).map((l) => l.split(",")[1]), ["1", "2"]);
  });
});
