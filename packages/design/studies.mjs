/* Studies (CONTRACT-008 Commands, FEAT-018 GDL-17 to GDL-19 and GDL-54 to
   GDL-61, ADR-039, ADR-042 decision 2): each study is one HELIX research
   plan, docs/helix/01-frame/research/<study>.md, proposed for the person to
   apply. Its *Research Methods* hold the sources (### Sources) and, for a
   study with people, the scenarios, success criteria and screener; its
   *Findings* hold the masked excerpts (### Excerpts) and the claims
   (### Claims, HELIX's columns). Raw material never enters it (ADR-039).
   What a session needs or leaves — the facilitator script, the consent note,
   the observation sheet, the imported observations — is run output, in the
   gitignored runs/studies/<study>/. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findSecrets } from "@ux-builder/trace";
import { DesignError, runsDir } from "./app.mjs";
import { parseDocument, PERSONAL_PATTERNS } from "./documents.mjs";
import { readState, writeState } from "./state.mjs";
import { cell, currentText, helixDocuments, proposeChange, proposedDocuments, requireHelix, sectionOf, setSection, slug, tableUnder } from "./helix.mjs";

export const CLAIM_COLUMNS = ["Claim", "Source", "Basis", "Confidence", "Direction", "Verified", "Contradicting", "Unknown"];
export const SOURCE_COLUMNS = ["Source", "Kind", "Date", "Where it is kept"];
const today = () => new Date().toISOString().slice(0, 10);
const none = (s) => !s || ["–", "-", "none", "no"].includes(String(s).trim().toLowerCase());

/* A study's name as a file name, and where its plan and its run output go. */
export const studyName = (study) => {
  const s = slug(study ?? "");
  if (!study || !String(study).trim() || s === "item") throw new DesignError("name the study: --study <name>, such as onboarding-interviews");
  return s;
};
export const studyPath = (app, study) => `${requireHelix(app, "a study")}/01-frame/research/${studyName(study)}.md`;
export const studyRunDir = (app, study) => runsDir(app, `studies/${studyName(study)}`);

/* A new research plan in HELIX's shape (v0.20.0), its required sections to fill with the person. */
function newPlan(study) {
  const name = studyName(study);
  return ["---", "ddx:", `  id: research-${name}`, "  type: research-plan", "  authoring:", "    home: repo", "---", "",
    `# Research plan: ${String(study).trim()}`, "",
    "## Research Objectives", "", "### Primary Research Questions", "", "1. **Question**: to agree with the person: what this study must answer.", "   - **Why Important**: how its answer changes the design.", "",
    "## Research Methods", "",
    "## Timeline", "", "- To agree with the person.", "",
    "## Research Risks", "", "- To agree with the person.", "",
    "## Completion Criteria", "", "- To agree with the person.", ""].join("\n");
}

/* Add a ## section when it is missing, after `after`. */
const ensure = (text, heading, after) => (sectionOf(text, heading) == null ? setSection(text, heading, "", { after }) : text);

/* Propose a change to a study's plan: change(text) returns the next text. */
export function proposeStudy(app, study, change) {
  return proposeChange(app, studyPath(app, study), (t) => change(t ?? newPlan(study)));
}

/* Every study: [{ name, path, text, proposed }], applied or proposed. */
export function studies(app) {
  const isStudy = (path, text) => /\/01-frame\/research\/[^/]+\.md$/.test(path) && parseDocument(text).front?.ddx?.type === "research-plan";
  const onDisk = helixDocuments(app).filter((d) => isStudy(d.path, d.text)).map((d) => ({ path: d.path, text: currentText(app, d.path).text, proposed: false }));
  const proposed = proposedDocuments(app).filter((d) => isStudy(d.path, d.text)).map((d) => ({ ...d, proposed: true }));
  return [...onDisk, ...proposed].map((d) => ({ name: d.path.split("/").pop().replace(/\.md$/, ""), ...d })).sort((a, b) => a.name.localeCompare(b.name));
}
export const studyOf = (app, study) => studies(app).find((s) => s.name === studyName(study)) ?? null;

