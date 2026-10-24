/* ux-builder-design init (CONTRACT-008 Commands, FEAT-018 GDL-72, GDL-73):
   puts the guide in an app. It installs the skill, writes an empty design
   state, writes a starting blueprint when there is none, and with mcp a
   .mcp.json for the ux-builder MCP server. create-app calls it for a new
   app; a person runs it in an existing one. */

import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { skeleton } from "@ux-builder/ui/blueprint";
import { DesignError, writeInApp } from "./app.mjs";
import { emptyState, STATE_FILE, writeState } from "./state.mjs";

export const SKILL_SOURCE = fileURLToPath(new URL("./skill/ux-builder-design", import.meta.url));
export const SKILL_DIR = ".claude/skills/ux-builder-design";
export const MCP_SERVER = { command: "npx", args: ["@ux-builder/mcp"] };

/* The skill, copied from this package into the app, replacing an older copy. */
export function installSkill(app) {
  cpSync(SKILL_SOURCE, join(app, SKILL_DIR), { recursive: true });
  return SKILL_DIR;
}

/* .mcp.json with the ux-builder server added; other servers are kept. */
export function writeMcpConfig(app) {
  const file = join(app, ".mcp.json");
  let config = { mcpServers: {} };
  if (existsSync(file)) {
    try { config = JSON.parse(readFileSync(file, "utf8")); } catch (e) {
      throw new DesignError(`.mcp.json is not valid JSON (${e.message}); fix it or remove it before init --mcp`);
    }
  }
  config.mcpServers = { ...(config.mcpServers ?? {}), "ux-builder": MCP_SERVER };
  writeInApp(app, ".mcp.json", JSON.stringify(config, null, 2) + "\n");
  return ".mcp.json";
}

function hasSdk(app) {
  try {
    const pkg = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
    return Boolean({ ...pkg.dependencies, ...pkg.devDependencies }["@ux-builder/ui"]);
  } catch { return false; }
}

export const ADOPT_SDK = [
  "npm install @ux-builder/tokens @ux-builder/ui",
  "npm install -D @ux-builder/audit eslint stylelint",
  "import the theme's CSS and fonts and @ux-builder/ui/ui.css, and wrap the app in ThemeProvider (the ux-builder README, \"An existing React app\")",
];

export function init(app, { mcp = false, startedFrom = "existing" } = {}) {
  if (existsSync(join(app, STATE_FILE))) {
    throw new DesignError(`${STATE_FILE} exists; init leaves it unchanged. Run ux-builder-design status to see where the loop stands`);
  }
  const notes = [];
  const written = [];

  let blueprint = "exists";
  if (!existsSync(join(app, "app.blueprint.json"))) {
    written.push(writeInApp(app, "app.blueprint.json", JSON.stringify(skeleton("app"), null, 2) + "\n"));
    blueprint = "written";
    notes.push("There was no app.blueprint.json, so a starting blueprint was written. The guide will help you describe the app's current screens in it.");
  }

  const sdk = hasSdk(app);
  if (!sdk) {
    notes.push(`@ux-builder/ui is not installed. The guide can define, explore and compare designs on the blueprint alone, but the validated prototype and the audit need the SDK. To adopt it: ${ADOPT_SDK.map((s, i) => `(${i + 1}) ${s}`).join("; ")}.`);
  }

  written.push(installSkill(app));
  writeState(app, emptyState({ startedFrom }));
  written.push(STATE_FILE);
  if (mcp) written.push(writeMcpConfig(app));

  notes.push("Start in Claude Code with /ux-builder-design, or ask your agent to design something.");
  return { app, startedFrom, blueprint, sdk, mcp, written, notes };
}
