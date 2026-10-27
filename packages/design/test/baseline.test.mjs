/* baseline (US-115-AC5; FEAT-018 GDL-74; SD-006 Baseline).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { emptyState, readState, validate } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const put = (app, path, text) => { mkdirSync(join(app, path, ".."), { recursive: true }); writeFileSync(join(app, path), text); };
const BP = {
  version: 1, kind: "app", name: "River Path",
  supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"] },
  destinations: [{ id: "find", label: "Find", screen: "map" }, { id: "saved", label: "Saved", screen: "saved" }],
  screens: [{ id: "map", title: "Map", pattern: "CollectionList", path: "/" }, { id: "detail", title: "River", pattern: "RecordDetail", path: "/river" }, { id: "saved", title: "Saved", pattern: "CollectionList", path: "/saved" }],
  journeys: [{ id: "J-find", story: "US-001", entry: "map", steps: [{ screen: "map", action: "open" }, { screen: "detail" }] }],
};

function existing() {
  const app = tempApp({ state: emptyState({ startedFrom: "existing" }) });
  writeFileSync(join(app, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(BP));
  writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  put(app, "docs/helix/01-frame/user-stories/US-001-find-a-river.md", "---\nddx:\n  id: US-001\n  type: user-stories\n---\n\n# US-001: Find a river near me\n");
  put(app, "docs/helix/01-frame/user-stories/US-002-save-a-river.md", "---\nddx:\n  id: US-002\n  type: user-stories\n---\n\n# US-002: Save a river for later\n");
  put(app, "docs/ux-builder/assessments/R-20261020T100000Z/backlog.json", JSON.stringify({ findings: [{ id: "F-old", title: "Superseded", status: "open" }] }));
  put(app, "docs/ux-builder/assessments/R-20261022T100000Z/backlog.json", JSON.stringify({ findings: [
    { id: "F-03", title: "The detail screen is a dead end", priority: "P1", journey_id: "J-find", status: "open" },
    { id: "F-04", title: "Rejected one", status: "rejected" },
  ] }));
  return app;
}

describe("baseline", () => {
  // @covers US-115-AC5
  test("lists every screen, journey, story and open finding; drafts jobs and tasks as current state, assumed; the activity is baseline", () => {
    const app = existing();
    const r = cli(app, ["baseline", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const text = readFileSync(join(app, "docs/ux-builder/baseline.md"), "utf8");
    for (const s of ["| map | CollectionList | / |", "| detail | RecordDetail | /river |", "| saved | CollectionList | /saved |"]) assert.ok(text.includes(s), s);
    assert.match(text, /\| J-find \| US-001 \| map → detail \|/);
    assert.match(text, /- US-001: Find a river near me\n- US-002: Save a river for later/);
    assert.match(text, /- F-03: The detail screen is a dead end, P1, J-find/);
    assert.doesNotMatch(text, /F-04|F-old/, "rejected findings and older runs are left out");
    assert.match(text, /## Draft jobs\n\n- A-2: J-1: Find a river near me \(current state, assumed\)\n- A-3: J-2: Save a river for later \(current state, assumed\)/);
    assert.match(text, /## Draft tasks\n\n- A-4: T-1: complete J-find \(Find a river near me\) \(current state, assumed\)/);
    assert.match(text, /## Draft brief\n\n- A-1: River Path offers Find, Saved \(current state, assumed\)/);

    const state = readState(app);
    assert.equal(state.activity, "baseline");
    assert.deepEqual(state.assumptions.map((a) => [a.id, a.status]), [["A-1", "current-state"], ["A-2", "current-state"], ["A-3", "current-state"], ["A-4", "current-state"]]);
    assert.equal(validate(app).valid, true, JSON.stringify(validate(app).problems));
    assert.equal(JSON.parse(r.stdout).run, "R-20261022T100000Z");

    // Run again: nothing is drafted twice.
    assert.equal(cli(app, ["baseline"]).status, 0);
    assert.equal(readState(app).assumptions.length, 4);
  });

  test("without a blueprint it says to run init; without a run it says so", () => {
    const none = tempApp();
    const r = cli(none, ["baseline"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no docs\/ux-builder\/blueprint\/app\.blueprint\.json/);
    const app = existing();
    rmSync(join(app, "docs/ux-builder/assessments"), { recursive: true });
    assert.equal(cli(app, ["baseline"]).status, 0);
    assert.match(readFileSync(join(app, "docs/ux-builder/baseline.md"), "utf8"), /No assessment run yet \(ux-builder-audit assess\)/);
  });
});
