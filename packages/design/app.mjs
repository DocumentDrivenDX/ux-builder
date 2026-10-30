/* Finding the app and writing inside it (CONTRACT-008 Commands, SD-006
   Command architecture). Every write goes through writeInApp, which refuses
   paths outside the places the guide may write. */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { alternativeFile, CURRENT, layoutOf, writable } from "@ux-builder/ui/blueprint/paths";

/* Where the app's design work lives (GDL-80): docs/ux-builder/, or the old
   layout until `ux-builder-design migrate`. Paths are relative to the app. */
export const layout = (app) => layoutOf(app ?? process.cwd());
export const ux = (app, sub) => (sub ? `${layout(app).docs}/${sub}` : layout(app).docs);
export const bpFile = (app, name) => alternativeFile(layout(app), name);
export const protoDir = (app) => layout(app).prototypes;
export const proposalsDir = (app) => layout(app).proposals;
/* Run output, gitignored (ADR-042 decision 6): runs/studies/<study>/, runs/insights/. */
export const runsDir = (app, sub) => (sub ? `${layout(app).runs}/${sub}` : layout(app).runs);

/* The nearest folder at or above start with .ux-builder/ or a blueprint
   (docs/ux-builder/blueprint/app.blueprint.json, or the old layout's
   app.blueprint.json), else the git root, else start. */
export function findApp(start = process.cwd()) {
  let d = resolve(start);
  let git = null;
  for (;;) {
    // The blueprint's own folder (docs/ux-builder/blueprint/) is not the app; the app is above it.
    if (existsSync(join(d, ".ux-builder")) || existsSync(join(d, CURRENT.blueprint)) || (existsSync(join(d, "app.blueprint.json")) && !d.endsWith(join("ux-builder", "blueprint")))) return d;
    if (!git && existsSync(join(d, ".git"))) git = d;
    const up = dirname(d);
    if (up === d) return git ?? resolve(start);
    d = up;
  }
}

/* Where the guide may write, relative to the app. */
const ALLOWED = [/^\.ux-builder\//, /^\.claude\/skills\/ux-builder-design\//, /^\.mcp\.json$/];

export function writeInApp(app, path, text) {
  const rel = relative(app, resolve(app, path)).split(sep).join("/");
  if (rel.startsWith("..") || !(writable(rel) || ALLOWED.some((re) => re.test(rel)))) {
    throw new DesignError(`refusing to write ${rel}: the guide writes only under docs/ux-builder/ (or an unmigrated app's docs/ux/, prototype/, helix-proposals/ and blueprint files), .ux-builder/, its own skill and .mcp.json`);
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
