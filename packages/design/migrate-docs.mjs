/* Moving an app's own design documents into HELIX (ADR-042 decision 9,
   CONTRACT-008 Commands): what ux-builder kept in docs/ux-builder/ before
   it wrote into HELIX becomes HELIX proposals the person applies, or run
   output; then the originals go. Jobs and users become the PRD's User Needs
   and User Segments, decision records ADRs, evidence records one study's
   research plan, principles in the design state principles.md; test kits,
   evaluation reports, insights, experiment records and the baseline move to
   the gitignored runs/. */

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { runsDir, ux } from "./app.mjs";
import { decisionAdd, decisionStatus } from "./decisions.mjs";
import { helixRoot, parseDocument } from "./documents.mjs";
import { documentOfType, tableUnder } from "./helix.mjs";
import { needAdd, segmentAdd } from "./people.mjs";
import { principleAdd } from "./principles.mjs";
import { readState, writeState } from "./state.mjs";
import { addExcerpts, addSource, upsertClaims } from "./studies.mjs";

export const MIGRATED_STUDY = "research";
const STATUS = { hypothesis: "assumed", confirmed: "validated", "current-state": "validated", refuted: "invalidated" };
const read = (app, p) => readFileSync(join(app, p), "utf8");
const has = (app, p) => existsSync(join(app, p));
const list = (x) => (Array.isArray(x) ? x : []);
const files = (app, dir, re) => (has(app, dir) ? readdirSync(join(app, dir)).filter((n) => re.test(n)).sort((a, b) => a.localeCompare(b, "en", { numeric: true })) : []);
const section = (body, h) => body.match(new RegExp(`^## ${h}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m"))?.[1]?.trim() ?? "";
const bullets = (body, h) => section(body, h).split("\n").map((l) => l.match(/^- (.+)$/)?.[1]?.trim()).filter((x) => x && x !== "None recorded.");
const level = (x) => (["high", "medium", "low"].includes(x) ? x : "low");
/* Old evidence citations (EV-n) become the migrated study. */
const evidenceOf = (cell) => (/EV-\d+/.test(String(cell ?? "")) ? [MIGRATED_STUDY] : []);

function moveTo(app, from, to) {
  mkdirSync(dirname(join(app, to)), { recursive: true });
  renameSync(join(app, from), join(app, to));
}

/* What migrating the documents would do: { proposals: [what], moves: [{ from, to }], removes: [path] }. */
export function documentsPlan(app) {
  const d = ux(app);
  const proposals = [], moves = [], removes = [];
  if (has(app, `${d}/jobs.md`)) { proposals.push("the PRD's User Needs, from jobs.md"); removes.push(`${d}/jobs.md`); }
  if (has(app, `${d}/users.md`)) { proposals.push("the PRD's User Segments, from users.md"); removes.push(`${d}/users.md`); }
  for (const f of files(app, `${d}/decisions`, /^UXD-\d+\.md$/)) { proposals.push(`an ADR, from decisions/${f}`); removes.push(`${d}/decisions/${f}`); }
  for (const f of files(app, `${d}/evidence`, /^EV-\d+\.md$/)) { proposals.push(`the ${MIGRATED_STUDY} study's sources, excerpts and claims, from evidence/${f}`); removes.push(`${d}/evidence/${f}`); }
  try { for (const p of list(readState(app).principles).filter((x) => x.status !== "refuted")) proposals.push(`principles.md, "${p.text}"`); } catch { /* no design state */ }
  for (const k of files(app, `${d}/tests`, /^TK-\d+$/)) moves.push({ from: `${d}/tests/${k}`, to: runsDir(app, `studies/${k.toLowerCase()}`) });
  for (const f of files(app, `${d}/evaluations`, /^UER-\d+\.md$/)) moves.push({ from: `${d}/evaluations/${f}`, to: runsDir(app, `evaluations/${f.replace(/\.md$/, "").toLowerCase()}/report.md`) });
  for (const f of files(app, `${d}/insights`, /^INS-\d{4}-\d{2}-\d{2}\.(md|json)$/)) moves.push({ from: `${d}/insights/${f}`, to: runsDir(app, `insights/${f.slice(4, 14)}/insights.${f.endsWith(".json") ? "json" : "md"}`) });
  for (const f of files(app, `${d}/experiments`, /^EXP-\d+\.md$/)) moves.push({ from: `${d}/experiments/${f}`, to: runsDir(app, `experiments/${f}`) });
  if (has(app, `${d}/baseline.md`)) moves.push({ from: `${d}/baseline.md`, to: runsDir(app, "baseline.md") });
  return { proposals, moves, removes };
}

/* Propose the documents into HELIX, move the run output, remove the originals. */
export function migrateDocuments(app, { dryRun = false } = {}) {
  let plan = documentsPlan(app);
  // Without HELIX (or a PRD for the users and needs) there is nowhere to propose them: they stay, and the run output still moves.
  const why = !helixRoot(app) ? "the app has no HELIX yet: run HELIX's frame, then migrate again to move the design documents into it"
    : !documentOfType(app, "prd") && plan.proposals.some((p) => /User (Needs|Segments)/.test(p)) ? "HELIX has no PRD yet for the users and needs: run HELIX's frame, then migrate again" : null;
  if (why) plan = { proposals: [], moves: plan.moves, removes: [], waiting: why };
  if (dryRun || (!plan.proposals.length && !plan.moves.length)) return { ...plan, migrated: false };
  const d = ux(app);
  // Needs first: users name them.
  const jobNames = {};
  if (plan.waiting) { for (const m of plan.moves) moveTo(app, m.from, m.to); return { ...plan, migrated: true }; }
  if (has(app, `${d}/jobs.md`)) {
    for (const [id, job, importance, evidence, confidence, status] of tableUnder(read(app, `${d}/jobs.md`), "Jobs")) {
      if (!job) continue;
      jobNames[id] = job;
      const ev = evidenceOf(evidence);
      needAdd(app, { need: job, importance: level(importance), evidence: ev, confidence: ev.length ? level(confidence) : "low", status: ev.length ? STATUS[status] ?? "assumed" : "assumed" });
    }
  }
  if (has(app, `${d}/users.md`)) {
    for (const [, user, context, , jobs, evidence, confidence, status] of tableUnder(read(app, `${d}/users.md`), "Users")) {
      if (!user) continue;
      const needs = String(jobs ?? "").split(",").map((x) => jobNames[x.trim().split(/\s+/)[0]]).filter(Boolean);
      const ev = evidenceOf(evidence);
      segmentAdd(app, { user, context: context || "not recorded", needs, evidence: ev, confidence: ev.length ? level(confidence) : "low", status: ev.length ? STATUS[status] ?? "assumed" : "assumed" });
    }
  }
  // Evidence: one study, its sources, excerpts and claims.
  for (const f of files(app, `${d}/evidence`, /^EV-\d+\.md$/)) {
    const doc = parseDocument(read(app, `${d}/evidence/${f}`));
    const ux0 = doc.front?.ux ?? {};
    const title = doc.body.match(/^# (?:EV-\d+: )?(.+)$/m)?.[1]?.trim() ?? f.replace(/\.md$/, "");
    addSource(app, MIGRATED_STUDY, { source: title, kind: ux0.kind ?? "interview", date: String(ux0.date ?? "unknown"), kept: `${ux0.source ?? ux0.file ?? "kept by the owner"}; not copied here` });
    const excerpts = bullets(doc.body, "Excerpts").map((e) => e.replace(/^(P\d+|[A-Z][a-z]+):\s*/, (m, who) => `${who} (${title}): `)).map((e) => `- ${e}`);
    if (excerpts.length) addExcerpts(app, MIGRATED_STUDY, excerpts);
    const claims = tableUnder(doc.body, "Claims").filter((r) => r[1]).map(([, claim, source, basis, confidence, direction, verified, contradicting, unknown]) => ({ claim, source: source && source !== "–" ? source : title, basis: basis || "inferred", confidence: level(confidence), direction: direction === "yes" ? "changes the design's direction" : "", verified: verified === "yes", contradicting: contradicting && contradicting !== "–" ? contradicting : "", unknown: unknown && unknown !== "–" ? unknown : "" }));
    if (claims.length) upsertClaims(app, MIGRATED_STUDY, claims);
  }
  // Decisions: ADRs, with their result.
  for (const f of files(app, `${d}/decisions`, /^UXD-\d+\.md$/)) {
    const doc = parseDocument(read(app, `${d}/decisions/${f}`));
    const options = bullets(doc.body, "Alternatives");
    const choice = section(doc.body, "Recommendation");
    const r = decisionAdd(app, { question: section(doc.body, "Question") || f, options: options.includes(choice) ? options : [...options, choice], choice, why: bullets(doc.body, "Rationale").join("; ") || "migrated from an earlier decision record", assumptions: bullets(doc.body, "Assumptions"), validation: section(doc.body, "Validation").match(/\*\*Required\*\*: (.+)/)?.[1] ?? "", links: list(doc.front?.ux?.links).map((l) => String(l.to)).filter((to) => !/^(UXD|EV|TK|UER|J|U)-/.test(to)) });
    const st = doc.front?.ux?.status;
    if (st === "tested" || st === "refuted") decisionStatus(app, { id: r.id, status: st, evidence: doc.front?.ux?.validated?.evidence ?? f });
  }
  // Principles from the design state.
  let state = null;
  try { state = readState(app); } catch { /* no design state */ }
  if (state && list(state.principles).length) {
    for (const p of state.principles.filter((x) => x.status !== "refuted")) principleAdd(app, { text: p.text, rule: p.rule ? JSON.stringify(p.rule) : undefined });
    state.principles = [];
    writeState(app, state);
  }
  for (const m of plan.moves) moveTo(app, m.from, m.to);
  for (const p of plan.removes) rmSync(join(app, p), { force: true });
  for (const dir of ["decisions", "evidence", "tests", "evaluations", "insights", "experiments"]) if (has(app, `${d}/${dir}`) && !readdirSync(join(app, d, dir)).length) rmSync(join(app, d, dir), { recursive: true });
  return { ...plan, migrated: true };
}

