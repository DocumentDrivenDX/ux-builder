/* trace and impact (US-137; US-121-AC2, AC3; FEAT-018 GDL-47 to GDL-49,
   GDL-75).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { currentEpisode, openEpisode, readEpisode } from "@ux-builder/trace";
import { testKit } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const put = (app, path, text) => { mkdirSync(join(app, path, ".."), { recursive: true }); writeFileSync(join(app, path), text); };
const st = ["empty", "loading", "error"];
const BP = {
  version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] },
  destinations: [{ id: "find", label: "Find", screen: "activity" }, { id: "saved", label: "Saved", screen: "saved" }],
  screens: [
    { id: "activity", title: "Activity", pattern: "FormPage", states: st, actions: [{ id: "pick", label: "Pick an activity", to: "map" }] },
    { id: "map", title: "Map", pattern: "CollectionList", states: st, actions: [{ id: "open", label: "Open", to: "detail", primary: true }] },
    { id: "detail", title: "River", pattern: "RecordDetail", states: st },
    { id: "saved", title: "Saved", pattern: "CollectionList", states: st, actions: [{ id: "open", label: "Open", to: "detail" }] },
  ],
  tasks: [{ id: "T-1", goal: "Find a river to fish", jobs: ["J-1"], success: ["US-001-AC1"] }, { id: "T-2", goal: "Return to a saved river", jobs: ["J-2"], success: ["US-002-AC1"] }],
  journeys: [
    { id: "J-find", story: "US-001", task: "T-1", criteria: ["US-001-AC1"], entry: "activity", steps: [{ screen: "activity", action: "pick", decision: "Which activity" }, { screen: "map", action: "open" }, { screen: "detail" }] },
    { id: "J-saved", story: "US-002", task: "T-2", criteria: ["US-002-AC1"], entry: "saved", steps: [{ screen: "saved", action: "open" }, { screen: "detail" }] },
  ],
};
const JOBS = "---\nux:\n  id: jobs\n  type: jobs\n---\n\n# Jobs\n\n## Jobs\n\n| ID | Job | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|---|\n| J-1 | Find a river | high | none | low | hypothesis |\n| J-2 | Go back to a river | medium | none | low | hypothesis |\n";

/* An app where one job, task, journey, screen, prototype page, kit task and finding are linked. */
function app({ tested = false } = {}) {
  const a = tempApp();
  writeFileSync(join(a, "app.blueprint.json"), JSON.stringify(BP, null, 2));
  writeFileSync(join(a, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  put(a, "docs/helix/01-frame/user-stories/US-001-find.md", "---\nddx:\n  id: US-001\n  type: user-stories\n---\n\n# US-001: Find a river\n\n- [ ] **US-001-AC1** — Given rivers nearby, when the user looks, then they find one.\n");
  put(a, "docs/helix/01-frame/user-stories/US-002-saved.md", "---\nddx:\n  id: US-002\n  type: user-stories\n---\n\n# US-002: Saved rivers\n");
  put(a, "docs/helix/02-design/wireframes/WF-001-activity.md", "---\nddx:\n  id: WF-001\n  type: wireframe\n---\n\n# WF-001: Activity\n\nFrom screen `activity`.\n");
  put(a, "docs/ux/jobs.md", JOBS);
  put(a, "prototype/current/activity.compact.html", "<html></html>");
  put(a, "prototype/current/map.compact.html", "<html></html>");
  put(a, "docs/ux/decisions/UXD-1.md", `---\nux:\n  id: UXD-1\n  type: ux-decision\n  status: ${tested ? "tested" : "not-tested"}\n---\n\n# UXD-1: Ask for an activity first?\n\n## Question\n\nShould the activity screen come first?\n\n## Alternatives\n\n- Yes\n- No\n\n## Recommendation\n\nYes\n\n## Rationale\n\n- Narrows rivers on activity.\n\n## Assumptions\n\n- People know their activity.\n\n## Validation\n\n- **Status**: ${tested ? "tested" : "not-tested"}\n- **Required**: test\n`);
  testKit(a);
  put(a, "docs/ux/tests/TK-1/findings.json", JSON.stringify({ findings: [{ id: "F-01", task: 1, title: "Picking an activity first slows people down", source: "human" }] }));
  return a;
}
const ids = (xs) => xs.map((x) => x.id);

describe("US-137: trace and impact", () => {
  // @covers US-137-AC1
  test("AC1: trace lists every linked item upstream and downstream, each with its file", () => {
    const a = app();
    let r = JSON.parse(cli(a, ["trace", "J-find", "--json"]).stdout);
    assert.deepEqual(ids(r.upstream).sort(), ["J-1", "T-1", "US-001"]);
    for (const x of ["screen:activity", "screen:map", "screen:detail", "pattern:FormPage", "page:prototype/current/activity.compact.html", "TK-1#1", "F-01", "WF-001"]) assert.ok(ids(r.downstream).includes(x), x);
    assert.equal(r.upstream.find((x) => x.id === "J-1").file, "docs/ux/jobs.md");
    assert.equal(r.downstream.find((x) => x.id === "F-01").file, "docs/ux/tests/TK-1/findings.json");
    // From a finding back to the job, and from a screen by its bare ID.
    r = JSON.parse(cli(a, ["trace", "F-01", "--json"]).stdout);
    assert.deepEqual(ids(r.upstream).sort(), ["J-1", "J-find", "T-1", "TK-1#1", "US-001"]);
    r = JSON.parse(cli(a, ["trace", "activity", "--json"]).stdout);
    assert.equal(r.item.id, "screen:activity");
    assert.equal(cli(a, ["trace", "nothing-here"]).status, 2);
  });

  // @covers US-137-AC2
  test("AC2: impact lists every dependent task, journey, screen, pattern, prototype page, kit task, finding and HELIX document, and changes no file", () => {
    const a = app();
    const snapshot = () => { const out = {}; const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else out[p] = readFileSync(p, "utf8"); } }; walk(a); return out; };
    const before = snapshot();
    const r = JSON.parse(cli(a, ["impact", "Remove the activity selection before exploring rivers", "--json"]).stdout);
    // The activity screen, and the journey whose step decides the activity; "rivers" names the domain, not an item.
    assert.deepEqual(ids(r.matched).sort(), ["J-find", "screen:activity"]);
    for (const x of ["T-1", "J-1", "J-find", "US-001", "pattern:FormPage", "page:prototype/current/activity.compact.html", "TK-1#1", "F-01", "WF-001"]) assert.ok(ids(r.affected).includes(x), `${x} in ${ids(r.affected).join(", ")}`);
    assert.ok(!ids(r.affected).includes("J-saved"), "a journey the change does not reach is left out");
    assert.deepEqual(snapshot(), before);
  });

  // @covers US-137-AC3
  test("AC3: impact --apply updates the blueprint, regenerates prototypes and the kit, writes HELIX only as proposals, and records a decision", async () => {
    const a = app();
    const episode = openEpisode(a, { trigger: "change", goal: { text: "Remove activity selection" } });
    const next = structuredClone(BP);
    next.screens = next.screens.filter((s) => s.id !== "activity");
    next.destinations[0].screen = "map";
    next.journeys[0] = { ...next.journeys[0], entry: "map", steps: [{ screen: "map", action: "open" }, { screen: "detail" }] };
    writeFileSync(join(a, "next.blueprint.json"), JSON.stringify(next));
    const r = cli(a, ["impact", "Remove the activity selection before exploring rivers", "--apply", "--set", "next.blueprint.json", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.applied, true);
    assert.deepEqual(JSON.parse(readFileSync(join(a, "app.blueprint.json"), "utf8")).screens.map((s) => s.id), ["map", "detail", "saved"]);
    assert.ok(out.regenerated.includes("prototype/current/") && out.regenerated.includes("docs/ux/tests/TK-1/"));
    assert.ok(existsSync(join(a, "prototype/current/map.compact.html")));
    assert.ok(!readdirSync(join(a, "prototype/current")).some((f) => f.startsWith("activity.")), "the removed screen's pages are gone");
    assert.ok(existsSync(join(a, "helix-proposals")), "HELIX changes are proposals");
    assert.equal(readFileSync(join(a, "docs/helix/02-design/wireframes/WF-001-activity.md"), "utf8").includes("activity"), true, "HELIX documents are not edited");
    assert.equal(currentEpisode(a), episode);
    assert.match(readEpisode(a, episode).at(-1).chose, /^Applied: Remove the activity selection/);
  });

  // @covers US-137-AC4
  test("AC4: an applied change prints one summary with the complexity delta per journey", () => {
    const a = app();
    const next = structuredClone(BP);
    next.journeys[0].steps = [{ screen: "map", action: "open" }, { screen: "detail" }];
    next.journeys[0].entry = "map";
    writeFileSync(join(a, "next.json"), JSON.stringify(next));
    const r = cli(a, ["impact", "Start finding rivers on the map", "--apply", "--set", "next.json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^Change: Start finding rivers on the map\n {2}J-find: -1 screens, 1 steps, 1 decisions\nRegenerated: /m);
  });

  // @covers US-137-AC5
  test("AC5: a change that breaks a journey: the check fails, nothing is regenerated, and the edit is left to fix", () => {
    const a = app();
    const kitBefore = readFileSync(join(a, "docs/ux/tests/TK-1/scenarios.md"), "utf8");
    const next = structuredClone(BP);
    next.screens[1].actions = [{ id: "open", label: "Open", to: "nowhere" }];
    writeFileSync(join(a, "next.json"), JSON.stringify(next));
    const r = cli(a, ["impact", "Point map's open somewhere new", "--apply", "--set", "next.json"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /The blueprint check fails \(1 error\); nothing was regenerated\. Fix app\.blueprint\.json:\n {2}flow\.target-exists/);
    assert.equal(JSON.parse(readFileSync(join(a, "app.blueprint.json"), "utf8")).screens[1].actions[0].to, "nowhere", "the edit is there to fix");
    assert.equal(readFileSync(join(a, "docs/ux/tests/TK-1/scenarios.md"), "utf8"), kitBefore);
    assert.equal(existsSync(join(a, "helix-proposals")), false);
  });
});

describe("US-121: impact in change mode", () => {
  // @covers US-121-AC2
  test("AC2: a change to a screen whose decision is tested sets checkpointRequired to significant-change", () => {
    const a = app({ tested: true });
    assert.equal(cli(a, ["mode", "change"]).status, 0);
    const r = JSON.parse(cli(a, ["impact", "Remove the activity selection", "--json"]).stdout);
    assert.equal(r.mode, "change");
    assert.ok(r.affected.length > 3);
    assert.equal(r.checkpointRequired, "significant-change");
    assert.match(r.because, /UXD-1/);
  });

  // @covers US-121-AC3
  test("AC3: the same change with no tested decision has no checkpointRequired", () => {
    const a = app({ tested: false });
    const r = JSON.parse(cli(a, ["impact", "Remove the activity selection", "--json"]).stdout);
    assert.equal("checkpointRequired" in r, false);
  });
});
