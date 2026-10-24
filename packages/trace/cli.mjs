#!/usr/bin/env node
/* ux-builder-trace (CONTRACT-007 Commands): the episode trace from a terminal
   or a hook. Run it in the app (or pass --dir). */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { assessmentRef, attachTranscript, closeEpisode, currentEpisode, exportBundle, listEpisodes, openEpisode, readEpisode, recordDecision, validateTrace, VERSION } from "./index.mjs";
import { lint } from "./lint.mjs";

const HELP = `ux-builder-trace ${VERSION}: the episode trace of an app built with ux-builder (CONTRACT-007)

Usage: ux-builder-trace <command> [options] [--dir <app>]

  start --goal <text> [--story US-n]... [--screen id]... [--journey J-x]...
        [--agent name --model id] [--trigger change|create] [--no-transcripts]
      open an episode; .ux-builder/trace/current names it. Exits 1 if one is open.
  attach-transcript [--file f] [--agent name]
      copy a transcript, secrets masked, into .ux-builder/transcripts/<episode>/
      and record it. With no --file it reads a Claude Code hook's JSON on stdin
      (transcript_path, session_id, cwd).
  decide --chose <what> --why <why> [--considered <x>]... [--relied <rule or US-n>]...
         [--kind addition --goal <g> --without <w> --simplest <s> --assumptions <a>... --validation <v>]
         (--assumption is the same as --assumptions, as ux-builder-design decision add spells it)
         [--screen id] [--departs] [--workaround]
      record a decision: each pattern choice, departure from the guidance and
      workaround for a missing component (as MCP record_decision does). An
      addition (a new destination, screen, modal, required input or step) also
      answers the five questions: --kind addition needs --goal, --without,
      --simplest, at least one --assumptions and --validation (FEAT-018).
  lint [--stylelint <glob>]... [--eslint <path or glob>]...
      run Stylelint and ESLint (the app's own, with its config) and record one
      lint check: status, attempt and each rule's findings. Exits 1 on an error.
  end [--status done|abandoned] [--assessment <run-dir>]
      close the open episode (else this branch's unscoped one): records its
      commits carrying "UX-Episode: <id>", the outcome and the end. With
      --assessment, the outcome names that run and its assess compare classes.
  status
      the open episode and every episode in the app.
  export [--episode <id>]... [--since <date>] --out <file>.tgz [--yes] [--include-open]
      write a bundle of chosen episodes and their transcripts, masked again,
      after listing every file and asking to confirm. It sends nothing.
  validate
      check every event against the schema, and the seq order. Exits 1 on a problem.

Options:
  --dir <app>   the app (default: the nearest folder above with .ux-builder/, else the git root, else here)
  -h, --help    this help
`;

function appDir(start) {
  let d = resolve(start);
  for (;;) {
    if (existsSync(join(d, ".ux-builder"))) return d;
    if (existsSync(join(d, ".git"))) return d;
    const up = dirname(d);
    if (up === d) return resolve(start);
    d = up;
  }
}

