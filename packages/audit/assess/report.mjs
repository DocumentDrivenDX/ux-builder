/* The assessment's readable report, its evidence index, run comparison and
   a CI gate (FEAT-009 RUN-01 to RUN-04, COV-02, COV-03; US-065, US-061-AC2,
   AC3; CONTRACT-006 "Increments 2 and 3").

   report() writes report.md, report.html and evidence.json from the run's
   records. It says what was checked, what was seen, what is uncertain, why
   each change matters and how to verify it; heuristics are listed as
   recommendations, claims about people as work for representative users,
   and blocked stages apart from findings. Its findings follow the journeys
   (FEAT-015 RPT-05, RPT-08; CONTRACT-006 "Journey-first report"): journey,
   then the state it was walked in, then step, then each finding with its
   rule's ID and full statement (or its heuristic and source), evidence,
   severity on Nielsen's 0 to 4 scale and fix; a finding at no step is under
   its state's "General". report.md is a HELIX usability-evaluation-report
   (ddx: frontmatter), drafted from the installed HELIX's template when it
   defines that type. compare() classifies findings
   across two runs of one scope; gate() is the CI exit. */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { HEURISTICS } from "./heuristics.mjs";
import { loadTypes } from "./helix.mjs";
import { metricsLines } from "./metrics.mjs";
import { catalogueRules, ruleOf, SEVERITY_WORDS, severityOf } from "./rules.mjs";
import { refreshLandingPage } from "../reports.mjs";

const read = (dir, f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const PRIORITIES = ["P0", "P1", "P2", "P3"];
/* Every finding says where it came from (FEAT-018 GDL-58). */
const ORIGIN = { agent: "agent recommendation", human: "human observation (verified)", "design-team": "design-team note (not user evidence)" };
export const CAVEAT = "A clean audit is not proof of usability or of full accessibility compliance, and passing functional tests do not show that usability criteria are met.";

function walk(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(relative(base, p).split(sep).join("/"));
  }
  return out;
}
const kindOf = (p) => /\.(mp4|webm)$/.test(p) ? "video" : p.endsWith(".vtt") ? "captions" : p === "video/index.html" ? "player" : p.endsWith(".png") ? "screenshot" : p.endsWith("tree.yml") ? "accessibility-tree" : p.startsWith("logs/") ? "test-log" : p.startsWith("audit/") ? "audit" : p.startsWith("proposals/") ? "proposal" : p.startsWith("evidence/real-user/") ? "real-user" : p.endsWith(".json") ? "record" : "other";

/* Everything the run's records say about it. */
export function load(dir) {
  return {
    run: read(dir, "run.json"), req: read(dir, "requirements.json"), trace: read(dir, "traceability.json"), baseline: read(dir, "baseline.json"),
    plan: read(dir, "plan.json"), coverage: read(dir, "coverage.json"), walk: read(dir, "walkthrough.json"), backlog: read(dir, "backlog.json"),
    proposals: read(dir, "proposals.json"), alignment: read(dir, "alignment.json"), comparison: read(dir, "comparison.json"),
    video: read(dir, "video/video.json"), heuristics: read(dir, "heuristics.json"), metrics: read(dir, "metrics.json"),
  };
}

