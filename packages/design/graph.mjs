/* The ID graph (CONTRACT-008 Commands, FEAT-018 GDL-47 to GDL-49; SD-006
   Impact and trace): what links a job to a task, a journey, its screens,
   their pattern and prototype pages, its test-kit tasks and findings, and
   the HELIX documents behind it. trace walks it from one ID; impact finds
   what a change in plain words reaches, and with --apply makes the
   blueprint change, regenerates prototypes and kits, writes HELIX changes
   only as proposals, and records the decision. */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkBlueprint, complexityDelta } from "@ux-builder/ui/blueprint";
import { recordDecision } from "@ux-builder/trace";
import { DesignError, bpFile, proposalsDir, protoDir, ux } from "./app.mjs";
import { businessRules, helixRoot, jobsTable, parseDocument, ruleCitations, usersTable, uxDocuments } from "./documents.mjs";
import { uiDecisions } from "./decisions.mjs";
import { keyOf } from "./people.mjs";
import { readState } from "./state.mjs";
import { kits, studyTasks, testKit } from "./testkit.mjs";
import { studyRunDir } from "./studies.mjs";
import { reportsOf } from "@ux-builder/ui/blueprint/paths";

const list = (x) => (Array.isArray(x) ? x : []);
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

/* Every file under a folder, relative to the app. */
function files(app, dir, test = () => true) {
  const out = [];
  const root = join(app, dir);
  if (!existsSync(root)) return out;
  const walk = (d, rel) => { for (const n of readdirSync(d).sort()) { const p = join(d, n); const r = `${rel}/${n}`; if (statSync(p).isDirectory()) { if (n !== ".archive") walk(p, r); } else if (test(r)) out.push(r.slice(1)); } };
  walk(root, "");
  return out.map((f) => `${dir}/${f}`);
}

/* The graph: nodes { id: { id, kind, label, file } } and directed edges
   from upstream to downstream. */
