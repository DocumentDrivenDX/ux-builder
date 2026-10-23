/* @ux-builder/design (FEAT-018, CONTRACT-008): one exported function per
   ux-builder-design command, each returning what the command prints with
   --json. MCP tools wrap these same functions (ADR-036 rule 2). */

import { readFileSync } from "node:fs";

export const VERSION = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

export { DesignError, findApp, writeInApp } from "./app.mjs";
export { canonical, emptyState, hasState, parsePath, readState, SCHEMA, serialize, STATE_FILE, stateGet, stateSet, validateState, writeState } from "./state.mjs";
export { status, summary } from "./status.mjs";
export { ADOPT_SDK, init, installSkill, MCP_SERVER, SKILL_DIR, writeMcpConfig } from "./init.mjs";
