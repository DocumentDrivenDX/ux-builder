/* The scaffolder (US-012, FEAT-004 SDK-08, SDK-09).

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkBlueprint, skeleton } from "@ux-builder/ui/blueprint";
import { scaffold, sdkVersions, themes } from "../index.mjs";
import { bundle } from "./fixtures/helix-release.mjs";

const CLI = fileURLToPath(new URL("../index.mjs", import.meta.url));
const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "create-app-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
// The starter's CLI gets HELIX from a test bundle; no test here touches GitHub (helix-fetch.test.mjs covers fetching).
const HELIX_ENV = { ...process.env, UX_BUILDER_HELIX_API: "http://127.0.0.1:9", UX_BUILDER_HELIX_BUNDLE: bundle("8.8.0") };
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd: tmp, env: HELIX_ENV });
const WEB = ["responsive-web"];

describe("scaffold", () => {
  test("writes a React + Vite app on the SDK, on the chosen theme", () => {
    const r = scaffold(join(tmp, "acme"), { theme: "databricks", modalities: WEB });
    assert.deepEqual(r.files, [".claude/settings.json", ".github/workflows/ci.yml", ".gitignore", ".stylelintrc.json", "AGENTS.md", "CLAUDE.md", "README.md", "app.blueprint.json", "e2e/starter.spec.js", "eslint.config.js", "index.html", "package.json", "playwright.config.js", "scripts/install-skill.mjs", "src/App.css", "src/App.jsx", "src/Home.jsx", "src/ThemeSwitch.jsx", "src/main.jsx", "vite.config.js"]);
    const pkg = JSON.parse(readFileSync(join(r.dir, "package.json"), "utf8"));
    assert.equal(pkg.name, "acme");
    assert.match(readFileSync(join(r.dir, "src/main.jsx"), "utf8"), /<ThemeProvider theme="databricks" appearance="system"/);
    assert.match(readFileSync(join(r.dir, ".stylelintrc.json"), "utf8"), /"theme": "databricks"/);
    assert.match(readFileSync(join(r.dir, "CLAUDE.md"), "utf8"), /node_modules\/@ux-builder\/ui\/AGENTS\.md/);
    for (const f of r.files) assert.doesNotMatch(readFileSync(join(r.dir, f), "utf8"), /__[A-Z_]+__/, f);
  });

  // @covers US-012-AC1
  test("AC1: SDK versions are pinned exactly, to the ones this package depends on", () => {
    const r = scaffold(join(tmp, "pinned"), { modalities: WEB });
    const deps = JSON.parse(readFileSync(join(r.dir, "package.json"), "utf8")).dependencies;
    const dev = JSON.parse(readFileSync(join(r.dir, "package.json"), "utf8")).devDependencies;
    assert.deepEqual({ "@ux-builder/tokens": deps["@ux-builder/tokens"], "@ux-builder/ui": deps["@ux-builder/ui"], "@ux-builder/audit": dev["@ux-builder/audit"], "@ux-builder/trace": dev["@ux-builder/trace"] }, sdkVersions());
    assert.match(deps["@ux-builder/ui"], /^\d+\.\d+\.\d+$/, "exact, not a range");
    for (const p of ["tokens", "ui", "audit", "trace"]) assert.equal(sdkVersions()[`@ux-builder/${p}`], JSON.parse(readFileSync(join(ROOT, `packages/${p}/package.json`), "utf8")).version);
  });

  // @covers US-012-AC4
  test("AC4: no secrets and no presentation literals in the app", () => {
    const r = scaffold(join(tmp, "clean"), { modalities: WEB });
    for (const f of r.files) {
      const text = readFileSync(join(r.dir, f), "utf8");
      assert.doesNotMatch(text, /(_authToken\s*=\s*\S+[^>]$|sk-[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{10,})/m, f);
    }
    assert.doesNotMatch(readFileSync(join(r.dir, "src/App.css"), "utf8"), /#[0-9a-f]{3,8}\b|rgb\(|\d+px/i);
  });

  test("the default theme is plain; every shipped theme is accepted", () => {
    assert.equal(scaffold(join(tmp, "default"), { modalities: WEB }).theme, "plain");
    assert.ok(themes().includes("praxis-carbon"));
  });

  test("an unknown theme, a non-empty folder or a bad name is refused", () => {
    assert.match(run(join(tmp, "x1"), "--modality", "responsive-web", "--theme", "bootstrap").stderr, /unknown theme "bootstrap"; choose one of/);
    mkdirSync(join(tmp, "full")); writeFileSync(join(tmp, "full", "keep.txt"), "x");
    assert.match(run(join(tmp, "full"), "--modality", "chat").stderr, /exists and is not empty/);
    assert.match(run(join(tmp, "x2"), "--modality", "chat", "--name", "Bad Name").stderr, /not a valid package name/);
  });

  test("runs through a symlinked bin, as npm create does", () => {
    mkdirSync(join(tmp, "bin"));
    symlinkSync(CLI, join(tmp, "bin", "create-app"));
    const r = spawnSync(process.execPath, [join(tmp, "bin", "create-app"), join(tmp, "linked"), "--modality", "responsive-web", "--theme", "databricks"], { encoding: "utf8", cwd: tmp, env: HELIX_ENV });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Created linked, a responsive-web app, on the databricks theme/);
    assert.match(readFileSync(join(tmp, "linked", "package.json"), "utf8"), /"name": "linked"/);
  });

  test("--help lists the themes", () => {
    const r = run("--help");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Themes: .*databricks/);
    assert.match(r.stdout, /--modality <list>/);
    for (const m of ["responsive-web", "chat", "hybrid-chat"]) assert.match(r.stdout, new RegExp(`^  ${m} `, "m"), m);
    assert.match(r.stdout, /Native apps \(ios, android, macos, windows\) are future/);
  });
});

describe("US-051: a new app starts from a blueprint", () => {
  // @covers US-051-AC1
  test("AC1: the app has a blueprint that passes, a check:blueprint script and a CI step", () => {
    const r = scaffold(join(tmp, "planned"), { modalities: WEB });
    const bp = JSON.parse(readFileSync(join(r.dir, "app.blueprint.json"), "utf8"));
    assert.equal(bp.name, "planned");
    assert.deepEqual(checkBlueprint(bp).filter((f) => f.severity === "error"), []);
    assert.deepEqual(checkBlueprint(bp), [], "and no warnings");
    const pkg = JSON.parse(readFileSync(join(r.dir, "package.json"), "utf8"));
    assert.equal(pkg.scripts["check:blueprint"], "ux-builder-blueprint check app.blueprint.json");
    assert.match(readFileSync(join(r.dir, ".github/workflows/ci.yml"), "utf8"), /- run: npm run check:blueprint/);
  });

  // @covers US-051-AC2
  test("AC2: --blueprint with a valid plan copies it", () => {
    const plan = { ...skeleton("app"), name: "Time review", screens: [{ id: "home", title: "Review", pattern: "WorkQueue", states: ["empty", "loading", "error"] }] };
    writeFileSync(join(tmp, "plan.json"), JSON.stringify(plan, null, 2));
    const r = run("from-plan", "--blueprint", "plan.json");
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(tmp, "from-plan/app.blueprint.json"), "utf8")), plan);
  });

  // @covers US-051-AC3
  // @covers US-051-AC5
  test("AC3: --blueprint with an error prints each error with its rule ID, exits 1 and creates nothing", () => {
    const bad = { ...skeleton("app"), screens: [{ id: "home", title: "Home", pattern: "SettingsPage", modals: [{ id: "a", title: "A", kind: "dialog", dismiss: "cancel", modals: [{ id: "b", title: "B", kind: "dialog", dismiss: "close" }] }] }] };
    writeFileSync(join(tmp, "bad.json"), JSON.stringify(bad));
    const r = run("from-bad", "--blueprint", "bad.json");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /modal\.one-at-a-time\s+\/screens\/0\/modals\/0\/modals\/0/);
    assert.equal(existsSync(join(tmp, "from-bad")), false);
    writeFileSync(join(tmp, "view.json"), JSON.stringify(skeleton("view")));
    const v = run("from-view", "--blueprint", "view.json");
    assert.equal(v.status, 1);
    assert.match(v.stderr, /view's blueprint/);
    assert.equal(existsSync(join(tmp, "from-view")), false);
  });

  // @covers US-051-AC4
  test("AC4: AGENTS.md and CLAUDE.md name the blueprint loop", () => {
    const r = scaffold(join(tmp, "guided"), { modalities: WEB });
    for (const f of ["AGENTS.md", "CLAUDE.md"]) {
      const text = readFileSync(join(r.dir, f), "utf8").replace(/\s+/g, " ");
      assert.match(text, /app\.blueprint\.json/, f);
      assert.match(text, /npm run check:blueprint/, f);
      assert.match(text, /inside a `Page`, within the app's `AppShell`/, f);
    }
  });
});
