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

   check, propose, draw and wireframes read app.blueprint.json when no file is
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

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { needsStories, readStories, skippedNote } from "./helix.mjs";
import { checkBlueprint, compareAlternatives, complexityDelta, deltaFindings, principleFindings, score, simplify, skeleton } from "./index.mjs";
import { propose, writeProposals } from "./propose.mjs";
import { drawings, writeDrawings } from "./draw.mjs";

const USAGE = `Usage:
  ux-builder-blueprint check [<file>] [--json] [--diff <base>]
  ux-builder-blueprint simplify [<file>] [--json]
  ux-builder-blueprint score [<file>] [--json]
  ux-builder-blueprint compare <file> <file> [<file>...] [--out <dir>]
  ux-builder-blueprint alternative (new <name> | choose <name> --reason <text>)
  ux-builder-blueprint prototype (--explore [--alternative <name>] [--design-system <ds>]... [--question <q>] | --archive <name>)
  ux-builder-blueprint init [--kind app|view] [--out <file>]
  ux-builder-blueprint propose [<file>] [--out <dir>]
  ux-builder-blueprint draw [<file>] [--out <dir>]
  ux-builder-blueprint wireframes [<file>] [--out <dir>]`;
const OUT = { propose: "helix-proposals", draw: "blueprint-drawings", wireframes: "blueprint-wireframes" };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: { json: { type: "boolean" }, diff: { type: "string" }, reason: { type: "string" }, explore: { type: "boolean" }, archive: { type: "string" }, alternative: { type: "string" }, "design-system": { type: "string", multiple: true }, question: { type: "string" }, kind: { type: "string", default: "app" }, out: { type: "string" }, help: { type: "boolean", short: "h" } } });
  } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  let { values, positionals: [command, file, ...rest] } = parsed;
  if (values.help) { console.log(USAGE); return 0; }

  if (command === "init") {
    const out = values.out ?? "app.blueprint.json";
    if (file || !["app", "view"].includes(values.kind)) { console.error(USAGE); return 2; }
    if (existsSync(out)) { console.error(`${out} exists; not overwriting it.`); return 1; }
    writeFileSync(out, JSON.stringify(skeleton(values.kind), null, 2) + "\n");
    console.log(`Wrote ${out}. Describe your ${values.kind === "view" ? "view's screen" : "app's destinations and screens"}, then run: ux-builder-blueprint check ${out}`);
    return 0;
  }

  if (command === "score") {
    if (rest.length) { console.error(USAGE); return 2; }
    const src = file ?? "app.blueprint.json";
    let bp;
    try { bp = JSON.parse(readFileSync(src, "utf8")); } catch (e) { console.error(`${src}: ${e.message}`); return 2; }
    const scores = score(bp);
    if (values.json) console.log(JSON.stringify(scores, null, 2));
    else for (const s of scores) console.log(`${s.journey}${s.task ? ` (${s.task})` : ""}, predicted: ${s.steps} steps (shortest ${s.shortestPath ?? "?"}), ${s.screens} screens, ${s.modals} modals, ${s.requiredInputs} required inputs, ${s.decisions} decisions, ${s.hops} hops, ${s.findings} findings, patterns ${s.patterns.reused} reused / ${s.patterns.introduced} introduced`);
    return 0;
  }

  if (command === "compare") {
    const files = [file, ...rest].filter(Boolean);
    if (files.length < 2) { console.error(`compare needs two or more blueprints\n${USAGE}`); return 2; }
    const alternatives = [];
    for (const f of files) {
      try { alternatives.push({ name: alternativeName(f), file: f, blueprint: JSON.parse(readFileSync(f, "utf8")) }); } catch (e) { console.error(`${f}: ${e.message}`); return 2; }
    }
    const design = await designState(files[0]);
    const judgments = Object.fromEntries((design?.state?.alternatives ?? []).map((a) => [a.name, a.judgments ?? []]));
    const r = compareAlternatives(alternatives, { judgments, title: `Comparing ${alternatives.map((a) => a.name).join(", ")}` });
    if (r.differ) {
      console.error(`The alternatives do not cover the same tasks: ${r.differ.join(", ")}. ${r.missing.map((m) => `${m.name} lacks ${m.lacks.join(", ")}`).join("; ")}.`);
      return 1;
    }
    const out = values.out ?? "blueprint-compare";
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "compare.html"), r.html);
    if (values.json) console.log(JSON.stringify({ file: join(out, "compare.html"), scores: r.scores, best: r.best }, null, 2));
    else console.log(`${join(out, "compare.html")}: ${alternatives.length} alternatives, best per task and dimension marked.`);
    return 0;
  }

  if (command === "alternative") {
    const [name] = rest;
    if (!["new", "choose"].includes(file) || !/^[a-z0-9][a-z0-9-]*$/.test(name ?? "")) { console.error(`alternative new <name> or alternative choose <name> --reason <text>; a name is lowercase letters, digits and hyphens\n${USAGE}`); return 2; }
    const main = "app.blueprint.json", alt = `app.blueprint.${name}.json`;
    if (file === "new") {
      if (!existsSync(main)) { console.error(`No ${main} here to copy.`); return 2; }
      if (existsSync(alt)) { console.error(`${alt} exists; not overwriting it.`); return 1; }
      writeFileSync(alt, readFileSync(main, "utf8"));
      const d = await designState(main);
      if (d && !d.state.alternatives.some((a) => a.name === name)) d.design.stateSet(d.app, { path: "alternatives[+]", value: { name, file: alt, status: "candidate" } });
      console.log(`Wrote ${alt}, a copy of ${main}. Change it, then: ux-builder-blueprint check ${alt}`);
      return 0;
    }
    if (!values.reason?.trim()) { console.error(`alternative choose needs --reason: why ${name} is chosen. Nothing was changed.`); return 1; }
    if (!existsSync(alt)) { console.error(`No ${alt}: create it with ux-builder-blueprint alternative new ${name}.`); return 1; }
    writeFileSync(main, readFileSync(alt, "utf8"));
    const d = await designState(main);
    if (d) {
      const date = new Date().toISOString().slice(0, 10);
      const others = readdirSync(".").map((f) => f.match(/^app\.blueprint\.([a-z0-9][a-z0-9-]*)\.json$/)?.[1]).filter(Boolean);
      const known = new Map(d.state.alternatives.map((a) => [a.name, a]));
      const names = [...new Set([...known.keys(), ...others])].sort();
      const alternatives = names.map((n) => ({ ...(known.get(n) ?? { name: n, file: `app.blueprint.${n}.json` }), status: n === name ? "chosen" : "rejected", reason: n === name ? values.reason.trim() : `${name} was chosen: ${values.reason.trim()}`, date }));
      d.design.stateSet(d.app, { path: "alternatives", value: alternatives });
    }
    console.log(`${main} is now ${name}${d ? "; the design state records the choice" : ""}.`);
    return 0;
  }

  if (command === "prototype") {
    if (file || rest.length) { console.error(USAGE); return 2; }
    const { archivePrototype, themeFor, writePrototype } = await import("./prototype.mjs");
    if (values.archive) {
      const to = archivePrototype(values.archive);
      if (!to) { console.error(`No prototype/${values.archive}/ to archive.`); return 1; }
      console.log(`Moved prototype/${values.archive}/ to ${to}/.`);
      return 0;
    }
    if (!values.explore) { console.error(`prototype needs --explore (or --archive <name>)\n${USAGE}`); return 2; }
    const name = values.alternative ?? "current";
    const src = values.alternative ? `app.blueprint.${values.alternative}.json` : "app.blueprint.json";
    let bp;
    try { bp = JSON.parse(readFileSync(src, "utf8")); } catch (e) { console.error(`${src}: ${e.message}`); return 2; }
    const errors = checkBlueprint(bp).filter((f) => f.severity === "error");
    if (errors.length) {
      for (const f of errors) console.error(`error   ${f.rule}  ${f.path || "/"}\n        ${f.message}`);
      console.error(`${src} has ${errors.length} error${errors.length === 1 ? "" : "s"}: fix them before prototyping. Nothing was written.`);
      return 1;
    }
    const d = await designState(src);
    const question = values.question ?? d?.state?.questions?.find((q) => q.status === "open")?.text ?? `What is it like to use ${name}?`;
    const systems = values["design-system"] ?? [];
    const targets = systems.length ? systems.map((ds) => ({ dir: `${name}-${ds}`, theme: themeFor(ds), ds })) : [{ dir: name, theme: "plain" }];
    const missing = targets.filter((t) => !t.theme);
    if (missing.length) { console.error(`No theme shows the design system ${missing.map((t) => t.ds).join(", ")}.`); return 2; }
    const written = [];
    for (const t of targets) written.push(await writePrototype(bp, { dir: t.dir, question, theme: t.theme }));
    if (values.json) console.log(JSON.stringify({ question, prototypes: written }, null, 2));
    else for (const w of written) console.log(`${w.dir}/: ${w.pages} pages (${w.theme}); open ${w.dir}/index.html. A prototype, never app code.`);
    return 0;
  }

  if (command === "simplify") {
    if (rest.length) { console.error(USAGE); return 2; }
    const src = file ?? "app.blueprint.json";
    let bp;
    try { bp = JSON.parse(readFileSync(src, "utf8")); } catch (e) { console.error(`${src}: ${e.message}`); return 2; }
    const r = simplify(bp);
    if (values.json) console.log(JSON.stringify(r, null, 2));
    else {
      for (const p of r.proposals) console.log(`${p.kind.padEnd(16)} ${p.task}${p.journey ? ` ${p.journey}` : ""}  ${p.at}\n                 ${p.change}\n                 Saves: ${Object.entries(p.saves).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ")}. Assumes: ${p.assumes}`);
      console.log(r.message);
    }
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

  if (command !== "check" || rest.length) { console.error(USAGE); return 2; }
  // Like the other commands, check reads app.blueprint.json when no file is given.
  file ??= "app.blueprint.json";
  let bp;
  try { bp = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`${file}: ${e.message}`); return 2; }
  const storied = needsStories(bp);
  const helix = storied ? readStories(file) : null;
  const note = storied && !helix ? skippedNote(file) : null;
  const findings = checkBlueprint(bp, { helix });
  // The app's experience principles that a check can express (FEAT-018 GDL-16).
  findings.push(...principleFindings(bp, readPrinciples(file)));
  // --diff: the complexity this blueprint adds over a base one (FEAT-018 GDL-12).
  let delta = null;
  if (values.diff) {
    let base;
    try { base = JSON.parse(readFileSync(values.diff, "utf8")); } catch (e) { console.error(`${values.diff}: ${e.message}`); return 2; }
    delta = complexityDelta(base, bp);
    findings.push(...deltaFindings(delta, await recordedDecisions(file)));
  }
  const errors = findings.filter((f) => f.severity === "error").length;
  await traceCheck(file, findings);
  if (values.json) { console.log(JSON.stringify(delta ? { findings, delta } : findings, null, 2)); if (note) console.error(`note: ${note}`); }
  else {
    if (delta) console.log(deltaText(values.diff, delta));
    for (const f of findings) console.log(`${f.severity.padEnd(7)} ${f.rule}  ${f.path || "/"}\n        ${f.message}\n        Fix: ${f.fix}`);
    if (note) console.log(`note    ${note}`);
    console.log(findings.length ? `${file}: ${errors} error${errors === 1 ? "" : "s"}, ${findings.length - errors} warning${findings.length - errors === 1 ? "" : "s"}` : `${file}: no findings`);
  }
  return errors ? 1 : 0;
}

