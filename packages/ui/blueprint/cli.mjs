#!/usr/bin/env node
/* ux-builder-blueprint: check an app's or view's plan against the
   interaction and IA rules, or start one (FEAT-008, CONTRACT-005); draft
   HELIX content and draw the plan from it (FEAT-012, CONTRACT-004).

     ux-builder-blueprint check app.blueprint.json [--json]
     ux-builder-blueprint init [--kind app|view] [--out app.blueprint.json]
     ux-builder-blueprint propose [file] [--out helix-proposals]
     ux-builder-blueprint draw [file] [--out blueprint-drawings]
     ux-builder-blueprint wireframes [file] [--out blueprint-wireframes]

   check exits 0 with no error finding, 1 with one, 2 on bad usage or an
   unreadable file. init exits 0 when written, 1 when the file exists.

   When the blueprint has journeys or screens that serve stories, check reads
   (never writes) the HELIX stories under the .helix.yml marker above the
   file (FEAT-012 JRN-03); with no marker it skips those checks and says so.
   Each check is also a check event in the app's episode trace (FEAT-016)
   when @ux-builder/trace is installed and .ux-builder/ is above the file.

   propose, draw and wireframes read app.blueprint.json when no file is
   given (FEAT-012 DRF-01, DRW-01, DRW-02; FEAT-015 RPT-09). propose writes
   HELIX proposals as patches, a report and proposals.json, and applies
   nothing; for HELIX UX types the installed HELIX does not define, it names
   them and writes drafts under <out>/drafts/ instead: exit 0 when written, 2
   with no .helix.yml marker above the file, on bad usage or an unreadable
   file. draw writes Mermaid and SVG, and per screen a state diagram with its
   state table (states-<screen>.md), noting the states a screen does not
   declare (exit 0). wireframes writes HTML and PNG per screen, size class and
   state; it exits 2 when the PNGs cannot be drawn (no Playwright or
   Chromium), with the HTML still written. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { needsStories, readStories, skippedNote } from "./helix.mjs";
import { checkBlueprint, skeleton } from "./index.mjs";
import { propose, writeProposals } from "./propose.mjs";
import { drawings, writeDrawings } from "./draw.mjs";

const USAGE = `Usage:
  ux-builder-blueprint check <file> [--json]
  ux-builder-blueprint init [--kind app|view] [--out <file>]
  ux-builder-blueprint propose [<file>] [--out <dir>]
  ux-builder-blueprint draw [<file>] [--out <dir>]
  ux-builder-blueprint wireframes [<file>] [--out <dir>]`;
const OUT = { propose: "helix-proposals", draw: "blueprint-drawings", wireframes: "blueprint-wireframes" };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: { json: { type: "boolean" }, kind: { type: "string", default: "app" }, out: { type: "string" }, help: { type: "boolean", short: "h" } } });
  } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  const { values, positionals: [command, file, ...rest] } = parsed;
  if (values.help) { console.log(USAGE); return 0; }

  if (command === "init") {
    const out = values.out ?? "app.blueprint.json";
    if (file || !["app", "view"].includes(values.kind)) { console.error(USAGE); return 2; }
    if (existsSync(out)) { console.error(`${out} exists; not overwriting it.`); return 1; }
    writeFileSync(out, JSON.stringify(skeleton(values.kind), null, 2) + "\n");
    console.log(`Wrote ${out}. Describe your ${values.kind === "view" ? "view's screen" : "app's destinations and screens"}, then run: ux-builder-blueprint check ${out}`);
    return 0;
  }

  if (OUT[command]) {
    if (rest.length) { console.error(USAGE); return 2; }
    const src = file ?? "app.blueprint.json";
    let bp;
    try { bp = JSON.parse(readFileSync(src, "utf8")); } catch (e) { console.error(`${src}: ${e.message}`); return 2; }
    const out = values.out ?? OUT[command];
    if (command === "propose") {
      const r = propose(bp, { blueprintFile: src });
      if (!r.marker) { console.error(`No HELIX marker (.helix.yml) above ${src}: propose drafts into the HELIX flow that marker names. Run it in a HELIX-governed repository.`); return 2; }
      writeProposals(r, out);
      for (const p of r.proposals) console.log(`patch    ${out}/${p.file}  ${p.path} (${p.section})`);
      for (const d of r.disagreements) console.log(`differs  ${d.path} (${d.section}): HELIX already says something else; no patch, see ${out}/report.md`);
      if (r.uxTypes.missing.length) console.log(`missing  ${r.uxTypes.missing.join(", ")}: not defined by the installed HELIX; drafted under ${out}/drafts/ instead of patched`);
      for (const d of r.drafts) console.log(`draft    ${out}/drafts/${d.path}  (${d.type})`);
      for (const p of r.problems) console.log(`note     ${p}`);
      console.log(`${out}: ${plural(r.proposals.length, "patch", "patches")}, ${plural(r.drafts.length, "draft")}, ${plural(r.disagreements.length, "disagreement")}; nothing applied. Review report.md, then apply the patches you accept.`);
      return 0;
    }
    if (command === "draw") {
      const list = drawings(bp);
      const files = writeDrawings(list, out);
      console.log(`${out}: ${files.join(", ")}`);
      for (const d of list) if (d.missing?.length) console.log(`note     ${d.name}.md: ${d.notes[0]}`);
      return 0;
    }
    const { wireframes, writeWireframes } = await import("./wireframes.mjs");
    const w = await writeWireframes(await wireframes(bp), out);
    const count = (ext) => w.files.filter((f) => f.endsWith(ext)).length;
    const states = new Set(w.pages.map((p) => `${p.screen} ${p.state}`)).size;
    console.log(`${out}: ${count(".html")} HTML${w.png ? `, ${count(".png")} PNG` : ""} (${plural(states, "screen state")})`);
    if (!w.png) { console.error(w.reason); return 2; }
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
  await traceCheck(file, findings);
  if (values.json) { console.log(JSON.stringify(findings, null, 2)); if (note) console.error(`note: ${note}`); }
  else {
    for (const f of findings) console.log(`${f.severity.padEnd(7)} ${f.rule}  ${f.path || "/"}\n        ${f.message}\n        Fix: ${f.fix}`);
    if (note) console.log(`note    ${note}`);
    console.log(findings.length ? `${file}: ${errors} error${errors === 1 ? "" : "s"}, ${findings.length - errors} warning${findings.length - errors === 1 ? "" : "s"}` : `${file}: no findings`);
  }
  return errors ? 1 : 0;
}

/* The check, as a check event in the app's episode trace (FEAT-016 TRC-03,
   US-106-AC2), when @ux-builder/trace is installed and a .ux-builder/ folder
   is at or above the blueprint. Nothing is written otherwise; a trace that
   cannot be written never changes the check's result. */
async function traceCheck(file, findings) {
  let trace;
  try { trace = await import("@ux-builder/trace"); } catch { return; }
  const app = trace.findApp(dirname(resolve(file)));
  if (!app) return;
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  trace.recordCheck(app, "blueprint", { findings: trace.countFindings(findings) }, { by: `@ux-builder/ui@${version}` });
}

process.exitCode = await main(process.argv.slice(2));
