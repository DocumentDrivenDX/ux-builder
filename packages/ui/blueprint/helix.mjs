/* The HELIX stories a blueprint's journeys are checked against (FEAT-012
   JRN-03; ADR-030 decision 1). Node only; used by ux-builder-blueprint check.

     import { readStories } from "./helix.mjs";
     readStories("app.blueprint.json"); // { marker, flow, stories } or null

   Finds the .helix.yml marker walking up from the blueprint's directory to
   the git root, as HELIX does, takes the flow it selects, and reads each
   user story under the flow's root: its ID from the ddx: frontmatter and its
   acceptance criteria (US-<n>-AC<m> at a list item's start). It reads and
   never writes. A small reader, not @ux-builder/audit's HELIX binding: the
   audit depends on this package, so this package cannot depend on it, and
   the stories need no YAML library. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SKIP = new Set(["node_modules", ".git", "dist", "build"]);

/* The first .helix.yml from dir up to the git root (or the filesystem root). */
export function findMarker(dir) {
  for (let d = resolve(dir); ; d = dirname(d)) {
    if (existsSync(join(d, ".helix.yml"))) return join(d, ".helix.yml");
    if (existsSync(join(d, ".git")) || dirname(d) === d) return null;
  }
}

/* The marker's flows ({ id, root }) and defaults.flow, from its plain YAML. */
export function readMarker(file) {
  const flows = [];
  let section = null, def = null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const text = line.replace(/\s+#.*$/, "");
    if (/^\S/.test(text)) section = text.replace(/:.*$/, "").trim();
    const kv = /^\s*(-\s+)?(id|root|flow):\s*["']?([^"'\s]+)["']?\s*$/.exec(text);
    if (!kv) continue;
    if (section === "flows") {
      if (kv[1] || !flows.length) flows.push({});
      flows[flows.length - 1][kv[2]] = kv[3];
    } else if (section === "defaults" && kv[2] === "flow") def = kv[3];
  }
  const flow = flows.find((f) => f.id === def) ?? flows[0];
  return flow?.root ? { id: flow.id ?? null, root: resolve(dirname(file), flow.root) } : null;
}

/* A story document's ID and criteria, or null if it is not a user story. */
export function readStory(text) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
  const id = /^\s+id:\s*["']?(US-\d+)["']?\s*$/m.exec(front)?.[1];
  if (!id || !/^\s+type:\s*["']?user-stor/m.test(front)) return null;
  const criteria = [...text.matchAll(/^\s*[-*]\s*(?:\[[ xX]\]\s*)?\*{0,2}(US-\d+-AC\d+)\*{0,2}\s*[—:-]/gm)].map((m) => m[1]);
  return { id, criteria: [...new Set(criteria)] };
}

/* Whether a blueprint has anything to check against the stories: journeys,
   or screens that serve stories. */
export const needsStories = (bp) => !!bp && typeof bp === "object"
  && ((Array.isArray(bp.journeys) && bp.journeys.length > 0) || (Array.isArray(bp.screens) && bp.screens.some((s) => Array.isArray(s?.stories) && s.stories.length > 0)));

/* What a check says when it had stories to read but no marker (US-087-AC6). */
export const skippedNote = (where) => `No HELIX marker (.helix.yml) above ${where}: skipped journey.story-covered and the criterion checks.`;

/* The stories of the HELIX flow above a blueprint file: { marker, flow,
   stories: { "US-12": { criteria, file } } }, or null with no marker. */
export function readStories(blueprintFile) {
  const marker = findMarker(dirname(resolve(blueprintFile)));
  if (!marker) return null;
  const flow = readMarker(marker);
  const stories = {};
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (SKIP.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) {
        const story = readStory(readFileSync(p, "utf8"));
        if (story && !stories[story.id]) stories[story.id] = { criteria: story.criteria, file: p };
      }
    }
  };
  if (flow && existsSync(flow.root)) walk(flow.root);
  return { marker, flow: flow?.id ?? null, stories };
}
