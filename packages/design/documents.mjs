/* The docs/ux types and their check (CONTRACT-008 Documents, FEAT-018
   GDL-76). Each type is described by artifacts/<type>/meta.yml; validate
   checks a document's frontmatter, ID, place, required sections, links and
   the type's own rules. New types never go under docs/helix/ (ADR-036
   rule 5). */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { findSecrets } from "@ux-builder/trace";

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
export function pathFor(type, id) {
  const out = documentTypes()[type]?.output;
  if (!out) return null;
  return out.replace(/<[^>]+>/, id.replace(/^[A-Z]+-/, ""));
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

/* Real names the owner keeps out of git: .ux-builder/participants.local.json, { "P1": "name" }. */
function localNames(appDir) {
  if (!appDir) return {};
  try { return JSON.parse(readFileSync(join(appDir, ".ux-builder/participants.local.json"), "utf8")) ?? {}; } catch { return {}; }
}

/* The excerpt lines of a document: [{ line, text }]. */
function excerptLines(body) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => /^## Excerpts\s*$/i.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length && !lines[i].startsWith("## "); i++) if (lines[i].trim().startsWith("-")) out.push({ line: i + 1, text: lines[i] });
  return out;
}

/* Type-specific rules named in meta.yml. Each returns problems, or
   { problems, warnings, notes }. */
const RULES = {
  participants(doc, ux) {
    const p = ux.participants ?? {};
    if (typeof p !== "object" || Array.isArray(p)) return ["participants maps pseudonyms (P1, P2) to roles"];
    const bad = Object.keys(p).filter((k) => !/^P[1-9][0-9]*$/.test(k));
    const used = excerptLines(doc.body).map((e) => e.text.match(/^\s*-\s*(P[0-9]+):/)?.[1]).filter((k) => k && !(k in p));
    return [...bad.map((k) => `participant "${k}" is not a pseudonym (P1, P2, …)`), ...[...new Set(used)].map((k) => `excerpt by ${k}, who is not listed under participants`)];
  },
  masked(doc, ux, { appDir }) {
    const out = findSecrets(doc.body, { appDir }).map((h) => `line ${h.line} of the body holds an unmasked ${h.kind}; mask it (ADR-039)`);
    const names = localNames(appDir);
    for (const e of excerptLines(doc.body)) {
      for (const [what, re] of PERSONAL_PATTERNS) if (re.test(e.text)) out.push(`the excerpt on line ${e.line} holds ${/^[aeiou]/.test(what) ? "an" : "a"} ${what}; mask it (ADR-039)`);
      for (const [p, name] of Object.entries(names)) if (typeof name === "string" && name.trim() && e.text.toLowerCase().includes(name.trim().toLowerCase())) out.push(`the excerpt on line ${e.line} names a participant; use the pseudonym ${p} (ADR-039)`);
    }
    return out;
  },
  "decision-status"(doc, ux) {
    return ["not-tested", "tested", "refuted"].includes(ux.status) ? [] : [`status is "${ux.status ?? ""}"; use not-tested, tested or refuted`];
  },
  jobs(doc, ux, { known }) {
    const out = [], notes = [];
    const seen = new Set();
    for (const [id, job, importance, evidence, confidence, status] of tableRows(doc.body, "Jobs")) {
      if (!/^J-[1-9][0-9]*$/.test(id ?? "")) { out.push(`job row "${id}" needs an ID J-<n>`); continue; }
      if (seen.has(id)) out.push(`${id} is used by more than one job`);
      seen.add(id);
      if (status === "hypothesis") {
        if ((evidence ?? "").match(/EV-[1-9][0-9]*/)) out.push(`${id}: evidence lists a source, but status is hypothesis; a hypothesis has no evidence (mark it confirmed, or clear evidence)`);
        else notes.push(`${id} is a hypothesis: ${job}`);
      }
      for (const [field, v] of [["importance", importance], ["confidence", confidence]]) if (!["high", "medium", "low"].includes(v)) out.push(`${id}: ${field} is "${v ?? ""}"; use high, medium or low`);
      const sources = (evidence ?? "").match(/EV-[1-9][0-9]*/g) ?? [];
      if (confidence && confidence !== "low" && !sources.length) out.push(`${id}: confidence ${confidence} needs at least one evidence source (EV-<n>)`);
      for (const s of sources) if (known && !known.has(s)) out.push(`${id}: evidence ${s} does not exist in docs/ux/evidence/`);
      if (!["hypothesis", "confirmed", "current-state"].includes(status)) out.push(`${id}: status is "${status ?? ""}"; use hypothesis or confirmed`);
      if (!job) out.push(`${id}: the job is empty`);
    }
    if (!tableRows(doc.body, "Jobs").length) out.push("the Jobs table has no rows");
    return { problems: out, notes };
  },
};

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
    const want = pathFor(ux.type, String(ux.id));
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
    const got = RULES[r]?.(doc, ux, { known, appDir }) ?? [`unknown rule ${r} in ${ux.type}'s meta.yml`];
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
  return markdown(app, "docs/ux").map((path) => {
    const ux = parseDocument(readFileSync(join(app, path), "utf8")).front?.ux;
    return { path, type: ux?.type ?? null, id: ux?.id != null ? String(ux.id) : null };
  });
}