/* A table's text: header, rule and rows. */
const table = (cols, rows) => [`| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map((c) => cell(c) || "–").join(" | ")} |`)].join("\n");

/* ------------------------------------------------------------ sources */

/* Add a source to a study: a row in Research Methods' ### Sources. */
export function addSource(app, study, { source, kind, date = today(), kept }) {
  let rows;
  const p = proposeStudy(app, study, (t) => {
    rows = tableUnder(t, "Sources", 3).filter((r) => r[0] !== source);
    rows.push([source, kind, date, kept]);
    return setSection(ensure(t, "Research Methods", "Research Objectives"), "Sources", table(SOURCE_COLUMNS, rows), { level: 3, inside: "Research Methods" });
  });
  return { study: studyName(study), path: p.path, proposal: p.id ?? null, source, kind, date, kept };
}

export const sourcesOf = (text) => tableUnder(text, "Sources", 3).map(([source, kind, date, kept]) => ({ source, kind, date, kept }));

/* ----------------------------------------------------------- excerpts */

/* Add masked excerpt lines to a study's Findings > ### Excerpts. */
export function addExcerpts(app, study, lines) {
  const p = proposeStudy(app, study, (t) => {
    const was = (sectionOf(t, "Excerpts", 3) ?? "").split("\n").filter((l) => l.trim().startsWith("-"));
    const next = [...was, ...lines.filter((l) => !was.includes(l))];
    return setSection(ensure(t, "Findings", "Research Risks"), "Excerpts", next.join("\n"), { level: 3, inside: "Findings" });
  });
  return { study: studyName(study), path: p.path, proposal: p.id ?? null };
}
export const excerptsOf = (text) => (sectionOf(text, "Excerpts", 3) ?? "").split("\n").filter((l) => l.trim().startsWith("-"));

/* ------------------------------------------------------------- claims */

/* A Direction cell changes the design's direction unless it is empty or "supports". */
const changesDirection = (d) => !none(d) && !/^supports\b/i.test(String(d).trim());

/* Every claim in every study: [{ study, path, claim, source, basis, confidence, direction, changes, verified, contradicting, unknown }]. */
export function studyClaims(app) {
  return studies(app).flatMap((s) => tableUnder(s.text, "Claims", 3).filter((r) => r[0]).map(([claim, source, basis, confidence, direction, verified, contradicting, unknown]) => ({
    study: s.name, path: s.path, claim, source: none(source) ? "" : source, basis: basis ?? "", confidence, direction: none(direction) ? "" : direction, changes: changesDirection(direction),
    verified: /^yes$/i.test(verified ?? ""), contradicting: none(contradicting) ? "" : contradicting, unknown: none(unknown) ? "" : unknown,
  })));
}

/* A claim's problems (it fails validate) and warnings. */
export function claimChecks(c) {
  const problems = [], warnings = [];
  const at = `${c.study}: "${c.claim}"`;
  if (!c.source) problems.push(`${at} has no source: name where it comes from (a session, a document, a time in a recording's transcript)`);
  if (!/^(observed|inferred)\b/i.test(c.basis ?? "")) problems.push(`${at}: the basis starts with observed or inferred, not "${c.basis ?? ""}"`);
  if (!["high", "medium", "low"].includes(c.confidence)) problems.push(`${at}: confidence is high, medium or low, not "${c.confidence ?? ""}"`);
  if (c.changes && !c.verified && c.confidence !== "low") warnings.push(`${at} changes the design's direction but was not checked against its source: check it there (evidence claim verify --study ${c.study} --claim "<its words>") or mark it low confidence; until then it is uncertain`);
  return { problems, warnings };
}

const claimRow = (c) => [c.claim, c.source, c.basis, c.confidence, c.direction || "–", c.verified ? "yes" : "no", c.contradicting || "none", c.unknown || "–"];

