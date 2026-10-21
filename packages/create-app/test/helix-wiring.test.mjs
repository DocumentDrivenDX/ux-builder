/* The new app's documents pass HELIX's reading and are traced; its agent
   guidance names HELIX (FEAT-010 HLA-04, HLW-01 to HLW-03; US-070, US-071;
   STP-070, STP-071). Reads the app with the assessment's own commands.

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { collect } from "../../audit/assess/collect.mjs";
import { load, validate } from "../../audit/assess/manifest.mjs";
import { create } from "../index.mjs";
import { bundle } from "./fixtures/helix-release.mjs";

const tmp = mkdtempSync(join(tmpdir(), "helix-wiring-"));
const BUNDLE = bundle("8.8.0");
process.env.UX_BUILDER_HELIX_BUNDLE = BUNDLE;
after(() => { rmSync(tmp, { recursive: true, force: true }); rmSync(BUNDLE, { recursive: true, force: true }); });
let app, checked;
before(async () => {
  app = await create(join(tmp, "acme"), { theme: "databricks", name: "acme", helix: { offline: true } });
  checked = validate(load(join(app.dir, "ux-assessment.yml")));
});

describe("US-070: the new app's documents pass HELIX's reading and are traced", () => {
  // @covers US-070-AC1
  test("AC1: every document typed by frontmatter, IDs valid, links resolving: collect records no warning", () => {
    const r = collect({ ...checked, manifest: load(join(app.dir, "ux-assessment.yml")), out: join(tmp, "runs"), run: "R-20261021T000000Z" });
    const warnings = r.requirements.problems.filter((p) => p.severity === "warning");
    assert.deepEqual(warnings, []);
    assert.equal(r.run.helix.catalog.source, "project-skill", "the HELIX the starter installed");
    assert.equal(r.run.helix.catalog.version, "8.8.0");
    assert.equal(r.requirements.documents.length, 8);
    assert.ok(r.requirements.documents.every((d) => d.typedBy === "frontmatter"));
  });

  // @covers US-070-AC2
  test("AC2: the app's ux-assessment.yml validates as created", () => {
    assert.deepEqual(checked.problems, []);
    assert.equal(checked.helix.flow.id, "helix");
    assert.deepEqual(checked.resolved.journeys.map((j) => j.story), ["US-001"]);
    assert.deepEqual(checked.resolved.tests.map((t) => [t.id, t.command]), [["lint", "npm run lint"], ["audit", "npm run audit"], ["e2e", "npm run test:e2e"]], "the lint, audit and e2e commands");
    assert.equal(JSON.parse(readFileSync(join(app.dir, "package.json"), "utf8")).scripts["assess:validate"], "ux-builder-audit assess validate");
  });

  // @covers US-070-AC3
  test("AC3: the starter's e2e test cites every US-001 criterion, and collect links each as explicit", () => {
    const spec = readFileSync(join(app.dir, "e2e/starter.spec.js"), "utf8");
    for (const ac of ["US-001-AC1", "US-001-AC2", "US-001-AC3", "US-001-AC4"]) assert.match(spec, new RegExp(`@covers ${ac}\\b`), ac);
    const r = collect({ ...checked, manifest: load(join(app.dir, "ux-assessment.yml")), out: join(tmp, "runs"), run: "R-20261021T000001Z" });
    assert.deepEqual(r.traceability.journeys[0].criteria.map((c) => [c.id, c.link, c.tests[0]?.file]), ["AC1", "AC2", "AC3", "AC4"].map((a) => [`US-001-${a}`, "explicit", "e2e/starter.spec.js"]));
    assert.equal(JSON.parse(readFileSync(join(app.dir, "package.json"), "utf8")).scripts["test:e2e"], "playwright test");
  });
});

describe("US-071: an agent in the new app finds HELIX", () => {
  // @covers US-071-AC1
  test("AC1: AGENTS.md and CLAUDE.md name the skill, the marker, the documents and the order of work", () => {
    for (const f of ["AGENTS.md", "CLAUDE.md"]) {
      const t = readFileSync(join(app.dir, f), "utf8").replace(/\s+/g, " ");
      assert.match(t, /the `helix` skill is installed in `\.claude\/skills\/helix\/`/, f);
      assert.match(t, /the marker is `\.helix\.yml`/, f);
      assert.match(t, /documents are in `docs\/helix\/`/, f);
      const helix = t.slice(t.indexOf("## HELIX"));
      const order = ["Frame or evolve the requirement in HELIX first", "app.blueprint.json", "AppShell", "npm run lint", "npm run audit", "Assess the UX"].map((s) => helix.indexOf(s));
      assert.ok(order.every((i) => i >= 0) && order.every((i, k) => k === 0 || i > order[k - 1]), `${f}: the order of work`);
      assert.match(t, /DocumentDrivenDX\/helix\/blob\/main\/docs\/install\/README\.md/, f);
    }
  });
});
