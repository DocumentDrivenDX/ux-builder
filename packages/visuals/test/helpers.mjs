/* Shared test data: the pinned umf fixtures and every theme in the token build. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(HERE, "test/fixtures/umf");
const TOKENS = dirname(createRequire(import.meta.url).resolve("@ux-builder/tokens/package.json"));

/** Every pinned umf fixture: { id, file, document }. */
export const fixtures = ["inventory", "forms"].flatMap((dir) => readdirSync(join(FIXTURES, dir)).filter((f) => f.endsWith(".json") && f !== "index.json")
  .map((f) => ({ id: f.replace(/\.json$/, ""), file: join(FIXTURES, dir, f), document: JSON.parse(readFileSync(join(FIXTURES, dir, f), "utf8")) })));

export const fixture = (id) => structuredClone(fixtures.find((f) => f.id === id).document);
export const kindForm = (doc) => `${doc.extensions["umf.visual"].kind}/${doc.extensions["umf.visual"].form}`;

/** Every theme the token build publishes, with the appearances it has. */
export const themes = JSON.parse(readFileSync(join(TOKENS, "dist/manifest.json"), "utf8")).themes
  .map((t) => ({ name: t.name, appearances: t.appearances.filter((a) => existsSync(join(TOKENS, `dist/resolved/${t.name}.${a}.json`))) }));

/** One fixture per supported form: the Storybook stories draw the same ones. */
export const PER_FORM = {
  "flow/network": "helix-context", "flow/pipeline": "beacon-overview", "flow/zoned": "beacon-deployment", "flow/lanes": "beacon-field-guide",
  "sequence/lifelines": "beacon-reply-draft", "sequence/ladder": "helix-request-ladder", "state/machine": "helix-authoring-state",
  "state/lifecycle": "beacon-ticket-lifecycle", "structure/entities": "tpl-sd-domain", "structure/tree": "umf-extensions",
  "structure/stack": "beacon-stack", "structure/nested": "beacon-estate-landscape", "timeline/milestones": "umf-releases",
  "timeline/roadmap": "visuals-roadmap", "timeline/history": "helix-releases", "comparison/matrix": "helix-adr-options",
  "comparison/quadrant": "layout-engines", "comparison/before-after": "visuals-before-after", "metric/stat": "umf-ac-satisfied",
  "metric/bar": "umf-ac-status", "metric/line": "umf-ac-trend", "metric/meter": "umf-ac-coverage",
};

/** Check findings the renderer cannot yet avoid, each with its reason. Anything not listed fails. None today. */
export const KNOWN = {};
