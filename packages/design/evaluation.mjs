/* The UX evaluation report and routing its findings (CONTRACT-008
   Commands, FEAT-018 GDL-59 to GDL-61; SD-006 Report). report() writes
   docs/ux/evaluations/UER-<n>.md from the design state, the rubric (its
   predicted column, the latest assessment run's agent-measured metrics, and
   the test kits' human observations), and the findings by journey, each
   labelled a human observation or an agent recommendation. Where an
   observation contradicts a prediction, the assumptions behind it become
   refuted; with no human evidence nothing is confirmed or refuted.
   route() writes the findings the person selects at checkpoint core-3 as a
   proposed patch to HELIX's improvement backlog, and can move a decision
   record to tested or refuted. */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DesignError, writeInApp } from "./app.mjs";
import { decisionStatus } from "./decisions.mjs";
import { businessRules, helixRoot, parseDocument, ruleCitations, usersTable } from "./documents.mjs";
import { rubric } from "./rubric.mjs";
import { humanFindings, kitTranscripts, observedMeasures } from "./sessions.mjs";
import { readState, writeState } from "./state.mjs";
import { kits } from "./testkit.mjs";

const DIR = "docs/ux/evaluations";
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const list = (x) => (Array.isArray(x) ? x : []);
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
const pct = (r) => (r == null ? "–" : `${Math.round(r * 100)}%`);
const SEVERITY_OF_PRIORITY = { P0: 4, P1: 3, P2: 2, P3: 1 };