/* Rewrite a study's Claims table. */
function writeClaims(app, study, rows) {
  return proposeStudy(app, study, (t) => setSection(ensure(t, "Findings", "Research Risks"), "Claims", table(CLAIM_COLUMNS, rows.map(claimRow)), { level: 3, inside: "Findings" }));
}

/* A study's claims, and the one a --claim names (its words, or the start of them). */
function claimsOf(app, study, words) {
  const s = studyOf(app, study);
  if (!s) throw new DesignError(`no study ${studyName(study)}: evidence list shows the studies`);
  const rows = studyClaims(app).filter((c) => c.study === s.name);
  if (words === undefined) return { rows };
  const w = String(words ?? "").trim().toLowerCase();
  const hits = rows.filter((c) => c.claim.toLowerCase() === w).length ? rows.filter((c) => c.claim.toLowerCase() === w) : rows.filter((c) => w && c.claim.toLowerCase().startsWith(w));
  if (hits.length !== 1) throw new DesignError(`${hits.length ? `"${words}" matches ${hits.length} claims` : `no claim "${words ?? ""}"`} in ${s.name}; it has ${rows.map((c) => `"${c.claim}"`).join(", ") || "none"}`);
  return { rows, c: hits[0] };
}

/* evidence claim add --study <s> --text --source --basis observed|inferred[: …] --confidence [--direction <what>] [--verified] [--contradicts] [--unknown]. */
export function claimAdd(app, { study, text, source, basis, confidence, direction, verified = false, contradicts, unknown } = {}) {
  if (!text?.trim()) throw new DesignError("evidence claim add needs --text: the claim, in one sentence");
  const { rows } = studyOf(app, study) ? claimsOf(app, study) : { rows: [] };
  if (!studyOf(app, study)) throw new DesignError(`no study ${studyName(study)}: add its first source with evidence add --study ${studyName(study)}`);
  const dir = direction === true ? "changes the design's direction" : String(direction ?? "").trim();
  const c = { study: studyName(study), claim: text.trim(), source: source?.trim() ?? "", basis: basis?.trim() ?? "", confidence, direction: dir, changes: changesDirection(dir), verified: !!verified, contradicting: contradicts ?? "", unknown: unknown ?? "" };
  if (rows.some((r) => r.claim.toLowerCase() === c.claim.toLowerCase())) throw new DesignError(`${c.study} already has the claim "${c.claim}"`);
  const { problems, warnings } = claimChecks(c);
  if (problems.length) throw new DesignError(`not recorded: ${problems.join("; ")}`);
  const p = writeClaims(app, study, [...rows, c]);
  return { study: c.study, claim: c.claim, path: p.path, proposal: p.id ?? null, warnings };
}

/* evidence claim verify --study <s> --claim <words> [--confidence]: the agent checked the claim against its source itself. */
export function claimVerify(app, { study, claim, confidence } = {}) {
  const { rows, c } = claimsOf(app, study, claim);
  c.verified = true;
  if (confidence) { if (!["high", "medium", "low"].includes(confidence)) throw new DesignError(`--confidence is high, medium or low, not "${confidence}"`); c.confidence = confidence; }
  writeClaims(app, study, rows);
  return { study: c.study, claim: c.claim, verified: true, confidence: c.confidence };
}

/* evidence claim contradict --study <s> --claim <words> --text <what the person said> (US-161-AC5). */
export function claimContradict(app, { study, claim, text } = {}) {
  if (!text?.trim()) throw new DesignError("evidence claim contradict needs --text: what the person said, in their words");
  const { rows, c } = claimsOf(app, study, claim);
  const said = `the person: "${text.trim()}"`;
  c.contradicting = c.contradicting ? `${c.contradicting}; ${said}` : said;
  const p = writeClaims(app, study, rows);
  const state = readState(app);
  state.questions ??= [];
  const q = { id: `Q-${Math.max(0, ...state.questions.map((x) => Number(String(x.id).slice(2)) || 0)) + 1}`, text: `The ${c.study} study says "${c.claim}", and the person said "${text.trim()}". Which holds?`, status: "open" };
  state.questions.push(q);
  writeState(app, state);
  return { study: c.study, claim: c.claim, path: p.path, contradicting: c.contradicting, question: q };
}