async function stdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const fail = (msg, code = 1) => { process.stderr.write(`ux-builder-trace: ${msg}\n`); process.exit(code); };

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") { process.stdout.write(HELP); return 0; }
  const common = { dir: { type: "string" }, help: { type: "boolean", short: "h" } };
  const opts = {
    start: { goal: { type: "string" }, story: { type: "string", multiple: true }, screen: { type: "string", multiple: true }, journey: { type: "string", multiple: true }, agent: { type: "string" }, model: { type: "string" }, trigger: { type: "string" }, "no-transcripts": { type: "boolean" } },
    "attach-transcript": { file: { type: "string" }, agent: { type: "string" } },
    decide: { chose: { type: "string" }, why: { type: "string" }, considered: { type: "string", multiple: true }, relied: { type: "string", multiple: true }, screen: { type: "string" }, departs: { type: "boolean" }, workaround: { type: "boolean" }, kind: { type: "string" }, goal: { type: "string" }, without: { type: "string" }, simplest: { type: "string" }, assumptions: { type: "string", multiple: true }, assumption: { type: "string", multiple: true }, validation: { type: "string" } },
    lint: { eslint: { type: "string", multiple: true }, stylelint: { type: "string", multiple: true } },
    end: { status: { type: "string" }, assessment: { type: "string" } },
    status: {},
    export: { episode: { type: "string", multiple: true }, since: { type: "string" }, out: { type: "string" }, yes: { type: "boolean", short: "y" }, "include-open": { type: "boolean" } },
    validate: {},
  };
  if (!opts[cmd]) fail(`unknown command "${cmd}" (ux-builder-trace --help)`, 2);
  let values;
  try { ({ values } = parseArgs({ args: rest, options: { ...common, ...opts[cmd] }, strict: true })); } catch (e) { fail(`${e.message} (ux-builder-trace --help)`, 2); }
  if (values.help) { process.stdout.write(HELP); return 0; }

  if (cmd === "start") {
    const dir = appDir(values.dir ?? process.cwd());
    if (!values.goal && !values.story && !values.screen) fail("start needs --goal <text> (and its --story, --screen and --journey IDs)", 2);
    if (values.trigger && !["change", "create"].includes(values.trigger)) fail("--trigger is change or create", 2);
    try {
      const id = openEpisode(dir, { trigger: values.trigger ?? "change", goal: { text: values.goal ?? "", stories: values.story ?? [], screens: values.screen ?? [], journeys: values.journey ?? [] }, agent: { name: values.agent ?? null, model: values.model ?? null }, transcripts: !values["no-transcripts"] });
      process.stdout.write(`${id}\nCommits made in this episode end with "UX-Episode: ${id}". Close it with: ux-builder-trace end\n`);
      return 0;
    } catch (e) { fail(e.message); }
  }

  if (cmd === "attach-transcript") {
    let hookJson = null;
    if (!values.file) {
      const raw = (await stdin()).trim();
      if (!raw) fail("attach-transcript needs --file <transcript>, or a hook's JSON on stdin", 2);
      try { hookJson = JSON.parse(raw); } catch { fail("stdin is not a hook's JSON", 2); }
    }
    const dir = appDir(values.dir ?? hookJson?.cwd ?? process.cwd());
    try {
      const r = attachTranscript(dir, { file: values.file, hookJson, agent: values.agent });
      if (!r.attached) { process.stdout.write(`No transcript attached: ${r.reason}\n`); return 0; }
      process.stdout.write(`Attached ${r.file} to ${r.episode}: ${r.bytes} bytes, ${r.masked} masked\n`);
      return 0;
    } catch (e) { fail(e.message); }
  }

  if (cmd === "end") {
    const dir = appDir(values.dir ?? process.cwd());
    if (values.status && !["done", "abandoned"].includes(values.status)) fail("--status is done or abandoned", 2);
    try {
      let assessment;
      if (values.assessment) { assessment = assessmentRef(values.assessment); if (!assessment) fail(`--assessment ${values.assessment}: no comparison.json from ux-builder-audit assess compare there`, 2); }
      const r = closeEpisode(dir, { status: values.status ?? "done", assessment });
      for (const w of r.warnings) process.stderr.write(`warning: ${w}\n`);
      const green = Object.entries(r.outcome.checksToGreen).map(([k, v]) => `${k} ${v === null ? "never passed" : `passed on attempt ${v}`}`).join(", ");
      process.stdout.write(`Ended ${r.episode} (${r.status}): ${r.change.commits.length} commit${r.change.commits.length === 1 ? "" : "s"}, ${r.change.files} file${r.change.files === 1 ? "" : "s"} changed${green ? `; checks: ${green}` : ""}\n`);
      return 0;
    } catch (e) { fail(e.message); }
  }

  if (cmd === "decide") {
    const dir = appDir(values.dir ?? process.cwd());
    try {
      const e = recordDecision(dir, { chose: values.chose, why: values.why, considered: values.considered, relied: values.relied, screen: values.screen, departs: values.departs, workaround: values.workaround, kind: values.kind, goal: values.goal, without: values.without, simplest: values.simplest, assumptions: [...(values.assumptions ?? []), ...(values.assumption ?? [])], validation: values.validation });
      if (!e) return 1;
      process.stdout.write(`Recorded the decision in ${e.episode}\n`);
      return 0;
    } catch (e) { fail(e.message, e.code === "MISSING" ? 2 : 1); }
  }

  if (cmd === "lint") {
    const dir = appDir(values.dir ?? process.cwd());
    if (!values.eslint && !values.stylelint) fail("lint needs --stylelint <glob> and/or --eslint <path>", 2);
    try {
      const r = await lint(dir, { eslint: values.eslint ?? [], stylelint: values.stylelint ?? [] });
      return r.status === "fail" ? 1 : 0;
    } catch (e) { fail(`lint could not run: ${e.message}`, 2); }
  }

  if (cmd === "status") {
    const dir = appDir(values.dir ?? process.cwd());
    const cur = currentEpisode(dir);
    const all = listEpisodes(dir);
    if (cur) {
      const ev = readEpisode(dir, cur);
      const s = ev.find((e) => e.kind === "start");
      process.stdout.write(`Open: ${cur}${s?.goal?.text ? ` — ${s.goal.text}` : ""}\n  ${ev.length} events; last: ${ev.at(-1)?.kind}\n`);
    } else process.stdout.write("No episode is open.\n");
    for (const u of all.filter((e) => e.open && e.unscoped)) process.stdout.write(`Unscoped (open): ${u.id}, ${u.events} events\n`);
    if (all.length) {
      process.stdout.write(`Episodes (${all.length}):\n`);
      for (const e of all) process.stdout.write(`  ${e.id}  ${e.open ? "open" : e.status}  ${e.events} events\n`);
    }
    return 0;
  }

  if (cmd === "export") {
    const dir = appDir(values.dir ?? process.cwd());
    const interactive = process.stdin.isTTY && process.stderr.isTTY;
    const confirm = interactive ? async () => {
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      try { return /^y(es)?$/i.test((await rl.question("Write this bundle? [y/N] ")).trim()); } finally { rl.close(); }
    } : undefined;
    try {
      const r = await exportBundle(dir, { episodes: values.episode, since: values.since, out: values.out, yes: !!values.yes, includeOpen: !!values["include-open"], confirm });
      if (!r.written) fail(`nothing written: ${r.reason}${confirm ? "" : " (not a terminal: pass --yes after reviewing the list)"}`);
      process.stdout.write(`Wrote ${r.out}: ${r.bundle.episodes.length} episode${r.bundle.episodes.length === 1 ? "" : "s"}, ${r.files.length} files, ${r.bundle.masked} masked. Nothing was sent; where it goes is your choice.\n`);
      return 0;
    } catch (e) { fail(e.message, e.code === "USAGE" ? 2 : 1); }
  }

  if (cmd === "validate") {
    const dir = appDir(values.dir ?? process.cwd());
    const problems = validateTrace(dir);
    for (const p of problems) process.stderr.write(`${p.file}${p.line ? `:${p.line}` : ""}: ${p.message}\n`);
    if (problems.length) return 1;
    process.stdout.write(`The trace is valid: ${listEpisodes(dir).length} episodes\n`);
    return 0;
  }
  return 2;
}

main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => fail(e.stack ?? e.message));