export function evidenceIndex(dir, r) {
  const refs = new Map();
  const note = (ref, by) => { if (ref) (refs.get(ref) ?? refs.set(ref, new Set()).get(ref)).add(by); };
  for (const e of r.coverage?.entries ?? []) for (const x of e.evidence ?? []) note(x, `coverage ${e.journey} × ${e.state}`);
  for (const f of r.backlog?.findings ?? []) for (const x of f.evidence_refs ?? []) note(x, f.id);
  for (const j of r.walk?.journeys ?? []) for (const s of j.steps ?? []) note(s.checkpoint, `${j.id} step ${s.n}`);
  for (const p of r.proposals?.proposals ?? []) note(p.patch, p.id);
  // A walkthrough video, its timeline and captions are evidence of the findings they show (FEAT-013 OUT-02).
  for (const v of r.video?.videos ?? []) for (const file of Object.values(v.files ?? {})) { note(`video/${file}`, `video ${v.journey}`); for (const f of v.findings ?? []) note(`video/${file}`, f.id); }
  if (r.video) { note("video/video.json", "video"); note("video/index.html", "video"); }
  const files = walk(dir).filter((p) => !["report.md", "report.html", "evidence.json"].includes(p));
  const of = (p) => [...(refs.get(p) ?? []), ...[...refs.entries()].filter(([k]) => p.startsWith(`${k.startsWith("checkpoints/") ? k : `checkpoints/${k}`}/`)).flatMap(([, v]) => [...v])];
  return { schema: "evidence", version: 1, files: files.map((p) => ({ path: p, kind: kindOf(p), bytes: statSync(join(dir, p)).size, referencedBy: [...new Set(of(p))] })) };
}

function counts(findings) {
  const c = Object.fromEntries(PRIORITIES.map((p) => [p, 0]));
  for (const f of findings) c[f.priority] = (c[f.priority] ?? 0) + 1;
  return c;
}

/* Where a finding is in the walkthrough videos: one link per video it is shown in (FEAT-013 OUT-02). */
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
export function videoLinks(video, id) {
  return (video?.videos ?? []).flatMap((v) => {
    const at = (v.findings ?? []).find((f) => f.id === id)?.ranges?.[0];
    if (!at) return [];
    const name = v.files.clean.replace(/\.clean\.webm$/, "");
    return [{ label: `${v.journey}${name.includes("@") ? ` ${v.viewport.width}×${v.viewport.height}` : ""} at ${mmss(at.start)}`, href: `video/index.html#${name}@${at.start}` }];
  });
}

/* The steps of a walked journey a finding is at: its own step, else each
   step whose checkpoint its evidence cites (FEAT-015 RPT-05). */
const cites = (f, checkpoint) => (f.evidence_refs ?? []).some((r) => r === checkpoint || r === `checkpoints/${checkpoint}` || r.startsWith(`checkpoints/${checkpoint}/`));
export function stepsOf(f, steps = []) {
  if (Number.isInteger(f.step)) return steps.filter((s) => s.n === f.step);
  return steps.filter((s) => s.checkpoint && cites(f, s.checkpoint));
}
const stateOf = (f, journey) => { const p = `S-${journey.replace(/^J-/, "")}-`; return f.state_id?.startsWith(p) ? f.state_id.slice(p.length) : f.state_id ?? "unknown"; };
const screenOf = (s, planJ) => s.screen ?? (s.alternate == null ? planJ?.steps?.find((x) => x.n === s.n)?.screen : null) ?? (s.url ? (() => { try { return new URL(s.url, "http://x").pathname; } catch { return s.url; } })() : null);

/* The journeys the report is ordered by (RPT-05): the plan's, then any the
   walkthrough or the findings name; each with the states it was walked in,
   its steps, and its findings, by state then step ("General" for a finding
   at no step). */
export function byJourney(r) {
  const findings = r.backlog?.findings ?? [];
  const cov = r.coverage?.entries ?? [];
  const ids = [...new Set([...(r.plan?.journeys ?? []).map((j) => j.id), ...(r.walk?.journeys ?? []).map((j) => j.id), ...findings.map((f) => f.journey_id)].filter(Boolean))];
  return ids.map((id) => {
    const planJ = r.plan?.journeys?.find((j) => j.id === id) ?? null;
    const steps = (r.walk?.journeys?.find((j) => j.id === id)?.steps ?? []).map((s) => ({ ...s, screen: screenOf(s, planJ) }));
    const mine = findings.filter((f) => f.journey_id === id);
    const entries = cov.filter((e) => e.journey === id);
    const fallback = entries.some((e) => e.state === "success") ? "success" : entries.find((e) => e.status === "assessed")?.state ?? "success";
    const stateNames = [...new Set([...entries.filter((e) => e.status === "assessed").map((e) => e.state), ...mine.map((f) => stateOf(f, id))])];
    const states = stateNames.map((state) => {
      const fs = mine.filter((f) => stateOf(f, id) === state);
      const at = new Map(fs.map((f) => [f.id, stepsOf(f, steps)]));
      const shown = steps.filter((s) => (s.state ?? fallback) === state || fs.some((f) => at.get(f.id).includes(s)));
      return {
        state, entry: entries.find((e) => e.state === state) ?? null,
        steps: shown.map((s) => ({ step: s, findings: fs.filter((f) => at.get(f.id).includes(s)) })),
        general: fs.filter((f) => !at.get(f.id).length),
      };
    });
    return { id, goal: planJ?.goal ?? null, story: planJ?.story ?? null, entries, steps, states };
  });
}