/* The complexity delta in words: per journey, what was added and removed. */
function deltaText(base, delta) {
  const list = (o) => Object.entries(o).filter(([, v]) => v.length).map(([k, v]) => `${k} ${v.join(", ")}`).join("; ");
  const lines = [`Complexity against ${base}:`];
  if (delta.screens.added.length || delta.screens.removed.length) lines.push(`  app screens: +${delta.screens.added.length} -${delta.screens.removed.length}`);
  for (const j of delta.journeys) {
    lines.push(`  ${j.journey} (${j.status})`);
    if (list(j.added)) lines.push(`    added:   ${list(j.added)}`);
    if (list(j.removed)) lines.push(`    removed: ${list(j.removed)}`);
  }
  if (!delta.journeys.length) lines.push("  no journey changed");
  return lines.join("\n");
}

/* An alternative's name from its file: app.blueprint.<name>.json, else "current". */
function alternativeName(f) {
  const m = basename(f).match(/^app\.blueprint\.([a-z0-9][a-z0-9-]*)\.json$/);
  return m ? m[1] : basename(f) === "app.blueprint.json" ? "current" : basename(f).replace(/\.json$/, "");
}

/* The guided design loop's state for the app above a blueprint, through
   @ux-builder/design when it is installed: { design, app, state }, or null. */
async function designState(file) {
  let design;
  try { design = await import("@ux-builder/design"); } catch { return null; }
  const app = design.findApp(dirname(resolve(file)));
  if (!design.hasState(app)) return null;
  return { design, app, state: design.readState(app) };
}

/* The app's principles: .ux-builder/principles.json in the nearest folder at
   or above the blueprint that has one; none otherwise. */
function readPrinciples(file) {
  let d = dirname(resolve(file));
  for (;;) {
    const p = join(d, ".ux-builder/principles.json");
    if (existsSync(p)) { try { return JSON.parse(readFileSync(p, "utf8")).principles ?? []; } catch { return []; } }
    const up = dirname(d);
    if (up === d) return [];
    d = up;
  }
}

/* Every decision recorded in the app's trace, when @ux-builder/trace is
   installed and the app keeps one; none otherwise. */
async function recordedDecisions(file) {
  let trace;
  try { trace = await import("@ux-builder/trace"); } catch { return []; }
  const app = trace.findApp(dirname(resolve(file)));
  if (!app) return [];
  return trace.listEpisodes(app).flatMap((e) => trace.readEpisode(app, e.id)).filter((ev) => ev.kind === "decision");
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
