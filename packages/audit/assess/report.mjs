/* The assessment's readable report, its evidence index, run comparison and
   a CI gate (FEAT-009 RUN-01 to RUN-04, COV-02, COV-03; US-065, US-061-AC2,
   AC3; CONTRACT-006 "Increments 2 and 3").

   report() writes report.md, report.html and evidence.json from the run's
   records. It says what was checked, what was seen, what is uncertain, why
   each change matters and how to verify it; heuristics are listed as
   recommendations, claims about people as work for representative users,
   and blocked stages apart from findings. compare() classifies findings
   across two runs of one scope; gate() is the CI exit. */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const read = (dir, f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const PRIORITIES = ["P0", "P1", "P2", "P3"];
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
const kindOf = (p) => p.endsWith(".png") ? "screenshot" : p.endsWith("tree.yml") ? "accessibility-tree" : p.startsWith("logs/") ? "test-log" : p.startsWith("audit/") ? "audit" : p.startsWith("proposals/") ? "proposal" : p.startsWith("evidence/real-user/") ? "real-user" : p.endsWith(".json") ? "record" : "other";

/* Everything the run's records say about it. */
export function load(dir) {
  return {
    run: read(dir, "run.json"), req: read(dir, "requirements.json"), trace: read(dir, "traceability.json"), baseline: read(dir, "baseline.json"),
    plan: read(dir, "plan.json"), coverage: read(dir, "coverage.json"), walk: read(dir, "walkthrough.json"), backlog: read(dir, "backlog.json"),
    proposals: read(dir, "proposals.json"), alignment: read(dir, "alignment.json"), comparison: read(dir, "comparison.json"),
  };
}

export function evidenceIndex(dir, r) {
  const refs = new Map();
  const note = (ref, by) => { if (ref) (refs.get(ref) ?? refs.set(ref, new Set()).get(ref)).add(by); };
  for (const e of r.coverage?.entries ?? []) for (const x of e.evidence ?? []) note(x, `coverage ${e.journey} × ${e.state}`);
  for (const f of r.backlog?.findings ?? []) for (const x of f.evidence_refs ?? []) note(x, f.id);
  for (const j of r.walk?.journeys ?? []) for (const s of j.steps ?? []) note(s.checkpoint, `${j.id} step ${s.n}`);
  for (const p of r.proposals?.proposals ?? []) note(p.patch, p.id);
  const files = walk(dir).filter((p) => !["report.md", "report.html", "evidence.json"].includes(p));
  const of = (p) => [...(refs.get(p) ?? []), ...[...refs.entries()].filter(([k]) => p.startsWith(`${k.startsWith("checkpoints/") ? k : `checkpoints/${k}`}/`)).flatMap(([, v]) => [...v])];
  return { schema: "evidence", version: 1, files: files.map((p) => ({ path: p, kind: kindOf(p), bytes: statSync(join(dir, p)).size, referencedBy: [...new Set(of(p))] })) };
}

function counts(findings) {
  const c = Object.fromEntries(PRIORITIES.map((p) => [p, 0]));
  for (const f of findings) c[f.priority] = (c[f.priority] ?? 0) + 1;
  return c;
}

/* The report, as Markdown; the HTML wraps the same sections. */
function markdown(dir, r) {
  const run = r.run ?? {}, findings = r.backlog?.findings ?? [];
  const heur = findings.filter((f) => f.finding_type === "heuristic"), obligations = findings.filter((f) => f.finding_type !== "heuristic");
  const stagesOff = (run.stages ?? []).filter((s) => s.status !== "completed");
  const L = [];
  L.push(`# UX assessment: ${run.config?.scope?.app ?? "app"} — ${run.id}`, "");
  L.push(`${CAVEAT} This report says what was checked, what was seen, what remains uncertain, why each change matters and how to verify it.`, "");
  L.push("## Summary", "");
  const c = counts(findings);
  L.push(`- Findings: ${findings.length} (${PRIORITIES.map((p) => `${p} ${c[p]}`).join(", ")}); ${heur.length} of them recommendations from UX heuristics rather than existing obligations.`);
  const cov = r.coverage?.entries ?? [];
  L.push(`- Coverage: ${cov.filter((e) => e.status === "assessed").length} of ${cov.length} journey × state pairs assessed; ${cov.filter((e) => e.status === "blocked").length} blocked, ${cov.filter((e) => e.status === "not-assessed").length} not assessed, ${cov.filter((e) => e.status === "not-applicable").length} not applicable.`);
  if (r.baseline) L.push(`- Baseline: ${r.baseline.tests.map((t) => `${t.id} ${t.status}`).join(", ") || "no tests declared"}; audit ${r.baseline.audit ? `${r.baseline.audit.findings.usability} usability and ${r.baseline.audit.findings.sdkAdoption} SDK-adoption findings` : "not run"}.`);
  L.push(`- Inputs: HELIX flow \`${run.helix?.flow ?? "?"}\` (root \`${run.helix?.root ?? "?"}\`, catalogue ${run.helix?.catalog?.source ?? "?"}${run.helix?.catalog?.version ? ` ${run.helix.catalog.version}` : ""}); app commit \`${run.app?.commit?.slice(0, 10) ?? "?"}\`${run.app?.dirty ? " (with uncommitted changes)" : ""}; @ux-builder/ui ${run.versions?.ui ?? "not installed"}, audit ${run.versions?.audit ?? "?"}${run.agent ? `; agent ${run.agent.name}${run.agent.model ? ` (${run.agent.model})` : ""}` : ""}.`);
  if (stagesOff.length) L.push(`- Stages that did not complete (reported apart from findings): ${stagesOff.map((s) => `${s.stage} ${s.status}${s.reason ? ` — ${s.reason}` : ""}`).join("; ")}.`);
  L.push("");
  if (r.plan) {
    L.push("## What was checked", "", "| Journey | Story | " + (r.plan.journeys[0]?.states ?? []).map((s) => s.state).join(" | ") + " |", "|---|---|" + (r.plan.journeys[0]?.states ?? []).map(() => "---").join("|") + "|");
    for (const j of r.plan.journeys) L.push(`| ${j.id} | ${j.story} | ` + j.states.map((s) => { const e = cov.find((x) => x.journey === j.id && x.state === s.state); return e ? (e.status === "assessed" ? `assessed: ${e.outcome}` : e.status) : "missing"; }).join(" | ") + " |");
    L.push("", "Reasons for pairs not assessed:", "");
    for (const e of cov.filter((x) => x.status !== "assessed")) L.push(`- ${e.journey} × ${e.state}: ${e.status} — ${e.reason}`);
    L.push("");
  }
  const section = (title, list) => {
    if (!list.length) return;
    L.push(`## ${title}`, "");
    for (const p of PRIORITIES) for (const f of list.filter((x) => x.priority === p)) {
      L.push(`### ${f.priority} · ${f.title} (${f.id})`, "");
      L.push(`**${f.finding_type}** · ${f.journey_id} · ${f.state_id} · role ${f.role} · confidence ${f.confidence?.level} (${f.confidence?.reason}) · effort ${f.effort}${f.validation_work ? " · **validation work**" : ""}${(f.qualified ?? []).length ? ` · qualified: ${f.qualified.join(", ")}` : ""}`, "");
      L.push(`- **Observed**: ${f.observed_behavior}`, `- **Expected**: ${f.expected_behavior_or_proposed_requirement}`, `- **Recommendation**: ${f.recommendation}`);
      if (f.component_mapping?.length) L.push(`- **Components**: ${f.component_mapping.map((m) => `\`${m.name}\` (${m.kind}, @ux-builder/ui ${m.version}, ${m.work})`).join("; ")}`);
      L.push(`- **Verify**: ${f.verification}`);
      L.push(`- **Requirements**: ${(f.source_refs ?? []).join(", ") || "none: a proposed criterion"} · **Tests**: ${(f.test_refs ?? []).join(", ") || "none"}`);
      L.push(`- **Evidence**: ${(f.evidence_refs ?? []).map((x) => `\`${x}\``).join(", ") || `none — ${f.uncertainty}`}`);
      if (f.proposed_doc_changes?.length) L.push(`- **Proposed HELIX changes**: ${f.proposed_doc_changes.join(", ")}`);
      L.push("");
    }
  };
  section("Findings against the app's requirements", obligations);
  section("Recommendations (UX heuristics, not existing obligations)", heur);
  if (r.proposals?.proposals?.length) {
    L.push("## Proposed HELIX changes", "", "Patches for review in `proposals/`. None has been applied: an accepted proposal goes through HELIX, after `assess apply-check` confirms its target is unchanged.", "");
    for (const p of r.proposals.proposals) L.push(`- **${p.id}** (${p.change}${p.decision_needed ? `; needs a ${p.decision_needed.toUpperCase()} decision` : ""}) → ${p.target.kind === "existing" ? `${p.target.id} \`${p.target.path}\`` : `new ${p.target.type} ${p.target.id} \`${p.target.path}\``}${p.criterion ? `, criterion ${p.criterion}` : ""}; for ${p.findings.join(", ")}. Test: ${p.test_change.description}. Patch: \`${p.patch}\`.`);
    L.push("");
  }
  L.push("## Needs representative users", "", "The assessment makes none of these claims; each needs people from the app's audience.", "");
  for (const u of r.backlog?.user_validation ?? []) L.push(`- **${u.claim}** — ${u.why}${u.method ? ` Method: ${u.method}` : ""}`);
  if (!(r.backlog?.user_validation ?? []).length) L.push("- None recorded.");
  L.push("");
  if (r.comparison) {
    L.push(`## Compared with ${r.comparison.from}`, "");
    for (const s of ["new", "persistent", "regressed", "resolved", "not-rechecked"]) { const x = r.comparison.findings.filter((f) => f.status === s); if (x.length) L.push(`- ${s}: ${x.map((f) => f.id).join(", ")}`); }
    L.push("");
  }
  if (r.baseline) {
    L.push("## Baseline", "", `${r.baseline.note}`, "");
    for (const t of r.baseline.tests) L.push(`- \`${t.command}\`: ${t.status}${t.counts && t.counts !== "unknown" ? ` (${t.counts.passed} passed, ${t.counts.failed} failed, ${t.counts.skipped} skipped)` : ""}, ${Math.round((t.durationMs ?? 0) / 1000)} s`);
    L.push("");
  }
  return L.join("\n");
}

