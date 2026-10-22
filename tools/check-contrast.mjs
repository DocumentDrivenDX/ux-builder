#!/usr/bin/env node
/* Every text role must clear 4.5:1 on the ground it sits on, in every theme
   and appearance (WCAG 2.x AA for body text), and every diagram and chart
   role (FEAT-017) its own floor: 4.5:1 for text, 3:1 for marks and edges,
   neighbouring series apart under colour-vision deficiency, region tints
   deepening from the ground.

     npm run contrast                     # fail on any new failure
     node tools/check-contrast.mjs --update-baseline

   Reads packages/tokens/dist/resolved/*.json, so run the build first.

   Failures the themes already had when they moved here are recorded in
   tools/contrast-baseline.json rather than fixed in the same change that
   moved them: step 1 changes nothing visible. The check fails on a failure
   that is not in the baseline, and also on a baseline entry that now passes,
   so the baseline can only shrink and nobody has to remember to prune it.

   The pairings and the formula live in contrast.mjs, shared with the
   gallery. */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { DIAGRAM_PAIRS, FLOOR, PAIRS, diagramFailures, measure, pairId } from "./contrast.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// --resolved and --baseline check another build (the tests feed it a failing brand).
const { values: args } = parseArgs({ options: { resolved: { type: "string" }, baseline: { type: "string" }, "update-baseline": { type: "boolean" } } });
const RESOLVED = args.resolved ?? join(ROOT, "packages/tokens/dist/resolved");
const BASELINE = args.baseline ?? join(ROOT, "tools/contrast-baseline.json");

// @covers US-003-AC3
const failures = [];
const resolvedFiles = readdirSync(RESOLVED).filter((f) => f.endsWith(".json")).sort();
for (const file of resolvedFiles) {
  const { theme, appearance, tokens } = JSON.parse(readFileSync(join(RESOLVED, file), "utf8"));
  for (const [fg, bg, label] of PAIRS) {
    const m = measure(tokens, fg, bg);
    if (!m) continue;
    const r = m.ratio;
    if (r < FLOOR) failures.push({ id: pairId(theme, appearance, fg, bg), label, ratio: Number(r.toFixed(2)) });
  }
  // @covers US-112-AC4
  // A file with no diagram roles is from before FEAT-017 (a test's fixture); that every
  // built theme has all of them is tools/__tests__/diagram-tokens.test.mjs's to check.
  if (!Object.keys(tokens).some((k) => k.startsWith("piq-color-series-"))) continue;
  for (const f of diagramFailures(tokens)) {
    failures.push({ id: pairId(theme, appearance, f.fg, f.bg), label: `${f.label}, floor ${f.floor.toFixed(2)}`, ratio: f.ratio === null ? null : Number(f.ratio.toFixed(2)), ...(f.unit && { unit: f.unit }) });
  }
}

if (args["update-baseline"]) {
  writeFileSync(BASELINE, JSON.stringify({
    $description: "Contrast failures carried over from the platform's themes when they moved here. Fix them; do not add to this list.",
    floor: FLOOR,
    known: failures,
  }, null, 2) + "\n");
  console.log(`baseline written: ${failures.length} known failure(s)`);
  process.exit(0);
}

const known = new Set(JSON.parse(readFileSync(BASELINE, "utf8")).known.map((k) => k.id));
const now = new Set(failures.map((f) => f.id));
const fresh = failures.filter((f) => !known.has(f.id));
const fixed = [...known].filter((id) => !now.has(id));

for (const f of failures) {
  console.log(`${known.has(f.id) ? "known" : "NEW  "}  ${f.ratio === null ? "unmeasurable" : f.unit ? `${f.unit} ${f.ratio.toFixed(2)}` : `${f.ratio.toFixed(2)}:1`}  ${f.id}  (${f.label})`);
}
for (const id of fixed) console.log(`FIXED  ${id}: remove it from tools/contrast-baseline.json`);
console.log(`\n${resolvedFiles.length} theme/appearance combinations, ${PAIRS.length} pairings each, floor ${FLOOR}:1; ${DIAGRAM_PAIRS.length} diagram pairings, series separation and region order (FEAT-017).`);
if (fresh.length || fixed.length) process.exit(1);
console.log(`No new failures. ${known.size} known failure(s) remain in the baseline.`);
