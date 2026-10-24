/* ux-builder-blueprint (FEAT-008 ADP-02; US-052-AC1, AC2; CONTRACT-005).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { skeleton } from "@ux-builder/ui/blueprint";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const run = (args, cwd) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });

describe("US-052: adopting the rules in an existing app", () => {
  // @covers US-052-AC1
  test("AC1: init writes a skeleton once, touches nothing else, and refuses to overwrite", () => {
    const dir = mkdtempSync(join(tmpdir(), "bp-init-"));
    writeFileSync(join(dir, "package.json"), '{"name":"existing"}\n');
    const first = run(["init"], dir);
    assert.equal(first.status, 0, first.stderr);
    assert.deepEqual(readdirSync(dir).sort(), ["app.blueprint.json", "package.json"]);
    const bp = JSON.parse(readFileSync(join(dir, "app.blueprint.json"), "utf8"));
    assert.equal(bp.kind, "app");
    assert.ok(bp.supports.sizeClasses.length && bp.supports.inputs.length);
    assert.equal(bp.screens.length, 1);
    writeFileSync(join(dir, "app.blueprint.json"), "{ \"mine\": true }\n");
    const second = run(["init"], dir);
    assert.equal(second.status, 1);
    assert.match(second.stderr, /exists/);
    assert.equal(readFileSync(join(dir, "app.blueprint.json"), "utf8"), "{ \"mine\": true }\n");
    assert.equal(readFileSync(join(dir, "package.json"), "utf8"), '{"name":"existing"}\n');
    assert.equal(run(["init", "--kind", "view", "--out", "view.blueprint.json"], dir).status, 0);
    assert.equal(JSON.parse(readFileSync(join(dir, "view.blueprint.json"), "utf8")).kind, "view");
    assert.equal(run(["init", "--kind", "page"], dir).status, 2);
  });

  // @covers US-052-AC2
  test("AC2: check prints rule, severity, path and fix; exits 1 on an error, 0 on warnings only", () => {
    const dir = mkdtempSync(join(tmpdir(), "bp-check-"));
    const error = { ...skeleton("app"), screens: [{ ...skeleton("app").screens[0], destructiveActions: [{ label: "Delete", safeguard: "none" }] }] };
    const warning = { ...skeleton("app"), screens: [{ id: "home", title: "Home", pattern: "CollectionList" }] };
    writeFileSync(join(dir, "error.json"), JSON.stringify(error));
    writeFileSync(join(dir, "warning.json"), JSON.stringify(warning));
    writeFileSync(join(dir, "broken.json"), "{ nope");
    const e = run(["check", "error.json"], dir);
    assert.equal(e.status, 1);
    assert.match(e.stdout, /error\s+action\.destructive-safeguard\s+\/screens\/0\/destructiveActions\/0/);
    assert.match(e.stdout, /Fix: Set safeguard/);
    const w = run(["check", "warning.json"], dir);
    assert.equal(w.status, 0, w.stdout);
    assert.match(w.stdout, /warning\s+screen\.states\s+\/screens\/0\/states/);
    const j = run(["check", "error.json", "--json"], dir);
    assert.equal(JSON.parse(j.stdout)[0].rule, "action.destructive-safeguard");
    assert.equal(run(["check", "broken.json"], dir).status, 2);
    assert.equal(run(["check", "missing.json"], dir).status, 2);
    assert.equal(run([], dir).status, 2);
    // With no file, check reads app.blueprint.json, as the other commands do.
    writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify(warning));
    assert.equal(run(["check"], dir).status, 0);
  });
});

describe("US-087: check reads the HELIX stories above the blueprint, never writing them", () => {
  const story = (id, acs) => `---\nddx:\n  id: ${id}\n  type: user-stories\n  status: draft\n---\n\n# ${id}: A story\n\n## Acceptance Criteria\n\n${acs.map((n) => `- [ ] **${id}-AC${n}** — Given something, then something.`).join("\n")}\n`;
  const blueprint = () => ({
    ...skeleton("app"),
    destinations: [{ id: "home", label: "Home", screen: "home" }, { id: "settings", label: "Settings", screen: "settings" }],
    screens: [{ ...skeleton("app").screens[0], stories: ["US-012"], actions: [{ id: "open", label: "Settings", to: "settings" }] },
      { id: "settings", title: "Settings", pattern: "SettingsPage", stories: ["US-013"], actions: [{ id: "back", label: "Back", to: "back" }] }],
    journeys: [{ id: "J-home", story: "US-012", criteria: ["US-012-AC1", "US-012-AC9"], entry: "home", steps: [{ screen: "home", action: "open" }, { screen: "settings" }] }],
  });
  /* A repository with a HELIX marker, two stories and the app's blueprint in a subdirectory. */
  const repo = () => {
    const dir = mkdtempSync(join(tmpdir(), "bp-helix-"));
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, ".helix.yml"), "# HELIX flow marker\nversion: 1\nflows:\n  - id: helix\n    root: docs/helix/\ndefaults:\n  flow: helix\n");
    mkdirSync(join(dir, "docs/helix/01-frame/user-stories"), { recursive: true });
    writeFileSync(join(dir, "docs/helix/01-frame/user-stories/US-012-home.md"), story("US-012", [1, 2]));
    writeFileSync(join(dir, "docs/helix/01-frame/user-stories/US-013-settings.md"), story("US-013", [1]));
    mkdirSync(join(dir, "app"));
    writeFileSync(join(dir, "app/app.blueprint.json"), JSON.stringify(blueprint()));
    return dir;
  };
  const snapshot = (dir) => {
    const out = {};
    const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else out[p] = [readFileSync(p, "utf8"), statSync(p).mtimeMs]; } };
    walk(dir);
    return out;
  };

  // @covers US-087-AC4
  test("AC4: a story a screen serves with no journey warns, naming it, from the marker above the file", () => {
    const dir = repo();
    const r = run(["check", "app.blueprint.json", "--json"], join(dir, "app"));
    assert.equal(r.status, 0, r.stderr);
    const f = JSON.parse(r.stdout);
    const story = f.filter((x) => x.rule === "journey.story-covered");
    assert.deepEqual(story.map((x) => x.path), ["/journeys/0/criteria/1", "/screens/1/stories/0"]);
    assert.match(story[1].message, /US-013, which "Settings" serves, has no journey/);
    assert.equal(r.stderr, "", "no note: the marker was found");
  });

  // @covers US-087-AC5
  test("AC5: a criterion the story lacks warns, naming it, and no HELIX document is written", () => {
    const dir = repo();
    const before = snapshot(dir);
    const r = run(["check", "app/app.blueprint.json"], dir);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /warning\s+journey\.story-covered\s+\/journeys\/0\/criteria\/1\n\s+J-home names US-012-AC9, which US-012 does not have/);
    assert.deepEqual(snapshot(dir), before, "every file as it was");
  });

  // @covers US-087-AC6
  test("AC6: with no HELIX marker, the story checks are skipped and the output says so", () => {
    const dir = mkdtempSync(join(tmpdir(), "bp-nohelix-"));
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify(blueprint()));
    const text = run(["check", "app.blueprint.json"], dir);
    assert.equal(text.status, 0, text.stdout);
    assert.match(text.stdout, /note\s+No HELIX marker \(\.helix\.yml\) above app\.blueprint\.json: skipped journey\.story-covered and the criterion checks\./);
    assert.doesNotMatch(text.stdout, /journey\.story-covered\s+\//);
    const json = run(["check", "app.blueprint.json", "--json"], dir);
    assert.ok(JSON.parse(json.stdout).every((x) => x.rule !== "journey.story-covered"), "stdout stays the findings array");
    assert.match(json.stderr, /^note: No HELIX marker/);
    // A blueprint with no journeys and no stories has nothing to skip.
    writeFileSync(join(dir, "plain.json"), JSON.stringify(skeleton("app")));
    assert.doesNotMatch(run(["check", "plain.json"], dir).stdout, /note/);
  });
});
