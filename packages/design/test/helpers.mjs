/* Shared by the design tests: temporary apps, design states, and running
   the CLI as a child process with the network guard loaded. */

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after } from "node:test";
import "./guard.mjs";
import { emptyState, reviewApprove, reviewList, serialize } from "../index.mjs";

export const CLI = fileURLToPath(new URL("../cli.mjs", import.meta.url));
export const GUARD = fileURLToPath(new URL("./guard.mjs", import.meta.url));
export const PKG = fileURLToPath(new URL("..", import.meta.url));
const made = [];
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

/* A new app folder with a package.json and, unless state is false, a design
   state (emptyState() merged with the given fields). */
export function tempApp({ state = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ux-design-"));
  made.push(dir);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "sample-app", private: true }, null, 2) + "\n");
  // The design work's folder (GDL-80): its blueprint goes in docs/ux-builder/blueprint/.
  mkdirSync(join(dir, "docs/ux-builder/blueprint"), { recursive: true });
  if (state !== false) {
    mkdirSync(join(dir, ".ux-builder"), { recursive: true });
    writeFileSync(join(dir, ".ux-builder/design-state.json"), serialize({ ...emptyState(), ...state }));
  }
  return dir;
}

/* Run ux-builder-design in cwd with the guard: { status, stdout, stderr }. */
export function cli(cwd, args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("NODE_TEST")));
  const r = spawnSync(process.execPath, ["--import", GUARD, CLI, ...args], { cwd, encoding: "utf8", env });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/* Record the person's approval of every item awaiting review (US-148), for
   tests whose subject is a later step, not the review itself. */
export function approveAll(app) {
  for (const p of reviewList(app).pending) reviewApprove(app, { item: p.id, answer: "Approved in the test" });
}

/* An app with HELIX: .helix.yml, a PRD and ADR-007 (ADR-042: ux-builder writes into HELIX). */
export function helixApp() {
  const app = tempApp();
  writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  mkdirSync(join(app, "docs/helix/01-frame"), { recursive: true });
  mkdirSync(join(app, "docs/helix/02-design/adr"), { recursive: true });
  writeFileSync(join(app, "docs/helix/01-frame/prd.md"), "---\nddx:\n  id: prd\n  type: prd\n---\n\n# PRD\n\n## Summary\n\nA list app.\n\n## Requirements\n\n- FR-1\n");
  writeFileSync(join(app, "docs/helix/02-design/adr/ADR-007-storage.md"), "---\nddx:\n  id: ADR-007\n  type: adr\n---\n\n# ADR-007: Storage\n");
  return app;
}

/* Give an app HELIX (.helix.yml) if it has none; returns the app. */
export function withHelix(app) {
  if (!existsSync(join(app, ".helix.yml"))) writeFileSync(join(app, ".helix.yml"), "flows:\n  - id: helix\n    root: docs/helix/\n");
  mkdirSync(join(app, "docs/helix/02-design/adr"), { recursive: true });
  return app;
}

/* An applied UX decision: docs/helix/02-design/adr/<id>-<slug>.md, tagged area:ui. */
export function putUiAdr(app, { id = "ADR-001", question = "Show the map first?", choice = "Map first", why = "Supports immediate exploration.", status = "not tested", extra = "" } = {}) {
  withHelix(app);
  const path = `docs/helix/02-design/adr/${id}-${question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`;
  writeFileSync(join(app, path), `---\nddx:\n  id: ${id}\n  type: adr\n  status: accepted\n  authoring:\n    home: repo\n  tags:\n    - area:ui\n---\n\n# ${id}: ${question}\n\n## Problem\n\n${question}\n\n## Decision\n\nWe will ${choice.toLowerCase()}.\n\n## Why We Chose This\n\n- ${why}\n${extra}\n## Consequences\n\n**Good**: ${why}\n\n## Validation\n\n**Result**: ${status}\n**Evidence**: none yet\n**Required**: a usability test\n`);
  return path;
}

/* A stand-in for DDx (ADR-042: experiments are DDx beads): UX_BUILDER_DDX
   points at a script that records each `ddx bead` call and answers create
   with exp-<n>. calls() reads what was asked. */
export function fakeDdx() {
  const dir = mkdtempSync(join(tmpdir(), "fake-ddx-"));
  made.push(dir);
  const bin = join(dir, "ddx");
  writeFileSync(bin, `#!/usr/bin/env node
const fs = require("node:fs");
const log = ${JSON.stringify(join(dir, "calls.jsonl"))};
const args = process.argv.slice(2);
fs.appendFileSync(log, JSON.stringify(args) + "\\n");
if (args[1] === "create") console.log("exp-" + fs.readFileSync(log, "utf8").split("\\n").filter((l) => l.includes('"create"')).length);
`);
  chmodSync(bin, 0o755);
  process.env.UX_BUILDER_DDX = bin;
  return { bin, calls: () => (existsSync(join(dir, "calls.jsonl")) ? readFileSync(join(dir, "calls.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []) };
}