/* The installed HELIX's usability-evaluation-report type, if it defines one
   (RPT-08; ADR-033): its location and template. */
export function helixType(run) {
  const path = run?.helix?.catalog?.path;
  if (!path || !existsSync(path)) return null;
  try { return loadTypes({ path }).find((t) => t.id === "usability-evaluation-report") ?? null; } catch { return null; }
}

/* The report, as Markdown with ddx: frontmatter; the HTML wraps the same
   sections. Drafted from the HELIX type's template when there is one: its
   sections in its order, each filled from the run where one of ours fits,
   the rest of ours after them. */
function markdown(dir, r) {
  const run = r.run ?? {}, findings = r.backlog?.findings ?? [];
  const rules = catalogueRules(dir, run);
  const heur = findings.filter((f) => f.finding_type === "heuristic"), obligations = findings.filter((f) => f.finding_type !== "heuristic");
  const stagesOff = (run.stages ?? []).filter((s) => s.status !== "completed");
  const journeys = byJourney(r);
  const type = helixType(run);
  const S = []; // { key, title, lines }
  const sec = (key, title, lines) => S.push({ key, title, lines });

  const c = counts(findings);
  const cov = r.coverage?.entries ?? [];
  const summary = [];
  summary.push(`- Findings: ${findings.length} (${PRIORITIES.map((p) => `${p} ${c[p]}`).join(", ")}); ${heur.length} of them recommendations from UX heuristics rather than existing obligations. Severity is on Nielsen's 0 to 4 scale (4 a catastrophe, 1 cosmetic).`);
  summary.push(`- Coverage: ${cov.filter((e) => e.status === "assessed").length} of ${cov.length} journey × state pairs assessed; ${cov.filter((e) => e.status === "blocked").length} blocked, ${cov.filter((e) => e.status === "not-assessed").length} not assessed, ${cov.filter((e) => e.status === "not-applicable").length} not applicable.`);
  if (r.baseline) summary.push(`- Baseline: ${r.baseline.tests.map((t) => `${t.id} ${t.status}`).join(", ") || "no tests declared"}; audit ${r.baseline.audit ? `${r.baseline.audit.findings.usability} usability and ${r.baseline.audit.findings.sdkAdoption} SDK-adoption findings` : "not run"}.`);
  summary.push(`- Inputs: HELIX flow \`${run.helix?.flow ?? "?"}\` (root \`${run.helix?.root ?? "?"}\`, catalogue ${run.helix?.catalog?.source ?? "?"}${run.helix?.catalog?.version ? ` ${run.helix.catalog.version}` : ""}); app commit \`${run.app?.commit?.slice(0, 10) ?? "?"}\`${run.app?.dirty ? " (with uncommitted changes)" : ""}; @ux-builder/ui ${run.versions?.ui ?? "not installed"}, audit ${run.versions?.audit ?? "?"}${run.agent ? `; agent ${run.agent.name}${run.agent.model ? ` (${run.agent.model})` : ""}` : ""}.`);
  summary.push(type ? `- HELIX artifact: a ${type.id}, drafted from the installed HELIX's template${type.template ? ` (\`${type.template.split(sep).slice(-4).join("/")}\`)` : ""}; its place in the flow is \`${type.dir}${type.naming ?? ""}\` (propose it with \`assess propose\`).` : "- HELIX artifact: a usability-evaluation-report (ddx: frontmatter); the installed HELIX defines no such type yet, so it stays in the run package until it is proposed to the flow.");
  if (r.video) summary.push(`- Walkthrough videos: ${r.video.videos.length} recorded${r.video.notRecorded.length ? `, ${r.video.notRecorded.length} not recorded` : ""}; [watch them in the player](video/index.html)${r.video.videos.some((v) => v.files.mp4) ? ", or share the MP4s in `video/`" : ""}.`);
  if (stagesOff.length) summary.push(`- Stages that did not complete (reported apart from findings): ${stagesOff.map((s) => `${s.stage} ${s.status}${s.reason ? ` — ${s.reason}` : ""}`).join("; ")}.`);
  sec("summary", "Summary", summary);

  if (r.plan) {
    const L = ["| Journey | Story | " + (r.plan.journeys[0]?.states ?? []).map((s) => s.state).join(" | ") + " |", "|---|---|" + (r.plan.journeys[0]?.states ?? []).map(() => "---").join("|") + "|"];
    for (const j of r.plan.journeys) L.push(`| ${j.id} | ${j.story} | ` + j.states.map((s) => { const e = cov.find((x) => x.journey === j.id && x.state === s.state); return e ? (e.status === "assessed" ? `assessed: ${e.outcome}` : e.status) : "missing"; }).join(" | ") + " |");
    L.push("", "Reasons for pairs not assessed:", "");
    for (const e of cov.filter((x) => x.status !== "assessed")) L.push(`- ${e.journey} × ${e.state}: ${e.status} — ${e.reason}`);
    sec("checked", "What was checked", L);
  }

  // A finding: its rule or heuristic in full, severity, evidence and fix (RPT-01, RPT-05).
  const finding = (f, level) => {
    const L = [];
    const sev = severityOf(f);
    const what = ruleOf(f, rules);
    L.push(`${"#".repeat(level)} ${f.priority} · severity ${sev} · ${f.title} (${f.id})`, "");
    L.push(`**${ORIGIN[f.source ?? "agent"]}** · **${f.finding_type}** · severity ${sev} (${SEVERITY_WORDS[sev]}) · ${f.journey_id} · ${f.state_id} · role ${f.role} · confidence ${f.confidence?.level} (${f.confidence?.reason}) · effort ${f.effort}${f.validation_work ? " · **validation work**" : ""}${(f.qualified ?? []).length ? ` · qualified: ${f.qualified.join(", ")}` : ""}`, "");
    if (what?.kind === "rule") L.push(`- **Rule** \`${what.id}\`: ${what.statement}${what.sources.length ? ` Sources: ${what.sources.map((s) => `[${s.title}](${s.url})`).join(", ")}.` : ""}`);
    else if (what) L.push(`- **Heuristic**: ${what.name}${what.source ? ` — source: ${/^https?:/.test(what.source) ? `[${what.source}](${what.source})` : what.source}` : ""}`);
    else L.push("- **Rule**: none named (assess validate-report fails this finding: name the rule or the heuristic it breaks)");
    if (f.plain) L.push(`- **In plain English**: ${f.plain.problem} ${f.plain.recommendation}`);
    L.push(`- **Observed**: ${f.observed_behavior}`, `- **Expected**: ${f.expected_behavior_or_proposed_requirement}`, `- **Fix**: ${f.recommendation}`);
    if (f.component_mapping?.length) L.push(`- **Components**: ${f.component_mapping.map((m) => `\`${m.name}\` (${m.kind}, @ux-builder/ui ${m.version}, ${m.work})`).join("; ")}`);
    L.push(`- **Verify**: ${f.verification}`);
    L.push(`- **Requirements**: ${(f.source_refs ?? []).join(", ") || "none: a proposed criterion"} · **Tests**: ${(f.test_refs ?? []).join(", ") || "none"}`);
    L.push(`- **Evidence**: ${(f.evidence_refs ?? []).map((x) => `\`${x}\``).join(", ") || `none — ${f.uncertainty}`}`);
    const seen = videoLinks(r.video, f.id);
    if (seen.length) L.push(`- **Seen in video**: ${seen.map((x) => `[${x.label}](${x.href})`).join(", ")}`);
    if (f.proposed_doc_changes?.length) L.push(`- **Proposed HELIX changes**: ${f.proposed_doc_changes.join(", ")}`);
    L.push("");
    return L;
  };
  const ordered = (fs) => [...fs].sort((a, b) => severityOf(b) - severityOf(a) || PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || (a.id < b.id ? -1 : 1));

  // Journey → state → step → finding (RPT-05; CONTRACT-006).
  const J = [];
  if (!journeys.length) J.push("No journeys were planned or walked.", "");
  for (const j of journeys) {
    J.push(`### ${j.id}${j.goal ? ` — ${j.goal}` : ""}${j.story ? ` (${j.story})` : ""}`, "");
    const walkedIn = j.entries.filter((e) => e.status === "assessed"), notWalked = j.entries.filter((e) => e.status !== "assessed");
    J.push(`States walked: ${walkedIn.length ? walkedIn.map((e) => `${e.state} (assessed${e.outcome ? `: ${e.outcome}` : ""})`).join(", ") : j.entries.length ? "none yet" : "none recorded in coverage.json"}.${notWalked.length ? ` Not walked: ${notWalked.map((e) => `${e.state} (${e.status})`).join(", ")}.` : ""}`, "");
    if (!j.states.length) J.push("No findings on this journey.", "");
    for (const st of j.states) {
      J.push(`#### State: ${st.state}`, "");
      if (!st.steps.length && !st.general.length) J.push("No findings in this state.", "");
      for (const { step, findings: fs } of st.steps) {
        J.push(`##### Step ${step.n}${step.alternate != null ? ` (alternate ${step.alternate})` : ""}: ${step.action}${step.screen ? ` — ${step.screen}` : ""}`, "");
        if (step.checkpoint) J.push(`Checkpoint \`${step.checkpoint}\`${step.status !== "done" ? ` · ${step.status}${step.reason ? `: ${step.reason}` : ""}` : ""}.`, "");
        if (!fs.length) J.push("No findings at this step.", "");
        for (const f of ordered(fs)) J.push(...finding(f, 6));
      }
      if (st.general.length) {
        J.push("##### General", "", "Findings of this state at no particular step.", "");
        for (const f of ordered(st.general)) J.push(...finding(f, 6));
      }
    }
  }
  sec("findings", "Findings by journey", J);

  // The heuristic pass (FEAT-018 GDL-50): every heuristic checked, with its findings or none.
  if (r.heuristics) {
    const h = r.heuristics;
    const L = [`Each walked screen was checked against ${HEURISTICS.length} heuristics: ${HEURISTICS.map((x) => x.name).join("; ")}.`, ""];
    for (const screen of h.screens ?? []) {
      const es = (h.entries ?? []).filter((e) => e.screen === screen);
      const hit = es.filter((e) => e.finding), clean = es.filter((e) => e.checked === "no finding"), open = es.length - hit.length - clean.length;
      L.push(`- **${screen}**: ${hit.length ? hit.map((e) => `${e.heuristic} → ${e.finding}`).join(", ") : "no findings"}${clean.length ? `; checked, no finding: ${clean.map((e) => e.heuristic).join(", ")}` : ""}${open ? `; ${open} not yet recorded` : ""}`);
    }
    if ((h.notInspected ?? []).length) L.push("", `Not inspected (no step reached them; not clean): ${h.notInspected.join(", ")}.`);
    sec("heuristics", "Heuristics checked", L);
  }
  // Task metrics (FEAT-018 GDL-52, GDL-53): agent-measured, and said so.
  if (r.metrics) sec("metrics", "Task metrics (agent-measured)", metricsLines(r.metrics));

  const index = (list) => ordered(list).map((f) => `- [${f.priority} · severity ${severityOf(f)} · ${f.title} (${f.id})](#${f.id}) — ${f.journey_id} · ${f.state_id}`);
  if (obligations.length) sec("obligations", "Findings against the app's requirements", index(obligations));
  if (heur.length) sec("recommendations", "Recommendations (UX heuristics, not existing obligations)", index(heur));

  const bl = r.proposals?.backlog;
  if (r.proposals?.proposals?.length || bl) {
    const L = ["Patches for review in `proposals/`. None has been applied: an accepted proposal goes through HELIX, after `assess apply-check` confirms its target is unchanged.", ""];
    if (bl) L.push(bl.target ? `- **improvement-backlog** → ${bl.target.kind === "existing" ? `${bl.target.id} \`${bl.target.path}\`` : `new ${bl.target.type} \`${bl.target.path}\``}: the backlog's ${bl.findings.length} finding(s) as backlog items. Patch: \`${bl.patch}\`.` : `- **improvement-backlog**: not proposed — ${bl.reason}`);
    for (const p of r.proposals.proposals ?? []) L.push(`- **${p.id}** (${p.change}${p.decision_needed ? `; needs a ${p.decision_needed.toUpperCase()} decision` : ""}) → ${p.target.kind === "existing" ? `${p.target.id} \`${p.target.path}\`` : `new ${p.target.type} ${p.target.id} \`${p.target.path}\``}${p.criterion ? `, criterion ${p.criterion}` : ""}; for ${p.findings.join(", ")}. Test: ${p.test_change.description}. Patch: \`${p.patch}\`.`);
    sec("proposals", "Proposed HELIX changes", L);
  }
  const U = ["The assessment makes none of these claims; each needs people from the app's audience.", ""];
  for (const u of r.backlog?.user_validation ?? []) U.push(`- **${u.claim}** — ${u.why}${u.method ? ` Method: ${u.method}` : ""}`);
  if (!(r.backlog?.user_validation ?? []).length) U.push("- None recorded.");
  sec("users", "Needs representative users", U);
  if (r.comparison) {
    const L = [];
    for (const s of ["new", "persistent", "regressed", "resolved", "not-rechecked"]) { const x = r.comparison.findings.filter((f) => f.status === s); if (x.length) L.push(`- ${s}: ${x.map((f) => f.id).join(", ")}`); }
    for (const f of r.comparison.baseline?.failures ?? []) L.push(`- Baseline failure from ${f.run}: \`${f.command}\` ${f.status}${f.reason ? ` (${f.reason})` : ""}; in this run's baseline: ${f.later}`);
    sec("comparison", `Compared with ${r.comparison.from}`, L);
  }
  if (r.baseline) {
    const L = [`${r.baseline.note}`, ""];
    for (const t of r.baseline.tests) L.push(`- \`${t.command}\`: ${t.status}${t.counts && t.counts !== "unknown" ? ` (${t.counts.passed} passed, ${t.counts.failed} failed, ${t.counts.skipped} skipped)` : ""}, ${Math.round((t.durationMs ?? 0) / 1000)} s`);
    sec("baseline", "Baseline", L);
  }

  // ddx: frontmatter (RPT-08): the type, and the journeys and stories it reports on.
  const stories = [...new Set([...journeys.map((j) => j.story), ...findings.flatMap((f) => (f.source_refs ?? []).map((x) => /^US-\d+/.exec(x)?.[0]))].filter(Boolean))].sort();
  const front = ["---", "ddx:", `  id: UER-${run.id ?? "run"}`, "  type: usability-evaluation-report", "  status: draft", ...(stories.length ? ["  links:", ...stories.flatMap((s) => ["    - kind: informed_by", `      to: ${s}`])] : []), ...(journeys.length ? ["  journeys:", ...journeys.map((j) => `    - ${j.id}`)] : []), "---", ""];
  const head = [`# UX assessment: ${run.config?.scope?.app ?? "app"} — ${run.id}`, "", `${CAVEAT} This report says what was checked, what was seen, what remains uncertain, why each change matters and how to verify it.`, ""];
  const body = (s) => [`## ${s.title}`, "", ...s.lines, ""];
  let text;
  if (type?.template) {
    // The template's sections, in its order: ours where one fits, its own guidance otherwise.
    const FIT = [["summary", /summary|overview/i], ["checked", /scope|method|checked|coverage|plan/i], ["findings", /finding|issue|problem|result/i], ["recommendations", /recommend/i], ["users", /user|participant|validation|research/i], ["proposals", /change|action|next/i]];
    const tpl = readFileSync(type.template, "utf8").replace(/^---\n[\s\S]*?\n---\n\n?/, "");
    const parts = tpl.split(/^(?=## )/m);
    const used = new Set();
    const out = [];
    for (const p of parts.slice(1)) {
      const title = /^## (.+)$/m.exec(p)[1].trim();
      const fit = FIT.find(([k, re]) => re.test(title) && !used.has(k) && S.some((s) => s.key === k));
      if (fit) { used.add(fit[0]); const s = S.find((x) => x.key === fit[0]); out.push(`## ${title}`, "", ...s.lines, ""); }
      else out.push(p.trimEnd(), "");
    }
    for (const s of S) if (!used.has(s.key)) out.push(...body(s));
    text = [...front, ...head, ...out].join("\n");
  } else text = [...front, ...head, ...S.flatMap(body)].join("\n");
  return text;
}

const md2html = (md, dir, selfContained) => {
  // Screenshots are shown, not just named; self-contained, they are embedded so the file stands alone.
  const src = (c) => (selfContained ? `data:image/png;base64,${readFileSync(join(dir, c)).toString("base64")}` : c);
  const inline = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, (m, c) => (/\.png$/.test(c) && existsSync(join(dir, c)) ? `<a href="${selfContained ? "#" : c}"><img src="${src(c)}" alt="${c}" loading="lazy"></a>` : `<code>${c}</code>`));
  const out = []; let list = false, table = false;
  for (const line of md.split("\n")) {
    const close = () => { if (list) { out.push("</ul>"); list = false; } if (table) { out.push("</table>"); table = false; } };
    if (/^\|/.test(line)) { if (/^\|[-| ]+\|$/.test(line)) continue; if (!table) { close(); out.push("<table>"); table = true; } out.push("<tr>" + line.slice(1, -1).split("|").map((c) => `<td>${inline(c.trim())}</td>`).join("") + "</tr>"); continue; }
    if (/^- /.test(line)) { if (!list) { close(); out.push("<ul>"); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    close();
    const h = /^(#{1,6}) (.*)$/.exec(line);
    // A finding's heading is its anchor (report.html#F-…), which the walkthrough player links to.
    const anchor = h && /\((F-[0-9a-f]+)\)$/.exec(h[2]);
    if (h) out.push(`<h${h[1].length}${anchor ? ` id="${anchor[1]}"` : ""}>${inline(h[2])}</h${h[1].length}>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  return out.join("\n");
};

export function report(dir, { selfContained = false } = {}) {
  const r = load(dir);
  const md = markdown(dir, r);
  writeFileSync(join(dir, "report.md"), md + "\n");
  writeFileSync(join(dir, "report.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>UX assessment ${esc(r.run?.id)}</title>
<style>:root{color-scheme:light dark;--fg:#1d1c1a;--bg:#f7f6f2;--line:#dcd9d0;--muted:#66625a}@media (prefers-color-scheme:dark){:root{--fg:#ecebe7;--bg:#171716;--line:#34332f;--muted:#a29f97}}
body{margin:0;padding:32px 16px 64px;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:980px;margin:0 auto}h1{font-size:1.6rem;text-wrap:balance}h2{margin-top:2.2rem;border-top:1px solid var(--line);padding-top:1rem}h3{margin-bottom:.3rem}p,li{max-width:75ch}
code{font:13px ui-monospace,Menlo,monospace;overflow-wrap:anywhere}table{border-collapse:collapse;display:block;overflow-x:auto}td{border:1px solid var(--line);padding:4px 8px;font-size:13px;white-space:nowrap}img{max-width:min(100%,520px);border:1px solid var(--line);border-radius:6px;display:block;margin:6px 0}</style></head><body><main>
${md2html(md.replace(/^---\n[\s\S]*?\n---\n\n?/, ""), dir, selfContained)}
</main></body></html>\n`);
  const index = evidenceIndex(dir, r);
  writeFileSync(join(dir, "evidence.json"), JSON.stringify(index, null, 2) + "\n");
  refreshLandingPage(dir);
  return { md, files: index.files.length };
}

/* Classify findings across two runs of the same scope (RUN-03, RUN-04). */
export function compare(fromDir, toDir) {
  const a = load(fromDir), b = load(toDir);
  const sa = JSON.stringify(a.run?.config?.scope ?? null), sb = JSON.stringify(b.run?.config?.scope ?? null);
  if (sa !== sb) { const e = new Error(`the runs have different scopes (${sa} vs ${sb}); compare runs of one app, flow and set of journeys`); e.code = "scope"; throw e; }
  const before = new Map((a.backlog?.findings ?? []).map((f) => [f.id, f])), after = new Map((b.backlog?.findings ?? []).map((f) => [f.id, f]));
  const wasResolved = new Set((a.comparison?.findings ?? []).filter((f) => f.status === "resolved").map((f) => f.id));
  const assessed = (r, f) => (r.coverage?.entries ?? []).some((e) => `S-${e.journey.slice(2)}-${e.state}` === f.state_id && e.status === "assessed");
  const out = [];
  for (const [id] of after) out.push({ id, status: before.has(id) ? "persistent" : wasResolved.has(id) ? "regressed" : "new" });
  for (const [id, f] of before) if (!after.has(id)) out.push({ id, status: assessed(b, f) ? "resolved" : "not-rechecked", ...(assessed(b, f) ? {} : { reason: `${f.state_id} was not assessed in ${b.run?.id}` }) });
  // The earlier baseline's failures stay visible (BAS-04): its own, or, without one, those its comparison carried.
  const failures = a.baseline
    ? a.baseline.tests.filter((t) => t.status !== "passed").map((t) => ({ run: a.run?.id ?? a.baseline.run, test: t.id, command: t.command, status: t.status, ...(t.reason ? { reason: t.reason } : {}) }))
    : (a.comparison?.baseline?.failures ?? []).map(({ later, ...f }) => f);
  const laterStatus = (f) => b.baseline?.tests.find((t) => t.id === f.test)?.status ?? "not-run";
  const record = { schema: "comparison", version: 1, from: a.run?.id, to: b.run?.id, findings: out, baseline: { run: a.baseline ? a.run?.id ?? a.baseline.run : a.comparison?.baseline?.run ?? null, failures: failures.map((f) => ({ ...f, later: laterStatus(f) })) } };
  writeFileSync(join(toDir, "comparison.json"), JSON.stringify(record, null, 2) + "\n");
  return record;
}

/* The CI exit: open findings at or above the level, or a stage that did not complete. */
export function gate(dir, failOn = "P1") {
  const r = load(dir);
  const level = PRIORITIES.indexOf(failOn);
  const open = (r.backlog?.findings ?? []).filter((f) => ["open", "accepted"].includes(f.status) && PRIORITIES.indexOf(f.priority) <= level);
  const stages = (r.run?.stages ?? []).filter((s) => s.status === "blocked");
  return { ok: !open.length && !stages.length, open, stages };
}
