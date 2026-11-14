/* ux-builder-design init in an existing app (US-115-AC1 to AC4,
   CONTRACT-008 Commands): the skill, an empty state, a starting blueprint
   when there is none, the SDK note, --mcp, and the refusal.

     npm test --workspace @ux-builder/design */

import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { checkBlueprint } from "@ux-builder/ui/blueprint";
import { readState, validateState } from "../index.mjs";
import { cli, tempApp } from "./helpers.mjs";

const SKILL = readFileSync(new URL("../skill/ux-builder-design/SKILL.md", import.meta.url), "utf8");
const BLUEPRINT = { $schema: "https://documentdrivendx.github.io/ux-builder/schema/blueprint.schema.json", version: 1, kind: "app", name: "rivers", supports: { sizeClasses: ["compact", "expanded"], inputs: ["coarse", "fine"] }, destinations: [{ id: "home", label: "Home", screen: "home" }], screens: [{ id: "home", title: "Home", pattern: "Dashboard" }] };

/* An existing app: package.json with or without the SDK, and optionally a
   blueprint and a HELIX marker. No design state. */
function existingApp({ sdk = true, blueprint = true, helix = true } = {}) {
  const app = tempApp({ state: false });
  writeFileSync(join(app, "package.json"), JSON.stringify({ name: "rivers", private: true, dependencies: sdk ? { "@ux-builder/tokens": "^1.6.0", "@ux-builder/ui": "^0.9.0" } : { react: "^19.3.0" } }, null, 2) + "\n");
  if (blueprint) writeFileSync(join(app, "docs/ux-builder/blueprint/app.blueprint.json"), JSON.stringify(BLUEPRINT, null, 2) + "\n");
  if (helix) writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  return app;
}

describe("init in an existing app", () => {
  // @covers US-115-AC1
  test("with ux-builder, a blueprint and HELIX: installs the skill, writes a valid empty state, exits 0, and leaves the blueprint alone", () => {
    const app = existingApp();
    const before = readFileSync(join(app, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8");
    const r = cli(app, ["init"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(join(app, ".claude/skills/ux-builder-design/SKILL.md"), "utf8"), SKILL);
    const state = readState(app);
    assert.deepEqual(validateState(state), []);
    assert.equal(state.startedFrom, "existing");
    assert.equal(state.activity, "baseline");
    for (const k of ["checkpoints", "questions", "assumptions", "alternatives", "issues", "experiments", "faked"]) assert.deepEqual(state[k], [], k);
    assert.equal(readFileSync(join(app, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8"), before);
    assert.equal(existsSync(join(app, ".mcp.json")), false);
    assert.match(r.stdout, /\/ux-builder-design/);
  });

  // @covers US-115-AC2
  test("with no blueprint: writes a starting blueprint as ux-builder-blueprint init does, and says the guide will help describe the screens", () => {
    const app = existingApp({ blueprint: false });
    const r = cli(app, ["init", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.blueprint, "written");
    const bp = JSON.parse(readFileSync(join(app, "docs/ux-builder/blueprint/app.blueprint.json"), "utf8"));
    assert.equal(bp.kind, "app");
    assert.deepEqual(checkBlueprint(bp).filter((f) => f.severity === "error"), []);
    assert.ok(out.notes.some((n) => /help you describe the app's current screens/.test(n)), out.notes.join("\n"));
  });

  // @covers US-115-AC3
  test("without the SDK: writes the state and skill, and says the validated prototype and the audit need the SDK, with the adoption steps", () => {
    const app = existingApp({ sdk: false });
    const r = cli(app, ["init"]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(app, ".ux-builder/design-state.json")));
    assert.ok(existsSync(join(app, ".claude/skills/ux-builder-design/SKILL.md")));
    assert.match(r.stdout, /the validated prototype and the audit need the SDK/);
    assert.match(r.stdout, /npm install @ux-builder\/tokens @ux-builder\/ui/);
    assert.match(r.stdout, /npm install -D @ux-builder\/audit/);
  });

  // @covers US-115-AC4
  test("with a design state already: exits 2, names the file and leaves it unchanged", () => {
    const app = tempApp({ state: { next: "Keep me" } });
    const before = readFileSync(join(app, ".ux-builder/design-state.json"), "utf8");
    const r = cli(app, ["init"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /\.ux-builder\/design-state\.json exists/);
    assert.equal(readFileSync(join(app, ".ux-builder/design-state.json"), "utf8"), before);
  });

  test("--mcp writes .mcp.json for the ux-builder server and keeps other servers", () => {
    const app = existingApp();
    writeFileSync(join(app, ".mcp.json"), JSON.stringify({ mcpServers: { other: { command: "other-server" } } }));
    const r = cli(app, ["init", "--mcp"]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(app, ".mcp.json"), "utf8")).mcpServers, { other: { command: "other-server" }, "ux-builder": { command: "npx", args: ["@ux-builder/mcp"] } });
  });
});


test("plugin mode persists skill selection and does not copy a local design skill", () => {
  const app = existingApp();
  const saved = process.env.UX_BUILDER_SKILLS;
  try {
    process.env.UX_BUILDER_SKILLS = "plugin";
    const r = cli(app, ["init", "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(app, ".ux-builder/skills.json"), "utf8")), { source: "plugin" });
    assert.equal(existsSync(join(app, ".claude/skills/ux-builder-design/SKILL.md")), false);
    assert.ok(existsSync(join(app, ".ux-builder/design-state.json")));
  } finally {
    if (saved === undefined) delete process.env.UX_BUILDER_SKILLS;
    else process.env.UX_BUILDER_SKILLS = saved;
  }
});
