#!/usr/bin/env node
/* Compare resolved theme files between two directories.

     node tools/diff-resolved.mjs <before-dir> <after-dir>

   For every resolved/<theme>.<appearance>.json in <before-dir>, the file of
   the same name in <after-dir> must give every token the same final value.
   A token missing from <after-dir> or with a different value fails. Tokens
   only <after-dir> has are listed but allowed: new roles (color.on-accent,
   --piq-*) and derived ones (--rail where a brand sets no recessed ground)
   are additive.

   npm run verify runs it against tools/fixtures/resolved-0.3.0/, the
   0.3.0 output, so a 0.x theme can only change by changing that fixture
   (FEAT-001 THEME-09, CONTRACT-003). Changed so far: the praxis* files'
   logo-image, logo-aspect, mark-image and favicon, for Praxis's v2 artwork
   (operator, 2026-10-07); plain's state-live, state-limited and
   state-evaluation, darkened to clear 4.5:1 on the pill's own tint
   (operator, 2026-10-08); pill-bg in the praxis-material and
   praxis-fluentui files, a filled pill so a status clears 4.5:1 on the page
   ground (operator, 2026-10-08). */

// @covers US-005-AC3 @covers US-004-AC2
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [before, after] = process.argv.slice(2);
if (!before || !after) { console.error("usage: diff-resolved.mjs <before-dir> <after-dir>"); process.exit(2); }

let changed = 0, missing = 0, files = 0;
for (const f of readdirSync(before).filter((x) => x.endsWith(".json")).sort()) {
  files++;
  const a = JSON.parse(readFileSync(join(before, f), "utf8")).tokens;
  const path = join(after, f);
  if (!existsSync(path)) { console.log(`MISSING FILE  ${f}`); missing++; continue; }
  const b = JSON.parse(readFileSync(path, "utf8")).tokens;
  const diffs = [];
  for (const [k, v] of Object.entries(a)) {
    if (!(k in b)) { diffs.push(`  missing  --${k}`); missing++; }
    else if (String(b[k]) !== String(v)) { diffs.push(`  changed  --${k}: ${v}  →  ${b[k]}`); changed++; }
  }
  const extra = Object.keys(b).filter((k) => !(k in a));
  console.log(`${diffs.length ? "DIFF" : "ok  "}  ${f}  (${Object.keys(a).length} tokens${extra.length ? `; added: ${extra.map((k) => `--${k}`).join(", ")}` : ""})`);
  diffs.forEach((d) => console.log(d));
}
console.log(`\n${files} files: ${changed} changed, ${missing} missing.`);
process.exit(changed || missing ? 1 : 0);
