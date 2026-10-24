/* The usability test kit (US-140; FEAT-018 GDL-54; CONTRACT-008
   Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { testKit } from "../index.mjs";
import { cli } from "./helpers.mjs";
import { kitApp } from "./kit-fixture.mjs";

describe("US-140: get a usability test kit from the journeys", () => {
  // @covers US-140-AC1
  test("AC1: test-kit writes docs/ux/tests/TK-<n>/ with its files, numbered after the last kit", () => {
    const a = kitApp();
    let r = cli(a, ["test-kit", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).id, "TK-1");
    for (const f of ["kit.md", "scenarios.md", "script.md", "consent.md", "screener.md", "observations.csv"]) assert.ok(existsSync(join(a, "docs/ux/tests/TK-1", f)), f);
    r = cli(a, ["test-kit"]);
    assert.match(r.stdout, /^Wrote docs\/ux\/tests\/TK-2\/: 2 tasks \(J-find, J-saved\)\./);
    assert.deepEqual(readdirSync(join(a, "docs/ux/tests")).sort(), ["TK-1", "TK-2"]);
    // The kit is one docs/ux document, kit.md; its other files are its parts.
    const v = JSON.parse(cli(a, ["validate", "--json"]).stdout);
    assert.deepEqual(v.documents.filter((d) => d.path.startsWith("docs/ux/tests/")).map((d) => d.path), ["docs/ux/tests/TK-1/kit.md", "docs/ux/tests/TK-2/kit.md"]);
    assert.deepEqual(v.problems.filter((p) => p.path.startsWith("docs/ux/tests/")), []);
  });

  // @covers US-140-AC2
  test("AC2: a scenario is the user's goal, with no screen, pattern or control name from the blueprint", () => {
    const a = kitApp();
    const kit = testKit(a);
    const scenarios = readFileSync(join(a, kit.dir, "scenarios.md"), "utf8");
    const rows = scenarios.split("\n").filter((l) => /^\| [12] \|/.test(l)).map((l) => l.split("|")[3]);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /You want to find a river to fish this weekend\. Show me how you would do that\./);
    for (const row of rows) for (const w of ["River map", "River details", "Saved", "CollectionList", "RecordDetail", "Open river details", "Save river", "map", "detail"]) assert.ok(!new RegExp(`\\b${w}\\b`).test(row), `"${w}" in: ${row}`);
    assert.ok(!/River map|Open river details/.test(readFileSync(join(a, kit.dir, "script.md"), "utf8")));
  });

  // @covers US-140-AC3
  test("AC3: each scenario lists its success criteria by ID from the journey's acceptance criteria", () => {
    const a = kitApp();
    const r = cli(a, ["test-kit", "--json"]);
    const kit = JSON.parse(r.stdout);
    assert.deepEqual(kit.tasks[0].criteria.map((c) => c.id), ["US-001-AC1", "US-001-AC2"]);
    assert.match(kit.tasks[0].criteria[0].text, /they find one with access/);
    const scenarios = readFileSync(join(a, "docs/ux/tests/TK-1/scenarios.md"), "utf8");
    assert.match(scenarios, /^\| 1 \| J-find \| .* \| US-001-AC1, US-001-AC2 \|$/m);
    // A journey with no criteria: the scenario says they are missing, and the command warns.
    assert.match(scenarios, /^\| 2 \| J-saved \| .* \| missing: the journey names no acceptance criteria \|$/m);
    assert.deepEqual(kit.warnings, ["J-saved names no acceptance criteria: task 2 has no success criteria"]);
    assert.match(cli(a, ["test-kit"]).stdout, /warning: J-saved names no acceptance criteria/);
  });

  // @covers US-140-AC4
  test("AC4: --journey keeps only the named journeys; an unknown journey exits 2 naming it", () => {
    const a = kitApp();
    const r = JSON.parse(cli(a, ["test-kit", "--journey", "J-saved", "--json"]).stdout);
    assert.deepEqual(r.tasks.map((t) => t.journey), ["J-saved"]);
    assert.doesNotMatch(readFileSync(join(a, "docs/ux/tests/TK-1/scenarios.md"), "utf8"), /J-find/);
    const bad = cli(a, ["test-kit", "--journey", "J-nope"]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /no journey J-nope in app\.blueprint\.json; it has J-find, J-saved/);
    assert.ok(!existsSync(join(a, "docs/ux/tests/TK-2")), "nothing written");
  });

  // @covers US-140-AC5
  test("AC5: the screener asks about the brief's target users; the observation sheet has a row per task with its columns", () => {
    const a = kitApp();
    const kit = testKit(a);
    const screener = readFileSync(join(a, kit.dir, "screener.md"), "utf8");
    assert.match(screener, /- Are you weekend anglers new to the area\?/);
    assert.match(screener, /- Are you fly-fishing guides\?/);
    const sheet = readFileSync(join(a, kit.dir, "observations.csv"), "utf8").trim().split("\n");
    assert.deepEqual(sheet[0].split(","), ["participant", "task", "completed", "seconds", "errors", "assists", "remark", "problem"]);
    assert.deepEqual(sheet.slice(1).map((l) => l.split(",")[1]), ["1", "2"]);
  });
});
