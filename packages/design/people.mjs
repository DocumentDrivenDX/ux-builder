/* Users, needs and tasks in HELIX (CONTRACT-008 Commands, FEAT-018 GDL-20
   to GDL-22 and GDL-77, ADR-042 decisions 2 and 5): the PRD's *User
   Segments* and *User Needs* tables and a feature specification's *Task
   Model*, each row named by what it says. `segment add`, `need add` and
   `task add` propose rows for the person to apply; the guide reads them back
   from HELIX, applied or proposed. A row's key is its name as a slug, which
   tools use to link it (a journey to its task, a task to its users and
   needs); people read the names. */

import { DesignError } from "./app.mjs";
import { evidenceSources, parseDocument } from "./documents.mjs";
import { cell, currentText, documentOfType, helixDocuments, proposeChange, proposedDocuments, requireHelix, sectionOf, setSection, slug, tableUnder } from "./helix.mjs";

export const SEGMENT_COLUMNS = ["User", "Context", "Needs", "Evidence", "Confidence", "Status"];
export const NEED_COLUMNS = ["Need", "Importance", "Evidence", "Confidence", "Status"];
export const TASK_COLUMNS = ["Task", "Goal", "Users", "Needs", "Rules", "Realized by", "Key"];
export const LEVELS = ["high", "medium", "low"];
/* HELIX's status words, and the guide's for each. */
export const STATUSES = { assumed: "hypothesis", validated: "confirmed", invalidated: "refuted" };
const list = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).map(String).map((s) => s.trim()).filter(Boolean);
const names = (s) => String(s ?? "").split(/[,;]/).map((x) => x.trim()).filter((x) => x && !/^(none|–|-)$/i.test(x));
export const keyOf = (name) => slug(name);

/* The PRD: { path, text } (proposed when HELIX has only a proposal of it), or null. */
const prdOf = (app) => documentOfType(app, "prd");

/* A table's text. */
const table = (cols, rows) => [`| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map((c) => cell(c) || "–").join(" | ")} |`)].join("\n");

/* Set a row (by its first cell) in a ### table under a ## section of a HELIX document. */
function upsertRow(text, { section, heading, cols, row }) {
  let t = sectionOf(text, section) == null ? setSection(text, section, "") : text;
  const rows = tableUnder(t, heading, 3).filter((r) => r[0].toLowerCase() !== String(row[0]).toLowerCase());
  rows.push(row);
  return setSection(t, heading, table(cols, rows), { level: 3, inside: section });
}

/* ------------------------------------------------------------ reading */

/* User Needs: { key: { key, job: need, importance, evidence, confidence, status } } (null without a PRD that has them). */
export function needsTable(app) {
  const prd = prdOf(app);
  if (!prd || sectionOf(prd.text, "User Needs", 3) == null) return null;
  const out = {};
  for (const [need, importance, evidence, confidence, status] of tableUnder(prd.text, "User Needs", 3)) {
    if (!need) continue;
    const key = keyOf(need);
    out[key] = { key, job: need, importance, evidence, confidence, status: STATUSES[status] ?? status, path: prd.path };
  }
  return out;
}

/* User Segments: { key: { key, user, context, needs, jobs: [{ job: needKey, importance }], evidence, confidence, status } }. */
export function segmentsTable(app) {
  const prd = prdOf(app);
  if (!prd || sectionOf(prd.text, "User Segments", 3) == null) return null;
  const needs = needsTable(app) ?? {};
  const out = {};
  for (const [user, context, held, evidence, confidence, status] of tableUnder(prd.text, "User Segments", 3)) {
    if (!user) continue;
    const key = keyOf(user);
    out[key] = { key, user, context, needs: held, jobs: names(held).map((n) => ({ job: keyOf(n), importance: needs[keyOf(n)]?.importance ?? null, name: n })), evidence, confidence, status: STATUSES[status] ?? status, path: prd.path };
  }
  return out;
}

/* Every feature specification with a Task Model: [{ id, path, text }]. */
function features(app) {
  const docs = [...helixDocuments(app).map((d) => ({ path: d.path, text: currentText(app, d.path).text })), ...proposedDocuments(app)];
  return docs.map((d) => ({ ...d, front: parseDocument(d.text).front?.ddx })).filter((d) => /^feature-spec/.test(String(d.front?.type ?? "")) || /^FEAT-\d+$/.test(String(d.front?.id ?? ""))).map((d) => ({ id: String(d.front.id), path: d.path, text: d.text }));
}

