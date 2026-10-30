/* ux-builder-design brief (CONTRACT-008 Commands, FEAT-018 GDL-14 to
   GDL-16): the experience brief, docs/ux/brief.md and a page to read,
   from the HELIX PRD, principles.md's Experience Principles, the stories
   and the design state, every point marked with its status. */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ux, writeInApp } from "./app.mjs";
import { helixRoot, jobsTable, parseDocument, usersTable } from "./documents.mjs";
import { experiencePrinciples, readPrinciplesFile, statePrinciples } from "./principles.mjs";
import { slug } from "./helix.mjs";
import { readState } from "./state.mjs";

export const BRIEF_SECTIONS = [
  ["product", "Product"],
  ["users", "Target users"],
  ["outcome", "Primary outcome"],
  ["jobs", "Primary jobs"],
  ["principles", "Experience principles"],
  ["constraints", "Constraints"],
  ["questions", "Open questions"],
];
/* Where each section is compiled from (ADR-042 decision 3: the brief holds no fact of its own). */
export const BRIEF_SOURCES = {
  product: "the PRD's title and Summary",
  users: "the PRD's User Segments",
  outcome: "the PRD, and the design state's assumptions until it says",
  jobs: "the PRD's User Needs and the user stories",
  principles: "principles.md's Experience Principles",
  constraints: "the PRD's Constraints, and the design state's assumptions",
  questions: "the design state's open questions",
};

/* HELIX documents under the marker's root: [{ path, front, body }]. */
function helixDocs(app) {
  const root = helixRoot(app);
  if (!root || !existsSync(join(app, root))) return [];
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(app, dir)).sort()) {
      const rel = `${dir.replace(/\/$/, "")}/${name}`;
      if (statSync(join(app, rel)).isDirectory()) walk(rel);
      else if (name.endsWith(".md")) out.push({ path: rel, ...parseDocument(readFileSync(join(app, rel), "utf8")) });
    }
  };
  walk(root);
  return out;
}

/* The lines under a heading (## or ###) up to the next heading of that
   level or above. */
