/* The pilot: the theme builder's assessment manifest, validated and collected
   against this repository's own HELIX documents (FEAT-009 increment 1; PRD
   P1-7 sketch; ADR-026 decision 8).

     npm test --workspace @ux-builder/theme-builder */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("..", import.meta.url));
const CLI = fileURLToPath(new URL("../../../packages/audit/cli.mjs", import.meta.url));
const out = mkdtempSync(join(tmpdir(), "pilot-"));
after(() => rmSync(out, { recursive: true, force: true }));
const assess = (...args) => spawnSync(process.execPath, [CLI, "assess", ...args], { cwd: APP, encoding: "utf8" });

describe("FEAT-009 pilot: the theme builder", () => {
  test("its manifest validates against this repository's HELIX marker, flow and catalogue", () => {
    const r = assess("validate", "--json");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const { problems, helix } = JSON.parse(r.stdout);
    assert.deepEqual(problems, []);
    assert.equal(helix.flow, "helix");
    assert.equal(helix.root, "docs/helix");
    assert.ok(helix.documents > 50);
  });

  test("collect traces its journeys to the builder's stories, criteria and e2e tests", () => {
    const r = assess("collect", "--out", out, "--run", "R-20261020T000000Z");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const dir = join(out, "R-20261020T000000Z");
    const t = JSON.parse(readFileSync(join(dir, "traceability.json"), "utf8")).journeys;
    assert.deepEqual(t.map((j) => j.story), ["US-015", "US-018", "US-019"]);
    const logo = t.find((j) => j.id === "J-logo-to-theme").criteria;
    assert.ok(logo.length >= 3);
    const ac1 = logo.find((c) => c.id === "US-015-AC1");
    assert.equal(ac1.link, "explicit");
    assert.ok(ac1.tests.some((x) => x.file === "apps/theme-builder/e2e/builder/core-flow.spec.mjs"), JSON.stringify(ac1.tests));
    const req = JSON.parse(readFileSync(join(dir, "requirements.json"), "utf8"));
    assert.ok(req.documents.some((d) => d.id === "FEAT-009" && d.type === "feature-specification"));
    assert.ok(req.criteria.some((c) => c.id === "US-015-AC1"));
    const run = JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
    assert.equal(run.helix.flow, "helix");
    assert.ok(["repository", "plugin", "none"].includes(run.helix.catalog.source));
  });
});
