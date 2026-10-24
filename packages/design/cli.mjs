#!/usr/bin/env node
/* ux-builder-design (CONTRACT-008 Commands): the guided design loop's
   deterministic work, for the agent (through its shell) and for a person.
   Exit codes: 0 done; 1 a check failed; 2 bad input or a refusal. */

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { applyImpact, baseline, brief, checkpoint, impact, summaryOf, testKit, trace, ready, readyText, rubric, rubricText, decisionAdd, decisionStatus, evidenceAdd, evidenceList, DesignError, findApp, init, setMode, stateGet, stateSet, status, validate, VERSION } from "./index.mjs";

const HELP = `ux-builder-design ${VERSION}: the guided design loop (FEAT-018, CONTRACT-008)

Usage: ux-builder-design <command> [options] [--app <dir>] [--json]

  init [--mcp]
      put the guide in this app: the skill in .claude/skills/ux-builder-design/,
      an empty design state, a starting blueprint if there is none, and with
      --mcp a .mcp.json for the ux-builder MCP server. Refuses if a design
      state exists.
  status
      where the loop stands: activity, mode, chosen alternative, untested
      assumptions, open questions, checkpoints and the next action.
  state get [<path>]
      read the design state, or one field: activity, assumptions[0].status.
  state set <path> <json>
      write one field, checked against the schema. <path>[+] appends to a
      list: state set 'assumptions[+]' '{"text":"Location is available"}'.
  state checkpoint <id> (--answer <text> | --skip --reason <text>)
      record the person's answer at a checkpoint, or a skip and why, in the
      state and the trace. <id>: core-1, core-2, core-3, significant-change,
      experiment, release.
  mode full|change [--why <text>]
      the full loop, or change mode for an everyday change.
  baseline
      an existing app's first session: docs/ux/baseline.md from the blueprint,
      the HELIX stories and the latest assessment run, every drafted point
      marked current state, assumed.
  brief [--name <product>]
      write the experience brief (docs/ux/brief.md and brief.html) from the
      HELIX PRD and stories and the design state, and .ux-builder/principles.json.
  evidence add <file> --kind interview|analytics|support|survey|observation
               [--date YYYY-MM-DD] [--source <where it is kept>] [--title <t>]
      record a research source as docs/ux/evidence/EV-<n>.md: where it is kept,
      never its text; add the masked excerpts the synthesis cites.
  evidence list
      each source's ID, kind, date, source and excerpts cited.
  decision add --question <q> --option <o> --option <o>... --choice <o> --why <text>
               [--assumption <a>]... [--validation <how it will be tested>] [--link <HELIX ID>]...
      write docs/ux/decisions/UXD-<n>.md, status not-tested, and a decision in the trace.
  decision status <UXD-n> tested|refuted [--evidence <id>]
      update a decision's validation status, keeping the earlier one in its history.
  trace <id>
      everything linked to a job, task, journey, screen, decision, kit task or
      finding, upstream and down, each with its file.
  impact "<change>" [--apply --set <changed blueprint>]
      what a change in plain words reaches (and checkpointRequired when it
      touches something already tested); --apply makes it: the blueprint,
      prototypes and kits regenerated, HELIX only as proposals, a decision.
  test-kit [--journey <id>]...
      a usability test kit in docs/ux/tests/TK-<n>/ from the journeys.
  ready [--for testing|production]
      is the validated prototype ready? testing: lint, check:blueprint and the
      audit pass. production (default): also every criterion its journeys
      cover is cited by a test and nothing faked is left; then ask core-3.
      Exits 1 while anything is listed.
  rubric [--alternative <name>]
      the UX quality rubric for an alternative (default: the app's blueprint):
      each dimension's predicted value and its basis (computed, judgment, or
      to validate), observed where tested; never an overall score.
  validate
      check every document in docs/ux/: frontmatter, ID, place, sections,
      links and its type's rules. Exits 1 on a problem.

Options:
  --app <dir>   the app (default: the nearest folder above with .ux-builder/
                or app.blueprint.json, else the git root, else here)
  --json        print the result as JSON
  -h, --help    this help
`;

