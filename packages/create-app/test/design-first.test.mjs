/* Design first, the app built in place at the end (US-150; FEAT-018 GDL-81;
   CONTRACT-008 Design first).

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { PassThrough } from "node:stream";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { explain, readState, status } from "@ux-builder/design";
import { askTheme, themes } from "../index.mjs";
import { mergePackage } from "../design-first.mjs";
import { bundle } from "./fixtures/helix-release.mjs";

const CLI = fileURLToPath(new URL("../index.mjs", import.meta.url));
const DESIGN = fileURLToPath(new URL("../../design/cli.mjs", import.meta.url));
const SKILL = fileURLToPath(new URL("../../design/skill/ux-builder-design/SKILL.md", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "design-first-"));
const BUNDLE = bundle("8.8.0");
after(() => { rmSync(tmp, { recursive: true, force: true }); rmSync(BUNDLE, { recursive: true, force: true }); });
// No test here touches GitHub: HELIX comes from the test bundle.
const ENV = { ...process.env, UX_BUILDER_HELIX_API: "http://127.0.0.1:9", UX_BUILDER_HELIX_BUNDLE: BUNDLE };
const create = (cwd, ...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
const design = (cwd, ...args) => spawnSync(process.execPath, [DESIGN, ...args], { encoding: "utf8", cwd, env: ENV });
const files = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath ?? e.path, e.name))).filter((f) => !f.startsWith(".claude/skills/helix/")).sort();
const BP = "docs/ux-builder/blueprint/app.blueprint.json";
const snapshot = (dir) => Object.fromEntries(files(dir).map((f) => [f, readFileSync(join(dir, f), "utf8")]));

/* A design folder, named name, its modality recorded unless modality is false. */
function folder(name, { modality = "responsive-web", sizes = "compact,expanded" } = {}) {
  const r = create(tmp, name);
  assert.equal(r.status, 0, r.stderr);
  const dir = join(tmp, name);
  if (modality) assert.equal(design(dir, "modality", "--answer", "A web app for phones and laptops", "--modality", modality, "--size-classes", sizes, ...(modality.includes("responsive-web") ? ["--frame", "side-nav"] : [])).status, 0);
  return dir;
}