/* The Task Model: { key: { key, task, goal, users: [keys], needs: [keys], rules: [BR-n], realizedBy, feature, path } }. */
export function taskModel(app) {
  const out = {};
  for (const f of features(app)) {
    for (const [task, goal, users, needs, rules, realizedBy, key] of tableUnder(f.text, "Task Model")) {
      if (!task) continue;
      const k = key && !/^(–|-)$/.test(key) ? key : keyOf(task);
      out[k] = { key: k, task, goal, users: names(users).map(keyOf), needs: names(needs).map(keyOf), rules: names(rules).filter((r) => /^BR-\d+$/.test(r)), realizedBy: names(realizedBy), feature: f.id, path: f.path };
    }
  }
  return out;
}

/* ---------------------------------------------------------- the rules */

function rowChecks(kind, name, { evidence, confidence, status }, known) {
  const out = [];
  const sources = evidenceSources(evidence);
  if (!LEVELS.includes(confidence)) out.push(`${kind} "${name}": confidence is "${confidence ?? ""}"; use high, medium or low`);
  if (confidence && confidence !== "low" && !sources.length) out.push(`${kind} "${name}": confidence ${confidence} needs at least one evidence source (a study)`);
  if (status === "hypothesis" && sources.length) out.push(`${kind} "${name}": evidence lists a source, but status is assumed; an assumption has no evidence (mark it validated, or clear evidence)`);
  if (!Object.values(STATUSES).includes(status)) out.push(`${kind} "${name}": status is "${status ?? ""}"; use assumed, validated or invalidated`);
  for (const s of sources) if (known && !known.has(s)) out.push(`${kind} "${name}": evidence ${s} is not a study (docs/helix/01-frame/research/)`);
  return out;
}

/* Problems and notes in the PRD's tables and the Task Model, for validate: [{ path, message, level }]. */
export function peopleChecks(app, { studies = new Set(), rules = {} } = {}) {
  const out = [];
  const needs = needsTable(app) ?? {}, segments = segmentsTable(app) ?? {};
  for (const n of Object.values(needs)) {
    if (!LEVELS.includes(n.importance)) out.push({ path: n.path, message: `need "${n.job}": importance is "${n.importance ?? ""}"; use high, medium or low` });
    for (const m of rowChecks("need", n.job, n, studies)) out.push({ path: n.path, message: m });
    if (n.status === "hypothesis") out.push({ path: n.path, message: `need "${n.job}" is assumed`, level: "note" });
  }
  for (const u of Object.values(segments)) {
    if (!u.context) out.push({ path: u.path, message: `user "${u.user}": say the user's context (where, on what, with what expertise)` });
    for (const j of u.jobs) if (!needs[j.job]) out.push({ path: u.path, message: `user "${u.user}": holds the need "${j.name}", which User Needs does not have` });
    for (const m of rowChecks("user", u.user, u, studies)) out.push({ path: u.path, message: m });
    if (u.status === "hypothesis") out.push({ path: u.path, message: `user "${u.user}" is assumed`, level: "note" });
  }
  for (const t of Object.values(taskModel(app))) {
    for (const k of t.users) if (Object.keys(segments).length && !segments[k]) out.push({ path: t.path, message: `task "${t.task}": its user ${k} is not in the PRD's User Segments` });
    for (const k of t.needs) if (Object.keys(needs).length && !needs[k]) out.push({ path: t.path, message: `task "${t.task}": its need ${k} is not in the PRD's User Needs` });
    for (const r of t.rules) if (!rules[r]) out.push({ path: t.path, message: `task "${t.task}": cites ${r}, which no HELIX document defines` });
  }
  return out;
}

/* ------------------------------------------------------------ writing */

const level = (v, what) => { const x = v ?? "low"; if (!LEVELS.includes(x)) throw new DesignError(`--${what} is high, medium or low, not "${v}"`); return x; };
const helixStatus = (v) => { const x = v ?? "assumed"; if (!STATUSES[x]) throw new DesignError(`--status is assumed, validated or invalidated, not "${v}"`); return x; };
function prdPath(app) {
  requireHelix(app, "a user segment or need");
  const prd = prdOf(app);
  if (!prd) throw new DesignError("HELIX has no PRD yet: write it with HELIX's frame first; users and needs go in its User Segments and User Needs");
  return prd.path;
}
function refuse(row, statusKey) {
  const r = { evidence: row.evidence, confidence: row.confidence, status: STATUSES[statusKey] };
  const problems = rowChecks("row", row.name, r, null);
  if (problems.length) throw new DesignError(`not proposed: ${problems.map((p) => p.replace(/^row "[^"]*": /, "")).join("; ")}`);
}

