/* Production insights per journey (US-144; FEAT-018 GDL-63 to GDL-65;
   ADR-038 rule 4; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import fs, { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, test } from "node:test";
import { syncBuiltinESMExports } from "node:module";
import { insights, rubric } from "../index.mjs";
import { cli, PKG } from "./helpers.mjs";
import { kitApp } from "./kit-fixture.mjs";

const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const at = (s) => `2026-10-20T10:00:${String(s).padStart(2, "0")}Z`;
const ev = (type, journey, step, screen, s, session) => ({ type, journey, step, screen, at: at(s), ...(session ? { session } : {}) });
/* Four people on J-find (two complete, one abandons at step 2, one at step 1 after a failed search), one on J-saved, and an old journey. */
const EVENTS = [
  ev("journey-start", "J-find", 1, "map", 0, "a"), ev("step", "J-find", 1, "map", 0, "a"), ev("step", "J-find", 2, "detail", 10, "a"), ev("complete", "J-find", 2, "detail", 20, "a"),
  ev("journey-start", "J-find", 1, "map", 0, "b"), ev("step", "J-find", 1, "map", 0, "b"), ev("step", "J-find", 2, "detail", 30, "b"), ev("complete", "J-find", 2, "detail", 40, "b"),
  ev("journey-start", "J-find", 1, "map", 0, "c"), ev("step", "J-find", 1, "map", 0, "c"), ev("step", "J-find", 2, "detail", 20, "c"), ev("error-shown", "J-find", 2, "detail", 25, "c"), ev("abandon", "J-find", 2, "detail", 30, "c"),
  ev("journey-start", "J-find", 1, "map", 0, "d"), ev("step", "J-find", 1, "map", 0, "d"), ev("no-results-search", "J-find", 1, "map", 5, "d"), ev("abandon", "J-find", 1, "map", 9, "d"),
  ev("journey-start", "J-saved", 1, "saved", 0, "e"), ev("step", "J-saved", 1, "saved", 0, "e"), ev("complete", "J-saved", 1, "saved", 3, "e"),
  ev("journey-start", "J-activity", 1, "activity", 0, "f"), ev("step", "J-activity", 1, "activity", 0, "f"),
];
const JOBS = "---\nux:\n  id: jobs\n  type: jobs\n---\n\n# Jobs\n\n## Jobs\n\n| ID | Job | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|---|\n| J-1 | Find a river | high | none | low | hypothesis |\n| J-2 | Go back to a river | medium | none | low | hypothesis |\n";
function insightsApp() {
  const a = kitApp();
  writeFileSync(join(a, "events.jsonl"), EVENTS.map((e) => JSON.stringify(e)).join("\n") + "\n");
  writeFileSync(join(a, "support.jsonl"), [
    { text: "The River details page never shows where to park. Call me at 415-555-0123." },
    { text: "Billing question from sam@example.com" },
  ].map((x) => JSON.stringify(x)).join("\n"));
  writeFileSync(join(a, "feedback.txt"), "Saved rivers are hard to find, says Dana\nLove it\n");
  writeFileSync(join(a, ".ux-builder/participants.local.json"), JSON.stringify({ P1: "Dana" }));
  writeFileSync(join(a, "docs/ux-builder/jobs.md"), JOBS);
  return a;
}