describe("US-150: design first, and build the app in place at the end", () => {
  // @covers US-150-AC1
  test("AC1: without --modality it asks nothing and writes a design folder: the guide, HELIX's skill and marker, no app code or theme", () => {
    const r = create(tmp, "trip-planner");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Created trip-planner, a design folder: the guided design, and no app yet\. Nothing was asked/);
    const dir = join(tmp, "trip-planner");
    assert.deepEqual(files(dir), [".claude/skills/ux-builder-design/SKILL.md", ".gitignore", ".helix.yml", ".ux-builder/design-state.json", "AGENTS.md", "CLAUDE.md", "README.md", BP, "package.json", "scripts/install-skill.mjs"]);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert.equal(pkg.name, "trip-planner");
    assert.deepEqual(Object.keys(pkg.devDependencies).sort(), ["@ux-builder/design", "@ux-builder/ui"]);
    assert.equal(pkg.dependencies, undefined);
    assert.equal(pkg.scripts.postinstall, "node scripts/install-skill.mjs");
    const state = readState(dir);
    assert.deepEqual([state.startedFrom, state.activity, state.modality, state.app], ["design", "define", undefined, undefined]);
    const bp = JSON.parse(readFileSync(join(dir, BP), "utf8"));
    assert.equal(bp.name, "trip-planner");
    assert.equal(bp.supports?.modalities, undefined, "no modality decided");
    assert.ok(existsSync(join(dir, ".claude/skills/helix/HELIX-VERSION.json")));
    assert.ok(!existsSync(join(dir, "docs/helix")), "HELIX's documents wait for the build");
    for (const f of files(dir)) assert.doesNotMatch(readFileSync(join(dir, f), "utf8"), /__[A-Z_]+__/, f);
    assert.doesNotMatch(readFileSync(join(dir, "AGENTS.md"), "utf8"), /theme `/, "no theme yet");
  });

  // @covers US-114-AC3
  test("US-114-AC3 (amended): a design folder's CLAUDE.md, AGENTS.md and README.md each name /ux-builder-design as the way to start", () => {
    const dir = join(tmp, "trip-planner");
    for (const f of ["CLAUDE.md", "AGENTS.md", "README.md"]) assert.match(readFileSync(join(dir, f), "utf8"), /type `\/ux-builder-design`/, f);
  });

  // @covers US-150-AC2
  test("AC2: status in a design folder says the app is not built, and what the build needs, in order", () => {
    const dir = folder("status-check", { modality: false });
    let s = status(dir);
    assert.deepEqual(s.app, { built: false, modalityRecorded: false });
    assert.match(s.text, /Step 1 of 8: Define intent \(Define, in the full loop, in a design folder\)\./);
    assert.match(s.text, /No app yet: this folder holds the design\. To build the app here when the design is ready: record the person's answer on modality \(ux-builder-design modality\), then ask them for the theme \(a released one, or one they make from their brand in the theme builder\), then run npm create @ux-builder\/app@latest \. -- --theme <name>\./);
    design(dir, "modality", "--answer", "chat", "--modality", "chat", "--size-classes", "compact");
    s = status(dir);
    assert.equal(s.app.modalityRecorded, true);
    assert.match(s.text, /To build the app here when the design is ready: ask them for the theme/);
  });

  // @covers US-150-AC3
  test("AC3: the build writes the app in place on the theme and recorded modalities, keeping the design work", () => {
    const dir = folder("rivers", { modality: "responsive-web,hybrid-chat", sizes: "compact,expanded" });
    // The design's own work, and a HELIX document the person wrote, must survive.
    mkdirSync(join(dir, "docs/helix/00-discover"), { recursive: true });
    writeFileSync(join(dir, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
    design(dir, "decision", "add", "--question", "Map first?", "--option", "Map", "--option", "List", "--choice", "Map", "--why", "Fewer steps");
    writeFileSync(join(dir, "docs/helix/00-discover/product-vision.md"), "# Rivers, in the owner's words\n");
    const designed = readFileSync(join(dir, BP), "utf8");
    const PROPOSED = "docs/ux-builder/helix-proposals/helix/02-design/adr/ADR-001-map-first.md.patch";
    const decision = readFileSync(join(dir, PROPOSED), "utf8");
    const r = create(dir, ".", "--theme", "databricks");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Built rivers, a responsive-web and hybrid-chat app, in \. on the databricks theme, from the designed blueprint/);
    assert.equal(readFileSync(join(dir, BP), "utf8"), designed, "the designed blueprint is the app's plan");
    assert.equal(readFileSync(join(dir, PROPOSED), "utf8"), decision);
    assert.equal(readFileSync(join(dir, "docs/helix/00-discover/product-vision.md"), "utf8"), "# Rivers, in the owner's words\n");
    assert.ok(existsSync(join(dir, "docs/helix/01-frame/user-stories/US-001-open-the-app-and-see-where-to-start.md")), "HELIX's starter documents where none existed");
    assert.ok(existsSync(join(dir, ".claude/skills/ux-builder-design/SKILL.md")) && existsSync(join(dir, ".claude/skills/helix/HELIX-VERSION.json")));
    for (const f of ["src/main.jsx", "src/Home.jsx", "src/Assistant.jsx", "index.html", "e2e/starter.spec.js", "docs/ux-builder/ux-assessment.yml", ".stylelintrc.json"]) assert.ok(existsSync(join(dir, f)), f);
    assert.match(readFileSync(join(dir, "src/main.jsx"), "utf8"), /<ThemeProvider theme="databricks"/);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert.equal(pkg.name, "rivers");
    assert.equal(pkg.scripts.design, "ux-builder-design status", "the folder's own script is kept");
    assert.ok(pkg.scripts.dev && pkg.scripts.audit && pkg.scripts["assess:validate"]);
    assert.ok(pkg.dependencies["@ux-builder/ui"] && !pkg.devDependencies["@ux-builder/ui"], "ui moves to dependencies");
    assert.match(readFileSync(join(dir, "AGENTS.md"), "utf8"), /## HELIX/);
    const state = readState(dir);
    assert.deepEqual([state.app.theme, state.app.modalities], ["databricks", ["responsive-web", "hybrid-chat"]]);
    assert.match(status(dir).text, /The app was built here on the databricks theme \(responsive-web, hybrid-chat\)\./);
    const trace = readdirSync(join(dir, ".ux-builder/trace"), { recursive: true }).map(String);
    assert.ok(trace.some((f) => /create/.test(f)), "the create episode is traced");
    // Built once: the folder is an app now, not a design folder.
    const again = create(dir, ".", "--theme", "databricks");
    assert.equal(again.status, 1);
    assert.match(again.stderr, /\. was already built from its design, on the databricks theme/);
  });

  // @covers US-150-AC4
  test("AC4: no recorded modality, a different --modality, --blueprint, a blueprint with errors or a file in the way: exit 1, nothing written", () => {
    const cases = [
      ["no-modality", { modality: false }, [], /the app's modalities are not recorded yet: .*ux-builder-design modality --answer/],
      ["other-modality", {}, ["--modality", "chat"], /--modality chat differs from the modalities recorded in the design, responsive-web/],
      ["with-blueprint", {}, ["--blueprint", "x.json"], /--blueprint is refused in a design folder/],
      ["bad-blueprint", {}, [], /the designed blueprint has \d+ errors?; fix (it|them) first/, (dir) => { const bp = JSON.parse(readFileSync(join(dir, BP), "utf8")); bp.screens = [{ id: "x" }]; writeFileSync(join(dir, BP), JSON.stringify(bp)); }],
      ["in-the-way", {}, [], /a file is in the way of the app: src\/App\.jsx; move or remove it first/, (dir) => { mkdirSync(join(dir, "src")); writeFileSync(join(dir, "src/App.jsx"), "// mine\n"); }],
    ];
    for (const [name, opts, args, message, prepare] of cases) {
      const dir = folder(name, opts);
      prepare?.(dir);
      const before = snapshot(dir);
      const r = create(dir, ".", "--theme", "plain", ...args);
      assert.equal(r.status, 1, name);
      assert.match(r.stderr, message, name);
      assert.match(r.stderr, /Nothing was written/, name);
      assert.deepEqual(snapshot(dir), before, `${name}: nothing written`);
    }
  });

  // @covers US-150-AC5
  test("AC5: no --theme and no terminal: exit 1 listing the released themes and the theme builder; the guide teaches the theme at the build", async () => {
    const dir = folder("no-theme");
    const before = snapshot(dir);
    const r = create(dir, ".");
    assert.equal(r.status, 1);
    for (const t of themes()) assert.match(r.stderr, new RegExp(`^  ${t}$`, "m"));
    assert.match(r.stderr, /No theme carries your brand\? Make one in the theme builder: in a clone of https:\/\/github\.com\/DocumentDrivenDX\/ux-builder run `npm install && npm run builder`.*released in @ux-builder\/tokens/);
    assert.deepEqual(snapshot(dir), before);
    // In a terminal, the same list and the theme builder, answered by number or name.
    const input = new PassThrough(), output = new PassThrough();
    let said = "";
    output.on("data", (d) => { said += d; });
    const answer = askTheme({ input, output });
    input.write("acme\n");
    input.write(`${themes().indexOf("databricks") + 1}\n`);
    assert.equal(await answer, "databricks");
    assert.match(said, /Which theme should the app be built on\?[\s\S]*theme builder[\s\S]*"acme" is not a released theme/);
    // The guide: the term, and the skill's instructions at the build.
    const [term] = explain({ term: "theme" }).terms;
    assert.equal(term.step, 6);
    assert.match(term.means, /^The app's look/);
    assert.match(term.why, /theme builder/);
    const skill = readFileSync(SKILL, "utf8");
    assert.match(skill, /\*\*Build the app first, in a design folder\.\*\*[\s\S]*ux-builder-design explain theme[\s\S]*theme builder[\s\S]*npm run builder[\s\S]*npm create @ux-builder\/app@latest \. -- --theme <name>/);
  });

  // @covers US-150-AC6
  test("AC6: --modality still makes the app at once; --theme without --modality exits 1 saying the theme is chosen at the build", () => {
    const r = create(tmp, "at-once", "--modality", "chat", "--theme", "plain", "--no-helix");
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(tmp, "at-once/src/main.jsx")));
    assert.equal(readState(join(tmp, "at-once")).startedFrom, "new");
    const t = create(tmp, "theme-only", "--theme", "databricks");
    assert.equal(t.status, 1);
    assert.match(t.stderr, /--theme without --modality: the starter makes a design folder, and the theme is chosen when the app is built there/);
    assert.ok(!existsSync(join(tmp, "theme-only")));
  });

  test("mergePackage keeps the folder's name and own fields, adds the app's, and makes a dependency of a package in both", () => {
    const m = mergePackage({ name: "rivers", private: true, scripts: { design: "d", postinstall: "p" }, devDependencies: { "@ux-builder/ui": "1", extra: "2" }, description: "mine" }, { name: "x", type: "module", scripts: { dev: "vite", postinstall: "p" }, dependencies: { "@ux-builder/ui": "1" }, devDependencies: { vite: "8" } });
    assert.deepEqual(m, { name: "rivers", type: "module", private: true, description: "mine", scripts: { design: "d", postinstall: "p", dev: "vite" }, dependencies: { "@ux-builder/ui": "1" }, devDependencies: { extra: "2", vite: "8" } });
  });
});
