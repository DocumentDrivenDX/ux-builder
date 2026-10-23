/* A new app gets the guided design loop (US-114-AC1 to AC4; FEAT-018
   GDL-72; ADR-036): @ux-builder/design, its skill, an empty design state
   starting at Define, guidance that points to /ux-builder-design, and
   .mcp.json only with --mcp.

     npm test --workspace @ux-builder/create-app */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { validateState } from "@ux-builder/design";
import { create, sdkVersions } from "../index.mjs";
import { bundle } from "./fixtures/helix-release.mjs";

const tmp = mkdtempSync(join(tmpdir(), "create-design-"));
const BUNDLE = bundle("8.8.0");
const saved = { api: process.env.UX_BUILDER_HELIX_API, bundle: process.env.UX_BUILDER_HELIX_BUNDLE };
after(() => {
  for (const [k, v] of [["UX_BUILDER_HELIX_API", saved.api], ["UX_BUILDER_HELIX_BUNDLE", saved.bundle]]) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  rmSync(tmp, { recursive: true, force: true });
  rmSync(BUNDLE, { recursive: true, force: true });
});

const DESIGN_SKILL = readFileSync(new URL("../../design/skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
let app, withMcp;
before(async () => {
  // The bundled HELIX, served without the network, as the other starter tests do.
  process.env.UX_BUILDER_HELIX_API = "http://127.0.0.1:9";
  process.env.UX_BUILDER_HELIX_BUNDLE = BUNDLE;
  app = await create(join(tmp, "rivers"), { modalities: ["responsive-web"], theme: "databricks", helix: { offline: true } });
  withMcp = await create(join(tmp, "rivers-mcp"), { modalities: ["responsive-web"], helix: { skip: true }, mcp: true });
});

describe("US-114: a new app gets the guided design loop", () => {
  // @covers US-114-AC1
  test("AC1: @ux-builder/design is a dev dependency, pinned like the SDK, and the skill is in .claude/skills/ux-builder-design/", () => {
    const pkg = JSON.parse(readFileSync(join(app.dir, "package.json"), "utf8"));
    assert.equal(pkg.devDependencies["@ux-builder/design"], sdkVersions()["@ux-builder/design"]);
    assert.equal(pkg.dependencies["@ux-builder/design"], undefined);
    assert.equal(readFileSync(join(app.dir, ".claude/skills/ux-builder-design/SKILL.md"), "utf8"), DESIGN_SKILL);
    // npm install refreshes it from the installed package, as it does ux-builder-ui.
    assert.match(readFileSync(join(app.dir, "scripts/install-skill.mjs"), "utf8"), /node_modules\/@ux-builder\/design\/skill\/ux-builder-design/);
  });

  // @covers US-114-AC2
  test("AC2: the design state is valid, starts at Define, and has no checkpoints, assumptions or alternatives", () => {
    const state = JSON.parse(readFileSync(join(app.dir, ".ux-builder/design-state.json"), "utf8"));
    assert.deepEqual(validateState(state), []);
    assert.equal(state.activity, "define");
    assert.equal(state.startedFrom, "new");
    assert.deepEqual(state.checkpoints, []);
    assert.deepEqual(state.assumptions, []);
    assert.deepEqual(state.alternatives, []);
  });

  // @covers US-114-AC3
  test("AC3: CLAUDE.md, AGENTS.md and the Home screen each name /ux-builder-design as the way to start designing", () => {
    for (const f of ["CLAUDE.md", "AGENTS.md"]) {
      const text = readFileSync(join(app.dir, f), "utf8");
      assert.match(text, /## Designing\n[\s\S]*type `\/ux-builder-design`/, f);
      assert.match(text, /works without the MCP server/, f);
    }
    assert.match(readFileSync(join(app.dir, "src/Home.jsx"), "utf8"), /<p>To design it with your agent, start with \/ux-builder-design\.<\/p>/);
  });

  // @covers US-114-AC4
  test("AC4: without --mcp no .mcp.json is written; with --mcp it names the ux-builder server started with npx @ux-builder/mcp", () => {
    assert.equal(existsSync(join(app.dir, ".mcp.json")), false);
    assert.equal(app.design.mcp, false);
    const config = JSON.parse(readFileSync(join(withMcp.dir, ".mcp.json"), "utf8"));
    assert.deepEqual(config.mcpServers["ux-builder"], { command: "npx", args: ["@ux-builder/mcp"] });
    assert.equal(withMcp.design.mcp, true);
  });

  test("the blueprint the starter wrote is kept: init does not replace it", () => {
    const bp = JSON.parse(readFileSync(join(app.dir, "app.blueprint.json"), "utf8"));
    assert.equal(bp.name, "rivers");
    assert.equal(app.design.blueprint, "exists");
  });
});
