/* Alternative blueprints (US-129; FEAT-018 GDL-26, GDL-27; ADR-036 rule 7).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { emptyState, readState, serialize } from "@ux-builder/design";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const SKILL = readFileSync(new URL("../../design/skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const tmp = mkdtempSync(join(tmpdir(), "bp-alt-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const BP = { version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] }, destinations: [{ id: "find", label: "Find", screen: "search" }], screens: [{ id: "search", title: "Search", pattern: "CollectionList", states: ["empty", "loading", "error"] }] };
let n = 0;
function app() {
  const dir = join(tmp, `app-${++n}`);
  mkdirSync(join(dir, ".ux-builder"), { recursive: true });
  writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify(BP, null, 2));
  writeFileSync(join(dir, ".ux-builder/design-state.json"), serialize({ ...emptyState(), activity: "explore" }));
  return dir;
}
const run = (dir, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8" });

describe("US-129: alternatives", () => {
  // @covers US-129-AC1
  test("AC1: alternative new writes app.blueprint.<name>.json as a copy, and refuses (exit 1) if it exists", () => {
    const dir = app();
    let r = run(dir, "alternative", "new", "map-first");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(join(dir, "app.blueprint.map-first.json"), "utf8"), readFileSync(join(dir, "app.blueprint.json"), "utf8"));
    assert.deepEqual(readState(dir).alternatives, [{ name: "map-first", file: "app.blueprint.map-first.json", status: "candidate" }]);
    writeFileSync(join(dir, "app.blueprint.map-first.json"), "{ \"changed\": true }");
    r = run(dir, "alternative", "new", "map-first");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /app\.blueprint\.map-first\.json exists; not overwriting it\./);
    assert.equal(readFileSync(join(dir, "app.blueprint.map-first.json"), "utf8"), "{ \"changed\": true }");
  });

  // @covers US-129-AC2
  test("AC2: an alternative with an error is reported exactly as the main blueprint would be", () => {
    const dir = app();
    const broken = { ...BP, screens: [{ ...BP.screens[0], pattern: "NoSuchPattern" }] };
    writeFileSync(join(dir, "app.blueprint.map-first.json"), JSON.stringify(broken));
    writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify(broken));
    const alt = run(dir, "check", "app.blueprint.map-first.json", "--json"), main = run(dir, "check", "app.blueprint.json", "--json");
    assert.equal(alt.status, 1);
    assert.deepEqual(JSON.parse(alt.stdout), JSON.parse(main.stdout));
    assert.ok(JSON.parse(alt.stdout).some((f) => f.rule === "pattern.exists"));
  });

  // @covers US-129-AC3
  test("AC3: choose makes app.blueprint.json the chosen content; the state lists it chosen and the others rejected, each with reason and date", () => {
    const dir = app();
    for (const name of ["search-first", "map-first", "activity-first"]) {
      assert.equal(run(dir, "alternative", "new", name).status, 0);
      writeFileSync(join(dir, `app.blueprint.${name}.json`), JSON.stringify({ ...BP, name: name }));
    }
    const r = run(dir, "alternative", "choose", "map-first", "--reason", "fewest steps");
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(readFileSync(join(dir, "app.blueprint.json"), "utf8")).name, "map-first");
    const today = new Date().toISOString().slice(0, 10);
    assert.deepEqual(readState(dir).alternatives, [
      { name: "activity-first", file: "app.blueprint.activity-first.json", status: "rejected", reason: "map-first was chosen: fewest steps", date: today },
      { name: "map-first", file: "app.blueprint.map-first.json", status: "chosen", reason: "fewest steps", date: today },
      { name: "search-first", file: "app.blueprint.search-first.json", status: "rejected", reason: "map-first was chosen: fewest steps", date: today },
    ]);
  });

  // @covers US-129-AC4
  test("AC4: choose without --reason exits 1 naming the missing reason and changes nothing", () => {
    const dir = app();
    run(dir, "alternative", "new", "map-first");
    writeFileSync(join(dir, "app.blueprint.map-first.json"), JSON.stringify({ ...BP, name: "map" }));
    const before = readFileSync(join(dir, "app.blueprint.json"), "utf8"), state = readFileSync(join(dir, ".ux-builder/design-state.json"), "utf8");
    const r = run(dir, "alternative", "choose", "map-first");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /alternative choose needs --reason/);
    assert.equal(readFileSync(join(dir, "app.blueprint.json"), "utf8"), before);
    assert.equal(readFileSync(join(dir, ".ux-builder/design-state.json"), "utf8"), state);
  });

  // @covers US-129-AC5
  test("AC5: the skill drafts at least two alternatives for every open question about the interaction model and recommends one", () => {
    const s = SKILL.slice(SKILL.indexOf("## Explore alternatives"), SKILL.indexOf("## Checkpoints"));
    assert.match(s, /For every open question about the interaction model[\s\S]*draft at least two alternatives and recommend one/);
  });
});
