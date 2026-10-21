/* The interaction rules and the blueprint check (FEAT-008; US-050, US-053,
   US-055; CONTRACT-005).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBlueprint, findRecipes, rulesFor, skeleton } from "@ux-builder/ui/blueprint";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const cat = JSON.parse(read("packages/ui/catalogue.json"));
const source = JSON.parse(read("guidelines/rules.json"));
const ids = (fs) => fs.map((f) => f.rule);
const app = (over = {}) => ({ ...skeleton("app"), ...over });
const view = (over = {}) => ({ ...skeleton("view"), ...over });

describe("US-050: cited rules for a target", () => {
  // @covers US-050-AC1
  test("AC1: the catalogue holds every rule and recipe, each complete", () => {
    assert.deepEqual(cat.interaction.rules, source.rules);
    assert.deepEqual(cat.interaction.recipes, JSON.parse(read("guidelines/recipes.json")).recipes);
    for (const r of cat.interaction.rules) {
      for (const k of ["id", "title", "statement", "rationale", "checks", "severity"]) assert.ok(r[k], `${r.id} has ${k}`);
      assert.ok(r.sources.length >= 1, `${r.id} cites a source`);
    }
    assert.ok(cat.interaction.rules.some((r) => r.when) && cat.interaction.rules.some((r) => !r.when), "rules with and without conditions");
  });

  // @covers US-050-AC2
  test("AC2: rulesFor returns exactly the rules whose conditions match on every axis they name", () => {
    const target = { context: "app", sizeClasses: ["compact"], inputs: ["coarse"] };
    const expected = source.rules.filter((r) => !r.when?.aiRole && (!r.when?.context || r.when.context.includes("app")) && (!r.when?.sizeClass || r.when.sizeClass.includes("compact")) && (!r.when?.input || r.when.input.includes("coarse")));
    assert.deepEqual(rulesFor(target).map((r) => r.id), expected.map((r) => r.id));
    const got = new Set(rulesFor(target).map((r) => r.id));
    assert.ok(got.has("modal.one-at-a-time"), "a rule with no conditions matches every target");
    assert.ok(got.has("nav.compact-destinations") && got.has("input.touch-targets"));
    assert.ok(!got.has("nav.standing-at-expanded") && !got.has("input.focus-visible") && !got.has("view.no-shell"));
    assert.equal(rulesFor().length, source.rules.filter((r) => !r.when?.aiRole).length, "an axis left out matches every value (but a target with no AI role gets no AI rule)");
  });

  // @covers US-050-AC3
  test("AC3: AGENTS.md and the skill list every rule ID with its statement, and the loop", () => {
    for (const p of ["packages/ui/AGENTS.md", "packages/ui/skill/ux-builder-ui/SKILL.md"]) {
      const text = read(p);
      for (const r of source.rules) assert.ok(text.includes(`\`${r.id}\``) && text.includes(r.statement.replace(/\|/g, "\\|")), `${p} lists ${r.id}`);
      assert.match(text, /\*\*plan\*\*[\s\S]*\*\*check\*\*[\s\S]*\*\*build\*\*[\s\S]*\*\*lint\*\*[\s\S]*\*\*audit\*\*/, `${p} states the loop`);
    }
  });

  // @covers US-050-AC5
  test("AC5: the README and the guidance carry the disclaimer", () => {
    for (const p of ["README.md", "packages/ui/README.md", "packages/ui/AGENTS.md", "packages/ui/skill/ux-builder-ui/SKILL.md"]) {
      const text = read(p).replace(/\s+/g, " ");
      assert.match(text, /not affiliated with or endorsed by Apple or Google/, p);
      assert.match(text, /Human Interface Guidelines is a trademark of Apple/, p);
      assert.match(text, /Material Design is a trademark of Google/, p);
    }
  });
});

