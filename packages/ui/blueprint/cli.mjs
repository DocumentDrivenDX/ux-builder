#!/usr/bin/env node
/* ux-builder-blueprint: check an app's or view's plan against the
   interaction and IA rules, or start one (FEAT-008, CONTRACT-005).

     ux-builder-blueprint check app.blueprint.json [--json]
     ux-builder-blueprint init [--kind app|view] [--out app.blueprint.json]

   check exits 0 with no error finding, 1 with one, 2 on bad usage or an
   unreadable file. init exits 0 when written, 1 when the file exists.

   When the blueprint has journeys or screens that serve stories, check reads
   (never writes) the HELIX stories under the .helix.yml marker above the
   file (FEAT-012 JRN-03); with no marker it skips those checks and says so. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { needsStories, readStories, skippedNote } from "./helix.mjs";
import { checkBlueprint, skeleton } from "./index.mjs";

const USAGE = `Usage:
  ux-builder-blueprint check <file> [--json]
  ux-builder-blueprint init [--kind app|view] [--out <file>]`;

function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: { json: { type: "boolean" }, kind: { type: "string", default: "app" }, out: { type: "string", default: "app.blueprint.json" }, help: { type: "boolean", short: "h" } } });
  } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  const { values, positionals: [command, file, ...rest] } = parsed;
  if (values.help) { console.log(USAGE); return 0; }

  if (command === "init") {
    if (file || !["app", "view"].includes(values.kind)) { console.error(USAGE); return 2; }
    if (existsSync(values.out)) { console.error(`${values.out} exists; not overwriting it.`); return 1; }
    writeFileSync(values.out, JSON.stringify(skeleton(values.kind), null, 2) + "\n");
    console.log(`Wrote ${values.out}. Describe your ${values.kind === "view" ? "view's screen" : "app's destinations and screens"}, then run: ux-builder-blueprint check ${values.out}`);
    return 0;
  }
  if (command !== "check" || !file || rest.length) { console.error(USAGE); return 2; }
  let bp;
  try { bp = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`${file}: ${e.message}`); return 2; }
  const storied = needsStories(bp);
  const helix = storied ? readStories(file) : null;
  const note = storied && !helix ? skippedNote(file) : null;
  const findings = checkBlueprint(bp, { helix });
  const errors = findings.filter((f) => f.severity === "error").length;
  if (values.json) { console.log(JSON.stringify(findings, null, 2)); if (note) console.error(`note: ${note}`); }
  else {
    for (const f of findings) console.log(`${f.severity.padEnd(7)} ${f.rule}  ${f.path || "/"}\n        ${f.message}\n        Fix: ${f.fix}`);
    if (note) console.log(`note    ${note}`);
    console.log(findings.length ? `${file}: ${errors} error${errors === 1 ? "" : "s"}, ${findings.length - errors} warning${findings.length - errors === 1 ? "" : "s"}` : `${file}: no findings`);
  }
  return errors ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
