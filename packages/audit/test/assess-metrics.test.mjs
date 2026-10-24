/* Agent-measured task metrics per walked journey (FEAT-018 GDL-52,
   GDL-53; US-139; CONTRACT-008 "Amendment to CONTRACT-006").

     npm run build && npm test --workspace @ux-builder/audit */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { score } from "@ux-builder/ui/blueprint";
import { AGENT_NOTE, metrics } from "../assess/metrics.mjs";
import { validateReport } from "../assess/validate-report.mjs";
import { prepared } from "./fixtures/run-package.mjs";

const CLI = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const made = [];
after(() => { for (const p of made) p.remove(); });
const st = ["empty", "loading", "error"];
const BP = {
  version: 1, kind: "app", name: "review", supports: { sizeClasses: ["compact"], inputs: ["coarse"] },
  destinations: [{ id: "queue", label: "Queue", screen: "queue" }, { id: "help", label: "Help", screen: "help" }],
  screens: [
    { id: "queue", title: "Queue", pattern: "CollectionList", states: st, actions: [{ id: "open", label: "Open", to: "entry", primary: true }, { id: "help", label: "Help", to: "help" }] },
    { id: "entry", title: "Entry", pattern: "RecordDetail", states: st, actions: [{ id: "approve", label: "Approve", to: "done", primary: true }, { id: "back", label: "Back", to: "queue" }] },
    { id: "done", title: "Approved", pattern: "RecordDetail", states: st },
    { id: "help", title: "Help", pattern: "RecordDetail", states: st, actions: [{ id: "back", label: "Back", to: "queue" }] },
  ],
  journeys: [
    { id: "J-review", story: "US-001", entry: "queue", steps: [{ screen: "queue", action: "open" }, { screen: "entry", action: "approve" }, { screen: "done" }] },
    { id: "J-undo", story: "US-002", entry: "queue", steps: [{ screen: "queue", action: "open" }, { screen: "entry" }] },
  ],
};
const at = (s) => `2026-10-21T09:00:${String(s).padStart(2, "0")}Z`;
/* J-review: the agent opened an entry, went back to the queue and into help
   looking for the approval limit, came back and approved. J-undo stopped. */
const WALK = { schema: "walkthrough", version: 1, journeys: [
  { id: "J-review", status: "completed", steps: [
    { n: 1, action: "open the queue", screen: "queue", status: "done", at: at(0) },
    { n: 2, action: "open the first entry", screen: "entry", status: "done", at: at(4) },
    { n: 3, action: "look for the approval limit", screen: "entry", status: "done", at: at(10), notFound: "the approval limit" },
    { n: 4, action: "go back to the queue", screen: "queue", status: "done", at: at(13) },
    { n: 5, action: "open Help", screen: "help", status: "done", at: at(15), error: "Help failed to load: try again" },
    { n: 6, action: "back to the queue", screen: "queue", status: "done", at: at(20) },
    { n: 7, action: "open the first entry again", screen: "entry", status: "done", at: at(22), failed: true },
    { n: 8, action: "approve", screen: "done", status: "done", at: at(30) },
  ] },
  { id: "J-undo", status: "blocked", steps: [
    { n: 1, action: "open the queue", screen: "queue", status: "done" },
    { n: 2, action: "find Undo after approving", screen: "entry", status: "blocked", reason: "no Undo control is shown" },
    { n: 3, action: "undo", status: "not-assessed", reason: "blocked at step 2" },
  ] },
] };
function run() {
  const p = prepared();
  made.push(p);
  writeFileSync(join(p.r.dir, "app.blueprint.json"), JSON.stringify(BP));
  p.write("walkthrough.json", WALK);
  return p;
}
const audits = (p, ...args) => spawnSync(process.execPath, [CLI, "assess", ...args], { cwd: p.r.dir, encoding: "utf8" });

describe("US-139: see agent-measured task effort per journey", () => {
  // @covers US-139-AC1
  test("AC1: metrics.json holds completion, interactions, the shortest path, the path taken, backtracks, failed actions, information not found, interface errors and time per step", () => {
    const p = run();
    const out = audits(p, "metrics", p.dir);
    assert.equal(out.status, 0, out.stderr);
    const m = p.read("metrics.json");
    assert.equal(m.label, "agent-measured");
    const j = m.journeys.find((x) => x.journey === "J-review");
    assert.equal(j.completed, true);
    assert.equal(j.interactions, 8);
    assert.equal(j.shortestPath, score(BP).find((x) => x.journey === "J-review").shortestPath);
    assert.equal(j.shortestPath, 2);
    assert.deepEqual(j.pathTaken, ["queue", "entry", "queue", "help", "queue", "entry", "done"]);
    assert.equal(j.failedActions, 1);
    assert.deepEqual(j.informationNotFound, [{ n: 3, what: "the approval limit" }]);
    assert.deepEqual(j.interfaceErrors, [{ n: 5, error: "Help failed to load: try again" }]);
    assert.deepEqual(j.timePerStep.map((t) => t.seconds), [4, 6, 3, 2, 5, 2, 8, null]);
    assert.deepEqual(validateReport(p.dir).filter((x) => x.file === "metrics.json" || x.file === "walkthrough.json"), []);
  });

  // @covers US-139-AC2
  test("AC2: a walk that revisits screens counts its backtracks and the interactions over the shortest path", () => {
    const p = run();
    const j = metrics(p.dir).journeys.find((x) => x.journey === "J-review");
    // queue → entry → queue (back) → help → queue (back) → entry (again) → done.
    assert.equal(j.backtracks, 3);
    assert.equal(j.moves, 6);
    assert.equal(j.extraInteractions, 4);
  });

  // @covers US-139-AC3
  test("AC3: the report labels every metric agent-measured and says agents navigate differently from people", () => {
    const p = run();
    metrics(p.dir);
    audits(p, "report", p.dir);
    const md = readFileSync(join(p.dir, "report.md"), "utf8");
    const part = md.slice(md.indexOf("## Task metrics (agent-measured)"));
    assert.ok(part.startsWith("## Task metrics (agent-measured)\n\n" + AGENT_NOTE));
    assert.match(AGENT_NOTE, /agent navigates differently from people/);
    const rows = part.split("\n## ")[0].split("\n").filter((l) => l.startsWith("- "));
    assert.equal(rows.length, 18, "nine metrics for each of two journeys");
    for (const r of rows) assert.match(r, /^- [A-Z][a-z ]+ \(agent-measured\): /);
    assert.match(readFileSync(join(p.dir, "report.html"), "utf8"), /agent navigates differently from people/);
  });

  // @covers US-139-AC4
  test("AC4: a journey the agent could not complete: completion false and the step where it stopped", () => {
    const p = run();
    const j = metrics(p.dir).journeys.find((x) => x.journey === "J-undo");
    assert.equal(j.completed, false);
    assert.deepEqual(j.stoppedAt, { n: 2, action: "find Undo after approving", screen: "entry", reason: "no Undo control is shown" });
    assert.equal(j.interactions, 2, "the step not assessed was not taken");
    audits(p, "report", p.dir);
    assert.match(readFileSync(join(p.dir, "report.md"), "utf8"), /- Completed \(agent-measured\): no — stopped at step 2 on entry \(no Undo control is shown\)/);
  });
});
