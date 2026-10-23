/* The complexity a blueprint change adds (US-120; FEAT-018 GDL-12;
   CONTRACT-005 as amended by CONTRACT-008): check --diff and
   simplicity.delta-decided.

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { openEpisode, recordDecision } from "@ux-builder/trace";
import { complexityDelta, deltaFindings } from "../blueprint/index.mjs";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "bp-diff-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const screen = (id, pattern = "RecordDetail", actions = []) => ({ id, title: id, pattern, states: ["empty", "loading", "error"], actions });
const base = {
  version: 1, kind: "app", name: "rivers",
  supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"] },
  destinations: [{ id: "find", label: "Find", screen: "map" }, { id: "saved", label: "Saved", screen: "saved" }],
  screens: [
    screen("map", "CollectionList", [{ id: "open", label: "Open river", to: "detail", primary: true }]),
    screen("detail", "RecordDetail", [{ id: "save", label: "Save", to: "saved" }]),
    screen("saved", "CollectionList", [{ id: "open", label: "Open", to: "detail" }]),
  ],
  journeys: [
    { id: "J-find", story: "US-001", criteria: ["US-001-AC1"], entry: "map", steps: [{ screen: "map", action: "open" }, { screen: "detail" }] },
    { id: "J-save", story: "US-002", criteria: ["US-002-AC1"], entry: "detail", steps: [{ screen: "detail", action: "save" }, { screen: "saved", action: "open", decision: "Which saved river" }, { screen: "detail" }] },
  ],
};
/* J-find gains a filters screen, a step and a required input; J-save loses a step. */
const next = structuredClone(base);
next.screens.push(screen("filters", "FormPage", [{ id: "apply", label: "Apply", to: "map" }]));
next.screens[0].actions.push({ id: "filter", label: "Filter", to: "filters" });
next.journeys[0].steps = [{ screen: "map", action: "filter" }, { screen: "filters", action: "apply", inputs: { required: ["activity"] } }, { screen: "map", action: "open" }, { screen: "detail" }];
next.journeys[1].steps = [{ screen: "detail", action: "save" }, { screen: "saved" }];

function app(name) {
  const dir = join(tmp, name);
  mkdirSync(join(dir, ".ux-builder"), { recursive: true });
  writeFileSync(join(dir, "app.blueprint.base.json"), JSON.stringify(base));
  writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify(next));
  return dir;
}
const check = (dir) => spawnSync(process.execPath, [CLI, "check", "app.blueprint.json", "--diff", "app.blueprint.base.json", "--json"], { cwd: dir, encoding: "utf8" });

describe("US-120: check --diff", () => {
  // @covers US-120-AC1
  test("AC1: per journey, the screens, steps, required inputs and decisions added and removed", () => {
    const d = complexityDelta(base, next);
    assert.deepEqual(d.screens, { added: ["filters"], removed: [] });
    const find = d.journeys.find((j) => j.journey === "J-find");
    assert.deepEqual(find.added, { screens: ["filters"], steps: ["filters:apply", "map:filter"], inputs: ["activity"], decisions: [] });
    assert.deepEqual(find.removed, { screens: [], steps: [], inputs: [], decisions: [] });
    assert.equal(find.grew, true);
    const save = d.journeys.find((j) => j.journey === "J-save");
    assert.deepEqual(save.removed, { screens: [], steps: ["detail", "saved:open"], inputs: [], decisions: ["Which saved river"] });
    assert.deepEqual(save.added.steps, ["saved"]);

    const dir = app("ac1");
    const r = spawnSync(process.execPath, [CLI, "check", "app.blueprint.json", "--diff", "app.blueprint.base.json"], { cwd: dir, encoding: "utf8" });
    assert.match(r.stdout, /Complexity against app\.blueprint\.base\.json:\n  app screens: \+1 -0\n  J-find \(changed\)\n    added:   screens filters; steps filters:apply, map:filter; inputs activity/);
    assert.match(r.stdout, /J-save \(changed\)\n    added:   steps saved\n    removed: steps detail, saved:open; decisions Which saved river/);
  });

  // @covers US-120-AC2
  test("AC2: a journey that grows with no decision naming the addition gets simplicity.delta-decided, with its sources", () => {
    const dir = app("ac2");
    openEpisode(dir, { trigger: "change", goal: { text: "Filters" } });
    recordDecision(dir, { chose: "WorkQueue for review", why: "unrelated", screen: "review" });
    const r = check(dir);
    const { findings } = JSON.parse(r.stdout);
    const w = findings.filter((f) => f.rule === "simplicity.delta-decided");
    assert.equal(w.length, 2, JSON.stringify(w));
    assert.equal(w[0].severity, "warning");
    assert.equal(w[0].path, "/journeys/J-find");
    assert.match(w[0].message, /screen "filters".*step "filters:apply".*step "map:filter".*input "activity"/);
    // J-save grew by a step too (saved without its action).
    assert.equal(w[1].path, "/journeys/J-save");
    const rules = JSON.parse(readFileSync(join(ROOT, "guidelines/rules.json"), "utf8")).rules;
    const rule = rules.find((x) => x.id === "simplicity.delta-decided");
    assert.ok(rule.sources.some((s) => /Interaction Cost/.test(s.title)));
  });

  // @covers US-120-AC3
  test("AC3: decisions naming the added screen and steps silence the warning", () => {
    const decisions = [
      { kind: "decision", screen: "filters", chose: "A filters screen", goal: "Narrow rivers by activity" },
      { kind: "decision", screen: "map", chose: "map:filter opens the filters" },
      { kind: "decision", chose: "Ask for activity", goal: "activity narrows results" },
      { kind: "decision", screen: "saved", chose: "Open a saved river from its row" },
    ];
    assert.deepEqual(deltaFindings(complexityDelta(base, next), decisions), []);

    const dir = app("ac3");
    openEpisode(dir, { trigger: "change", goal: { text: "Filters" } });
    for (const d of decisions) recordDecision(dir, { ...d, why: "Recorded with its five answers", kind: "addition", goal: d.goal ?? "Find a river", without: "No", simplest: "Fewer filters", assumptions: ["People filter by activity"], validation: "Task time in a test" });
    const { findings } = JSON.parse(check(dir).stdout);
    assert.deepEqual(findings.filter((f) => f.rule === "simplicity.delta-decided"), []);
  });

  // @covers US-120-AC4
  test("AC4: the rule has a paraphrased statement and a cited source, and passes the provenance check", async () => {
    const { checkRules, known, NOTICES } = await import(join(ROOT, "tools/check-rules.mjs"));
    const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
    const rules = read("guidelines/rules.json"), recipes = read("guidelines/recipes.json");
    const rule = rules.rules.find((x) => x.id === "simplicity.delta-decided");
    assert.ok(rule.statement.length > 40);
    assert.ok(rule.sources.length >= 1);
    for (const s of rule.sources) assert.equal(s.wording, "paraphrased");
    const problems = checkRules({ rules, recipes, notices: readFileSync(join(ROOT, NOTICES), "utf8") }, await known());
    assert.deepEqual(problems.filter((p) => p.includes("simplicity.delta-decided")), []);
  });

  test("the steps' new fields are part of the blueprint schema", () => {
    const dir = app("schema");
    const r = spawnSync(process.execPath, [CLI, "check", "app.blueprint.json", "--json"], { cwd: dir, encoding: "utf8" });
    const findings = JSON.parse(r.stdout);
    assert.deepEqual(findings.filter((f) => f.rule === "blueprint.valid"), []);
  });
});
