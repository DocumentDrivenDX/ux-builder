/* score and compare (US-130; FEAT-018 GDL-28 to GDL-30; SD-006).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { emptyState, serialize } from "@ux-builder/design";
import { score } from "../blueprint/index.mjs";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "bp-compare-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const run = (dir, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8" });

const st = ["empty", "loading", "error"];
const sc = (id, pattern, actions = []) => ({ id, title: id, pattern, states: st, actions });
const TASKS = [{ id: "T-1", goal: "Find a river", success: ["US-001-AC1"] }];
const base = (screens, steps, destinations) => ({ version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] }, destinations, screens, tasks: TASKS, journeys: [{ id: "J-find", story: "US-001", task: "T-1", entry: steps[0].screen, steps }] });
/* Search first: search → results (input) → detail: 3 steps, 1 required input. */
const SEARCH = base([sc("search", "FormPage", [{ id: "go", label: "Search", to: "results" }]), sc("results", "CollectionList", [{ id: "open", label: "Open", to: "detail" }]), sc("detail", "RecordDetail")],
  [{ screen: "search", action: "go", inputs: { required: ["river name"] } }, { screen: "results", action: "open" }, { screen: "detail" }], [{ id: "find", label: "Find", screen: "search" }]);
/* Map first: map → detail: 2 steps, nothing required. */
const MAP = base([sc("map", "CollectionList", [{ id: "open", label: "Open", to: "detail" }]), sc("detail", "RecordDetail")], [{ screen: "map", action: "open" }, { screen: "detail" }], [{ id: "find", label: "Find", screen: "map" }]);
/* Activity first: activity (decision) → list → detail, with a hop to another destination. */
const ACTIVITY = base([sc("activity", "FormPage", [{ id: "pick", label: "Pick", to: "list" }]), sc("list", "CollectionList", [{ id: "open", label: "Open", to: "detail" }]), sc("detail", "RecordDetail")],
  [{ screen: "activity", action: "pick", decision: "Which activity" }, { screen: "list", action: "open" }, { screen: "detail" }], [{ id: "start", label: "Start", screen: "activity" }, { id: "browse", label: "Browse", screen: "list" }]);

function app(extra = {}) {
  const dir = mkdtempSync(join(tmp, "app-"));
  mkdirSync(join(dir, ".ux-builder"), { recursive: true });
  for (const [n, b] of [["search-first", SEARCH], ["map-first", MAP], ["activity-first", ACTIVITY]]) writeFileSync(join(dir, `app.blueprint.${n}.json`), JSON.stringify(b));
  writeFileSync(join(dir, ".ux-builder/design-state.json"), serialize({ ...emptyState(), activity: "explore", ...extra }));
  return dir;
}
const files = ["app.blueprint.search-first.json", "app.blueprint.map-first.json", "app.blueprint.activity-first.json"];

describe("US-130: score and compare", () => {
  // @covers US-130-AC1
  test("AC1: score gives per journey the steps, screens, modals, required inputs, decisions, hops, findings and patterns, labelled predicted", () => {
    const [s] = score(ACTIVITY);
    assert.deepEqual(s, { journey: "J-find", task: "T-1", label: "predicted", steps: 3, shortestPath: 2, screens: 3, modals: 0, requiredInputs: 0, decisions: 1, hops: 1, findings: s.findings, patterns: { reused: 0, introduced: 3 } });
    assert.equal(typeof s.findings, "number");
    const dir = app();
    const r = run(dir, "score", "app.blueprint.search-first.json", "--json");
    assert.equal(r.status, 0, r.stderr);
    const [x] = JSON.parse(r.stdout);
    assert.deepEqual([x.label, x.steps, x.requiredInputs, x.decisions, x.hops], ["predicted", 3, 1, 0, 0]);
  });

  // @covers US-130-AC2
  test("AC2: the page marks, per task and dimension, the alternative with the best value", () => {
    const dir = app();
    const r = run(dir, "compare", ...files, "--json");
    assert.equal(r.status, 0, r.stderr);
    const { best } = JSON.parse(r.stdout);
    assert.deepEqual(best["T-1"].steps, ["map-first"]);
    assert.deepEqual(best["T-1"].requiredInputs, ["map-first", "activity-first"]);
    assert.deepEqual(best["T-1"].decisions, ["search-first", "map-first"]);
    const html = readFileSync(join(dir, "blueprint-compare/compare.html"), "utf8");
    assert.match(html, /<th scope="row">Steps<\/th><td>3<\/td><td class="best">2 <span class="mark">best<\/span><\/td><td>3<\/td>/);
  });

  // @covers US-130-AC3
  test("AC3: judgments in the design state appear with their reasoning, labelled preliminary, not measured", () => {
    const dir = app({ alternatives: [{ name: "map-first", file: "app.blueprint.map-first.json", status: "candidate", judgments: [{ criterion: "Supports exploration", value: "excellent", reasoning: "Rivers near the user are visible at once." }] }] });
    assert.equal(run(dir, "compare", ...files).status, 0);
    const html = readFileSync(join(dir, "blueprint-compare/compare.html"), "utf8");
    assert.match(html, /<li><strong>Supports exploration<\/strong>: excellent\. <em>Preliminary judgment, not a measured result\.<\/em> Rivers near the user are visible at once\.<\/li>/);
  });

  // @covers US-130-AC4
  test("AC4: the same inputs twice give byte-identical pages", () => {
    const dir = app();
    run(dir, "compare", ...files, "--out", "one");
    run(dir, "compare", ...files, "--out", "two");
    assert.equal(readFileSync(join(dir, "one/compare.html"), "utf8"), readFileSync(join(dir, "two/compare.html"), "utf8"));
  });

  // @covers US-130-AC5
  test("AC5: alternatives whose tasks differ: exit 1 naming the tasks", () => {
    const dir = app();
    writeFileSync(join(dir, "app.blueprint.map-first.json"), JSON.stringify({ ...MAP, tasks: [...TASKS, { id: "T-2", goal: "Save", success: ["US-002-AC1"] }] }));
    const r = run(dir, "compare", ...files);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /do not cover the same tasks: T-2\. search-first lacks T-2; activity-first lacks T-2\./);
  });
});
