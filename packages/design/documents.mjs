/* The docs/ux types and their check (CONTRACT-008 Documents, FEAT-018
   GDL-76). Each type is described by artifacts/<type>/meta.yml; validate
   checks a document's frontmatter, ID, place, required sections, links and
   the type's own rules. New types never go under docs/helix/ (ADR-036
   rule 5). */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { bpFile, proposalsDir, runsDir, ux } from "./app.mjs";
import { proposedDocuments } from "./helix.mjs";
import { studies, studyChecks, studyClaims } from "./studies.mjs";
import { keyOf, needsTable, peopleChecks, segmentsTable, taskModel } from "./people.mjs";
import { briefStale } from "./brief.mjs";

export const ARTIFACTS = fileURLToPath(new URL("./artifacts", import.meta.url));

let types;
/* { [type]: meta } from every artifacts/<type>/meta.yml. */
export function documentTypes() {
  if (!types) {
    types = {};
    for (const name of readdirSync(ARTIFACTS).sort()) {
      const file = join(ARTIFACTS, name, "meta.yml");
      if (existsSync(file)) types[name] = parseYaml(readFileSync(file, "utf8"));
    }
  }
  return types;
}

/* A document's frontmatter (null if it has none), its body and its ## headings. */
export function parseDocument(text) {
  const m = String(text).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  let front = null, error = null;
  if (m) { try { front = parseYaml(m[1]) ?? {}; } catch (e) { error = e.message; } }
  const body = m ? m[2] : String(text);
  const headings = [...body.matchAll(/^## (.+?)\s*$/gm)].map((h) => h[1]);
  return { front, error, body, headings };
}

/* The path a document of this type and ID belongs at. */
export function pathFor(type, id, app) {
  const out = documentTypes()[type]?.output;
  if (!out) return null;
  // meta.yml names the place under docs/ux-builder/; an unmigrated app keeps docs/ux/ (GDL-80).
  return out.replace(/^docs\/ux-builder(?=\/)/, ux(app)).replace(/<[^>]+>/, id.replace(/^[A-Z]+-/, ""));
}

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

/* The table rows under a heading, as arrays of trimmed cells, header and
   rule lines left out. */
function tableRows(body, heading) {
  const start = body.search(new RegExp(`^## ${heading}\\s*$`, "mi"));
  if (start < 0) return [];
  const rest = body.slice(start).split("\n").slice(1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  const rows = (end < 0 ? rest : rest.slice(0, end)).filter((l) => l.trim().startsWith("|")).map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  return rows.slice(2);
}

/* Personal data an excerpt must not hold (ADR-039), beside the trace's
   secret patterns. */
export const PERSONAL_PATTERNS = [
  ["email address", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["phone number", /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]\d{3,4}[\s.-]\d{3,4}\b/],
];

/* The studies an evidence cell names: comma-separated study names, "none" for none. */
export const evidenceSources = (cell) => String(cell ?? "").split(",").map((x) => x.trim()).filter((x) => x && !/^(none|–|-)$/i.test(x));

/* Type-specific rules named in meta.yml. Each returns problems, or
   { problems, warnings, notes }. */
const RULES = {};

/* Problems with one document: [{ message }]. path is relative to the app
   (null to skip the place check); known holds the docs/ux and HELIX IDs
   links may point at (null to skip the link check). */
export function validateDocument(text, { path = null, known = null, appDir } = {}) {
  const doc = parseDocument(text);
  const problems = [];
  const add = (message) => problems.push({ message });
  if (!doc.front) { add(doc.error ? `the frontmatter is not YAML: ${doc.error}` : "no frontmatter: start with --- and ux: { id, type }"); return problems; }
  const ux = doc.front.ux;
  if (!ux || typeof ux !== "object") { add("the frontmatter has no ux: { id, type, links }"); return problems; }
  for (const field of ["id", "type"]) if (!ux[field]) add(`the frontmatter is missing ux.${field}`);
  if (!ux.type) return problems;
  const meta = documentTypes()[ux.type];
  if (!meta) { add(`"${ux.type}" is not a docs/ux type; use one of ${Object.keys(documentTypes()).join(", ")}`); return problems; }
  if (ux.id && !new RegExp(meta.id.pattern).test(String(ux.id))) add(`ID "${ux.id}" does not match ${meta.id.prefix}'s format (${meta.id.example})`);
  if (path && ux.id) {
    const want = pathFor(ux.type, String(ux.id), appDir);
    if (want && path !== want) add(`a ${ux.type} with ID ${ux.id} belongs at ${want}, not ${path}`);
    if (path.startsWith("docs/helix/")) add("a docs/ux type is never written under docs/helix/");
  }
  const have = new Set(doc.headings.map(norm));
  for (const s of meta.sections ?? []) if (!have.has(norm(s))) add(`missing the section "## ${s}"`);
  for (const l of ux.links ?? []) {
    if (!l || typeof l !== "object" || !l.kind || !l.to) { add("each link needs kind and to"); continue; }
    if (known && !known.has(String(l.to))) add(`link to ${l.to} (${l.kind}) does not resolve to a docs/ux document or a HELIX document`);
  }
  for (const r of meta.rules ?? []) {
    // Lines are counted from the top of the file, past the frontmatter.
    const offset = text.split("\n").length - doc.body.split("\n").length;
    const got = RULES[r]?.(doc, ux, { known, appDir, offset }) ?? [`unknown rule ${r} in ${ux.type}'s meta.yml`];
    for (const m of Array.isArray(got) ? got : got.problems ?? []) add(m);
    if (!Array.isArray(got)) for (const n of got.notes ?? []) problems.push({ message: n, level: "note" });
  }
  return problems;
}

/* Every .md under a folder, relative to app, sorted. */
function markdown(app, dir) {
  const root = join(app, dir);
  if (!existsSync(root)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const abs = join(d, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (name.endsWith(".md")) out.push(relative(app, abs).split(sep).join("/"));
    }
  };
  walk(root);
  return out;
}

/* The HELIX root from .helix.yml (its first flow's root), or null. */
export function helixRoot(app) {
  const file = join(app, ".helix.yml");
  if (!existsSync(file)) return null;
  try { return parseYaml(readFileSync(file, "utf8"))?.flows?.[0]?.root ?? "docs/helix/"; } catch { return "docs/helix/"; }
}

/* The IDs of HELIX documents (ddx.id in their frontmatter). */
export function helixIds(app) {
  const root = helixRoot(app);
  if (!root) return new Set();
  return new Set(markdown(app, root).map((p) => parseDocument(readFileSync(join(app, p), "utf8")).front?.ddx?.id).filter(Boolean).map(String));
}

/* Every docs/ux document: { path, type, id } (type and id null when the
   frontmatter does not say). */
export function uxDocuments(app) {
  // Run output and HELIX proposals under docs/ux-builder/ are not ux-builder documents (ADR-042).
  const outside = [runsDir(app), proposalsDir(app)].map((d) => `${d}/`);
  return markdown(app, ux(app)).filter((path) => !outside.some((d) => path.startsWith(d))).map((path) => {
    const ux = parseDocument(readFileSync(join(app, path), "utf8")).front?.ux;
    return { path, type: ux?.type ?? null, id: ux?.id != null ? String(ux.id) : null };
  });
}

/* The needs (the PRD's User Needs) and users (its User Segments), by key (ADR-042). */
export const jobsTable = (app) => needsTable(app);
export const usersTable = (app) => segmentsTable(app);

/* The business rules HELIX defines (GDL-78): lines "**BR-<n>** — <rule>"
   in any HELIX document. { rules: { BR-n: { text, file } }, twice: [{ id, files }] }. */
export function businessRules(app) {
  const root = helixRoot(app);
  const rules = {}, seen = {};
  if (!root) return { rules, twice: [], helix: false };
  for (const file of markdown(app, root)) {
    for (const m of readFileSync(join(app, file), "utf8").matchAll(/\*\*(BR-[1-9][0-9]*)\*\*\s*[—:-]+\s*(.+)$/gm)) {
      (seen[m[1]] ??= []).push(file);
      rules[m[1]] ??= { text: m[2].trim(), file };
    }
  }
  return { rules, twice: Object.entries(seen).filter(([, fs]) => new Set(fs).size > 1).map(([id, fs]) => ({ id, files: [...new Set(fs)] })), helix: true };
}

/* Where the blueprint cites each business rule: [{ rule, item, path }]. */
export function ruleCitations(bp) {
  const out = [];
  for (const t of Array.isArray(bp?.tasks) ? bp.tasks : []) for (const r of t?.rules ?? []) out.push({ rule: r, item: t.id, kind: "task" });
  for (const j of Array.isArray(bp?.journeys) ? bp.journeys : []) (j?.steps ?? []).forEach((st, i) => { for (const r of st?.rules ?? []) out.push({ rule: r, item: `${j.id} step ${i + 1}`, kind: "step", journey: j.id, screen: st.screen }); });
  return out;
}
export const RULE_ANSWERS = [["trigger", "the situation that triggers it"], ["before", "how the user learns of it before acting"], ["blocked", "what they see when it blocks them"], ["recover", "how they recover"]];

/* ux-builder-design validate: every docs/ux document, and what cites the
   jobs (blueprint tasks, decision records). Problems fail it; warnings and
   notes are reported. */
export function validate(app) {
  const documents = uxDocuments(app);
  // HELIX documents on disk, and those a pending proposal creates (they exist once the person applies them).
  const known = new Set([...documents.map((d) => d.id).filter(Boolean), ...helixIds(app), ...studies(app).map((x) => x.name), ...proposedDocuments(app).map((d) => parseDocument(d.text).front?.ddx?.id).filter(Boolean).map(String)]);
  // Users and needs are the PRD's (ADR-042), linked by their names' keys.
  const jobs = needsTable(app);
  for (const id of Object.keys(jobs ?? {})) known.add(id);
  const users = segmentsTable(app);
  for (const id of Object.keys(users ?? {})) known.add(id);
  const problems = [], warnings = [], notes = [];
  for (const d of documents) {
    for (const p of validateDocument(readFileSync(join(app, d.path), "utf8"), { path: d.path, known, appDir: app })) {
      const { level, ...rest } = p;
      (level === "note" ? notes : problems).push({ path: d.path, ...rest });
    }
  }
  const ids = documents.map((d) => d.id).filter(Boolean);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) problems.push({ path: documents.filter((d) => d.id === id).map((d) => d.path).join(", "), message: `ID ${id} is used by more than one document` });

  // What cites a need: the blueprint's tasks, by the need's name or key.
  const cites = [];
  let bp = null;
  try { bp = JSON.parse(readFileSync(join(app, bpFile(app)), "utf8")); } catch { /* no blueprint */ }
  for (const t of Array.isArray(bp?.tasks) ? bp.tasks : []) for (const j of t?.needs ?? t?.jobs ?? []) cites.push({ path: bpFile(app), item: t.id, job: keyOf(j), name: j });
  // The PRD's users and needs, and the Task Model (ADR-042).
  for (const x of peopleChecks(app, { studies: new Set(studies(app).map((st) => st.name)), rules: businessRules(app).rules })) (x.level === "note" ? notes : problems).push({ path: x.path, message: x.message });
  const model = taskModel(app);
  if (Object.keys(model).length) for (const t of Array.isArray(bp?.tasks) ? bp.tasks : []) if (t?.id && !model[t.id]) warnings.push({ path: bpFile(app), message: `task ${t.id} is not a row of a feature's Task Model: name it by its Task Model key (${Object.keys(model).join(", ")})` });
  // Business rules (GDL-78): each cited rule is defined in HELIX, and how the user meets it is designed.
  const br = businessRules(app);
  const cited = ruleCitations(bp);
  for (const c of cited) if (!br.rules[c.rule]) problems.push({ path: bpFile(app), message: br.helix ? `${c.item} cites ${c.rule}, which no HELIX document defines (**${c.rule}** — <rule>)` : `${c.item} cites ${c.rule}, but the app has no HELIX to define it` });
  for (const id of [...new Set(cited.map((c) => c.rule))]) {
    const entry = (Array.isArray(bp?.businessRules) ? bp.businessRules : []).find((e) => e?.id === id);
    const missing = RULE_ANSWERS.filter(([k]) => !String(entry?.[k] ?? "").trim()).map(([k, what]) => `${k} (${what})`);
    if (missing.length) problems.push({ path: bpFile(app), message: `${id}: how the user meets it is not designed; businessRules needs ${missing.join(", ")}` });
  }
  for (const t of br.twice) warnings.push({ path: t.files.join(", "), message: `${t.id} is defined in more than one HELIX document` });
  // What cites a target user: blueprint tasks (GDL-77).
  for (const t of Array.isArray(bp?.tasks) ? bp.tasks : []) for (const u of t?.users ?? []) {
    const user = users?.[keyOf(u)];
    if (!user) { problems.push({ path: bpFile(app), message: `${t.id} names the user ${u}, which the PRD's User Segments does not have` }); continue; }
    if (user.confidence === "low") warnings.push({ path: bpFile(app), message: `${t.id} serves "${user.user}", whose confidence is low` });
  }
  // Studies (ADR-042): masked excerpts, and claims with a source and a basis.
  for (const x of studyChecks(app)) (x.level === "warning" ? warnings : problems).push({ path: x.path, message: x.message });
  // Documents that drift from the design (US-161-AC6): a contradicted claim nobody asked the person about,
  // and a story the brief lists as confirmed that no journey carries any more.
  let state = null;
  try { state = JSON.parse(readFileSync(join(app, ".ux-builder/design-state.json"), "utf8")); } catch { /* no design state */ }
  const questions = Array.isArray(state?.questions) ? state.questions : [];
  for (const c of studyClaims(app)) if (c.contradicting && !questions.some((q) => q.text.includes(`"${c.claim}"`))) warnings.push({ path: c.path, message: `${c.study}: "${c.claim}" is contradicted (${c.contradicting}), and no question asks the person which holds: ux-builder-design evidence claim contradict --study ${c.study} --claim "<its words>" --text "<what they said>"` });
  const carried = new Set((Array.isArray(bp?.journeys) ? bp.journeys : []).map((j) => j?.story).filter(Boolean));
  const briefPath = ux(app, "brief.md");
  if (carried.size && existsSync(join(app, briefPath))) {
    for (const m of readFileSync(join(app, briefPath), "utf8").matchAll(/^\s*-\s*(US-\d+)\b[^\n]*\[confirmed\]/gm)) if (!carried.has(m[1])) warnings.push({ path: briefPath, message: `the brief lists ${m[1]} as confirmed, but no journey in the blueprint carries it: drop it from the brief, or mark it deferred` });
  }
  const stale = briefStale(app);
  if (stale) warnings.push(stale);
  for (const c of cites) {
    const job = jobs?.[c.job];
    if (!job) { problems.push({ path: c.path, message: `${c.item} cites the need ${c.name}, which the PRD's User Needs does not have` }); continue; }
    if (job.confidence === "low") warnings.push({ path: c.path, message: `${c.item} relies on the need "${job.job}", whose confidence is low` });
  }
  return { documents, problems, warnings, notes, valid: problems.length === 0 };
}

export const exampleFile = (type) => join(ARTIFACTS, type, "example.md");
export const templateFile = (type) => join(ARTIFACTS, type, "template.md");