function under(body, heading) {
  const lines = body.split("\n");
  const i = lines.findIndex((l) => new RegExp(`^#{2,3} ${heading}\\s*$`, "i").test(l));
  if (i < 0) return [];
  const level = lines[i].match(/^#+/)[0].length;
  const rest = lines.slice(i + 1);
  const end = rest.findIndex((l) => { const m = l.match(/^(#+) /); return m && m[1].length <= level; });
  return end < 0 ? rest : rest.slice(0, end);
}

const sentence = (text) => (text.match(/^[^.!?]*[.!?]/)?.[0] ?? text).trim();
/* Text still the template's: a [placeholder] (a Markdown link is not one). */
const placeholder = (text) => /\[/.test(String(text).replace(/\[[^\]]*\]\([^)]*\)/g, ""));

/* What the PRD and stories say, as confirmed points by section. */
function fromHelix(docs) {
  const points = Object.fromEntries(BRIEF_SECTIONS.map(([k]) => [k, []]));
  const prd = docs.find((d) => d.front?.ddx?.id === "prd" || d.front?.ddx?.type === "prd");
  if (prd) {
    const title = prd.body.match(/^# (.+)$/m)?.[1]?.replace(/^Product Requirements Document\s*[—-]\s*/i, "").trim();
    const summary = under(prd.body, "Summary").filter((l) => l.trim() && !l.startsWith(">") && !l.startsWith("|")).join(" ").trim();
    const lead = [title && !/^Product Requirements Document$/i.test(title) ? title : null, summary && sentence(summary)].filter((x) => x && !placeholder(x)).join(": ");
    if (lead) points.product.push({ text: lead, status: "confirmed", from: "prd" });
    for (const [, who] of prd.body.matchAll(/^### (?:Primary|Secondary) Persona: (.+)$/gm)) if (!placeholder(who)) points.users.push({ text: who.trim(), status: "confirmed", from: "prd" });
    for (const l of under(prd.body, "Constraints")) { const m = l.match(/^\s*[-*] (.+)$/); if (m && !placeholder(m[1])) points.constraints.push({ text: m[1].replace(/\*\*/g, "").trim(), status: "confirmed", from: "prd" }); }
  }
  for (const d of docs.filter((x) => /^US-\d+$/.test(String(x.front?.ddx?.id ?? "")))) {
    const t = d.body.match(/^# (US-\d+): (.+)$/m);
    if (t) points.jobs.push({ text: `${t[1]}: ${t[2].trim()}`, status: "confirmed", from: t[1] });
  }
  return { points, prd: !!prd };
}

const LABEL = { confirmed: "confirmed", assumed: "assumed", hypothesis: "hypothesis", "current-state": "current state, assumed" };

/* The brief's content: { sections: [{ key, heading, points }], helix, notes }. */
export function briefContent(app) {
  const state = readState(app);
  const docs = helixDocs(app);
  const helix = helixRoot(app) !== null;
  const { points, prd } = fromHelix(docs);
  for (const a of state.assumptions) {
    if (a.status === "refuted" || !a.section) continue;
    points[a.section].push({ text: a.text, status: a.status, id: a.id, confirm: a.confirm });
  }
  // Experience principles are HELIX's (principles.md, ADR-042); a checkable one names its rule.
  const rules = new Map((readPrinciplesFile(app).principles ?? []).map((x) => [x.key ?? slug(x.text ?? ""), x.rule?.kind]));
  for (const p of experiencePrinciples(app)) points.principles.push({ text: p.text, status: p.status, rule: rules.get(slug(p.text)) });
  for (const q of state.questions) if (q.status === "open") points.questions.push({ text: q.text, status: null });
  const notes = [];
  // The PRD's User Needs lead the primary jobs, before the stories (ADR-042).
  const needs = jobsTable(app);
  if (needs) points.jobs.unshift(...Object.values(needs).map((n) => ({ text: n.job, status: n.status, confirm: `a study that supports it, cited in ${n.path}'s User Needs` })));
  // Target users in the PRD's User Segments are the only source of the section (GDL-77, ADR-042).
  const users = usersTable(app);
  if (users && Object.keys(users).length) {
    const path = Object.values(users)[0].path;
    points.users = Object.values(users).map((u) => ({ text: `${u.user}: ${u.context}`, status: u.status, confirm: `research about these users (a study, ux-builder-design evidence add), cited in ${path}'s User Segments` }));
    notes.push(`Target users are from ${path}, User Segments.`);
  }
  const old = statePrinciples(state);
  if (old.length) notes.push(`${old.length === 1 ? "One experience principle is" : `${old.length} experience principles are`} still in the design state; propose ${old.length === 1 ? "it" : "them"} to principles.md with ux-builder-design principle add.`);
  if (!helix) notes.push("HELIX was not found (no .helix.yml): the brief is built from the design state alone.");
  else if (!prd) notes.push("HELIX has no PRD yet: the brief is built from the stories and the design state.");
  return { sections: BRIEF_SECTIONS.map(([key, heading]) => ({ key, heading, points: points[key] })), helix, prd, users: !!users, notes };
}

function markdown(content, name) {
  const lines = [];
  lines.push("---", "ux:", "  id: brief", "  type: experience-brief");
  const links = [content.prd && "prd"].filter(Boolean);
  if (links.length) lines.push("  links:", ...links.flatMap((to) => ["    - kind: informed_by", `      to: ${to}`]));
  lines.push("---", "", `# Experience brief${name ? `: ${name}` : ""}`, "");
  for (const s of content.sections) {
    lines.push(`## ${s.heading}`, "", `_From ${BRIEF_SOURCES[s.key]}._`, "");
    if (!s.points.length) lines.push(s.key === "questions" ? "- None open." : "- Not yet known.");
    for (const p of s.points) {
      lines.push(`- ${p.text}${p.status ? ` [${LABEL[p.status]}]` : ""}${p.rule ? ` (checked: ${p.rule})` : ""}`);
      if (p.status === "hypothesis") lines.push(`  Confirm by: ${p.confirm?.trim() || "to be decided with the person"}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* The brief as a page to read in a browser; plain HTML, no scripts. */
export function briefHtml(content, name) {
  const body = content.sections.map((s) => `<section><h2>${esc(s.heading)}</h2><ul>${(s.points.length ? s.points : [{ text: s.key === "questions" ? "None open." : "Not yet known.", status: null }]).map((p) => `<li>${esc(p.text)}${p.status ? ` <span class="status status-${esc(p.status)}">${esc(LABEL[p.status])}</span>` : ""}${p.status === "hypothesis" ? `<br><small>Confirm by: ${esc(p.confirm?.trim() || "to be decided with the person")}</small>` : ""}</li>`).join("")}</ul></section>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Experience brief${name ? `: ${esc(name)}` : ""}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem}h2{margin-top:1.5rem;font-size:1.1rem}.status{font-size:.75rem;border:1px solid;border-radius:1rem;padding:0 .5rem}.status-hypothesis{border-style:dashed}</style>
</head><body><h1>Experience brief${name ? `: ${esc(name)}` : ""}</h1>
${content.notes.map((n) => `<p><em>${esc(n)}</em></p>`).join("\n")}
${body}
</body></html>
`;
}

export function brief(app, { name } = {}) {
  const content = briefContent(app);
  let product = name;
  if (!product) { try { product = JSON.parse(readFileSync(join(app, "package.json"), "utf8")).name; } catch { product = ""; } }
  const written = [
    writeInApp(app, ux(app, "brief.md"), markdown(content, product)),
    writeInApp(app, ux(app, "brief.html"), briefHtml(content, product)),
  ];
  return { written, sections: content.sections, notes: content.notes, helix: content.helix };
}

/* Whether docs/ux-builder/brief.md still says what its sources say: null when it does or there is none, else a warning. */
export function briefStale(app) {
  const path = ux(app, "brief.md");
  let text;
  try { text = readFileSync(join(app, path), "utf8"); } catch { return null; }
  let content;
  try { content = briefContent(app); } catch { return null; }
  const body = (t) => t.slice(t.indexOf("\n## ")).trim();
  return body(markdown(content, "")) === body(text) ? null : { path, message: "the brief no longer says what the PRD, principles.md, the stories and the design state say: regenerate it with ux-builder-design brief (it holds no fact of its own)" };
}