describe("US-053: checking a blueprint", () => {
  // @covers US-052-AC1
  test("the app and view skeletons pass", () => {
    assert.deepEqual(checkBlueprint(skeleton("app")), []);
    assert.deepEqual(checkBlueprint(skeleton("view")), []);
  });

  // @covers US-053-AC9
  test("AC9: CONTRACT-005's example blueprint passes", () => {
    const contract = read("docs/helix/02-design/contracts/CONTRACT-005-interaction-rules-and-blueprint.md");
    const examples = [...contract.split("## Examples")[1].matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));
    const example = examples.find((x) => !Array.isArray(x) && x.version === 1);
    assert.ok(example, "the contract has an example blueprint");
    assert.equal(example.name, "Time review");
    assert.deepEqual(checkBlueprint(example), []);
  });

  // @covers US-053-AC7
  test("AC7: the same blueprint gives the same findings in the same order, by path then rule in plain string order", () => {
    const screens = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, title: `S${i}`, pattern: i % 2 ? "CollectionList" : "Dashbord", destructiveActions: [{ label: "Delete", safeguard: "none" }] }));
    const bp = app({ destinations: screens.map((s) => ({ id: s.id, label: s.title, screen: s.id })), screens });
    const first = checkBlueprint(bp), second = checkBlueprint(structuredClone(bp));
    assert.ok(first.length > 20, "enough findings to show an order");
    assert.deepEqual(second, first);
    assert.equal(JSON.stringify(second), JSON.stringify(first));
    const key = (f) => [f.path, f.rule];
    for (let i = 1; i < first.length; i++) {
      const [pa, ra] = key(first[i - 1]), [pb, rb] = key(first[i]);
      assert.ok(pa < pb || (pa === pb && ra <= rb), `${pa} ${ra} before ${pb} ${rb}`);
    }
    assert.ok(first.findIndex((f) => f.path.startsWith("/screens/10/")) < first.findIndex((f) => f.path.startsWith("/screens/2/")), "string order: /screens/10 before /screens/2");
  });

  // @covers US-053-AC8
  test("AC8: a 50-screen blueprint is checked in under one second", () => {
    const screens = Array.from({ length: 50 }, (_, i) => ({
      id: `screen-${i}`, title: `Screen ${i}`, pattern: ["CollectionList", "RecordDetail", "WorkQueue", "SettingsPage", "FormPage"][i % 5],
      primaryAction: { label: "Save" }, destructiveActions: [{ label: "Delete", safeguard: "undo" }], states: ["empty", "loading", "error"],
      modals: [{ id: `edit-${i}`, title: "Edit", kind: "dialog", dismiss: "cancel", editsData: true, guardsUnsavedChanges: true }],
    }));
    const bp = app({ destinations: screens.slice(0, 5).map((s) => ({ id: s.id, label: s.title, screen: s.id })), screens });
    const start = performance.now();
    const f = checkBlueprint(bp);
    const ms = performance.now() - start;
    assert.deepEqual(f, [], "the 50-screen blueprint is valid");
    assert.ok(ms < 1000, `took ${ms.toFixed(1)} ms`);
  });

  // @covers US-053-AC4
  test("AC4: an unknown pattern is an error naming the nearest", () => {
    const f = checkBlueprint(app({ screens: [{ id: "home", title: "Home", pattern: "ListDetails" }] }));
    assert.deepEqual(ids(f), ["pattern.exists"]);
    assert.equal(f[0].severity, "error");
    assert.equal(f[0].path, "/screens/0/pattern");
    assert.match(f[0].fix, /"ListDetail"/);
  });

  // @covers US-053-AC5
  test("AC5: four mistakes give four findings, each with rule, path and fix", () => {
    const f = checkBlueprint(app({
      supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"] },
      destinations: ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, label: id.toUpperCase(), screen: "home" })),
      screens: [{
        id: "home", title: "Matters", pattern: "CollectionList",
        destructiveActions: [{ label: "Delete", safeguard: "none" }],
        modals: [{ id: "edit", title: "Edit", kind: "dialog", dismiss: "cancel", modals: [{ id: "pick", title: "Pick", kind: "dialog", dismiss: "close" }] }],
      }],
    }));
    assert.deepEqual(f.map((x) => [x.rule, x.path]), [
      ["nav.compact-destinations", "/destinations"],
      ["action.destructive-safeguard", "/screens/0/destructiveActions/0"],
      ["modal.one-at-a-time", "/screens/0/modals/0/modals/0"],
      ["screen.states", "/screens/0/states"],
    ]);
    for (const x of f) assert.ok(x.message && x.fix && ["error", "warning"].includes(x.severity));
  });

  test("schema problems, modal contract and unsaved changes", () => {
    const f = checkBlueprint(app({
      extra: true,
      destinations: [{ id: "home", label: "Home", screen: "nowhere" }],
      screens: [{ id: "home", title: "Home", pattern: "SettingsPage", modals: [{ id: "m", title: " ", kind: "sheet", editsData: true }] }],
    }));
    assert.deepEqual(ids(f).sort(), ["blueprint.valid", "blueprint.valid", "modal.dismiss", "modal.titled", "modal.unsaved-changes"]);
    assert.ok(f.some((x) => x.path === "/extra") && f.some((x) => x.path === "/destinations/0/screen"));
    assert.deepEqual(ids(checkBlueprint({ version: 1 })), ["blueprint.valid", "blueprint.valid", "blueprint.valid", "blueprint.valid"]);
    const noDest = app(); delete noDest.destinations;
    assert.deepEqual(ids(checkBlueprint(noDest)), ["blueprint.valid"], "an app needs destinations");
  });

  // @covers US-053-AC5
  test("a rule applies only where the blueprint's support meets its conditions", () => {
    const wide = app({ supports: { sizeClasses: ["expanded", "large"], inputs: ["fine"] }, destinations: ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, label: id, screen: "home" })) });
    assert.deepEqual(checkBlueprint(wide), [], "six destinations are fine when compact is not supported");
  });

  // @covers US-053-AC5
  test("AC5: the destination limit is for the compact size class only; a medium-only app may have six", () => {
    const six = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, label: id, screen: "home" }));
    assert.deepEqual(source.rules.find((r) => r.id === "nav.compact-destinations").when.sizeClass, ["compact"]);
    assert.deepEqual(checkBlueprint(app({ supports: { sizeClasses: ["medium"], inputs: ["coarse"] }, destinations: six })), []);
    assert.deepEqual(checkBlueprint(app({ supports: { sizeClasses: ["medium", "expanded"], inputs: ["fine"] }, destinations: six })), []);
    const compact = checkBlueprint(app({ supports: { sizeClasses: ["compact", "medium"], inputs: ["coarse"] }, destinations: six }));
    assert.deepEqual(ids(compact), ["nav.compact-destinations"]);
    assert.match(compact[0].message, /at the compact size class/);
    assert.ok(!rulesFor({ context: "app", sizeClasses: ["medium"] }).some((r) => r.id === "nav.compact-destinations"));
  });

  test("findRecipes: best match first; every recipe for no job", () => {
    assert.equal(findRecipes("approve flagged time entries")[0].id, "review-queue");
    assert.equal(findRecipes("change my preferences")[0].id, "settings");
    assert.deepEqual(findRecipes("").map((r) => r.id), cat.interaction.recipes.map((r) => r.id));
    assert.ok(findRecipes("", "view").every((r) => r.kind !== "app"));
  });
});

