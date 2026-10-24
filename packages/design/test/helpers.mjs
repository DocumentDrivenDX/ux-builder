/* Shared by the design tests: temporary apps, design states, and running
   the CLI as a child process with the network guard loaded. */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