export function buildGraph(app) {
  const nodes = new Map(), edges = [];
  const node = (id, kind, label, file) => { if (!nodes.has(id)) nodes.set(id, { id, kind, label: label ?? id, file }); return id; };
  const edge = (from, to) => { if (from && to && from !== to) edges.push([from, to]); };
  const bp = readJson(join(app, bpFile(app))) ?? {};
  const BP = bpFile(app);

  // The PRD's needs and users (ADR-042), by key: a user holds needs, and tasks serve users.
  for (const [id, j] of Object.entries(jobsTable(app) ?? {})) node(id, "job", j.job, j.path);
  for (const [id, u] of Object.entries(usersTable(app) ?? {})) { node(id, "user", u.user, u.path); for (const h of u.jobs) edge(id, h.job); }
  for (const t of list(bp.tasks).filter((x) => x?.id)) { node(t.id, "task", t.goal, BP); for (const j of list(t.needs ?? t.jobs)) edge(keyOf(j), t.id); for (const u of list(t.users)) edge(keyOf(u), t.id); }
  // Business rules (GDL-78), defined in HELIX: a rule applies to the tasks and journey steps that cite it.
  const rules = businessRules(app).rules;
  for (const c of ruleCitations(bp)) {
    node(c.rule, "rule", rules[c.rule]?.text ?? c.rule, rules[c.rule]?.file ?? null);
    if (c.kind === "task") edge(c.rule, c.item);
    else { edge(c.rule, c.journey); if (c.screen) edge(c.rule, `screen:${c.screen}`); }
  }
  for (const s of list(bp.screens).filter((x) => x?.id)) {
    node(`screen:${s.id}`, "screen", s.title ?? s.id, BP);
    if (s.pattern) { node(`pattern:${s.pattern}`, "pattern", s.pattern, BP); edge(`screen:${s.id}`, `pattern:${s.pattern}`); }
  }
  for (const page of files(app, protoDir(app), (f) => f.endsWith(".html") && !f.endsWith("/index.html"))) {
    const screen = page.split("/").pop().split(".")[0];
    if (nodes.has(`screen:${screen}`)) { node(`page:${page}`, "prototype page", page, page); edge(`screen:${screen}`, `page:${page}`); }
  }
  // HELIX documents by their ID, and stories by theirs.
  const helix = new Map();
  const root = helixRoot(app);
  if (root) for (const f of files(app, root.replace(/\/$/, ""), (x) => x.endsWith(".md"))) {
    const doc = parseDocument(readFileSync(join(app, f), "utf8"));
    if (doc.front?.ddx?.id) helix.set(String(doc.front.ddx.id), { file: f, body: doc.body });
  }
  for (const j of list(bp.journeys).filter((x) => x?.id)) {
    node(j.id, "journey", j.id, BP);
    if (j.task) edge(j.task, j.id);
    if (j.story) { node(j.story, "HELIX document", helix.get(j.story)?.body.match(/^# (.+)$/m)?.[1] ?? j.story, helix.get(j.story)?.file ?? null); edge(j.story, j.id); }
    for (const st of [...list(j.steps), ...list(j.alternates).flatMap((a) => list(a?.steps))]) if (nodes.has(`screen:${st?.screen}`)) edge(j.id, `screen:${st.screen}`);
  }
  // HELIX documents that name a screen (a wireframe, a state diagram, a solution design).
  for (const [id, h] of helix) for (const s of list(bp.screens).filter((x) => x?.id)) {
    if (new RegExp(`\`${s.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``).test(h.body) && !/^US-\d+$/.test(id)) { node(id, "HELIX document", h.body.match(/^# (.+)$/m)?.[1] ?? id, h.file); edge(`screen:${s.id}`, id); }
  }
  // Test-kit tasks, by journey; findings, by journey.
  for (const kit of kits(app)) {
    const run = studyRunDir(app, kit);
    for (const t of studyTasks(app, kit)) { const id = `${kit}#${t.n}`; node(id, "test-kit task", `the ${kit} study, task ${t.n}`, `${run}/tasks.json`); if (nodes.has(t.journey)) edge(t.journey, id); }
    const findings = readJson(join(app, `${run}/findings.json`))?.findings ?? [];
    for (const f of findings) { node(f.id, "finding", f.title ?? f.remark ?? f.id, `${run}/findings.json`); edge(`${kit}#${f.task}`, f.id); }
  }
  const assessments = reportsOf(app).assessments;
  const runs = existsSync(join(app, assessments)) ? readdirSync(join(app, assessments)).filter((n) => /^R-/.test(n)).sort() : [];
  if (runs.length) for (const f of readJson(join(app, assessments, runs.at(-1), "backlog.json"))?.findings ?? []) {
    if (f.id && f.journey_id && nodes.has(f.journey_id)) { node(f.id, "finding", f.title ?? f.id, `${assessments}/${runs.at(-1)}/backlog.json`); edge(f.journey_id, f.id); }
  }
  // Decision records, linked to what they name.
  for (const d of uiDecisions(app)) {
    node(d.id, "decision", d.title, d.path);
    nodes.get(d.id).status = d.status;
    const named = new Set([...d.links, ...(d.text.match(/\b(?:J|T)-[A-Za-z0-9-]+\b/g) ?? [])]);
    for (const s of list(bp.screens).filter((x) => x?.id)) if (new RegExp(`\\b${s.id}\\b`).test(d.text)) named.add(`screen:${s.id}`);
    for (const id of named) if (nodes.has(id) && id !== d.id) edge(d.id, id);
  }
  return { nodes, edges, bp };
}

function reach(edges, from, forward = true) {
  const seen = new Set(), out = [];
  const next = (id) => edges.filter(([a, b]) => (forward ? a : b) === id).map(([a, b]) => (forward ? b : a));
  const stack = [...from];
  while (stack.length) for (const n of next(stack.pop())) if (!seen.has(n) && !from.includes(n)) { seen.add(n); out.push(n); stack.push(n); }
  return out;
}

const view = (nodes, ids) => ids.map((id) => nodes.get(id)).filter(Boolean).map(({ id, kind, label, file }) => ({ id, kind, label, file })).sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));

/* The node an ID names: a bare screen ID is a screen. */
function resolveId(nodes, id) {
  if (nodes.has(id)) return id;
  if (nodes.has(`screen:${id}`)) return `screen:${id}`;
  return null;
}

/* ux-builder-design trace <id>. */
export function trace(app, { id } = {}) {
  const { nodes, edges } = buildGraph(app);
  const at = resolveId(nodes, id ?? "");
  if (!at) throw new DesignError(`no ${id ?? "ID"} in the app: use a J-, T-, journey, screen, ADR-, <study>#task or F- ID`);
  const { id: _, ...self } = nodes.get(at);
  return { item: { id: at, ...self }, upstream: view(nodes, reach(edges, [at], false)), downstream: view(nodes, reach(edges, [at], true)) };
}

const STOP = new Set(["the", "and", "for", "from", "with", "before", "after", "into", "onto", "that", "this", "when", "make", "move", "remove", "add", "change", "show", "users", "user", "screen", "step", "page", "them", "their", "should", "must", "not"]);
const words = (s) => String(s ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
const stem = (w) => w.replace(/(ions|ion|ing|ies|es|s)$/, "");

/* What a change names: screens (by ID, title or an action), tasks (goal),
   journeys (ID or a step's decision). A word that appears in more than two
   of them names the domain, not an item ("river" in a rivers app), and is
   left out unless nothing else matches. */
function matches(bp, change) {
  const items = [
    ...list(bp.screens).filter((x) => x?.id).map((s) => ({ id: `screen:${s.id}`, texts: [s.id, s.title, ...list(s.actions).map((a) => a?.label)] })),
    ...list(bp.tasks).filter((x) => x?.id).map((t) => ({ id: t.id, texts: [t.goal] })),
    ...list(bp.journeys).filter((x) => x?.id).map((j) => ({ id: j.id, texts: [j.id, ...list(j.steps).map((s) => s?.decision)] })),
  ].map((it) => ({ ...it, stems: new Set(it.texts.flatMap((t) => words(t)).map(stem)) }));
  const asked = [...new Set(words(change).map(stem))];
  const spread = (w) => items.filter((it) => it.stems.has(w)).length;
  const distinctive = asked.filter((w) => spread(w) > 0 && spread(w) <= 2);
  const use = new Set(distinctive.length ? distinctive : asked);
  return items.filter((it) => [...use].some((w) => it.stems.has(w))).map((it) => it.id);
}

/* ux-builder-design impact "<change>": everything the change reaches. */
export function impact(app, { change } = {}) {
  if (!change?.trim()) throw new DesignError('impact needs the change in plain words: impact "<change>"');
  const { nodes, edges, bp } = buildGraph(app);
  const hits = matches(bp, change);
  const up = reach(edges, hits, false);
  const journeys = [...hits, ...up].filter((id) => nodes.get(id)?.kind === "journey");
  const ids = new Set([...hits, ...up, ...reach(edges, hits, true),
    // A journey a change reaches carries its test-kit tasks and findings, not its other screens.
    ...reach(edges, journeys, true).filter((id) => ["test-kit task", "finding"].includes(nodes.get(id)?.kind))]);
  const decisions = [...ids].map((id) => nodes.get(id)).filter((n) => n?.kind === "decision");
  const tested = decisions.filter((d) => d.status === "tested");
  const affected = view(nodes, [...ids].filter((id) => nodes.get(id)?.kind !== "decision"));
  let mode = "full";
  try { mode = readState(app).mode; } catch { /* no state */ }
  return {
    change: change.trim(), mode, matched: view(nodes, hits), affected,
    decisions: decisions.map(({ id, label, status, file }) => ({ id, label, status, file })),
    ...(tested.length ? { checkpointRequired: "significant-change", because: `it reaches ${tested.map((d) => d.id).join(", ")}, already tested` } : {}),
  };
}

/* impact --apply --set <blueprint>: make the change the person accepted. */
export async function applyImpact(app, { change, set } = {}) {
  if (!set) throw new DesignError("impact --apply needs --set <file>: the blueprint with the change made");
  const next = readJson(join(app, set)) ?? readJson(set);
  if (!next) throw new DesignError(`${set} is not a readable blueprint`);
  const before = readJson(join(app, bpFile(app))) ?? {};
  const reached = impact(app, { change });
  // The blueprint takes the edit either way; a failing check leaves it for the person to fix.
  writeFileSync(join(app, bpFile(app)), JSON.stringify(next, null, 2) + "\n");
  const errors = checkBlueprint(next).filter((f) => f.severity === "error");
  const delta = complexityDelta(before, next);
  if (errors.length) return { applied: false, change: reached.change, errors, delta, regenerated: [], proposals: null, summary: summaryOf(reached, delta, [], errors) };
  const regenerated = [];
  // The prototypes of the app's own blueprint: prototype/current*, and the chosen alternative's, which app.blueprint.json now is.
  let chosen = null;
  try { chosen = readState(app).alternatives.find((a) => a.status === "chosen")?.name ?? null; } catch { /* no design state */ }
  const { writePrototype } = await import("@ux-builder/ui/blueprint/prototype");
  const protos = protoDir(app);
  for (const dir of existsSync(join(app, protos)) ? readdirSync(join(app, protos)).filter((n) => /^current(-[a-z0-9-]+)?$/.test(n) || (chosen && (n === chosen || n.startsWith(`${chosen}-`)))) : []) {
    // The theme it was drawn in: its assets hold that theme's CSS beside ui.css and patterns.css.
    const assetsDir = join(app, protos, dir, "assets");
    const theme = (existsSync(assetsDir) ? readdirSync(assetsDir) : []).find((f) => f.endsWith(".css") && !["ui.css", "patterns.css"].includes(f))?.replace(/\.css$/, "") ?? "plain";
    await writePrototype(next, { root: join(app, protos), dir, question: reached.change, theme });
    regenerated.push(`${protos}/${dir}/`);
  }
  for (const kit of kits(app)) { testKit(app, { study: kit }); regenerated.push(`${studyRunDir(app, kit)}/`); }
  // HELIX changes only as proposals the person applies.
  let proposals = null;
  if (helixRoot(app)) {
    const { propose, writeProposals } = await import("@ux-builder/ui/blueprint/propose");
    const r = propose(next, { blueprintFile: join(app, bpFile(app)) });
    if (r.marker) { writeProposals(r, join(app, proposalsDir(app))); proposals = { patches: r.proposals.length, drafts: r.drafts.length, dir: `${proposalsDir(app)}/` }; }
  }
  try { recordDecision(app, { chose: `Applied: ${reached.change}`, why: `The person accepted the change after reviewing its impact (${reached.affected.length} items).`, relied: reached.matched.map((m) => m.id) }, { by: "agent" }); } catch (e) { process.emitWarning(`the change was not written to the trace: ${e.message}`); }
  return { applied: true, change: reached.change, errors: [], delta, regenerated, proposals, summary: summaryOf(reached, delta, regenerated, [], proposals) };
}

/* One summary of a change: what it reached, the complexity per journey, what was regenerated. */
export function summaryOf(reached, delta, regenerated, errors, proposals = null) {
  const lines = [`Change: ${reached.change}`];
  if (errors.length) {
    lines.push(`The blueprint check fails (${errors.length} error${errors.length === 1 ? "" : "s"}); nothing was regenerated. Fix the blueprint:`);
    for (const e of errors) lines.push(`  ${e.rule} ${e.path}: ${e.message}`);
  }
  for (const j of delta.journeys) {
    const n = (o) => Object.entries(o).filter(([, v]) => v.length).map(([k, v]) => `${v.length} ${k}`).join(", ");
    lines.push(`  ${j.journey}: ${n(j.added) ? `+${n(j.added)}` : ""}${n(j.added) && n(j.removed) ? "; " : ""}${n(j.removed) ? `-${n(j.removed)}` : ""}`);
  }
  if (!delta.journeys.length) lines.push("  No journey changed.");
  if (regenerated.length) lines.push(`Regenerated: ${regenerated.join(", ")}`);
  if (proposals?.patches || proposals?.drafts) lines.push(`Proposed to HELIX: ${proposals.patches} patch${proposals.patches === 1 ? "" : "es"}${proposals.drafts ? ` and ${proposals.drafts} draft${proposals.drafts === 1 ? "" : "s"}` : ""} in ${proposals.dir}; nothing in HELIX is changed until the person applies them.`);
  return lines.join("\n");
}
