/* The design work's home, docs/ux-builder/, the old layout until
   migration, and the modality answer (US-149; FEAT-018 GDL-80;
   CONTRACT-008 Layout).

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { emptyState, readState, serialize } from "../index.mjs";
import { cli } from "./helpers.mjs";

const BLUEPRINT_CLI = fileURLToPath(new URL("../../ui/blueprint/cli.mjs", import.meta.url));
const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });
const json = (a, args) => { const r = cli(a, [...args, "--json"]); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const blueprint = (a, args) => spawnSync(process.execPath, [BLUEPRINT_CLI, ...args], { cwd: a, encoding: "utf8" });
const st = ["empty", "loading", "error"];
const BP = { version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] }, destinations: [{ id: "find", label: "Find", screen: "map" }], screens: [{ id: "map", title: "Map", pattern: "CollectionList", states: st }], tasks: [{ id: "T-1", goal: "Find a river" }], journeys: [{ id: "J-find", task: "T-1", entry: "map", steps: [{ screen: "map" }] }] };
/* A bare folder: no design work yet, so the new layout. */
function bare() {
  const d = mkdtempSync(join(tmpdir(), "ux-layout-"));
  made.push(d);
  writeFileSync(join(d, "package.json"), JSON.stringify({ name: "rivers", private: true, scripts: { "check:blueprint": "ux-builder-blueprint check app.blueprint.json" } }, null, 2));
  return d;
}
/* An app made before docs/ux-builder/: its design work at its top. */
function oldApp() {
  const d = bare();
  mkdirSync(join(d, ".ux-builder"), { recursive: true });
  writeFileSync(join(d, ".ux-builder/design-state.json"), serialize({ ...emptyState(), alternatives: [{ name: "list-first", file: "app.blueprint.list-first.json", status: "candidate" }] }));
  writeFileSync(join(d, "app.blueprint.json"), JSON.stringify(BP, null, 2));
  writeFileSync(join(d, "app.blueprint.list-first.json"), JSON.stringify(BP, null, 2));
  mkdirSync(join(d, "docs/ux/decisions"), { recursive: true });
  writeFileSync(join(d, "docs/ux/jobs.md"), "---\nux:\n  id: jobs\n  type: jobs\n---\n\n# Jobs\n\n## Jobs\n\n| ID | Job | Importance | Evidence | Confidence | Status |\n|---|---|---|---|---|---|\n| J-1 | Find a river | high | none | low | hypothesis |\n");
  mkdirSync(join(d, "prototype/list-first"), { recursive: true });
  writeFileSync(join(d, "prototype/list-first/map.compact.html"), "<html></html>");
  writeFileSync(join(d, "ux-assessment.yml"), "version: 1\nblueprint: app.blueprint.json\n");
  mkdirSync(join(d, ".github/workflows"), { recursive: true });
  writeFileSync(join(d, ".github/workflows/ci.yml"), "jobs:\n  check:\n    steps:\n      - run: npx ux-builder-blueprint check app.blueprint.json\n");
  return d;
}
const listAll = (d, rel = "") => readdirSync(join(d, rel), { withFileTypes: true }).flatMap((e) => (e.name === ".git" ? [] : e.isDirectory() ? listAll(d, `${rel}${e.name}/`) : [`${rel}${e.name}`])).sort();

