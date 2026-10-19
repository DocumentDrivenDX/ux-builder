/* The scaffolder (US-012, FEAT-004 SDK-08, SDK-09).

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { scaffold, sdkVersions, themes } from "../index.mjs";

const CLI = fileURLToPath(new URL("../index.mjs", import.meta.url));
const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "create-app-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd: tmp });

describe("scaffold", () => {
  test("writes a React + Vite app on the SDK, on the chosen theme", () => {
    const r = scaffold(join(tmp, "acme"), { theme: "databricks" });
    assert.deepEqual(r.files, [".github/workflows/ci.yml", ".gitignore", ".stylelintrc.json", "AGENTS.md", "CLAUDE.md", "README.md", "eslint.config.js", "index.html", "package.json", "scripts/install-skill.mjs", "src/App.css", "src/App.jsx", "src/main.jsx", "vite.config.js"]);
    const pkg = JSON.parse(readFileSync(join(r.dir, "package.json"), "utf8"));
    assert.equal(pkg.name, "acme");
    assert.match(readFileSync(join(r.dir, "src/main.jsx"), "utf8"), /<ThemeProvider theme="databricks" appearance="system"/);
    assert.match(readFileSync(join(r.dir, ".stylelintrc.json"), "utf8"), /"theme": "databricks"/);
    assert.match(readFileSync(join(r.dir, "CLAUDE.md"), "utf8"), /node_modules\/@ux-builder\/ui\/AGENTS\.md/);
    for (const f of r.files) assert.doesNotMatch(readFileSync(join(r.dir, f), "utf8"), /__(APP_NAME|THEME|TOKENS|UI|AUDIT)__/, f);
  });

  // @covers US-012-AC1
  test("AC1: SDK versions are pinned exactly, to the ones this package depends on", () => {
    const r = scaffold(join(tmp, "pinned"), {});
    const deps = JSON.parse(readFileSync(join(r.dir, "package.json"), "utf8")).dependencies;
    const dev = JSON.parse(readFileSync(join(r.dir, "package.json"), "utf8")).devDependencies;
    assert.deepEqual({ "@ux-builder/tokens": deps["@ux-builder/tokens"], "@ux-builder/ui": deps["@ux-builder/ui"], "@ux-builder/audit": dev["@ux-builder/audit"] }, sdkVersions());
    assert.match(deps["@ux-builder/ui"], /^\d+\.\d+\.\d+$/, "exact, not a range");
    for (const p of ["tokens", "ui", "audit"]) assert.equal(sdkVersions()[`@ux-builder/${p}`], JSON.parse(readFileSync(join(ROOT, `packages/${p}/package.json`), "utf8")).version);
  });

  // @covers US-012-AC4
  test("AC4: no secrets and no presentation literals in the app", () => {
    const r = scaffold(join(tmp, "clean"), {});
    for (const f of r.files) {
      const text = readFileSync(join(r.dir, f), "utf8");
      assert.doesNotMatch(text, /(_authToken\s*=\s*\S+[^>]$|sk-[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{10,})/m, f);
    }
    assert.doesNotMatch(readFileSync(join(r.dir, "src/App.css"), "utf8"), /#[0-9a-f]{3,8}\b|rgb\(|\d+px/i);
  });

  test("the default theme is plain; every shipped theme is accepted", () => {
    assert.equal(scaffold(join(tmp, "default"), {}).theme, "plain");
    assert.ok(themes().includes("praxis-carbon"));
  });

  test("an unknown theme, a non-empty folder or a bad name is refused", () => {
    assert.match(run(join(tmp, "x1"), "--theme", "bootstrap").stderr, /unknown theme "bootstrap"; choose one of/);
    mkdirSync(join(tmp, "full")); writeFileSync(join(tmp, "full", "keep.txt"), "x");
    assert.match(run(join(tmp, "full")).stderr, /exists and is not empty/);
    assert.match(run(join(tmp, "x2"), "--name", "Bad Name").stderr, /not a valid package name/);
  });

  test("--help lists the themes", () => {
    const r = run("--help");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Themes: .*databricks/);
  });
});