describe("US-144: read production insights per journey", () => {
  // @covers US-144-AC1
  test("AC1: insights writes INS-<date>.md with completion, abandonment points, failed searches, feature use and time per step per journey", () => {
    const a = insightsApp();
    const r = json(a, ["insights", "events.jsonl", "--date", "2026-10-23"]);
    assert.equal(r.path, "docs/ux-builder/insights/INS-2026-10-23.md");
    const find = r.journeys.find((j) => j.journey === "J-find");
    assert.deepEqual({ started: find.started, completed: find.completed, abandoned: find.abandoned, failedSearches: find.failedSearches, errors: find.errors, features: find.features, secondsPerStep: find.secondsPerStep },
      { started: 4, completed: 2, abandoned: { 1: 1, 2: 1 }, failedSearches: 1, errors: 1, features: { map: 4, detail: 3 }, secondsPerStep: { "1→2": 20 } });
    const t = readFileSync(join(a, r.path), "utf8");
    assert.match(t, /^\| J-find \| 4 \| 2 \| 50% \| step 1 \(1\) \| 1 \| 1 \| map 4, detail 3 \| 1→2: 20 \|$/m);
    assert.match(t, /^\| J-saved \| 1 \| 1 \| 100% \| none \| 0 \| 0 \| saved 1 \| – \|$/m);
    assert.equal(cli(a, ["validate"]).stdout.includes("INS-2026-10-23.md:"), false, "it validates as an insights document");
  });

  // @covers US-144-AC2
  test("AC2: events naming a journey the blueprint no longer has are reported as unmatched, not dropped", () => {
    const a = insightsApp();
    const r = cli(a, ["insights", "events.jsonl", "--date", "2026-10-23"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /unmatched: J-activity \(2 events; not in the blueprint\)/);
    assert.match(readFileSync(join(a, "docs/ux-builder/insights/INS-2026-10-23.md"), "utf8"), /## Unmatched events\n\n- J-activity: 2 events name a journey the blueprint does not have/);
  });

  // @covers US-144-AC3
  test("AC3: support and feedback entries are masked and linked to the journeys they mention, as evidence sources", () => {
    const a = insightsApp();
    const r = json(a, ["insights", "events.jsonl", "--support", "support.jsonl", "--feedback", "feedback.txt", "--date", "2026-10-23"]);
    assert.deepEqual(r.sources.map((s) => [s.id, s.kind]), [["EV-1", "analytics"], ["EV-2", "support"], ["EV-3", "feedback"]]);
    assert.deepEqual(r.linked.map((l) => [l.evidence, l.journeys]), [["EV-2", ["J-find", "J-saved"]], ["EV-3", ["J-saved"]]]);
    const support = readFileSync(join(a, "docs/ux-builder/evidence/EV-2.md"), "utf8");
    assert.match(support, /^- \[J-find, J-saved\] "The River details page never shows where to park\. Call me at \[masked:phone\]\."$/m);
    assert.ok(!support.includes("sam@example.com") && !support.includes("Billing"), "an entry naming no journey is not cited");
    const feedback = readFileSync(join(a, "docs/ux-builder/evidence/EV-3.md"), "utf8");
    assert.match(feedback, /^- \[J-saved\] "Saved rivers are hard to find, says P1"$/m);
    assert.ok(!feedback.includes("Dana"));
    assert.equal(JSON.parse(cli(a, ["validate", "--json"]).stdout).problems.filter((p) => p.path.startsWith("docs/ux-builder/evidence/")).length, 0);
  });

  // @covers US-144-AC4
  test("AC4: the run's sources join the evidence store, and the jobs table's confidence and the rubric's observed column cite them", () => {
    const a = insightsApp();
    json(a, ["insights", "events.jsonl", "--support", "support.jsonl", "--date", "2026-10-23"]);
    assert.deepEqual(json(a, ["evidence", "list"]).evidence.map((e) => [e.id, e.kind]), [["EV-1", "analytics"], ["EV-2", "support"]]);
    const jobs = readFileSync(join(a, "docs/ux-builder/jobs.md"), "utf8");
    assert.match(jobs, /^\| J-1 \| Find a river \| high \| EV-1, EV-2 \| medium \| confirmed \|$/m);
    assert.match(jobs, /^\| J-2 \| Go back to a river \| medium \| EV-1, EV-2 \| medium \| confirmed \|$/m);
    assert.equal(cli(a, ["validate"]).status, 0, cli(a, ["validate"]).stdout);
    const eff = rubric(a).dimensions.find((d) => d.id === "task-effectiveness");
    assert.equal(eff.observed.value, "60% of 5 journeys completed in production (INS-2026-10-23)");
    assert.deepEqual(eff.observed.evidence, ["INS-2026-10-23", "EV-1", "EV-2"]);
  });

  // @covers US-144-AC5
  test("AC5: with network APIs spied on, insights reads only the given files and the app's own, and makes no network request", () => {
    const a = insightsApp();
    const calls = [], reads = [];
    const saved = { fetch: globalThis.fetch, read: fs.readFileSync };
    globalThis.fetch = (...x) => { calls.push(["fetch", String(x[0])]); throw new Error("no network"); };
    fs.readFileSync = function (p, ...rest) { reads.push(resolve(String(p))); return saved.read.call(this, p, ...rest); };
    syncBuiltinESMExports();
    try {
      insights(a, { events: "events.jsonl", feedback: "feedback.txt", date: "2026-10-23" });
    } finally {
      globalThis.fetch = saved.fetch; fs.readFileSync = saved.read; syncBuiltinESMExports();
    }
    assert.deepEqual(calls, []);
    const outside = reads.filter((p) => !p.startsWith(resolve(a)) && !p.startsWith(resolve(PKG, "..")) && !p.includes("node_modules"));
    assert.deepEqual(outside, [], "nothing outside the app and the installed packages");
    for (const f of ["events.jsonl", "feedback.txt"]) assert.ok(reads.includes(join(resolve(a), f)), f);
    // The guard the suite runs under makes every network API throw; the CLI succeeds under it.
    assert.equal(cli(a, ["insights", "events.jsonl", "--date", "2026-10-24"]).status, 0);
  });
});