function numbers(app) {
  const dir = join(app, DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map((n) => n.match(/^UER-([1-9][0-9]*)\.md$/)?.[1]).filter(Boolean).map(Number);
}

/* The latest assessment run: { id, dir, metrics, backlog, coverage } or null. */
function latestRun(app) {
  const root = join(app, "ux-assessment");
  if (!existsSync(root)) return null;
  const id = readdirSync(root).filter((n) => /^R-/.test(n)).sort().at(-1);
  if (!id) return null;
  const dir = join(root, id);
  return { id, dir: `ux-assessment/${id}`, metrics: readJson(join(dir, "metrics.json")), backlog: readJson(join(dir, "backlog.json")), coverage: readJson(join(dir, "coverage.json")) };
}

/* Every finding the evaluation reports: human observations from the kits,
   agent recommendations from the latest run. Each with its origin label. */
export function evaluationFindings(app, run = latestRun(app)) {
  // A person's transcript from the same kit is evidence beside their row of the sheet.
  const transcripts = kitTranscripts(app);
  const quotes = (f) => transcripts.filter((t) => t.kit === f.kit && t.participants.includes(f.participant)).map((t) => t.id);
  const human = humanFindings(app).filter((f) => f.severity > 0 || f.problem).map((f) => ({
    id: f.id, source: "human", label: "human observation", journey: f.journey, severity: f.severity, title: f.title,
    evidence: `${f.kit} task ${f.task}, ${f.participant} (docs/ux/tests/${f.kit}/findings.json)${quotes(f).length ? `; transcript ${quotes(f).join(", ")}` : ""}`, transcripts: quotes(f), fix: null,
    detail: `${f.completed ? "completed" : "did not complete"}${f.seconds != null ? ` in ${f.seconds} s` : ""}, ${f.errors} error${f.errors === 1 ? "" : "s"}, ${f.assists} assist${f.assists === 1 ? "" : "s"}${f.remark ? `; "${f.remark}"` : ""}`,
  }));
  const agent = list(run?.backlog?.findings).filter((f) => f.status !== "rejected").map((f) => {
    // A finding from the assessment is an agent recommendation unless it says a person found it.
    const source = f.source ?? "agent";
    return {
      id: f.id, source, label: source === "human" ? "human observation" : source === "design-team" ? "design-team note" : "agent recommendation",
      journey: f.journey_id, severity: f.severity ?? SEVERITY_OF_PRIORITY[f.priority] ?? 2, title: f.title,
      evidence: list(f.evidence_refs).length ? list(f.evidence_refs).map((r) => `${run.dir}/${r}`).join(", ") : `none (${f.uncertainty ?? "uncertain"})`, fix: f.recommendation ?? null, detail: null,
    };
  });
  return [...human, ...agent].sort((a, b) => String(a.journey).localeCompare(String(b.journey)) || b.severity - a.severity || (a.id < b.id ? -1 : 1));
}

/* What the agent measured, per rubric dimension, from the run's metrics.json. */
function agentMeasured(metrics) {
  const js = list(metrics?.journeys);
  if (!js.length) return {};
  const done = js.filter((j) => j.completed).length;
  const extra = js.reduce((a, j) => a + (j.extraInteractions ?? 0), 0);
  const notFound = js.reduce((a, j) => a + list(j.informationNotFound).length, 0);
  const errors = js.reduce((a, j) => a + list(j.interfaceErrors).length, 0);
  return {
    "task-effectiveness": `${done} of ${js.length} journeys completed by the agent`,
    "task-efficiency": `${extra} move${extra === 1 ? "" : "s"} over the shortest paths; ${js.reduce((a, j) => a + j.backtracks, 0)} backtracks`,
    discoverability: `${notFound} piece${notFound === 1 ? "" : "s"} of information not found`,
    "error-recovery": `${errors} interface error${errors === 1 ? "" : "s"} met`,
  };
}

/* ux-builder-design report: write docs/ux/evaluations/UER-<n>.md. */
export function report(app) {
  let state = null;
  try { state = readState(app); } catch { /* no design state: nothing to update */ }
  const chosen = list(state?.alternatives).find((a) => a.status === "chosen") ?? null;
  const alt = chosen && existsSync(join(app, `app.blueprint.${chosen.name}.json`)) ? chosen.name : undefined;
  const r = rubric(app, { alternative: alt });
  const run = latestRun(app);
  const measured = agentMeasured(run?.metrics);
  const humans = humanFindings(app);
  const observedAny = humans.length > 0;
  const m = observedAny ? observedMeasures(app) : null;
  const bp = readJson(join(app, alt ? `app.blueprint.${alt}.json` : "app.blueprint.json")) ?? {};
  const n = Math.max(0, ...numbers(app)) + 1;
  const id = `UER-${n}`;
  const earlier = numbers(app).sort((a, b) => a - b).map((x) => `UER-${x}`);
  const allKits = kits(app);
  const findings = evaluationFindings(app, run);

  // Contradicted predictions refute the assumptions behind them; supported ones confirm them.
  const contradicted = r.dimensions.filter((d) => d.observed?.verdict === "contradicts").map((d) => d.id);
  const supported = r.dimensions.filter((d) => d.observed?.verdict === "supports").map((d) => d.id);
  const changed = [];
  if (state && observedAny) {
    for (const a of list(state.assumptions)) {
      const to = contradicted.includes(a.dimension) ? "refuted" : supported.includes(a.dimension) && a.status !== "refuted" ? "confirmed" : null;
      if (to && a.status !== to) { changed.push({ id: a.id, from: a.status, to, dimension: a.dimension }); a.status = to; a.evidence = [...new Set([...list(a.evidence), id, ...m.kits])]; }
    }
    if (changed.length) writeState(app, state);
  }

  const journeys = [...new Set([...list(bp.journeys).map((j) => j.id), ...findings.map((f) => f.journey)].filter(Boolean))];
  const kitTasks = allKits.flatMap((k) => {
    const file = join(app, "docs/ux/tests", k, "scenarios.md");
    return existsSync(file) ? readFileSync(file, "utf8").split("\n").map((l) => /^\|\s*(\d+)\s*\|\s*(J-[^|\s]+)\s*\|[^|]*\|\s*([^|]*)\|/.exec(l)).filter(Boolean).map((x) => ({ kit: k, n: Number(x[1]), journey: x[2], criteria: x[3].trim() })) : [];
  });
  const tested = new Set(humans.map((f) => f.journey));
  const walked = new Set(list(run?.metrics?.journeys).map((j) => j.blueprint ?? j.journey));
  const approach = observedAny && run ? "mixed" : observedAny ? "moderated" : run ? "automated-assessment" : "expert-review";

  const L = [];
  const links = [...earlier.slice(-1).map((to) => ["follows", to]), ...allKits.map((to) => ["informed_by", to])];
  L.push("---", "ux:", `  id: ${id}`, "  type: usability-evaluation-report", ...(links.length ? ["  links:", ...links.flatMap(([kind, to]) => [`    - kind: ${kind}`, `      to: ${to}`])] : ["  links: []"]), "---", "");
  L.push(`# ${id}: ${bp.name ?? "app"} evaluation`, "");
  const top = findings.filter((f) => f.severity >= 2).slice(0, 5);
  L.push("## Executive summary", "", `- **Evaluated**: ${journeys.join(", ") || "no journeys"}${alt ? ` (alternative ${alt})` : ""}`, `- **Top findings**: ${top.length ? top.map((f) => `${f.id} (${f.label}, severity ${f.severity})`).join(", ") : "none at severity 2 or above"}`);
  if (contradicted.length) L.push(`- **Contradicted predictions**: ${contradicted.join(", ")}`);
  if (earlier.length) L.push(`- **Follows**: ${earlier.at(-1)}`);
  L.push("", "## Product and goals", "", `- ${bp.name ?? "The app"}: ${list(bp.tasks).map((t) => `${t.id} ${t.goal}`).join("; ") || "the blueprint's journeys"}`, "");
  L.push("## Method", "", `- **Approach**: ${approach}`, `- **Sources**: ${[observedAny ? `${m.sessions} test session${m.sessions === 1 ? "" : "s"} (${m.kits.join(", ")})` : null, run ? `assessment run ${run.id}` : null, "the rubric's predictions"].filter(Boolean).join("; ")}`,
    `- **Limits**: ${observedAny ? "a small number of sessions shows problems, not their frequency in the whole audience" : "no people were observed; nothing here is a verified human observation"}${run ? "; agent-measured metrics show where a journey asks for more than it needs, not how people will do (agents navigate differently from people)" : ""}`, "");
  L.push("## Tasks and journeys", "", "| Task | Journey | Stories / ACs |", "|---|---|---|", ...(kitTasks.length ? kitTasks.map((t) => `| ${t.kit} task ${t.n} | ${t.journey} | ${cell(t.criteria)} |`) : list(bp.journeys).map((j) => `| none (not tested with people) | ${j.id} | ${cell([j.story, ...list(j.criteria)].filter(Boolean).join(", "))} |`)), "");
  L.push("## Measures", "", "| Measure | Result |", "|---|---|");
  if (m) for (const t of m.tasks) L.push(`| ${t.kit} task ${t.task} (${t.journey}) | ${pct(t.completionRate)} completed, median ${t.medianSeconds ?? "–"} s, ${pct(t.errorRate)} with errors, ${t.assists} assist${t.assists === 1 ? "" : "s"} (${t.sessions} sessions) |`);
  else L.push("| Human measures | No human evidence yet |");
  for (const j of list(run?.metrics?.journeys)) L.push(`| ${j.journey} (agent-measured) | ${j.completed ? "completed" : `stopped at step ${j.stoppedAt?.n}`}, ${j.moves} moves against a shortest ${j.shortestPath ?? "unknown"}, ${j.backtracks} backtracks |`);
  // By target user (GDL-77), when the observation sheet recorded the user each participant matched.
  if (m?.byUser.length) {
    const users = usersTable(app) ?? {};
    L.push("", "By target user:", "", "| User | Attempts | Completed | Median time | With errors | Assists |", "|---|---|---|---|---|---|",
      ...m.byUser.map((u) => `| ${u.user ? `${u.user}${users[u.user] ? ` ${cell(users[u.user].user)}` : ""}` : "not recorded"} | ${u.attempts} (${u.sessions} sessions) | ${pct(u.completionRate)} | ${u.medianSeconds ?? "–"} s | ${pct(u.errorRate)} | ${u.assists} |`));
  }
  if (m?.recurring.length) L.push("", "Problems seen in two or more sessions:", "", ...m.recurring.map((p) => `- ${p.problem} (${p.sessions} sessions; ${p.findings.join(", ")})`));
  L.push("");
  L.push("## Rubric", "", "| Dimension | Predicted | Agent-measured | Observed |", "|---|---|---|---|");
  for (const d of r.dimensions) {
    const obs = d.observed ? `${d.observed.value}${d.observed.verdict === "contradicts" ? " — **contradicts the prediction**" : ""}` : observedAny ? "not observed" : "no human evidence yet";
    const name = d.observed?.verdict === "contradicts" ? `**${d.name}**` : d.name;
    L.push(`| ${name}${d.baseline ? " (baseline)" : ""} | ${cell(d.predicted.value)} (${d.predicted.basis}) | ${cell(measured[d.id] ?? "–")} | ${cell(obs)} |`);
  }
  L.push("", r.recommendable ? `No baseline fails${r.unchecked?.length ? `; not checked yet: ${r.unchecked.join(", ")}` : ""}; no overall score is given.` : `Not recommendable: ${r.notRecommendable}.`);
  if (changed.length) L.push("", "Assumptions updated from what people did:", "", ...changed.map((c) => `- ${c.id} (${c.dimension}): ${c.from} → ${c.to}`));
  L.push("");
  L.push("## Findings by journey", "");
  if (!findings.length) L.push("No findings.", "");
  for (const j of [...new Set(findings.map((f) => f.journey ?? "no journey"))]) {
    L.push(`### ${j}`, "");
    for (const f of findings.filter((x) => (x.journey ?? "no journey") === j)) L.push(`- **${f.id}** (${f.label}) Severity ${f.severity}: ${f.title}${f.detail ? ` (${f.detail})` : ""}. Evidence: ${f.evidence}.${f.fix ? ` Fix: ${f.fix}` : ""}`);
    L.push("");
  }
  L.push("## State coverage", "", "| Journey | Empty | Loading | Error |", "|---|---|---|---|");
  const cov = list(run?.coverage?.entries);
  const stateOf = (j, s) => { const e = cov.find((x) => x.journey === j && new RegExp(s, "i").test(x.state)); return e ? e.status : "not tested"; };
  for (const j of list(bp.journeys)) L.push(`| ${j.id} | ${stateOf(j.id, "empty")} | ${stateOf(j.id, "loading")} | ${stateOf(j.id, "error")} |`);
  L.push("");
  // Business rules (GDL-78): how people fared where each cited rule applied, from the kits' rule tasks.
  const cited = [...new Set(ruleCitations(bp).map((c) => c.rule))];
  const defined = businessRules(app).rules;
  const ruleRows = cited.map((id) => {
    const ts = kitTasks.filter((t) => t.criteria.split(/,\s*/).includes(id));
    const fs = humans.filter((f) => ts.some((t) => t.kit === f.kit && t.n === f.task));
    return { id, text: defined[id]?.text ?? "not defined in HELIX", ts, fs };
  });
  if (cited.length) {
    L.push("## Business rules", "", "| Rule | Kit tasks | Completed | Problems seen |", "|---|---|---|---|");
    for (const r of ruleRows) L.push(`| ${r.id}: ${cell(r.text)} | ${r.ts.map((t) => `${t.kit} task ${t.n}`).join(", ") || "none"} | ${r.fs.length ? `${r.fs.filter((f) => f.completed).length} of ${r.fs.length}` : "not tested"} | ${cell([...new Set(r.fs.map((f) => f.problem).filter(Boolean))].join("; ") || "none")} |`);
    L.push("");
  }
  L.push("## Recommendations", "");
  const recs = findings.filter((f) => f.severity >= 2);
  L.push(...(recs.length ? recs.map((f, i) => `${i + 1}. ${f.fix ?? `Correct: ${f.title}`} (${f.id}, ${f.label}). Route it at checkpoint core-3: \`ux-builder-design route ${f.id}\`.`) : ["1. None at severity 2 or above."]), "");
  L.push("## Not tested", "");
  const untested = [
    ...list(bp.journeys).filter((j) => !tested.has(j.id)).map((j) => `- ${j.id}: not tested with people${walked.has(j.id) ? " (walked by the agent only)" : ""}`),
    ...r.dimensions.filter((d) => !d.observed).map((d) => `- ${d.name}: no human observation${d.predicted.basis === "to validate" ? "; nothing predicted either" : ""}`),
    ...ruleRows.filter((x) => !x.fs.length).map((x) => `- ${x.id}: no one met this business rule in a test${x.ts.length ? "" : " (no kit task for it)"}`),
  ];
  L.push(...(untested.length ? untested : ["- Everything planned was tested."]), "");
  const path = writeInApp(app, `${DIR}/${id}.md`, L.join("\n"));
  return { id, path, follows: earlier.at(-1) ?? null, approach, contradicted, assumptions: changed, observed: observedAny, findings: findings.map((f) => ({ id: f.id, source: f.source, severity: f.severity })) };
}

const TABLE_HEAD = ["| Rank | Priority | Item | Evidence | Tracker or Follow-Up Target | Why Now | Confidence | Effort | Status |", "|------|----------|------|----------|-----------------------------|---------|------------|--------|--------|"];
const PRIORITY = (s) => (s >= 4 ? "P0" : s === 3 ? "P1" : s === 2 ? "P2" : "P3");

function unifiedDiff(path, before, after) {
  const d = mkdtempSync(join(tmpdir(), "route-"));
  try {
    writeFileSync(join(d, "a"), before ?? ""); writeFileSync(join(d, "b"), after);
    const out = spawnSync("diff", ["-u", before == null ? "/dev/null" : join(d, "a"), join(d, "b")], { encoding: "utf8" }).stdout;
    return out.replace(/^--- .*$/m, `--- ${before == null ? "/dev/null" : `a/${path}`}`).replace(/^\+\+\+ .*$/m, `+++ b/${path}`);
  } finally { rmSync(d, { recursive: true, force: true }); }
}

/* HELIX's improvement backlog: { path, text } of the existing one, or where a new one goes. */
function backlogDoc(app) {
  const root = helixRoot(app);
  if (!root) throw new DesignError("the app has no HELIX (.helix.yml): there is no improvement backlog to route findings to");
  const walk = (dir) => (existsSync(join(app, dir)) ? readdirSync(join(app, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir.replace(/\/$/, "")}/${e.name}`) : e.name.endsWith(".md") ? [`${dir.replace(/\/$/, "")}/${e.name}`] : [])) : []);
  for (const p of walk(root)) {
    const text = readFileSync(join(app, p), "utf8");
    if (parseDocument(text).front?.ddx?.type === "improvement-backlog") return { path: p, text };
  }
  return { path: `${root.replace(/\/$/, "")}/06-iterate/improvement-backlog.md`, text: null };
}

/* ux-builder-design route <F-id>... [--decision <UXD-n> --status tested|refuted]. */
export function route(app, { findings: ids = [], decision, status } = {}) {
  if (!ids.length) throw new DesignError("route needs the findings the person selected at checkpoint core-3: route F-<id>...");
  if (decision && !status) throw new DesignError("--decision needs --status tested or refuted");
  const all = evaluationFindings(app);
  const unknown = ids.filter((x) => !all.some((f) => f.id === x));
  if (unknown.length) throw new DesignError(`no finding ${unknown.join(", ")} in the test kits or the latest assessment run`);
  const chosen = ids.map((x) => all.find((f) => f.id === x));
  const uer = numbers(app).sort((a, b) => a - b).map((x) => `UER-${x}`).at(-1) ?? null;
  const doc = backlogDoc(app);
  const row = (f, rank) => `| ${rank} | ${PRIORITY(f.severity)} | ${cell(f.title)} | ${cell(f.evidence)} | ${cell(`${f.id}${uer ? ` in ${uer}` : ""}`)} | ${cell(`${f.journey ?? "no journey"}; ${f.label}`)} | ${f.source === "human" ? "high" : "medium"} | unknown | open |`;
  let after;
  if (doc.text) {
    const lines = doc.text.replace(/\n*$/, "").split("\n");
    const fresh = chosen.filter((f) => !doc.text.includes(f.id));
    const h = lines.findIndex((l) => /^#{2,3}\s+Backlog Items\b/i.test(l));
    let end = -1;
    if (h >= 0) for (let i = h + 1; i < lines.length && !/^#{1,3}\s/.test(lines[i]); i++) if (/^\|/.test(lines[i])) end = i;
    const ranks = h >= 0 && end > h ? lines.slice(h + 1, end + 1).map((l) => Number(/^\|\s*(\d+)\s*\|/.exec(l)?.[1])).filter(Number.isFinite) : [];
    const rows = fresh.map((f, i) => row(f, (ranks.length ? Math.max(...ranks) : 0) + 1 + i));
    if (end > h && h >= 0) lines.splice(end + 1, 0, ...rows);
    else lines.push("", `## Backlog Items (routed from ${uer ?? "the UX evaluation"})`, "", ...TABLE_HEAD, ...rows);
    after = lines.join("\n") + "\n";
  } else {
    after = ["---", "ddx:", "  id: improvement-backlog", "  type: improvement-backlog", "  status: draft", "---", "", "# Improvement Backlog", "", "## Backlog Items", "", ...TABLE_HEAD, ...chosen.map((f, i) => row(f, i + 1)), ""].join("\n");
  }
  const patch = writeInApp(app, "helix-proposals/backlog/improvement-backlog.patch", unifiedDiff(doc.path, doc.text, after));
  const out = { findings: ids, target: { path: doc.path, kind: doc.text ? "existing" : "new" }, patch };
  if (decision) out.decision = decisionStatus(app, { id: decision, status, evidence: uer ?? undefined });
  return out;
}
