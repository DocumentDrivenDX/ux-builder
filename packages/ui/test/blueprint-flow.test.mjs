/* Screen flows and journeys in the blueprint (FEAT-012; US-086, US-087;
   ADR-030; CONTRACT-005 Flows and journeys).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { blueprintSchema, checkBlueprint, skeleton } from "@ux-builder/ui/blueprint";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ids = (fs) => fs.map((f) => f.rule);
const valid = (fs) => fs.filter((f) => f.rule === "blueprint.valid");

/* CONTRACT-005's Flows and journeys examples: a screen with actions, and a journey. */
const examples = () => [...read("docs/helix/02-design/contracts/CONTRACT-005-interaction-rules-and-blueprint.md").split("## Flows and journeys")[1].split("\n## ")[0].matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));
const withExamples = () => {
  const [screen, journey] = examples();
  return {
    ...skeleton("app"), name: "Time review",
    destinations: [{ id: "queue", label: "Review", screen: "queue" }],
    screens: [{ ...screen, states: ["empty", "loading", "error"], modals: [{ id: "reject-reason", title: "Reject entry", kind: "dialog", dismiss: "cancel" }] },
      { id: "entry", title: "Entry", pattern: "RecordDetail", states: ["empty", "loading", "error"] }],
    journeys: [journey],
  };
};

describe("FEAT-012 FLW-01, JRN-01: actions, modal actions and journeys in the schema", () => {
  test("CONTRACT-005's Flows and journeys examples validate, by the check and as JSON Schema", () => {
    const [screen, journey] = examples();
    assert.ok(screen.actions?.length === 4 && journey.id === "J-review-entry", "the contract has both examples");
    const bp = withExamples();
    assert.deepEqual(valid(checkBlueprint(bp)), []);
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    const v = ajv.compile(blueprintSchema);
    assert.ok(v(bp), JSON.stringify(v.errors));
  });

  test("actions take only CONTRACT-005's fields: destructive and highImpact are their enums", () => {
    const bp = withExamples();
    bp.screens[0].actions.push({ id: "pay", label: "Pay", to: "queue", destructive: true, highImpact: "always", colour: "red" });
    const f = valid(checkBlueprint(bp));
    assert.deepEqual(f.map((x) => x.path), ["/screens/0/actions/4/colour", "/screens/0/actions/4/destructive", "/screens/0/actions/4/highImpact"]);
    assert.match(f[1].message, /must be one of "undo", "confirm", "none"/);
    assert.match(f[2].message, /must be one of "each", "plan", "none"/);
    const noTo = withExamples();
    noTo.screens[0].actions[0] = { id: "open", label: "Open entry" };
    assert.deepEqual(valid(checkBlueprint(noTo)).map((x) => [x.path, x.message]), [["/screens/0/actions/0", '/screens/0/actions/0 needs "to".']]);
  });

  test("modals take actions too", () => {
    const bp = withExamples();
    bp.screens[0].modals[0].actions = [{ id: "confirm", label: "Reject", to: "back", destructive: "undo" }];
    assert.deepEqual(valid(checkBlueprint(bp)), []);
    bp.screens[0].modals[0].actions.push({ id: "confirm", label: "Again", to: "back", extra: 1 });
    assert.deepEqual(valid(checkBlueprint(bp)).map((x) => x.path), ["/screens/0/modals/0/actions/1/extra", "/screens/0/modals/0/actions/1/id"]);
  });

  test("journeys: J- IDs, US- stories and AC IDs, steps with known states, alternates from a step index, scenarios", () => {
    const bp = withExamples();
    bp.journeys.push({
      id: "review", story: "US12", criteria: ["US-012-1"], entry: "queue",
      steps: [{ screen: "queue", state: "busy", scenario: "scary" }],
      alternates: [{ from: -1, steps: [] }],
    });
    const f = valid(checkBlueprint(bp));
    assert.deepEqual(f.map((x) => x.path), [
      "/journeys/1/alternates/0/from", "/journeys/1/alternates/0/steps", "/journeys/1/criteria/0", "/journeys/1/id",
      "/journeys/1/steps/0/scenario", "/journeys/1/steps/0/state", "/journeys/1/story",
    ]);
    assert.match(f.find((x) => x.path === "/journeys/1/id").message, /"review"; it must match/);
    const ok = withExamples();
    ok.journeys[0].alternates[0] = { ...ok.journeys[0].alternates[0], reason: "The entry is wrong", scenario: "errorProne" };
    ok.journeys[0].steps[1].scenario = "risky";
    assert.deepEqual(valid(checkBlueprint(ok)), []);
    const twice = withExamples();
    twice.journeys.push(structuredClone(twice.journeys[0]));
    assert.deepEqual(valid(checkBlueprint(twice)).map((x) => [x.path, x.message]), [["/journeys/1/id", 'Journey ID "J-review-entry" is used twice.']]);
    const missing = withExamples();
    missing.journeys = [{ id: "J-x" }];
    assert.deepEqual(ids(valid(checkBlueprint(missing))).length, 3, "story, entry and steps are required");
  });
});

