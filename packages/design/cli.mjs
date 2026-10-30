#!/usr/bin/env node
/* ux-builder-design (CONTRACT-008 Commands): the guided design loop's
   deterministic work, for the agent (through its shell) and for a person.
   Exit codes: 0 done; 1 a check failed; 2 bad input or a refusal. */

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { advance, carried, claimAdd, claimContradict, claimVerify, intake, logTurn, mapText, mark, metrics, metricsText, proposalsApply, proposalsPreview, reviewMap, reviewTable, confirmModality, migrate, bpFile, layout, ux, explain, explainText, overview, overviewText, pendingReviews, reviewApprove, reviewFeedback, reviewList, reviewRespond, reviewShow, setStep, excerptAdd, insights, diagnose, experimentStart, experimentEnd, observeImport, transcriptAdd, report, route, applyImpact, brief, checkpoint, impact, summaryOf, testKit, trace, ready, readyText, rubric, rubricText, decisionAdd, decisionStatus, principleAdd, needAdd, segmentAdd, taskAdd, evidenceAdd, evidenceList, DesignError, findApp, init, setMode, stateGet, stateSet, status, validate, VERSION } from "./index.mjs";

const HELP = `ux-builder-design ${VERSION}: the guided design loop (FEAT-018, CONTRACT-008)

Usage: ux-builder-design <command> [options] [--app <dir>] [--json]

  modality --answer <their words> --modality <list> [--size-classes <list>] [--frame <frame>]
      record which modalities (responsive-web, chat, hybrid-chat) and screen
      sizes the person says the app is for, in the blueprint's supports;
      wireframes and prototypes wait for it.
  migrate [--dry-run]
      move an app made before docs/ux-builder/ onto it: the design documents,
      the blueprint and alternatives, prototypes, proposals, comparisons and
      drawings, with git mv; and rewrite the app's references to them.
  overview
      the process in eight steps: what you do in each, what comes out, the
      terms it introduces and the checkpoint that closes it.
  step next|<n>
      move to the next (or the given) step; next refuses while items of the
      current step await review.
  explain [<term>] [--step <n>]
      what a term means and why it is valuable; --step: the terms a step
      introduces; with neither, every term.
  review [list]
      what awaits review, by tier: foundations (the brief, target users,
      jobs, stories, business rules, decisions), reviewed a table per kind;
      built items (tasks, journeys, alternatives, screens, kits), reviewed as
      the coverage map; records (evidence, reports, insights, experiments)
      need no approval. An approval holds through formatting and metadata
      changes; a change to the meaning shows as a diff.
  review table <kind>
      every item of a foundation kind, to show as one table, with what
      changed since it was approved.
  review map
      the coverage map: each job, its tasks, journeys and screens, and the
      exceptions to see one by one.
  review show <item>
      the item's content, to present inline in the conversation.
  review feedback <item> --text <their words>
      record the person's feedback on an item (FB-<n>).
  review respond <FB-n> --text <what changed>
      record how the feedback was addressed.
  review approve (<item>... | --kind <kind> | map [--accept <exception>]...)
               --answer <their words>
      record the person's approval of items as they are now, of a
      foundation kind's whole table, or of the coverage map (every built
      item awaiting review; refused while an exception is neither fixed nor
      accepted). Refused while feedback is open.
  intake
      the intake questions not yet answered, to ask together in one
      message, and what the app's sources already answer.
  advance --until-decision
      do the safe work (check the documents, keep approvals through
      formatting changes, work out the coverage map, find unverified claims
      and pending proposals) and stop at the one decision the person must
      make next, with a recommendation and what happens after it.
  metrics [turn --kind answer|decision|approval|correction|question|other [--text <note>] | mark prototype|testing|release]
      how the design spends the person's time, against the targets; turn
      records one human turn, mark a milestone. Kept in .ux-builder/metrics.jsonl.
  proposals [preview]
      every pending HELIX proposal in one line, with ID clashes flagged.
  proposals apply --accepted <ids> [--dry-run]
      apply the accepted proposals to HELIX, all or nothing: checked first,
      a clashing ID renumbered and its references rewritten.
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
  state checkpoint <id> (--answer <text> [--declined] | --skip --reason <text>)
      record the person's answer at a checkpoint (--declined when it is no or
      not yet: it never counts as passed), or a skip and why, in the
      state and the trace. <id>: core-1, core-2, core-3, significant-change,
      experiment, release.
  mode full|change [--why <text>]
      the full loop, or change mode for an everyday change.
  brief [--name <product>]
      write the experience brief (docs/ux-builder/brief.md and brief.html) from the
      HELIX PRD, principles.md, the stories and the design state.
  need add --need <need> --importance high|medium|low [--evidence <study>[,<study>]] [--confidence <c>] [--status assumed|validated|invalidated]
      propose a row of the PRD's User Needs (HELIX), named by what the user needs.
  segment add --user <who> --context <where, on what, with what expertise> [--need <need>]...
              [--evidence <study>] [--confidence <c>] [--status <s>]
      propose a row of the PRD's User Segments: a segment, never an invented person;
      its needs are User Needs rows, by name.
  task add --feature FEAT-<n> --task <what the person does> --goal <what they want>
           [--user <who>]... [--need <need>]... [--business-rule BR-<n>]... [--realized-by <journey>]...
      propose a row of the feature's Task Model; its key, the task's name as a
      slug, is what blueprint tasks and journeys use.
  principle add --text <principle> [--rule <json>]
      propose an experience principle for HELIX's principles.md; a rule a check
      can express ({"kind":"no-step-before","patterns":["SignIn"]}) goes in
      .ux-builder/principles.json for ux-builder-blueprint check.
  evidence add <file> --kind interview|analytics|support|feedback|survey|observation --study <name>
               [--date YYYY-MM-DD] [--source <where it is kept>] [--title <t>]
      propose a source for the study's HELIX research plan
      (docs/helix/01-frame/research/<study>.md, Research Methods > Sources):
      where it is kept, never its text.
  evidence list
      each study's sources, claims and excerpts.
  evidence claim add --study <name> --text <claim> --source <where> --basis observed|inferred[: …]
               --confidence high|medium|low [--direction "<supports|weakens|refutes>: <what>"] [--verified]
               [--contradicts <t>] [--unknown <t>]
      propose a claim for the study's Findings > Claims (HELIX's columns).
  evidence claim verify --study <name> --claim <its words> [--confidence <c>]
      the agent checked the claim against its source.
  evidence claim contradict --study <name> --claim <its words> --text <what the person said>
      what the person said goes against the claim: written in its
      Contradicting column and opened as a question for the person.
  evidence excerpt add --study <name> --participant <name or Pn> --text <quote> [--at <time>] [--source <which>]
      propose one quote the synthesis cites for the study's Findings > Excerpts:
      masked, by pseudonym (a name gets one, kept in .ux-builder/participants.local.json).
  decision add --question <q> --option <o> --option <o>... --choice <o> --why <text>
               [--assumption <a>]... [--validation <how it will be tested>] [--link <HELIX ID>]...
      propose a HELIX ADR (docs/helix/02-design/adr/ADR-<nnn>-<slug>.md, tagged area:ui)
      with its Validation not tested, and write a decision in the trace.
  decision status <ADR-nnn> tested|refuted [--evidence <where>]
      propose the ADR's new Validation result, keeping the earlier one in its history.
  trace <id>
      everything linked to a job, task, journey, screen, decision, kit task or
      finding, upstream and down, each with its file.
  impact "<change>" [--apply --set <changed blueprint>]
      what a change in plain words reaches (and checkpointRequired when it
      touches something already tested); --apply makes it: the blueprint,
      prototypes and kits regenerated, HELIX only as proposals, a decision.
  test-kit --study <name> [--journey <id>]...
      propose the study's scenarios, success criteria and screener for its
      research plan's Research Methods; write the facilitator script, consent
      note, observation sheet and task list to docs/ux-builder/runs/studies/<study>/
      (run output, gitignored).
  observe import <file> --study <name>
      import a filled observation sheet (CSV or JSON) as findings with
      source: human, one per participant and task, by pseudonym, remarks
      masked; into the study's run folder, findings.json.
  transcript add <file> --study <name> --session <id> --consent-confirmed [--by <name>] [--cite <time>]...
      propose the transcript as a source of the study and its cited lines as
      masked excerpts in its Findings, and record the consent in the design
      state. Refuses without --consent-confirmed, and refuses recordings.
  report
      write the UX evaluation, docs/ux-builder/runs/evaluations/<date>/report.md
      (run output): method, tasks, measures, the rubric (predicted,
      agent-measured, observed), findings by journey labelled human or agent,
      recommendations and what was not tested; and propose what people did as
      claims in each study's Findings. A contradicted prediction refutes its assumptions.
  route <F-id>... [--decision <ADR-nnn> --status tested|refuted]
      the findings the person chose at checkpoint core-3 as a proposed patch
      to HELIX's improvement backlog (docs/ux-builder/helix-proposals/backlog/); with
      --decision, the decision's proposed ADR Validation.
  insights <events.jsonl> [--support <file>] [--feedback <file>] [--date YYYY-MM-DD]
      production insights from the journey events the app exported: per
      journey, completion, where people abandon, failed searches, errors,
      feature use and time per step, in docs/ux-builder/runs/insights/<date>/
      (run output); each journey's funnel proposed into HELIX's metrics
      dashboard (Journey Funnels). Reads only the files it is given; fetches nothing.
  diagnose --insight <date> [--journey <id>] --observation <o> --explanation <e> --explanation <e>...
           --hypothesis <h> --alternative <name>
      record what an insight shows, at least two explanations, the
      hypothesis and the alternative that tests it; with --journey, propose it
      as that journey's funnel Diagnosis.
  experiment start --decision ADR-<nnn> --variant <alt> --metric <m> [--guardrail <m>]... --duration <days>
      after the person answers checkpoint experiment: a DDx bead with the hypothesis,
      the metrics and the stopping rule; metrics HELIX does not define are
      proposed in docs/ux-builder/helix-proposals/metrics/.
  experiment end <bead> --result <file>
      compare the success metric and each guardrail, close the bead with the
      result, propose the decision's ADR Validation, then ask checkpoint release.
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
      check every document in docs/ux-builder/: frontmatter, ID, place, sections,
      links and its type's rules. Exits 1 on a problem.

Options:
  --app <dir>   the app (default: the nearest folder above with .ux-builder/
                or a blueprint, else the git root, else here)
  --json        print the result as JSON
  -h, --help    this help
`;

