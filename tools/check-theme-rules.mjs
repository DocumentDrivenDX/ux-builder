#!/usr/bin/env node
/* Run the theme checks (theme-rules.mjs) on every theme in tokens/themes,
   in each appearance, and report what each one finds, by theme.

     npm run theme-rules                       # fail on any new finding
     node tools/check-theme-rules.mjs --update-baseline

   Reads packages/tokens/dist/resolved/<theme>.<appearance>.json, so run the
   build first. Only the themes themselves are checked, not the gallery's
   brand and design-system pairings.

   Like the contrast check, what the themes already did when the checks
   arrived is recorded in tools/theme-rules-baseline.json rather than
   changed in the same step: the check fails on a finding not in the
   baseline, and on a baseline entry that no longer happens, so the
   baseline can only shrink. */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CHECKS, checkAppearance, checkTheme, findingId } from "./theme-rules.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { values: args } = parseArgs({ options: {
  resolved: { type: "string" }, themes: { type: "string" }, baseline: { type: "string" },
  "update-baseline": { type: "boolean" }, quiet: { type: "boolean" },
} });
const RESOLVED = args.resolved ?? join(ROOT, "packages/tokens/dist/resolved");
const THEMES = args.themes ?? join(ROOT, "tokens/themes");
const BASELINE = args.baseline ?? join(ROOT, "tools/theme-rules-baseline.json");

const names = readdirSync(THEMES).filter((f) => f.endsWith(".theme.json")).map((f) => JSON.parse(readFileSync(join(THEMES, f), "utf8")).name ?? f.replace(/\.theme\.json$/, "")).sort();
const load = (n, a) => { const f = join(RESOLVED, `${n}.${a}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).tokens : null; };

const findings = [];
for (const theme of names) {
  const ap = { light: load(theme, "light"), dark: load(theme, "dark") };
  if (!ap.light && !ap.dark) { console.error(`check-theme-rules: no resolved tokens for ${theme} in ${RESOLVED}; run npm run build`); process.exit(2); }
  for (const [appearance, tokens] of Object.entries(ap)) if (tokens) for (const f of checkAppearance(tokens)) findings.push({ theme, appearance, ...f });
  for (const f of checkTheme(ap)) findings.push({ theme, ...f });
}
for (const f of findings) { f.id = findingId(f.theme, f.appearance, f); f.rule = CHECKS[f.check]; }

if (args["update-baseline"]) {
  writeFileSync(BASELINE, JSON.stringify({
    $description: "What the themes did when the theme checks arrived (tools/theme-rules.mjs). Fix them; do not add to this list.",
    known: findings.map(({ id, rule, message }) => ({ id, rule, message })),
  }, null, 2) + "\n");
  console.log(`baseline written: ${findings.length} known finding(s)`);
  process.exit(0);
}

const known = new Set(existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")).known.map((k) => k.id) : []);
const now = new Set(findings.map((f) => f.id));
const fresh = findings.filter((f) => !known.has(f.id));
const fixed = [...known].filter((id) => !now.has(id));

if (!args.quiet) {
  for (const theme of names) {
    const mine = findings.filter((f) => f.theme === theme);
    console.log(`\n${theme}: ${mine.length ? `${mine.length} finding(s)` : "passes every theme check"}`);
    for (const f of mine) console.log(`  ${known.has(f.id) ? "known" : "NEW  "}  ${f.appearance.padEnd(5)}  ${f.rule}: ${f.message}`);
  }
}
for (const id of fixed) console.log(`FIXED  ${id}: remove it from tools/theme-rules-baseline.json`);
const rules = [...new Set(Object.values(CHECKS))];
console.log(`\n${names.length} themes, ${Object.keys(CHECKS).length} theme checks for ${rules.length} rules: ${findings.length} finding(s), ${fresh.length} new.`);
if (fresh.length || fixed.length) process.exit(1);
console.log(`No new findings. ${known.size} known finding(s) remain in the baseline.`);