/* The jobs table's rows: { id: { job, confidence, status } }. */
export function jobsTable(app) {
  const p = join(app, "docs/ux/jobs.md");
  if (!existsSync(p)) return null;
  const out = {};
  for (const [id, job, importance, evidence, confidence, status] of tableRows(parseDocument(readFileSync(p, "utf8")).body, "Jobs")) if (id) out[id] = { job, importance, evidence, confidence, status };
  return out;
}

/* ux-builder-design validate: every docs/ux document, and what cites the
   jobs (blueprint tasks, decision records). Problems fail it; warnings and
   notes are reported. */
export function validate(app) {
  const documents = uxDocuments(app);
  const known = new Set([...documents.map((d) => d.id).filter(Boolean), ...helixIds(app)]);
  const jobs = jobsTable(app);
  // A jobs table's rows are linkable by their J- IDs.
  for (const id of Object.keys(jobs ?? {})) known.add(id);
  const problems = [], warnings = [], notes = [];
  for (const d of documents) {
    for (const p of validateDocument(readFileSync(join(app, d.path), "utf8"), { path: d.path, known, appDir: app })) {
      const { level, ...rest } = p;
      (level === "note" ? notes : problems).push({ path: d.path, ...rest });
    }
  }
  const ids = documents.map((d) => d.id).filter(Boolean);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) problems.push({ path: documents.filter((d) => d.id === id).map((d) => d.path).join(", "), message: `ID ${id} is used by more than one document` });

  // What cites a job: blueprint tasks (T-<n>) and decision records (UXD-<n>).
  const cites = [];
  let bp = null;
  try { bp = JSON.parse(readFileSync(join(app, "app.blueprint.json"), "utf8")); } catch { /* no blueprint */ }
  for (const t of Array.isArray(bp?.tasks) ? bp.tasks : []) for (const j of t?.jobs ?? []) cites.push({ path: "app.blueprint.json", item: t.id, job: j });
  for (const d of documents.filter((x) => x.type === "ux-decision")) {
    const text = readFileSync(join(app, d.path), "utf8");
    for (const j of new Set(text.match(/\bJ-[1-9][0-9]*\b/g) ?? [])) cites.push({ path: d.path, item: d.id, job: j });
  }
  for (const c of cites) {
    const job = jobs?.[c.job];
    if (!job) { problems.push({ path: c.path, message: `${c.item} cites ${c.job}, which docs/ux/jobs.md does not have` }); continue; }
    if (job.confidence === "low") warnings.push({ path: c.path, message: `${c.item} relies on ${c.job} ("${job.job}"), whose confidence is low` });
  }
  return { documents, problems, warnings, notes, valid: problems.length === 0 };
}

export const exampleFile = (type) => join(ARTIFACTS, type, "example.md");
export const templateFile = (type) => join(ARTIFACTS, type, "template.md");