describe("US-149: keep the design work in docs/ux-builder, and choose the modality first", () => {
  // @covers US-149-AC1
  test("AC1: in a new app, every file the guide and the blueprint commands write lands under docs/ux-builder/", () => {
    const a = bare();
    json(a, ["init"]);
    json(a, ["state", "set", "assumptions[+]", JSON.stringify({ text: "Anglers new to an area", section: "users", status: "hypothesis" })]);
    json(a, ["brief"]);
    json(a, ["decision", "add", "--question", "Map first?", "--option", "Map", "--option", "List", "--choice", "Map", "--why", "Fewer steps"]);
    assert.equal(blueprint(a, ["alternative", "new", "list-first"]).status, 0);
    assert.equal(blueprint(a, ["compare", "docs/ux-builder/blueprint/app.blueprint.json", "docs/ux-builder/blueprint/app.blueprint.list-first.json"]).status, 0);
    json(a, ["modality", "--answer", "A web app for phones", "--modality", "responsive-web", "--size-classes", "compact"]);
    assert.equal(blueprint(a, ["prototype", "--explore", "--alternative", "list-first", "--question", "List first?"]).status, 0);
    const files = listAll(a).filter((f) => f !== "package.json");
    for (const f of ["docs/ux-builder/blueprint/app.blueprint.json", "docs/ux-builder/blueprint/app.blueprint.list-first.json", "docs/ux-builder/brief.md", "docs/ux-builder/decisions/UXD-1.md", "docs/ux-builder/compare/compare.html", "docs/ux-builder/prototypes/list-first/index.html"]) assert.ok(files.includes(f), f);
    const outside = files.filter((f) => !f.startsWith("docs/ux-builder/") && !f.startsWith(".ux-builder/") && !f.startsWith(".claude/skills/ux-builder-design/"));
    assert.deepEqual(outside, [], "nothing at the app's top but .ux-builder/ and the skill");
    assert.equal(json(a, ["status"]).layout, "current");
  });

  // @covers US-149-AC2
  test("AC2: an app on the old layout keeps its paths, and status says to migrate", () => {
    const a = oldApp();
    json(a, ["decision", "add", "--question", "List first?", "--option", "Map", "--option", "List", "--choice", "List", "--why", "Faster"]);
    assert.ok(existsSync(join(a, "docs/ux/decisions/UXD-1.md")));
    assert.ok(!existsSync(join(a, "docs/ux-builder")));
    assert.match(json(a, ["rubric", "--alternative", "list-first"]).file, /^app\.blueprint\.list-first\.json$/);
    assert.match(cli(a, ["status"]).stdout, /This app is on the old layout \(docs\/ux\/, app\.blueprint\.json at the top\): run ux-builder-design migrate to move it under docs\/ux-builder\//);
    assert.match(blueprint(a, ["compare", "app.blueprint.json", "app.blueprint.list-first.json"]).stderr, /note: this app is on the old layout .* `npx ux-builder-design migrate` moves it under docs\/ux-builder\//);
    assert.ok(existsSync(join(a, "blueprint-compare/compare.html")));
  });

  // @covers US-149-AC3
  test("AC3: migrate --dry-run lists and changes nothing; migrate moves with git mv and rewrites the app's references", () => {
    const a = oldApp();
    execFileSync("git", ["init", "-q"], { cwd: a });
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "add", "-A"], { cwd: a });
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "start"], { cwd: a });
    const before = listAll(a);
    const dry = json(a, ["migrate", "--dry-run"]);
    assert.deepEqual(dry.moves, [
      { from: "docs/ux", to: "docs/ux-builder" },
      { from: "prototype", to: "docs/ux-builder/prototypes" },
      { from: "app.blueprint.json", to: "docs/ux-builder/blueprint/app.blueprint.json" },
      { from: "app.blueprint.list-first.json", to: "docs/ux-builder/blueprint/app.blueprint.list-first.json" },
    ]);
    assert.deepEqual(dry.updated.sort(), [".github/workflows/ci.yml", ".ux-builder/design-state.json", "package.json", "ux-assessment.yml"]);
    assert.equal(dry.git, true);
    assert.deepEqual(listAll(a), before, "a dry run changes nothing");
    const r = json(a, ["migrate"]);
    assert.equal(r.migrated, true);
    for (const f of ["docs/ux-builder/jobs.md", "docs/ux-builder/blueprint/app.blueprint.json", "docs/ux-builder/blueprint/app.blueprint.list-first.json", "docs/ux-builder/prototypes/list-first/map.compact.html"]) assert.ok(existsSync(join(a, f)), f);
    for (const f of ["docs/ux", "prototype", "app.blueprint.json"]) assert.ok(!existsSync(join(a, f)), f);
    // git sees renames, so the history follows the files.
    assert.match(execFileSync("git", ["status", "--porcelain"], { cwd: a, encoding: "utf8" }), /^R {2}app\.blueprint\.json -> docs\/ux-builder\/blueprint\/app\.blueprint\.json$/m);
    assert.equal(JSON.parse(readFileSync(join(a, "package.json"), "utf8")).scripts["check:blueprint"], "ux-builder-blueprint check docs/ux-builder/blueprint/app.blueprint.json");
    assert.match(readFileSync(join(a, "ux-assessment.yml"), "utf8"), /^blueprint: docs\/ux-builder\/blueprint\/app\.blueprint\.json$/m);
    assert.match(readFileSync(join(a, ".github/workflows/ci.yml"), "utf8"), /check docs\/ux-builder\/blueprint\/app\.blueprint\.json/);
    assert.equal(readState(a).alternatives[0].file, "docs/ux-builder/blueprint/app.blueprint.list-first.json");
    // The commands now use the new layout.
    assert.equal(json(a, ["status"]).layout, "current");
    assert.equal(json(a, ["rubric", "--alternative", "list-first"]).file, "docs/ux-builder/blueprint/app.blueprint.list-first.json");
    assert.equal(json(a, ["migrate"]).migrated, false, "nothing left to migrate");
    // A destination that exists is refused, changing nothing.
    const b = oldApp();
    mkdirSync(join(b, "docs/ux-builder/prototypes"), { recursive: true });
    const refused = cli(b, ["migrate"]);
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, /cannot migrate: docs\/ux-builder\/prototypes already exists/);
    assert.ok(existsSync(join(b, "prototype/list-first")));
  });

  // @covers US-149-AC5
  test("AC5: modality refuses a future or unknown modality or size class, naming it, and changes nothing", () => {
    const a = bare();
    json(a, ["init"]);
    const before = readFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8");
    let r = cli(a, ["modality", "--answer", "An iPhone app", "--modality", "ios"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /ios is a future modality; today the app can be responsive-web, chat, hybrid-chat/);
    r = cli(a, ["modality", "--answer", "x", "--modality", "kiosk"]);
    assert.match(r.stderr, /unknown modality kiosk; use responsive-web, chat, hybrid-chat/);
    r = cli(a, ["modality", "--answer", "x", "--modality", "chat", "--size-classes", "huge"]);
    assert.match(r.stderr, /unknown size class huge; use compact, medium, expanded, large, extra-large/);
    assert.equal(readFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8"), before);
    assert.equal(readState(a).modality, undefined);
    const ok = json(a, ["modality", "--answer", "Chat on phones and laptops", "--modality", "responsive-web,hybrid-chat", "--size-classes", "compact,expanded"]);
    assert.deepEqual([ok.modalities, ok.sizeClasses], [["responsive-web", "hybrid-chat"], ["compact", "expanded"]]);
    assert.deepEqual(JSON.parse(readFileSync(join(a, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8")).supports.modalities, ["responsive-web", "hybrid-chat"]);
    assert.equal(readState(a).modality.answer, "Chat on phones and laptops");
  });
});