/* -------------------------------------------------- flow and journeys */
/* The review queue of FEAT-012, planned cleanly: every defect below is
   seeded into a copy of it. */
const ALL = ["empty", "loading", "error"];
const clean = () => ({
  ...skeleton("app"), name: "Time review",
  destinations: [{ id: "queue", label: "Review", screen: "queue" }, { id: "settings", label: "Settings", screen: "settings" }],
  screens: [
    { id: "queue", title: "Entries", pattern: "WorkQueue", primaryAction: { label: "Approve" }, states: ALL, stories: ["US-012"],
      actions: [
        { id: "open", label: "Open entry", to: "entry" },
        { id: "approve", label: "Approve", to: "queue", primary: true },
        { id: "reject", label: "Reject", to: "modal:reject-reason", destructive: "undo" },
        { id: "help", label: "Help", to: "external" },
      ],
      modals: [{ id: "reject-reason", title: "Why reject?", kind: "dialog", dismiss: "cancel", actions: [{ id: "confirm", label: "Reject", to: "back", destructive: "undo" }] }] },
    { id: "entry", title: "Entry", pattern: "RecordDetail", states: ALL,
      actions: [
        { id: "approve", label: "Approve", to: "queue" },
        { id: "reject", label: "Reject", to: "modal:reject", destructive: "confirm" },
        { id: "back", label: "Back", to: "back" },
      ],
      modals: [{ id: "reject", title: "Reject this entry?", kind: "dialog", dismiss: "cancel", actions: [{ id: "confirm", label: "Reject", to: "queue" }] }] },
    { id: "settings", title: "Settings", pattern: "SettingsPage" },
  ],
  journeys: [{
    id: "J-review-entry", story: "US-012", criteria: ["US-012-AC1", "US-012-AC3"], entry: "queue",
    steps: [{ screen: "queue", action: "open" }, { screen: "entry", action: "approve", state: "loading" }, { screen: "queue", expect: "empty" }],
    alternates: [
      { from: 1, steps: [{ screen: "entry", action: "reject" }, { screen: "modal:reject", action: "confirm" }, { screen: "queue" }], reason: "The entry is wrong" },
      { from: 1, steps: [{ screen: "entry", state: "error", action: "back" }, { screen: "queue" }], reason: "The entry fails to load", scenario: "errorProne" },
      { from: 0, steps: [{ screen: "queue", state: "error", action: "help" }], reason: "The queue fails to load" },
    ],
  }],
});
const HELIX = { stories: { "US-012": { criteria: ["US-012-AC1", "US-012-AC2", "US-012-AC3"] }, "US-013": { criteria: ["US-013-AC1"] } } };
const rules = (fs, prefix) => fs.filter((f) => f.rule.startsWith(prefix)).map((f) => [f.rule, f.severity, f.path]);

