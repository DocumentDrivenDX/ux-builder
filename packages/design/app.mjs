/* Finding the app and writing inside it (CONTRACT-008 Commands, SD-006
   Command architecture). Every write goes through writeInApp, which refuses
   paths outside the places the guide may write. */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/* The nearest folder at or above start with .ux-builder/ or
   app.blueprint.json, else the git root, else start. */
export function findApp(start = process.cwd()) {
  let d = resolve(start);
  let git = null;
  for (;;) {
    if (existsSync(join(d, ".ux-builder")) || existsSync(join(d, "app.blueprint.json"))) return d;
    if (!git && existsSync(join(d, ".git"))) git = d;
    const up = dirname(d);
    if (up === d) return git ?? resolve(start);
    d = up;
  }
}

/* Where the guide may write, relative to the app. */
const ALLOWED = [/^docs\/ux\//, /^\.ux-builder\//, /^prototype\//, /^helix-proposals\//, /^app\.blueprint(\.[a-z0-9-]+)?\.json$/, /^\.claude\/skills\/ux-builder-design\//, /^\.mcp\.json$/];

export function writeInApp(app, path, text) {
  const rel = relative(app, resolve(app, path)).split(sep).join("/");
  if (rel.startsWith("..") || !ALLOWED.some((re) => re.test(rel))) {
    throw new DesignError(`refusing to write ${rel}: the guide writes only under docs/ux/, .ux-builder/, prototype/, helix-proposals/, its own skill, .mcp.json and the blueprint files`);
  }
  const abs = join(app, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
  return rel;
}

/* An error a command reports with exit code 2 (bad input or a refusal). */
export class DesignError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "DesignError";
    this.code = 2;
    if (details) this.details = details;
  }
}