const md2html = (md, dir) => {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, (m, c) => (/\.png$/.test(c) && existsSync(join(dir, c)) ? `<a href="${c}"><img src="${c}" alt="${c}" loading="lazy"></a>` : `<code>${c}</code>`));
  const out = []; let list = false, table = false;
  for (const line of md.split("\n")) {
    const close = () => { if (list) { out.push("</ul>"); list = false; } if (table) { out.push("</table>"); table = false; } };
    if (/^\|/.test(line)) { if (/^\|[-| ]+\|$/.test(line)) continue; if (!table) { close(); out.push("<table>"); table = true; } out.push("<tr>" + line.slice(1, -1).split("|").map((c) => `<td>${inline(c.trim())}</td>`).join("") + "</tr>"); continue; }
    if (/^- /.test(line)) { if (!list) { close(); out.push("<ul>"); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    close();
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  return out.join("\n");
};

export function report(dir) {
  const r = load(dir);
  const md = markdown(dir, r);
  writeFileSync(join(dir, "report.md"), md + "\n");
  writeFileSync(join(dir, "report.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>UX assessment ${esc(r.run?.id)}</title>
<style>:root{color-scheme:light dark;--fg:#1d1c1a;--bg:#f7f6f2;--line:#dcd9d0;--muted:#66625a}@media (prefers-color-scheme:dark){:root{--fg:#ecebe7;--bg:#171716;--line:#34332f;--muted:#a29f97}}
body{margin:0;padding:32px 16px 64px;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:980px;margin:0 auto}h1{font-size:1.6rem;text-wrap:balance}h2{margin-top:2.2rem;border-top:1px solid var(--line);padding-top:1rem}h3{margin-bottom:.3rem}p,li{max-width:75ch}
code{font:13px ui-monospace,Menlo,monospace;overflow-wrap:anywhere}table{border-collapse:collapse;display:block;overflow-x:auto}td{border:1px solid var(--line);padding:4px 8px;font-size:13px;white-space:nowrap}img{max-width:min(100%,520px);border:1px solid var(--line);border-radius:6px;display:block;margin:6px 0}</style></head><body><main>
${md2html(md, dir)}
</main></body></html>\n`);
  const index = evidenceIndex(dir, r);
  writeFileSync(join(dir, "evidence.json"), JSON.stringify(index, null, 2) + "\n");
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
  const record = { schema: "comparison", version: 1, from: a.run?.id, to: b.run?.id, findings: out };
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