describe("US-086: plan the screen flow in the blueprint", () => {
  test("the clean review queue has no finding, with or without its HELIX stories", () => {
    assert.deepEqual(checkBlueprint(clean()), []);
    assert.deepEqual(checkBlueprint(clean(), { helix: HELIX }), []);
  });

  // @covers US-086-AC1
  test("AC1: a screen no destination and no action reaches warns, naming it and the size classes", () => {
    const bp = clean();
    bp.destinations.pop();
    const f = checkBlueprint(bp);
    assert.deepEqual(rules(f, "flow."), [["flow.reachable", "warning", "/screens/2"]]);
    assert.match(f.find((x) => x.rule === "flow.reachable").message, /"Settings" is unreachable at compact, medium, expanded and large/);
    // An action from a reachable screen or one of its modals reaches it.
    bp.screens[1].modals[0].actions.push({ id: "prefs", label: "Preferences", to: "settings" });
    assert.deepEqual(rules(checkBlueprint(bp), "flow."), []);
    // Reached only from an unreachable screen is unreachable.
    const chain = clean();
    chain.destinations.pop();
    chain.screens.push({ id: "about", title: "About", pattern: "RecordDetail", states: ALL, actions: [{ id: "s", label: "Settings", to: "settings" }, { id: "b", label: "Back", to: "back" }] });
    assert.deepEqual(rules(checkBlueprint(chain), "flow.reachable"), [["flow.reachable", "warning", "/screens/2"], ["flow.reachable", "warning", "/screens/3"]]);
    // A view starts at its first screen.
    const v = { ...skeleton("view"), screens: [{ ...skeleton("view").screens[0], actions: [{ id: "more", label: "More", to: "external" }] }, { id: "other", title: "Other", pattern: "RecordDetail", states: ALL }] };
    assert.deepEqual(rules(checkBlueprint(v), "flow."), [["flow.reachable", "warning", "/screens/1"]]);
  });

  // @covers US-086-AC2
  test("AC2: a screen or modal whose actions lead nowhere onward and offer no back warns; external counts as onward", () => {
    const bp = clean();
    bp.screens[1].actions = [{ id: "reject", label: "Reject", to: "modal:reject", destructive: "confirm" }, { id: "retry", label: "Retry", to: "state:loading" }, { id: "self", label: "Reload", to: "entry" }];
    assert.deepEqual(rules(checkBlueprint(bp), "flow."), [["flow.no-dead-end", "warning", "/screens/1/actions"]]);
    bp.screens[1].actions.push({ id: "out", label: "Open in Files", to: "external" });
    assert.deepEqual(rules(checkBlueprint(bp), "flow."), [], "external is onward");
    const modal = clean();
    delete modal.screens[1].modals[0].dismiss;
    modal.screens[1].modals[0].actions = [{ id: "again", label: "Check again", to: "state:loading" }];
    const f = checkBlueprint(modal);
    assert.deepEqual(rules(f, "flow."), [["flow.no-dead-end", "warning", "/screens/1/modals/0/actions"]]);
    assert.match(f.find((x) => x.rule === "flow.no-dead-end").message, /^Modal "Reject this entry\?" is a dead end/);
    assert.ok(ids(f).includes("modal.dismiss"), "the missing dismiss is its own error");
    // A destination's navigation leads on, whatever its actions.
    const dest = clean();
    dest.screens[2].actions = [{ id: "save", label: "Save", to: "state:loading" }];
    assert.deepEqual(rules(checkBlueprint(dest), "flow."), []);
  });

  // @covers US-086-AC3
  test("AC3: an action whose target names no screen, modal or state is an error with the action's path", () => {
    const bp = clean();
    bp.screens[0].actions.push({ id: "a", label: "Archive", to: "archive" }, { id: "b", label: "Edit", to: "modal:edit" }, { id: "c", label: "Nap", to: "state:sleeping" }, { id: "d", label: "Retry", to: "state:loading" });
    bp.screens[1].modals[0].actions.push({ id: "e", label: "Elsewhere", to: "modal:reject-reason" });
    const f = checkBlueprint(bp);
    assert.deepEqual(rules(f, "flow.target-exists"), [
      ["flow.target-exists", "error", "/screens/0/actions/4"], ["flow.target-exists", "error", "/screens/0/actions/5"], ["flow.target-exists", "error", "/screens/0/actions/6"],
      ["flow.target-exists", "error", "/screens/1/modals/0/actions/1"],
    ]);
    assert.match(f.find((x) => x.path === "/screens/0/actions/4").message, /"Archive" on "Entries" leads to "archive", which names no screen/);
    assert.match(f.find((x) => x.path === "/screens/1/modals/0/actions/1").message, /modal of "Entry"/, "a modal action opens a modal of its own screen");
  });

  // @covers US-086-AC4
  test("AC4: a primary action that is not among the screen's actions warns", () => {
    const bp = clean();
    bp.screens[0].primaryAction = { label: "Approve all" };
    const f = checkBlueprint(bp);
    assert.deepEqual(rules(f, "flow."), [["flow.primary-consistent", "warning", "/screens/0/primaryAction"]]);
    assert.match(f.find((x) => x.path === "/screens/0/primaryAction").message, /"Approve all" of "Entries" is not among its actions/);
    const two = clean();
    two.screens[0].actions[0].primary = true;
    assert.deepEqual(rules(checkBlueprint(two), "flow."), [["flow.primary-consistent", "warning", "/screens/0/actions/0"], ["flow.primary-consistent", "warning", "/screens/0/actions/1"]], "a second primary action, and the first is not primaryAction");
  });

  // @covers US-086-AC5
  test("AC5: a blueprint without actions gives exactly the findings it gave before this feature", () => {
    const { cases } = JSON.parse(read("packages/ui/test/fixtures/pre-ai-findings.json"));
    // The SDK's version in messages changes with every release; the findings must not.
    const unversioned = (x) => JSON.stringify(x).replace(/@ux-builder\/ui \d+\.\d+\.\d+[^ \\"]*/g, "@ux-builder/ui <version>");
    for (const c of cases) assert.equal(unversioned(checkBlueprint(c.blueprint)), unversioned(c.findings), c.name);
    // Removing every action from the clean flow leaves only the checks that existed before.
    const bp = clean();
    delete bp.journeys;
    for (const s of bp.screens) { delete s.actions; delete s.stories; for (const m of s.modals ?? []) delete m.actions; }
    assert.deepEqual(checkBlueprint(bp), []);
  });

  test("actions[] and destructiveActions are one list: a destructive action needs its safeguard", () => {
    const bp = clean();
    bp.screens[0].actions[2].destructive = "none";
    assert.deepEqual(rules(checkBlueprint(bp), "action."), [["action.destructive-safeguard", "error", "/screens/0/actions/2/destructive"]]);
  });
});

describe("US-087: describe a story's journey in the blueprint", () => {
  // @covers US-087-AC1
  test("AC1: a step whose action is not on its screen, or whose next step is not where it leads, warns with the step's path", () => {
    const bp = clean();
    bp.journeys[0].steps[1].action = "archive";
    let f = checkBlueprint(bp);
    assert.deepEqual(rules(f, "journey."), [["journey.walkable", "warning", "/journeys/0/steps/1/action"]]);
    assert.match(f.find((x) => x.rule === "journey.walkable").message, /"Entry" has no action "archive"/);
    const wrong = clean();
    wrong.journeys[0].steps[2].screen = "settings";
    f = checkBlueprint(wrong);
    assert.deepEqual(rules(f, "journey."), [["journey.walkable", "warning", "/journeys/0/steps/2"]]);
    assert.match(f.find((x) => x.rule === "journey.walkable").message, /is on "Settings", but the step before leads to "Entries"/);
    const entry = clean();
    entry.journeys[0].entry = "entry";
    assert.deepEqual(rules(checkBlueprint(entry), "journey.walkable"), [["journey.walkable", "warning", "/journeys/0/steps/0"]], "the first step is on the entry");
    const alt = clean();
    alt.journeys[0].alternates[0].steps[1].screen = "modal:reject-reason";
    assert.deepEqual(rules(checkBlueprint(alt), "journey.walkable"), [["journey.walkable", "warning", "/journeys/0/alternates/0/steps/1/screen"]], "a modal of another screen");
    const stuck = clean();
    delete stuck.journeys[0].steps[0].action;
    assert.deepEqual(rules(checkBlueprint(stuck), "journey.walkable"), [["journey.walkable", "warning", "/journeys/0/steps/0"]], "a step with no action cannot lead on");
  });

  // @covers US-087-AC2
  test("AC2: a destructive step with no safeguard, or a high-impact one with no approval, warns", () => {
    const bp = clean();
    bp.screens[1].actions[1].destructive = "none";
    let f = checkBlueprint(bp);
    assert.deepEqual(rules(f, "journey."), [["journey.safeguarded", "warning", "/journeys/0/alternates/0/steps/0"]]);
    assert.match(f.find((x) => x.rule === "journey.safeguarded").message, /"Reject" \(step 1 of J-review-entry\) is destructive with no safeguard/);
    // destructiveActions is the same list: an action it names takes its safeguard.
    const listed = clean();
    delete listed.screens[1].actions[1].destructive;
    listed.screens[1].destructiveActions = [{ label: "Reject", safeguard: "none" }];
    // Its modal's own Reject is that action too.
    assert.deepEqual(rules(checkBlueprint(listed), "journey."), [["journey.safeguarded", "warning", "/journeys/0/alternates/0/steps/0"], ["journey.safeguarded", "warning", "/journeys/0/alternates/0/steps/1"]]);
    const pay = clean();
    pay.screens[1].actions[0].highImpact = "none";
    f = checkBlueprint(pay);
    assert.deepEqual(rules(f, "journey."), [["journey.safeguarded", "warning", "/journeys/0/steps/1"]]);
    assert.match(f.find((x) => x.rule === "journey.safeguarded").message, /high-impact with no approval/);
    const agent = clean();
    agent.screens[1].ai = { roles: ["agent"], acts: true, highImpactActions: [{ label: "Approve" }] };
    assert.deepEqual(rules(checkBlueprint(agent), "journey."), [["journey.safeguarded", "warning", "/journeys/0/steps/1"]], "a high-impact action declared without approval");
    pay.screens[1].actions[0].highImpact = "each";
    assert.deepEqual(rules(checkBlueprint(pay), "journey."), []);
  });

  // @covers US-087-AC3
  test("AC3: a journey through a screen with an error state warns when no alternate covers it", () => {
    const bp = clean();
    bp.journeys[0].alternates.splice(1, 1);
    const f = checkBlueprint(bp);
    assert.deepEqual(rules(f, "journey."), [["journey.covers-errors", "warning", "/journeys/0"]]);
    assert.match(f.find((x) => x.rule === "journey.covers-errors").message, /passes "Entry", which declares an error state/);
  });

  // @covers US-087-AC4
  test("AC4: with HELIX stories, a story an app screen serves that no journey covers warns, naming it", () => {
    const bp = clean();
    bp.screens[2].stories = ["US-013"];
    const f = checkBlueprint(bp, { helix: HELIX });
    assert.deepEqual(rules(f, "journey."), [["journey.story-covered", "warning", "/screens/2/stories/0"]]);
    assert.match(f[0].message, /US-013, which "Settings" serves, has no journey/);
    bp.screens[2].stories = ["US-099"];
    assert.match(checkBlueprint(bp, { helix: HELIX })[0].message, /US-099, which is not a HELIX story/);
  });

  // @covers US-087-AC5
  test("AC5: a journey naming a criterion its story lacks warns, naming it", () => {
    const bp = clean();
    bp.journeys[0].criteria.push("US-012-AC9");
    const f = checkBlueprint(bp, { helix: HELIX });
    assert.deepEqual(rules(f, "journey."), [["journey.story-covered", "warning", "/journeys/0/criteria/2"]]);
    assert.match(f[0].message, /names US-012-AC9, which US-012 does not have/);
    bp.journeys[0].criteria[2] = "US-013-AC1";
    assert.deepEqual(checkBlueprint(bp, { helix: HELIX }).map((x) => [x.rule, x.severity, x.path]), [["blueprint.valid", "error", "/journeys/0/criteria/2"]], "a criterion of another story is a contract error");
  });

  // @covers US-087-AC6
  test("AC6: without the stories, the story checks are skipped", () => {
    const bp = clean();
    bp.screens[2].stories = ["US-013"];
    bp.journeys[0].criteria.push("US-012-AC9");
    assert.deepEqual(checkBlueprint(bp), []);
  });
});

describe("FEAT-012 non-functional: flows and journeys keep the check fast and deterministic", () => {
  // @covers US-053-AC8
  test("a 50-screen blueprint with actions, modal actions, journeys and ai is checked in under one second, the same each time", () => {
    const n = 50;
    const screens = Array.from({ length: n }, (_, i) => ({
      id: `s${i}`, title: `Screen ${i}`, pattern: ["CollectionList", "RecordDetail", "WorkQueue", "SettingsPage", "FormPage"][i % 5], states: ALL,
      ...(i % 3 === 0 ? { ai: { roles: ["agent"], acts: true, highImpactActions: [{ label: "Send", approval: "each" }] } } : {}),
      actions: [
        { id: "next", label: "Next", to: `s${(i + 1) % n}`, primary: true }, { id: "back", label: "Back", to: "back" },
        { id: "edit", label: "Edit", to: `modal:edit-${i}` }, { id: "delete", label: "Delete", to: "state:empty", destructive: i % 4 ? "undo" : "none" },
      ],
      modals: [{ id: `edit-${i}`, title: "Edit", kind: "dialog", dismiss: "cancel", editsData: true, guardsUnsavedChanges: true, actions: [{ id: "save", label: "Save", to: "back" }] }],
    }));
    const journeys = Array.from({ length: 20 }, (_, k) => ({
      id: `J-walk-${k}`, story: `US-${k + 1}`, criteria: [`US-${k + 1}-AC1`], entry: "s0",
      steps: [...Array.from({ length: 10 }, (_, i) => ({ screen: `s${i}`, action: i % 3 ? "next" : "next" })), { screen: "s10", action: "edit" }, { screen: "modal:edit-10", action: "save" }, { screen: "s10" }],
      alternates: [{ from: 3, steps: [{ screen: "s3", state: "error", action: "delete" }, { screen: "s3" }] }],
    }));
    const bp = { ...skeleton("app"), destinations: screens.slice(0, 5).map((s) => ({ id: s.id, label: s.title, screen: s.id })), screens, journeys };
    const helix = { stories: Object.fromEntries(journeys.map((j) => [j.story, { criteria: [`${j.story}-AC1`] }])) };
    const start = performance.now();
    const first = checkBlueprint(bp, { helix });
    const ms = performance.now() - start;
    assert.ok(ms < 1000, `took ${ms.toFixed(1)} ms`);
    assert.ok(first.some((f) => f.rule === "journey.covers-errors") && first.some((f) => f.rule === "action.destructive-safeguard"), "the checks ran");
    assert.equal(JSON.stringify(checkBlueprint(structuredClone(bp), { helix })), JSON.stringify(first));
  });
});