function print(result, json, text) {
  process.stdout.write(json ? JSON.stringify(result, null, 2) + "\n" : `${text}\n`);
}

function parseJson(text, what) {
  try { return JSON.parse(text); } catch {
    throw new DesignError(`${what} is not JSON: ${text}`);
  }
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { app: { type: "string" }, json: { type: "boolean" }, mcp: { type: "boolean" }, answer: { type: "string" }, skip: { type: "boolean" }, reason: { type: "string" }, why: { type: "string" }, name: { type: "string" }, kind: { type: "string" }, date: { type: "string" }, source: { type: "string" }, title: { type: "string" }, question: { type: "string" }, option: { type: "string", multiple: true }, choice: { type: "string" }, assumption: { type: "string", multiple: true }, validation: { type: "string" }, link: { type: "string", multiple: true }, evidence: { type: "string" }, alternative: { type: "string" }, for: { type: "string" }, apply: { type: "boolean" }, set: { type: "string" }, journey: { type: "string", multiple: true }, help: { type: "boolean", short: "h" } },
  });
  const [command, ...rest] = positionals;
  if (values.help || !command) { process.stdout.write(HELP); return 0; }

  if (command === "init") {
    // init works in the folder it is given (or this one): an existing app may have no .ux-builder/ yet.
    const r = init(resolve(values.app ?? "."), { mcp: values.mcp });
    print(r, values.json, [`Wrote ${r.written.join(", ")}.`, ...r.notes].join("\n"));
    return 0;
  }

  const app = values.app ? findApp(values.app) : findApp();

  if (command === "status") {
    const r = status(app);
    print(r, values.json, r.text);
    return 0;
  }
  if (command === "state") {
    const [sub, path, value] = rest;
    if (sub === "get") {
      const r = stateGet(app, { path });
      print(r, values.json, typeof r.value === "string" ? r.value : JSON.stringify(r.value, null, 2));
      return 0;
    }
    if (sub === "set") {
      if (!path || value === undefined) throw new DesignError("usage: state set <path> <json>");
      const r = stateSet(app, { path, value: parseJson(value, "the value") });
      print(r, values.json, `${path} set.`);
      return 0;
    }
    if (sub === "checkpoint") {
      const r = checkpoint(app, { id: path, answer: values.answer, skip: values.skip, reason: values.reason });
      print(r, values.json, `Checkpoint ${r.checkpoint.id} ${r.checkpoint.status}${r.trace ? ` (trace ${r.trace.episode})` : ""}.`);
      return 0;
    }
    throw new DesignError(`unknown state command "${sub ?? ""}": use get, set or checkpoint`);
  }
  if (command === "baseline") {
    const r = baseline(app);
    print(r, values.json, `Wrote ${r.written.join(", ")}: ${r.screens} screens, ${r.journeys} journeys, ${r.stories} stories, ${r.findings} open findings; drafted ${r.drafted.join(", ") || "nothing"} as current state, assumed.`);
    return 0;
  }
  if (command === "brief") {
    const r = brief(app, { name: values.name });
    print(r, values.json, [`Wrote ${r.written.join(", ")}.`, ...r.notes].join("\n"));
    return 0;
  }
  if (command === "trace") {
    const r = trace(app, { id: rest[0] });
    const line = (n) => `  ${n.kind.padEnd(15)} ${n.id}${n.label && n.label !== n.id ? `  ${n.label}` : ""}${n.file ? `  (${n.file})` : ""}`;
    print(r, values.json, [`${r.item.kind} ${r.item.id}`, "Upstream:", ...(r.upstream.length ? r.upstream.map(line) : ["  none"]), "Downstream:", ...(r.downstream.length ? r.downstream.map(line) : ["  none"])].join("\n"));
    return 0;
  }
  if (command === "impact") {
    if (values.apply) {
      const r = await applyImpact(app, { change: rest[0], set: values.set });
      print(r, values.json, r.summary);
      return r.applied ? 0 : 1;
    }
    const r = impact(app, { change: rest[0] });
    const line = (n) => `  ${n.kind.padEnd(15)} ${n.id}${n.file ? `  (${n.file})` : ""}`;
    print(r, values.json, [`Change: ${r.change}`, `Reaches ${r.affected.length} item${r.affected.length === 1 ? "" : "s"}:`, ...r.affected.map(line), ...(r.checkpointRequired ? [`Checkpoint ${r.checkpointRequired} needed: ${r.because}.`] : [])].join("\n"));
    return 0;
  }
  if (command === "test-kit") {
    const r = testKit(app, { journeys: values.journey ?? [] });
    print(r, values.json, `Wrote ${r.dir}/: ${r.tasks.length} task${r.tasks.length === 1 ? "" : "s"} (${r.tasks.map((t) => t.journey).join(", ")}).`);
    return 0;
  }
  if (command === "ready") {
    const r = ready(app, { for: values.for ?? "production" });
    print(r, values.json, readyText(r));
    return r.ready ? 0 : 1;
  }
  if (command === "rubric") {
    const r = rubric(app, { alternative: values.alternative });
    print(r, values.json, rubricText(r));
    return 0;
  }
  if (command === "decision") {
    const [sub, id, status] = rest;
    if (sub === "add") {
      const r = decisionAdd(app, { question: values.question, options: values.option, choice: values.choice, why: values.why, assumptions: values.assumption, validation: values.validation, links: values.link });
      print(r, values.json, `Wrote ${r.path} (${r.status}).`);
      return 0;
    }
    if (sub === "status") {
      const r = decisionStatus(app, { id, status, evidence: values.evidence });
      print(r, values.json, `${r.id} is ${r.status}${r.evidence ? ` (evidence ${r.evidence})` : ""}.`);
      return 0;
    }
    throw new DesignError(`unknown decision command "${sub ?? ""}": use add or status`);
  }
  if (command === "evidence") {
    const [sub, file] = rest;
    if (sub === "add") {
      const r = evidenceAdd(app, { file, kind: values.kind, date: values.date, source: values.source, title: values.title });
      print(r, values.json, `Wrote ${r.path} (${r.kind}). Add the excerpts the synthesis cites, masked, by pseudonym.`);
      return 0;
    }
    if (sub === "list") {
      const r = evidenceList(app);
      print(r, values.json, r.evidence.length ? r.evidence.map((e) => `${e.id}  ${e.kind}  ${e.date}  ${e.excerpts} excerpt${e.excerpts === 1 ? "" : "s"}  ${e.source}`).join("\n") : "No evidence yet.");
      return 0;
    }
    throw new DesignError(`unknown evidence command "${sub ?? ""}": use add or list`);
  }
  if (command === "validate") {
    const r = validate(app);
    const lines = [...r.problems.map((p) => `${p.path}: ${p.message}`), ...r.warnings.map((p) => `warning ${p.path}: ${p.message}`), ...r.notes.map((p) => `note    ${p.path}: ${p.message}`)];
    if (r.valid) lines.push(`docs/ux/: ${r.documents.length} document${r.documents.length === 1 ? "" : "s"}, no problems.`);
    print(r, values.json, lines.join("\n"));
    return r.valid ? 0 : 1;
  }
  if (command === "mode") {
    const r = setMode(app, { mode: rest[0], why: values.why });
    print(r, values.json, r.mode === "change" ? "Change mode: challenge, impact, complexity, decision." : "The full loop.");
    return 0;
  }
  throw new DesignError(`unknown command "${command}"; see ux-builder-design --help`);
}

main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
  if (e instanceof DesignError || e?.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
    process.stderr.write(`ux-builder-design: ${e.message}\n`);
    for (const d of e.details ?? []) process.stderr.write(`  ${d.path}: ${d.message}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`ux-builder-design: ${e.stack ?? e}\n`);
    process.exitCode = 1;
  }
});
