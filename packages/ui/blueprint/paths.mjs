/* Where an app's design work lives (FEAT-018 GDL-80, CONTRACT-008 Layout):
   everything the guided design writes that is not HELIX's, under
   docs/ux-builder/. The design documents at its top, the blueprint and its
   alternatives in blueprint/, exploratory prototypes in prototypes/, HELIX
   proposals in helix-proposals/, comparisons, drawings and wireframes in
   their own folders. Tool data (the design state, the trace) stays in
   .ux-builder/.

   An app made before this layout keeps its files where they were
   (app.blueprint.json, docs/ux/, prototype/, helix-proposals/ at the top)
   until `ux-builder-design migrate` moves them; until then every tool reads
   them there, and says how to move. */

import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const CURRENT = {
  name: "current",
  docs: "docs/ux-builder",
  blueprintDir: "docs/ux-builder/blueprint",
  blueprint: "docs/ux-builder/blueprint/app.blueprint.json",
  prototypes: "docs/ux-builder/prototypes",
  proposals: "docs/ux-builder/helix-proposals",
  compare: "docs/ux-builder/compare",
  drawings: "docs/ux-builder/drawings",
  wireframes: "docs/ux-builder/wireframes",
};
export const LEGACY = {
  name: "legacy",
  docs: "docs/ux",
  blueprintDir: ".",
  blueprint: "app.blueprint.json",
  prototypes: "prototype",
  proposals: "helix-proposals",
  compare: "blueprint-compare",
  drawings: "blueprint-drawings",
  wireframes: "blueprint-wireframes",
};
export const MIGRATE_HINT = "this app is on the old layout (app.blueprint.json, docs/ux/ at the top); `npx ux-builder-design migrate` moves it under docs/ux-builder/";

/* The layout an app is on: the old one only when it has old files (docs/ux/,
   app.blueprint*.json at its top) and none of the new. */
export function layoutOf(app = process.cwd()) {
  const has = (p) => existsSync(join(app, p));
  if (has(CURRENT.blueprint) || has(CURRENT.docs)) return CURRENT;
  const oldBlueprints = () => { try { return readdirSync(app).some((n) => /^app\.blueprint(\.[a-z0-9-]+)?\.json$/.test(n)); } catch { return false; } };
  if (has(LEGACY.docs) || oldBlueprints()) return LEGACY;
  return CURRENT;
}

/* An alternative's blueprint file: app.blueprint.<name>.json beside the app's blueprint. */
export const alternativeFile = (layout, name) => (name && name !== "current" ? `${layout.blueprintDir === "." ? "" : `${layout.blueprintDir}/`}app.blueprint.${name}.json` : layout.blueprint);

/* A path relative to the app, with forward slashes. */
export const rel = (app, p) => relative(app, resolve(app, p)).split(sep).join("/");

/* Every app-relative path the guided design may write, on either layout (the write fence). */
export function writable(path) {
  const p = String(path);
  for (const l of [CURRENT, LEGACY]) {
    if (l === CURRENT && (p === l.docs || p.startsWith(`${l.docs}/`))) return true;
    if (l === LEGACY && [l.docs, l.prototypes, l.proposals, l.compare].some((d) => p.startsWith(`${d}/`))) return true;
  }
  return /^app\.blueprint(\.[a-z0-9-]+)?\.json$/.test(p);
}