/* ux-builder-design need add --need <need> --importance <l> [--evidence <study>]... [--confidence <l>] [--status <s>]. */
export function needAdd(app, { need, importance, evidence, confidence, status } = {}) {
  if (!need?.trim()) throw new DesignError("need add needs --need: the need, in the user's words");
  const row = { name: need.trim(), importance: level(importance, "importance"), evidence: list(evidence).join(", ") || "none", confidence: level(confidence, "confidence"), status: helixStatus(status) };
  refuse(row, row.status);
  const p = proposeChange(app, prdPath(app), (t) => upsertRow(t, { section: "Users and Scope", heading: "User Needs", cols: NEED_COLUMNS, row: [row.name, row.importance, row.evidence, row.confidence, row.status] }));
  return { need: row.name, key: keyOf(row.name), path: p.path, proposal: p.id ?? null, status: row.status };
}

/* ux-builder-design segment add --user <who> --context <c> [--need <need>]... [--evidence <study>]... [--confidence] [--status]. */
export function segmentAdd(app, { user, context, needs, evidence, confidence, status } = {}) {
  if (!user?.trim()) throw new DesignError("segment add needs --user: who, as a segment (never an invented person)");
  if (!context?.trim()) throw new DesignError("segment add needs --context: where, on what, with what expertise");
  const known = needsTable(app) ?? {};
  const held = list(needs);
  const missing = held.filter((n) => !known[keyOf(n)]);
  if (missing.length) throw new DesignError(`no need ${missing.map((n) => `"${n}"`).join(", ")} in the PRD's User Needs: add ${missing.length === 1 ? "it" : "them"} with need add first`);
  const row = { name: user.trim(), evidence: list(evidence).join(", ") || "none", confidence: level(confidence, "confidence"), status: helixStatus(status) };
  refuse(row, row.status);
  const p = proposeChange(app, prdPath(app), (t) => upsertRow(t, { section: "Users and Scope", heading: "User Segments", cols: SEGMENT_COLUMNS, row: [row.name, context.trim(), held.map((n) => known[keyOf(n)].job).join(", ") || "none known", row.evidence, row.confidence, row.status] }));
  return { user: row.name, key: keyOf(row.name), path: p.path, proposal: p.id ?? null, status: row.status };
}

/* ux-builder-design task add --feature <FEAT-n> --task <t> --goal <g> [--user <who>]... [--need <need>]... [--rule BR-n]... [--realized-by <journey>]... */
export function taskAdd(app, { feature, task, goal, users, needs, rules, realizedBy } = {}) {
  requireHelix(app, "a task");
  if (!task?.trim()) throw new DesignError("task add needs --task: what the person does, in their words");
  if (!goal?.trim()) throw new DesignError("task add needs --goal: what they want to achieve");
  const fs = features(app);
  const f = fs.find((x) => x.id === feature);
  if (!f) throw new DesignError(`no feature specification ${feature ?? ""}: name one with --feature (${fs.map((x) => x.id).join(", ") || "HELIX has none yet; write one with HELIX's frame"})`);
  const segs = segmentsTable(app) ?? {}, known = needsTable(app) ?? {};
  const us = list(users), ns = list(needs);
  const badU = us.filter((u) => !segs[keyOf(u)]), badN = ns.filter((n) => !known[keyOf(n)]);
  if (badU.length || badN.length) throw new DesignError(`not proposed: ${[...badU.map((u) => `no user "${u}" in the PRD's User Segments`), ...badN.map((n) => `no need "${n}" in its User Needs`)].join("; ")}`);
  const key = keyOf(task);
  const row = [task.trim(), goal.trim(), us.map((u) => segs[keyOf(u)].user).join(", ") || "–", ns.map((n) => known[keyOf(n)].job).join(", ") || "–", list(rules).join(", ") || "–", list(realizedBy).join(", ") || "–", key];
  const p = proposeChange(app, f.path, (t) => {
    let x = sectionOf(t, "Task Model") == null ? setSection(t, "Task Model", "", { after: sectionOf(t, "Functional Areas") != null ? "Functional Areas" : null }) : t;
    const rows = tableUnder(x, "Task Model").filter((r) => (r[6] || keyOf(r[0])) !== key);
    rows.push(row);
    return setSection(x, "Task Model", table(TASK_COLUMNS, rows));
  });
  return { task: row[0], key, feature: f.id, path: p.path, proposal: p.id ?? null };
}
