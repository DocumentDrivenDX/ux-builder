/* Production insights per journey (US-144; FEAT-018 GDL-63 to GDL-65;
   ADR-038 rule 4; CONTRACT-008 Commands).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import fs, { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, test } from "node:test";
import { syncBuiltinESMExports } from "node:module";
import { currentText, insights, rubric, sectionOf } from "../index.mjs";
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

const RUN = "docs/ux-builder/runs/insights/2026-10-23";
const DASH = "docs/helix/06-iterate/metrics-dashboard.md";

describe("US-144: read production insights per journey", () => {
  // @covers US-144-AC1
  test("AC1: insights writes the dated insights as run output, with completion, abandonment points, failed searches, feature use and time per step per journey", () => {
    const a = insightsApp();
    const r = json(a, ["insights", "events.jsonl", "--date", "2026-10-23"]);
    assert.equal(r.path, `${RUN}/insights.md`);
    const find = r.journeys.find((j) => j.journey === "J-find");
    assert.deepEqual({ started: find.started, completed: find.completed, abandoned: find.abandoned, failedSearches: find.failedSearches, errors: find.errors, features: find.features, secondsPerStep: find.secondsPerStep },
      { started: 4, completed: 2, abandoned: { 1: 1, 2: 1 }, failedSearches: 1, errors: 1, features: { map: 4, detail: 3 }, secondsPerStep: { "1→2": 20 } });
    const t = readFileSync(join(a, r.path), "utf8");
    assert.match(t, /^\| J-find \| 4 \| 2 \| 50% \| step 1 \(1 left\) \| 1 \| 1 \| map 4, detail 3 \| 1→2: 20 \|$/m);
    assert.match(t, /^\| J-saved \| 1 \| 1 \| 100% \| none \| 0 \| 0 \| saved 1 \| – \|$/m);
    assert.ok(JSON.parse(readFileSync(join(a, RUN, "insights.json"), "utf8")).journeys.length, "the export's data, beside it");
    assert.deepEqual(JSON.parse(cli(a, ["validate", "--json"]).stdout).documents.filter((d) => d.path.startsWith("docs/ux-builder/runs/")), [], "run output is not a document");
  });

  // @covers US-144-AC2
  test("AC2: events naming a journey the blueprint no longer has are reported as unmatched, not dropped", () => {
    const a = insightsApp();
    const r = cli(a, ["insights", "events.jsonl", "--date", "2026-10-23"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /unmatched: J-activity \(2 events; not in the blueprint\)/);
    assert.match(readFileSync(join(a, RUN, "insights.md"), "utf8"), /## Unmatched events\n\n- J-activity: 2 events name a journey the blueprint does not have/);
  });

  // @covers US-144-AC3
  test("AC3: support and feedback entries are masked and linked to the journeys they mention, in the run output only", () => {
    const a = insightsApp();
    const r = json(a, ["insights", "events.jsonl", "--support", "support.jsonl", "--feedback", "feedback.txt", "--date", "2026-10-23"]);
    assert.deepEqual(r.sources.map((s) => s.kind), ["analytics", "support", "feedback"]);
    assert.deepEqual(r.linked.map((l) => [l.kind, l.journeys]), [["support", ["J-find", "J-saved"]], ["feedback", ["J-saved"]]]);
    const t = readFileSync(join(a, RUN, "insights.md"), "utf8");
    assert.match(t, /^- support \[J-find, J-saved\]: "The River details page never shows where to park\. Call me at \[masked:phone\]\."$/m);
    assert.match(t, /^- feedback \[J-saved\]: "Saved rivers are hard to find, says P1"$/m);
    assert.ok(!t.includes("sam@example.com") && !t.includes("Billing") && !t.includes("Dana"));
    assert.ok(!currentText(a, DASH).text.includes("park"), "no entry reaches HELIX");
  });

  // @covers US-144-AC4
  test("AC4: each journey's funnel is proposed into HELIX's metrics dashboard, a diagnosis into its row, and the rubric's observed column cites the insights", () => {
    const a = insightsApp();
    const r = json(a, ["insights", "events.jsonl", "--support", "support.jsonl", "--date", "2026-10-23"]);
    assert.equal(r.dashboard, DASH);
    const d = currentText(a, DASH).text;
    assert.match(d, /^---\nddx:\n  id: metrics-dashboard\n  type: metrics-dashboard\n/);
    for (const h of ["Decision", "Summary", "Metrics Table", "Interpretation Rules", "Trend Notes", "Journey Funnels", "Follow-Up"]) assert.match(d, new RegExp(`^## ${h}$`, "m"), h);
    assert.match(sectionOf(d, "Journey Funnels"), /^\| J-find \| 50% of 4 started \| step 1 \(1 left\) \| – \| production events to 2026-10-23 \(docs\/ux-builder\/runs\/insights\/2026-10-23\/insights\.json\) \|$/m);
    assert.ok(!existsSync(join(a, DASH)), "HELIX is written only by applying the proposal");
    // A diagnosis with --journey fills that row's Diagnosis.
    json(a, ["diagnose", "--insight", "2026-10-23", "--journey", "J-find", "--observation", "Half of J-find is abandoned", "--explanation", "The map is slow", "--explanation", "People expect a list", "--hypothesis", "If the list comes first, more find a river", "--alternative", "current"]);
    assert.match(sectionOf(currentText(a, DASH).text, "Journey Funnels"), /^\| J-find \| 50% of 4 started \| step 1 \(1 left\) \| The map is slow; or People expect a list\. Testing: current/m);
    const eff = rubric(a).dimensions.find((x) => x.id === "task-effectiveness");
    assert.equal(eff.observed.value, "60% of 5 journeys completed in production (insights to 2026-10-23)");
    assert.deepEqual(eff.observed.evidence, ["insights to 2026-10-23"]);
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
