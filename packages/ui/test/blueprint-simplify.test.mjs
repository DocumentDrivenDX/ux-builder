/* simplify (US-128; FEAT-018 GDL-24; SD-006 Simplify).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { simplify } from "../blueprint/index.mjs";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "bp-simplify-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const s = (id, actions = []) => ({ id, title: id, pattern: "RecordDetail", states: ["empty", "loading", "error"], actions });
/* Seeded: T-2 requires "location", which T-1's system action produces (an input to infer);
   a decision on detail, which has one action (a default); two steps on saved with no
   decision between them (to combine); map → help → map (a hop to remove). */
const BP = {
  version: 1, kind: "app", name: "rivers",
  supports: { sizeClasses: ["compact"], inputs: ["coarse"] },
  destinations: [{ id: "find", label: "Find", screen: "map" }, { id: "help", label: "Help", screen: "help" }],
  screens: [s("map", [{ id: "help", label: "Help", to: "help" }, { id: "open", label: "Open", to: "detail" }]), s("help", [{ id: "back", label: "Back", to: "back" }]), s("detail", [{ id: "save", label: "Save", to: "saved" }]), s("saved", [{ id: "pick", label: "Pick a list", to: "state:empty" }])],
  tasks: [
    { id: "T-1", goal: "Find a river", success: ["US-001-AC1"], systemActions: ["Detect the user's location"] },
    { id: "T-2", goal: "Save a river", success: ["US-002-AC1"], inputs: { required: ["location", "name"] } },
  ],
  journeys: [
    { id: "J-find", story: "US-001", task: "T-1", entry: "map", steps: [{ screen: "map", action: "help" }, { screen: "help", action: "back" }, { screen: "map", action: "open" }, { screen: "detail" }] },
    { id: "J-save", story: "US-002", task: "T-2", entry: "detail", steps: [{ screen: "detail", decision: "Which list" }, { screen: "saved", action: "pick" }, { screen: "saved" }] },
  ],
};
const run = (file, json = true) => spawnSync(process.execPath, [CLI, "simplify", file, ...(json ? ["--json"] : [])], { cwd: tmp, encoding: "utf8" });

describe("US-128: simplify", () => {
  // @covers US-128-AC1
  test("AC1: one proposal per seeded opportunity, each with its task, kind, what it saves and what it assumes", () => {
    const { proposals } = simplify(BP);
    assert.deepEqual(proposals.map((p) => [p.task, p.kind]), [["T-1", "remove-hop"], ["T-2", "infer-input"], ["T-2", "default-decision"], ["T-2", "combine-steps"]]);
    for (const p of proposals) {
      assert.ok(p.change && p.assumes, JSON.stringify(p));
      assert.ok(Object.values(p.saves).some((n) => n > 0), JSON.stringify(p));
    }
    assert.deepEqual(proposals.find((p) => p.kind === "remove-hop").saves, { steps: 2, inputs: 0, decisions: 0 });
  });

  // @covers US-128-AC2
  test("AC2: a required input another task's system action produces is proposed as inferable", () => {
    const p = simplify(BP).proposals.find((x) => x.kind === "infer-input");
    assert.equal(p.at, "tasks/T-2/inputs/required/location");
    assert.match(p.change, /Move "location" to inputs\.optional: T-1's system action "Detect the user's location" already produces it\./);
    assert.deepEqual(p.saves, { steps: 0, inputs: 1, decisions: 0 });
  });

  // @covers US-128-AC3
  test("AC3: the same blueprint twice gives identical output", () => {
    writeFileSync(join(tmp, "a.json"), JSON.stringify(BP));
    assert.equal(run("a.json").stdout, run("a.json").stdout);
    assert.deepEqual(simplify(structuredClone(BP)), simplify(BP));
  });

  // @covers US-128-AC4
  test("AC4: the blueprint file is unchanged afterwards", () => {
    const text = JSON.stringify(BP, null, 2);
    writeFileSync(join(tmp, "b.json"), text);
    run("b.json"); run("b.json", false);
    assert.equal(readFileSync(join(tmp, "b.json"), "utf8"), text);
  });

  // @covers US-128-AC5
  test("AC5: with no tasks it exits 0 and says there is no task model to simplify", () => {
    const { tasks, ...none } = BP;
    writeFileSync(join(tmp, "c.json"), JSON.stringify(none));
    const r = run("c.json", false);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /There is no task model to simplify: the blueprint has no tasks\./);
  });
});
