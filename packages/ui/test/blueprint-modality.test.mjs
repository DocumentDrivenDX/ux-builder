/* Modality first: in a guided app, wireframes and exploratory prototypes
   wait for the person's answer on modality and screen sizes (US-149-AC4;
   FEAT-018 GDL-80; CONTRACT-008 Layout).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../blueprint/cli.mjs", import.meta.url));
const DESIGN = fileURLToPath(new URL("../../design/cli.mjs", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "bp-modality-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const run = (cli, dir, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, UX_BUILDER_NO_BROWSER: "1" } });
const BP = "docs/ux-builder/blueprint/app.blueprint.json";
const ASK = /Ask the person first which modalities \(responsive-web, chat, hybrid-chat\) and screen sizes \(compact to extra-large\) the app is for.*Nothing was drawn\./s;

describe("US-149-AC4: modality before any wireframe or prototype", () => {
  // @covers US-149-AC4
  test("wireframes and prototype --explore exit 1 until the modality is recorded, draw after, and ask again when the supports change", () => {
    const dir = mkdtempSync(join(tmp, "app-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "rivers", private: true }));
    assert.equal(run(DESIGN, dir, "init").status, 0);
    assert.equal(run(CLI, dir, "alternative", "new", "list-first").status, 0);
    const explore = () => run(CLI, dir, "prototype", "--explore", "--alternative", "list-first", "--question", "List first?");
    let r = explore();
    assert.equal(r.status, 1);
    assert.match(r.stderr, ASK);
    assert.ok(!existsSync(join(dir, "docs/ux-builder/prototypes")), "no prototype drawn");
    r = run(CLI, dir, "wireframes");
    assert.equal(r.status, 1);
    assert.match(r.stderr, ASK);
    assert.ok(!existsSync(join(dir, "docs/ux-builder/wireframes")), "no wireframe drawn");

    assert.equal(run(DESIGN, dir, "modality", "--answer", "A web app for phones", "--modality", "responsive-web", "--size-classes", "compact", "--frame", "top-bar").status, 0);
    r = explore();
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, "docs/ux-builder/prototypes/list-first/index.html")));
    const drawn = run(CLI, dir, "wireframes");
    assert.notEqual(drawn.status, 1, "wireframes no longer wait for the modality");
    // The HTML is drawn even where Chromium is missing for the PNGs (exit 2 then).
    assert.ok(existsSync(join(dir, "docs/ux-builder/wireframes")) && readdirSync(join(dir, "docs/ux-builder/wireframes")).some((f) => f.endsWith(".html")), drawn.stderr);

    // A blueprint whose supports changed since the answer asks again.
    const bp = JSON.parse(readFileSync(join(dir, BP), "utf8"));
    bp.supports.sizeClasses = ["compact", "expanded"];
    writeFileSync(join(dir, BP), JSON.stringify(bp, null, 2));
    r = run(CLI, dir, "wireframes");
    assert.equal(r.status, 1);
    assert.match(r.stderr, ASK);
  });

  test("outside a guided app (no design state) the commands draw as before", () => {
    const dir = mkdtempSync(join(tmp, "plain-"));
    writeFileSync(join(dir, "app.blueprint.json"), JSON.stringify({ version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact"], inputs: ["coarse"] }, destinations: [{ id: "find", label: "Find", screen: "map" }], screens: [{ id: "map", title: "Map", pattern: "CollectionList", states: ["empty", "loading", "error"] }] }));
    writeFileSync(join(dir, "app.blueprint.list-first.json"), readFileSync(join(dir, "app.blueprint.json")));
    const r = run(CLI, dir, "prototype", "--explore", "--alternative", "list-first", "--question", "List first?");
    assert.equal(r.status, 0, r.stderr);
  });
});