function print(result, json, text) {
  process.stdout.write(json ? JSON.stringify(result, null, 2) + "\n" : `${text}\n`);
}

/* Items as lines, a prototype's pages grouped by screen: one line for its
   states and size classes, not one per page (--json keeps every page). */
function itemLines(items, { labels = false } = {}) {
  const out = [], pages = new Map();
  for (const n of items) {
    const m = n.kind === "prototype page" && /^((?:docs\/ux-builder\/prototypes|prototype)\/.+)\/([a-z0-9-]+)(?:\.[a-z-]+)?\.[a-z-]+\.html$/i.exec(n.file ?? "");
    if (!m) { out.push(`  ${n.kind.padEnd(15)} ${n.id}${labels && n.label && n.label !== n.id ? `  ${n.label}` : ""}${n.file ? `  (${n.file})` : ""}`); continue; }
    const key = `${m[1]}\u0000${m[2]}`;
    if (!pages.has(key)) { pages.set(key, 0); out.push(key); }
    pages.set(key, pages.get(key) + 1);
  }
  return out.map((l) => (pages.has(l) ? (([dir, screen]) => `  ${"prototype pages".padEnd(15)} ${screen}: ${pages.get(l)} page${pages.get(l) === 1 ? "" : "s"}  (${dir}/)`)(l.split("\u0000")) : l));
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
    options: { app: { type: "string" }, json: { type: "boolean" }, mcp: { type: "boolean" }, answer: { type: "string" }, skip: { type: "boolean" }, declined: { type: "boolean" }, reason: { type: "string" }, why: { type: "string" }, name: { type: "string" }, kind: { type: "string" }, date: { type: "string" }, source: { type: "string" }, title: { type: "string" }, question: { type: "string" }, option: { type: "string", multiple: true }, choice: { type: "string" }, assumption: { type: "string", multiple: true }, validation: { type: "string" }, link: { type: "string", multiple: true }, evidence: { type: "string" }, alternative: { type: "string" }, for: { type: "string" }, apply: { type: "boolean" }, set: { type: "string" }, journey: { type: "string", multiple: true }, session: { type: "string" }, "consent-confirmed": { type: "boolean" }, by: { type: "string" }, cite: { type: "string", multiple: true }, decision: { type: "string" }, status: { type: "string" }, support: { type: "string" }, feedback: { type: "string" }, insight: { type: "string" }, observation: { type: "string" }, explanation: { type: "string", multiple: true }, hypothesis: { type: "string" }, variant: { type: "string" }, metric: { type: "string" }, guardrail: { type: "string", multiple: true }, duration: { type: "string" }, result: { type: "string" }, participant: { type: "string" }, text: { type: "string" }, rule: { type: "string" }, user: { type: "string", multiple: true }, need: { type: "string", multiple: true }, importance: { type: "string" }, context: { type: "string" }, goal: { type: "string" }, feature: { type: "string" }, task: { type: "string" }, "business-rule": { type: "string", multiple: true }, "realized-by": { type: "string", multiple: true }, step: { type: "string" }, modality: { type: "string" }, "size-classes": { type: "string" }, frame: { type: "string" }, "dry-run": { type: "boolean" }, at: { type: "string" }, role: { type: "string" }, accept: { type: "string", multiple: true }, accepted: { type: "string", multiple: true }, "until-decision": { type: "boolean" }, basis: { type: "string" }, confidence: { type: "string" }, direction: { type: "string" }, study: { type: "string" }, claim: { type: "string" }, verified: { type: "boolean" }, contradicts: { type: "string" }, unknown: { type: "string" }, help: { type: "boolean", short: "h" } },
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

  if (command === "modality") {
    const r = confirmModality(app, { answer: values.answer, modalities: values.modality, sizeClasses: values["size-classes"], frame: values.frame });
    print(r, values.json, `Recorded: ${r.modalities.join(", ")}${r.sizeClasses.length ? ` at ${r.sizeClasses.join(", ")}` : ""}${r.frame ? `, in the ${r.frame} frame` : ""}, in ${r.file}. Wireframes and prototypes can be drawn now.`);
    return 0;
  }
  if (command === "migrate") {
    const r = migrate(app, { dryRun: values["dry-run"] });
    print(r, values.json, r.dryRun ? [`Would move (${r.git ? "git mv" : "move"}):`, ...r.moves.map((m) => `  ${m.from} → ${m.to}`), ...(r.updated.length ? [`Would update: ${r.updated.join(", ")}`] : [])].join("\n") : [r.message, ...r.moves.map((m) => `  ${m.from} → ${m.to}`)].join("\n"));
    return 0;
  }
  if (command === "overview") {
    const r = overview();
    print(r, values.json, overviewText(r));
    return 0;
  }
  if (command === "explain") {
    const r = explain({ term: rest.join(" ") || undefined, step: values.step });
    print(r, values.json, explainText(r));
    return 0;
  }
  if (command === "step") {
    const r = setStep(app, { to: rest[0], pending: (n) => pendingReviews(app, { steps: [n] }).map((p) => p.id) });
    print(r, values.json, `${r.text}.`);
    return 0;
  }
  if (command === "review") {
    const [sub = "list", ...targets] = rest;
    const target = targets[0];
    if (sub === "list") {
      const r = reviewList(app);
      const line = (p) => `  step ${p.step}  ${p.id}  ${p.title}${p.changed ? "  (changed since approved)" : ""}${p.feedback.length ? `  open feedback ${p.feedback.join(", ")}` : ""}`;
      const f = r.pending.filter((p) => p.tier === "foundation"), d = r.pending.filter((p) => p.tier === "derived");
      print(r, values.json, r.count ? [`Awaiting review (${r.count}):`, ...(f.length ? ["Foundations, a table per kind:", ...f.map(line)] : []), ...(d.length ? ["Built from them, as the coverage map:", ...d.map(line)] : []), r.next].join("\n") : r.next);
      return 0;
    }
    if (sub === "table") {
      const r = reviewTable(app, { kind: target });
      print(r, values.json, r.items.length ? r.items.flatMap((i) => [`${i.id}: ${i.title} (${i.status}; ${i.file})`, "", i.content, ...(i.diff ? ["", "Changed since approved:", i.diff] : []), ""]).join("\n") + (r.pending.length ? `${r.pending.length} awaiting review: ux-builder-design review approve --kind ${r.kind} --answer "<their words>"` : "All approved.") : `No ${r.kind} yet.`);
      return 0;
    }
    if (sub === "map") {
      const r = reviewMap(app);
      print(r, values.json, mapText(r));
      return 0;
    }
    if (sub === "show") {
      const r = reviewShow(app, { item: target });
      print(r, values.json, [`${r.id}: ${r.title} (step ${r.step}, ${r.status}; ${r.file})`, "", r.content, ...(r.diff ? ["", "Changed since approved:", r.diff] : []), ...(r.feedback.length ? ["", "Feedback:", ...r.feedback.map((f) => `  ${f.id} [${f.status}] ${f.text}${f.response ? ` → ${f.response}` : ""}`)] : [])].join("\n"));
      return 0;
    }
    if (sub === "feedback") {
      const r = reviewFeedback(app, { item: target, text: values.text });
      print(r, values.json, `${r.id} recorded on ${r.item}. Address it, then: ux-builder-design review respond ${r.id} --text "<what changed>".`);
      return 0;
    }
    if (sub === "respond") {
      const r = reviewRespond(app, { id: target, text: values.text });
      print(r, values.json, `${r.id} addressed. Show ${r.item} again and ask for approval.`);
      return 0;
    }
    if (sub === "approve") {
      const r = reviewApprove(app, { items: targets, kind: values.kind, answer: values.answer, accept: values.accept ?? [] });
      print(r, values.json, `${r.item === "map" ? `The coverage map approved: ${r.items.length} built item${r.items.length === 1 ? "" : "s"}${r.accepted.length ? `; accepted ${r.accepted.join(", ")}` : ""}` : `${r.items.join(", ")} approved`}. ${r.remaining ? `${r.remaining} item${r.remaining === 1 ? "" : "s"} left; next: ${r.next}.` : "Nothing else awaits review."}`);
      return 0;
    }
    throw new DesignError(`unknown review command "${sub}": use list, table, map, show, feedback, respond or approve`);
  }
  if (command === "intake") {
    const r = intake(app);
    print(r, values.json, r.text);
    return 0;
  }
  if (command === "advance") {
    if (!values["until-decision"]) throw new DesignError("advance runs until the next decision: ux-builder-design advance --until-decision");
    const r = advance(app);
    print(r, values.json, r.text);
    return 0;
  }
  if (command === "metrics") {
    const [sub, name] = rest;
    if (sub === "turn") { const r = logTurn(app, { kind: values.kind, note: values.text }); print(r, values.json, `Turn recorded: ${r.kind}.`); return 0; }
    if (sub === "mark") { const r = mark(app, { name }); print(r, values.json, `Milestone recorded: ${r.name}.`); return 0; }
    if (sub) throw new DesignError(`unknown metrics command "${sub}": use turn or mark, or nothing for the summary`);
    const r = metrics(app, { carried: carried(app) });
    print(r, values.json, metricsText(r));
    return 0;
  }
  if (command === "proposals") {
    const [sub = "preview"] = rest;
    if (sub === "preview") { const r = proposalsPreview(app); print(r, values.json, r.text); return 0; }
    if (sub === "apply") {
      const accepted = (values.accepted ?? []).flatMap((a) => a.split(",")).map((a) => a.trim()).filter(Boolean);
      if (!accepted.length) throw new DesignError("proposals apply needs --accepted <ids>: the proposals the person accepted");
      const r = proposalsApply(app, { accepted, dryRun: values["dry-run"] });
      print(r, values.json, r.text);
      return 0;
    }
    throw new DesignError(`unknown proposals command "${sub}": use preview or apply`);
  }
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
      print(r, values.json, r.id ? `${path} set: ${r.id}.` : `${path} set.`);
      return 0;
    }
    if (sub === "checkpoint") {
      const r = checkpoint(app, { id: path, answer: values.answer, skip: values.skip, declined: values.declined, reason: values.reason });
      print(r, values.json, `Checkpoint ${r.checkpoint.id} ${r.checkpoint.status}${r.trace ? ` (trace ${r.trace.episode})` : ""}.${r.moved ? `\nNow ${r.activity}${r.step ? `, step ${r.step}` : ""}. Next: ${r.next}` : ""}`);
      return 0;
    }
    throw new DesignError(`unknown state command "${sub ?? ""}": use get, set or checkpoint`);
  }
  if (command === "baseline") throw new DesignError("baseline is retired (ADR-042): for an existing app, HELIX's backfill drafts the PRD and stories from the app, as proposals; draw the blueprint from its screens (ux-builder-blueprint), then route what the person wants to improve");

  if (command === "brief") {
    const r = brief(app, { name: values.name });
    print(r, values.json, [`Wrote ${r.written.join(", ")}.`, ...r.notes].join("\n"));
    return 0;
  }
  if (command === "trace") {
    const r = trace(app, { id: rest[0] });
    print(r, values.json, [`${r.item.kind} ${r.item.id}`, "Upstream:", ...(r.upstream.length ? itemLines(r.upstream, { labels: true }) : ["  none"]), "Downstream:", ...(r.downstream.length ? itemLines(r.downstream, { labels: true }) : ["  none"])].join("\n"));
    return 0;
  }
  if (command === "impact") {
    if (values.apply) {
      const r = await applyImpact(app, { change: rest[0], set: values.set });
      print(r, values.json, r.summary);
      return r.applied ? 0 : 1;
    }
    const r = impact(app, { change: rest[0] });
    print(r, values.json, [`Change: ${r.change}`, `Reaches ${r.affected.length} item${r.affected.length === 1 ? "" : "s"}:`, ...itemLines(r.affected), ...(r.checkpointRequired ? [`Checkpoint ${r.checkpointRequired} needed: ${r.because}.`] : [])].join("\n"));
    return 0;
  }
  if (command === "test-kit") {
    const r = testKit(app, { study: values.study, journeys: values.journey ?? [] });
    print(r, values.json, [`Proposed the ${r.study} study's scenarios, success criteria and screener for ${r.path}; wrote ${r.run}/: ${r.tasks.length} task${r.tasks.length === 1 ? "" : "s"} (${r.tasks.map((t) => t.journey).join(", ")}).`, ...r.warnings.map((w) => `warning: ${w}`)].join("\n"));
    return 0;
  }
  if (command === "observe") {
    const [sub, file] = rest;
    if (sub !== "import") throw new DesignError(`unknown observe command "${sub ?? ""}": use import`);
    const r = observeImport(app, { file, study: values.study });
    print(r, values.json, [`Imported ${r.imported} observation${r.imported === 1 ? "" : "s"} into ${r.path} (${r.sessions.join(", ") || "no sessions"}).`, ...(r.rewritten ? [`Rewrote ${r.rewritten} with pseudonyms; the real names are only in .ux-builder/participants.local.json, kept out of git.`] : []), ...r.skipped.map((x) => `skipped row ${x.row}: ${x.reason}`)].join("\n"));
    return 0;
  }
  if (command === "transcript") {
    const [sub, file] = rest;
    if (sub !== "add") throw new DesignError(`unknown transcript command "${sub ?? ""}": use add`);
    const r = transcriptAdd(app, { file, study: values.study, session: values.session, consentConfirmed: values["consent-confirmed"], by: values.by, cite: values.cite ?? [], date: values.date });
    print(r, values.json, `Proposed for ${r.path}: ${r.excerpts} cited excerpt${r.excerpts === 1 ? "" : "s"} from session ${r.session}, masked; consent recorded.${r.excerpts ? "" : " Cite the lines the synthesis relies on with --cite <time>."}`);
    return 0;
  }
  if (command === "report") {
    const r = report(app);
    print(r, values.json, [`Wrote ${r.path} (${r.approach}${r.follows ? `, follows the ${r.follows} evaluation` : ""}).`, ...r.claims.map((c) => `Proposed what people did as claims for ${c.path}.`), r.observed ? null : "No human evidence yet: the observed column says so.", ...r.contradicted.map((d) => `Contradicted: ${d}`), ...r.assumptions.map((a) => `${a.id}: ${a.from} → ${a.to}`)].filter(Boolean).join("\n"));
    return 0;
  }
  if (command === "route") {
    const r = route(app, { findings: rest, decision: values.decision, status: values.status });
    print(r, values.json, [`Wrote ${r.patch}: ${r.findings.join(", ")} for ${r.target.path} (${r.target.kind}). Apply it through HELIX.`, ...(r.decision ? [`Proposed ${r.decision.id}'s Validation: ${r.decision.status}.`] : [])].join("\n"));
    return 0;
  }
  if (command === "insights") {
    const r = insights(app, { events: rest[0], support: values.support, feedback: values.feedback, date: values.date });
    const pct = (j) => (j.started ? `${Math.round((j.completed / j.started) * 100)}%` : "–");
    print(r, values.json, [`Wrote ${r.path}: ${r.events} events.`, ...r.journeys.map((j) => `  ${j.journey}: ${j.completed} of ${j.started} completed (${pct(j)}), ${j.failedSearches} failed searches`), ...r.unmatched.map((u) => `  unmatched: ${u.journey} (${u.events} event${u.events === 1 ? "" : "s"}; not in the blueprint)`), `Proposed the journey funnels for ${r.dashboard}.`].join("\n"));
    return 0;
  }
  if (command === "diagnose") {
    const r = diagnose(app, { insight: values.insight, journey: values.journey?.[0], observation: values.observation, explanations: values.explanation, hypothesis: values.hypothesis, alternative: values.alternative });
    print(r, values.json, `Diagnosis recorded on the ${r.insight} insights: ${r.explanations.length} explanations; tests ${r.alternative}.`);
    return 0;
  }
  if (command === "experiment") {
    const [sub, id] = rest;
    if (sub === "start") {
      const r = experimentStart(app, { decision: values.decision, variant: values.variant, metric: values.metric, guardrails: values.guardrail, duration: values.duration });
      print(r, values.json, [`Started ${r.bead} (DDx): ${r.variant} for ${r.decision}, ${r.duration} days, running.`, ...r.proposed.map((p) => `Proposed a metric definition: ${p}`)].join("\n"));
      return 0;
    }
    if (sub === "end") {
      const r = experimentEnd(app, { id, result: values.result });
      print(r, values.json, [`${r.id} ended and closed: ${r.metric} ${r.control} → ${r.variant}; hypothesis ${r.hypothesis}.`, ...(r.decision ? [`Proposed ${r.decision.id}'s Validation: ${r.decision.status}.`] : []), r.next].join("\n"));
      return 0;
    }
    throw new DesignError(`unknown experiment command "${sub ?? ""}": use start or end`);
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
  if (command === "need" || command === "segment" || command === "task") {
    if (rest[0] !== "add") throw new DesignError(`unknown ${command} command "${rest[0] ?? ""}": use add`);
    const evidence = String(values.evidence ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    if (command === "need") {
      const r = needAdd(app, { need: values.need?.[0], importance: values.importance, evidence, confidence: values.confidence, status: values.status });
      print(r, values.json, `Proposed the need "${r.need}" (${r.status}) for ${r.path}, User Needs.`);
    } else if (command === "segment") {
      const r = segmentAdd(app, { user: values.user?.[0], context: values.context, needs: values.need, evidence, confidence: values.confidence, status: values.status });
      print(r, values.json, `Proposed the user "${r.user}" (${r.status}) for ${r.path}, User Segments.`);
    } else {
      const r = taskAdd(app, { feature: values.feature, task: values.task, goal: values.goal, users: values.user, needs: values.need, rules: values["business-rule"], realizedBy: values["realized-by"] });
      print(r, values.json, `Proposed the task "${r.task}" for ${r.feature}'s Task Model (${r.path}); journeys name it by its key, ${r.key}.`);
    }
    return 0;
  }
  if (command === "principle") {
    if (rest[0] !== "add") throw new DesignError(`unknown principle command "${rest[0] ?? ""}": use add`);
    const r = principleAdd(app, { text: values.text, rule: values.rule });
    print(r, values.json, `Proposed "${r.text}" for ${r.path} (Experience Principles)${r.checked ? `; ux-builder-blueprint check applies its ${r.checked.kind} rule` : ""}.`);
    return 0;
  }
  if (command === "decision") {
    const [sub, id, status] = rest;
    if (sub === "add") {
      const r = decisionAdd(app, { question: values.question, options: values.option, choice: values.choice, why: values.why, assumptions: values.assumption, validation: values.validation, links: values.link });
      print(r, values.json, `Proposed ${r.id} (${r.path}), not tested. Show the person: ux-builder-design proposals.`);
      return 0;
    }
    if (sub === "status") {
      const r = decisionStatus(app, { id, status, evidence: values.evidence });
      print(r, values.json, `Proposed ${r.id}'s Validation: ${r.status}${r.evidence ? ` (${r.evidence})` : ""}.`);
      return 0;
    }
    throw new DesignError(`unknown decision command "${sub ?? ""}": use add or status`);
  }
  if (command === "evidence") {
    const [sub, file] = rest;
    if (sub === "add") {
      const r = evidenceAdd(app, { file, kind: values.kind, study: values.study, date: values.date, source: values.source, title: values.title });
      print(r, values.json, `Proposed "${r.source}" (${r.kind}) as a source of the ${r.study} study, ${r.path}. Add the excerpts and claims the synthesis cites.`);
      return 0;
    }
    if (sub === "list") {
      const r = evidenceList(app);
      print(r, values.json, r.studies.length ? r.studies.map((x) => `${x.study}${x.proposed ? " (proposed)" : ""}  ${x.sources.length} source${x.sources.length === 1 ? "" : "s"}, ${x.claims} claim${x.claims === 1 ? "" : "s"}, ${x.excerpts} excerpt${x.excerpts === 1 ? "" : "s"}  ${x.path}`).join("\n") : "No studies yet.");
      return 0;
    }
    if (sub === "claim") {
      const [, op] = rest;
      if (op === "add") {
        const r = claimAdd(app, { study: values.study, text: values.text, source: values.source, basis: values.basis, confidence: values.confidence, direction: values.direction, verified: values.verified, contradicts: values.contradicts, unknown: values.unknown });
        print(r, values.json, [`Proposed the claim for ${r.path}.`, ...r.warnings.map((w) => `warning: ${w}`)].join("\n"));
        return 0;
      }
      if (op === "verify") {
        const r = claimVerify(app, { study: values.study, claim: values.claim, confidence: values.confidence });
        print(r, values.json, `"${r.claim}" checked against its source (${r.confidence} confidence).`);
        return 0;
      }
      if (op === "contradict") {
        const r = claimContradict(app, { study: values.study, claim: values.claim, text: values.text });
        print(r, values.json, `"${r.claim}" is contradicted by what the person said; asked: ${r.question.text}`);
        return 0;
      }
      throw new DesignError(`unknown evidence claim command "${op ?? ""}": use add, verify or contradict`);
    }
    if (sub === "excerpt") {
      const [, op] = rest;
      if (op !== "add") throw new DesignError(`unknown evidence excerpt command "${op ?? ""}": use add`);
      const r = excerptAdd(app, { study: values.study, participant: values.participant, text: values.text, at: values.at, source: values.source });
      print(r, values.json, `Proposed for ${r.path}: ${r.excerpt}`);
      return 0;
    }
    throw new DesignError(`unknown evidence command "${sub ?? ""}": use add, list, claim add|verify|contradict or excerpt add`);
  }
  if (command === "validate") {
    const r = validate(app);
    const lines = [...r.problems.map((p) => `${p.path}: ${p.message}`), ...r.warnings.map((p) => `warning ${p.path}: ${p.message}`), ...r.notes.map((p) => `note    ${p.path}: ${p.message}`)];
    if (r.valid) lines.push(`${ux(app)}/: ${r.documents.length} document${r.documents.length === 1 ? "" : "s"}, no problems.`);
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