/* Direction-changing claims not yet checked against their source, and not marked low confidence. */
export const unverifiedClaims = (app) => studyClaims(app).filter((c) => claimChecks(c).warnings.length).map((c) => ({ study: c.study, claim: c.claim, source: c.source }));

/* ------------------------------------------------- masking (ADR-039) */

/* Real names the owner keeps out of git: .ux-builder/participants.local.json, { "P1": "name" }. */
export function localNames(app) {
  try { return JSON.parse(readFileSync(join(app, ".ux-builder/participants.local.json"), "utf8")) ?? {}; } catch { return {}; }
}

/* A study's excerpts that hold a secret, contact details or a participant's real name: [message]. */
export function maskProblems(app, text) {
  const out = [];
  const lines = excerptsOf(text);
  for (const h of findSecrets(lines.join("\n"), { appDir: app })) out.push(`an excerpt holds an unmasked ${h.kind}; mask it (ADR-039)`);
  const names = localNames(app);
  for (const l of lines) {
    for (const [what, re] of PERSONAL_PATTERNS) if (re.test(l)) out.push(`an excerpt holds ${/^[aeiou]/.test(what) ? "an" : "a"} ${what}; mask it (ADR-039)`);
    const named = (name) => [name.trim(), ...name.trim().split(/\s+/).filter((w) => w.length > 2)].some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(l));
    for (const [p, name] of Object.entries(names)) if (typeof name === "string" && name.trim() && named(name)) out.push(`an excerpt names a participant; use the pseudonym ${p} (ADR-039)`);
    const who = l.match(/^\s*-\s*(P[0-9]+|[A-Z][a-z]+)\b/)?.[1];
    if (who && !/^P[1-9][0-9]*$/.test(who) && !/^(Facilitator|Moderator|Observer|Interviewer)$/.test(who)) out.push(`an excerpt is by "${who}", not a pseudonym (P1, P2); use one (ADR-039)`);
  }
  return out;
}

/* Every study's problems and warnings, for validate: [{ path, message, level }]. */
export function studyChecks(app) {
  const out = [];
  for (const s of studies(app)) for (const m of maskProblems(app, s.text)) out.push({ path: s.path, message: m, level: "problem" });
  for (const c of studyClaims(app)) {
    const r = claimChecks(c);
    for (const m of r.problems) out.push({ path: c.path, message: m, level: "problem" });
    for (const m of r.warnings) out.push({ path: c.path, message: m, level: "warning" });
  }
  return out;
}

/* A study's run folder file, read as JSON (null when absent). */
export function runJson(app, study, file) {
  try { return JSON.parse(readFileSync(join(app, studyRunDir(app, study), file), "utf8")); } catch { return null; }
}
export const hasRun = (app, study, file) => existsSync(join(app, studyRunDir(app, study), file));

/* Add or replace claims in a study, by their words (report's observed results). */
export function upsertClaims(app, study, claims) {
  const name = studyName(study);
  const rows = studyClaims(app).filter((c) => c.study === name);
  for (const c of claims) {
    const i = rows.findIndex((r) => r.claim.toLowerCase() === c.claim.toLowerCase());
    const row = { study: name, verified: false, contradicting: "", unknown: "", direction: "", ...c, changes: changesDirection(c.direction) };
    if (i >= 0) rows[i] = { ...rows[i], ...row, verified: rows[i].verified }; else rows.push(row);
  }
  const p = writeClaims(app, name, rows);
  return { study: name, path: p.path, proposal: p.id ?? null };
}