describe("US-055: an embedded view", () => {
  // @covers US-055-AC1
  test("AC1: destinations or a shell pattern in a view are errors", () => {
    const f = checkBlueprint(view({ destinations: [{ id: "a", label: "A", screen: "main" }], screens: [{ id: "main", title: "Main", pattern: "AppShell", states: ["empty", "loading", "error"] }] }));
    assert.deepEqual(f.map((x) => [x.rule, x.severity, x.path]), [["view.no-shell", "error", "/destinations"], ["view.no-shell", "error", "/screens/0/pattern"]]);
  });

  // @covers US-055-AC2
  test("AC2: a view must support compact and medium", () => {
    const f = checkBlueprint(view({ supports: { sizeClasses: ["expanded"], inputs: ["fine"] } }));
    assert.deepEqual(ids(f), ["view.size-classes"]);
    assert.equal(f[0].severity, "error");
    assert.match(f[0].message, /compact and medium/);
  });

  // @covers US-055-AC3
  test("AC3: more than one screen is a warning; modal tasks are not screens", () => {
    const two = checkBlueprint(view({ screens: [...skeleton("view").screens, { id: "b", title: "B", pattern: "FormPage", states: ["empty", "loading", "error"] }] }));
    assert.deepEqual(two.map((x) => [x.rule, x.severity]), [["view.one-task", "warning"]]);
    const modal = view(); modal.screens = [{ ...modal.screens[0], modals: [{ id: "m", title: "Edit", kind: "sheet", dismiss: "cancel" }] }];
    assert.deepEqual(checkBlueprint(modal), []);
  });

  // @covers US-055-AC4
  test("AC4: rulesFor a view gives the view profile and no app-only rule", () => {
    const got = rulesFor({ context: "view" });
    for (const id of ["view.no-shell", "view.size-classes", "view.one-task", "view.states", "view.theme-from-host"]) assert.ok(got.some((r) => r.id === id), id);
    assert.ok(got.every((r) => !r.when?.context || r.when.context.includes("view")));
    assert.ok(!got.some((r) => r.id === "nav.compact-destinations"));
  });

  // @covers US-055-AC5
  test("AC5: every screen of a view declares its states, whatever its pattern", () => {
    const form = checkBlueprint(view({ screens: [{ id: "main", title: "Request", pattern: "FormPage" }] }));
    assert.deepEqual(form.map((x) => [x.rule, x.severity, x.path]), [["view.states", "warning", "/screens/0/states"]]);
    assert.match(form[0].message, /empty, loading, error states/);
    const partial = checkBlueprint(view({ screens: [{ id: "main", title: "Result", pattern: "RecordDetail", states: ["empty"] }] }));
    assert.deepEqual(ids(partial), ["view.states"], "one finding, not a second screen.states for a data pattern");
    assert.match(partial[0].message, /loading, error states/);
    assert.deepEqual(checkBlueprint(view({ screens: [{ id: "main", title: "Request", pattern: "FormPage", states: ["empty", "loading", "error"] }] })), []);
    assert.deepEqual(checkBlueprint(app({ screens: [{ id: "home", title: "Request", pattern: "FormPage" }] })), [], "in an app, a form screen needs no declared states");
  });
});
