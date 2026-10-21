/* ux-builder-blueprint (FEAT-008 ADP-02; US-052-AC1, AC2; CONTRACT-005).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
  });
});
