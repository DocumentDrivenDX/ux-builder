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
import { DesignError } from "./app.mjs";
import { helixRoot, jobsTable, parseDocument, uxDocuments } from "./documents.mjs";
import { readState } from "./state.mjs";
import { kits, testKit } from "./testkit.mjs";

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
  const bp = readJson(join(app, "app.blueprint.json")) ?? {};
  const BP = "app.blueprint.json";

  for (const [id, j] of Object.entries(jobsTable(app) ?? {})) node(id, "job", j.job, "docs/ux/jobs.md");
  for (const t of list(bp.tasks).filter((x) => x?.id)) { node(t.id, "task", t.goal, BP); for (const j of list(t.jobs)) edge(j, t.id); }
  for (const s of list(bp.screens).filter((x) => x?.id)) {
    node(`screen:${s.id}`, "screen", s.title ?? s.id, BP);
    if (s.pattern) { node(`pattern:${s.pattern}`, "pattern", s.pattern, BP); edge(`screen:${s.id}`, `pattern:${s.pattern}`); }
  }
  for (const page of files(app, "prototype", (f) => f.endsWith(".html") && !f.endsWith("/index.html"))) {
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
    const text = existsSync(join(app, `docs/ux/tests/${kit}/scenarios.md`)) ? readFileSync(join(app, `docs/ux/tests/${kit}/scenarios.md`), "utf8") : "";
    for (const [, n, journey] of text.matchAll(/^\| (\d+) \| (J-[^ |]+) \|/gm)) { const id = `${kit}#${n}`; node(id, "test-kit task", `${kit} task ${n}`, `docs/ux/tests/${kit}/scenarios.md`); edge(journey, id); }
    const findings = readJson(join(app, `docs/ux/tests/${kit}/findings.json`))?.findings ?? [];
    for (const f of findings) { node(f.id, "finding", f.title ?? f.remark ?? f.id, `docs/ux/tests/${kit}/findings.json`); edge(`${kit}#${f.task}`, f.id); }
  }
  const runs = existsSync(join(app, "ux-assessment")) ? readdirSync(join(app, "ux-assessment")).filter((n) => /^R-/.test(n)).sort() : [];
  if (runs.length) for (const f of readJson(join(app, "ux-assessment", runs.at(-1), "backlog.json"))?.findings ?? []) {
    if (f.id && f.journey_id && nodes.has(f.journey_id)) { node(f.id, "finding", f.title ?? f.id, `ux-assessment/${runs.at(-1)}/backlog.json`); edge(f.journey_id, f.id); }
  }
  // Decision records, linked to what they name.
  for (const d of uxDocuments(app).filter((x) => x.type === "ux-decision")) {
    const doc = parseDocument(readFileSync(join(app, d.path), "utf8"));
    node(d.id, "decision", doc.body.match(/^# UXD-\d+: (.+)$/m)?.[1] ?? d.id, d.path);
    nodes.get(d.id).status = doc.front?.ux?.status;
    const named = new Set([...list(doc.front?.ux?.links).map((l) => String(l.to)), ...(doc.body.match(/\b(?:J|T)-[A-Za-z0-9-]+\b/g) ?? [])]);
    for (const s of list(bp.screens).filter((x) => x?.id)) if (new RegExp(`\\b${s.id}\\b`).test(doc.body)) named.add(`screen:${s.id}`);
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
  if (!at) throw new DesignError(`no ${id ?? "ID"} in the app: use a J-, T-, journey, screen, UXD-, TK-n#task or F- ID`);
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
  const before = readJson(join(app, "app.blueprint.json")) ?? {};
  const reached = impact(app, { change });
  // The blueprint takes the edit either way; a failing check leaves it for the person to fix.
  writeFileSync(join(app, "app.blueprint.json"), JSON.stringify(next, null, 2) + "\n");
  const errors = checkBlueprint(next).filter((f) => f.severity === "error");
  const delta = complexityDelta(before, next);
  if (errors.length) return { applied: false, change: reached.change, errors, delta, regenerated: [], proposals: null, summary: summaryOf(reached, delta, [], errors) };
  const regenerated = [];
  // The prototypes of the app's own blueprint (prototype/current*).
  const { writePrototype } = await import("@ux-builder/ui/blueprint/prototype");
  for (const dir of existsSync(join(app, "prototype")) ? readdirSync(join(app, "prototype")).filter((n) => /^current(-[a-z0-9-]+)?$/.test(n)) : []) {
    // The theme it was drawn in: its assets hold that theme's CSS beside ui.css and patterns.css.
    const assetsDir = join(app, "prototype", dir, "assets");
    const theme = (existsSync(assetsDir) ? readdirSync(assetsDir) : []).find((f) => f.endsWith(".css") && !["ui.css", "patterns.css"].includes(f))?.replace(/\.css$/, "") ?? "plain";
    await writePrototype(next, { root: join(app, "prototype"), dir, question: reached.change, theme });
    regenerated.push(`prototype/${dir}/`);
  }
  for (const kit of kits(app)) { testKit(app, { id: kit }); regenerated.push(`docs/ux/tests/${kit}/`); }
  // HELIX changes only as proposals the person applies.
  let proposals = null;
  if (helixRoot(app)) {
    const { propose, writeProposals } = await import("@ux-builder/ui/blueprint/propose");
    const r = propose(next, { blueprintFile: join(app, "app.blueprint.json") });
    if (r.marker) { writeProposals(r, join(app, "helix-proposals")); proposals = { patches: r.proposals.length, drafts: r.drafts.length, dir: "helix-proposals/" }; }
  }
  try { recordDecision(app, { chose: `Applied: ${reached.change}`, why: `The person accepted the change after reviewing its impact (${reached.affected.length} items).`, relied: reached.matched.map((m) => m.id) }, { by: "agent" }); } catch (e) { process.emitWarning(`the change was not written to the trace: ${e.message}`); }
  return { applied: true, change: reached.change, errors: [], delta, regenerated, proposals, summary: summaryOf(reached, delta, regenerated, []) };
}

/* One summary of a change: what it reached, the complexity per journey, what was regenerated. */
export function summaryOf(reached, delta, regenerated, errors) {
  const lines = [`Change: ${reached.change}`];
  if (errors.length) {
    lines.push(`The blueprint check fails (${errors.length} error${errors.length === 1 ? "" : "s"}); nothing was regenerated. Fix app.blueprint.json:`);
    for (const e of errors) lines.push(`  ${e.rule} ${e.path}: ${e.message}`);
  }
  for (const j of delta.journeys) {
    const n = (o) => Object.entries(o).filter(([, v]) => v.length).map(([k, v]) => `${v.length} ${k}`).join(", ");
    lines.push(`  ${j.journey}: ${n(j.added) ? `+${n(j.added)}` : ""}${n(j.added) && n(j.removed) ? "; " : ""}${n(j.removed) ? `-${n(j.removed)}` : ""}`);
  }
  if (!delta.journeys.length) lines.push("  No journey changed.");
  if (regenerated.length) lines.push(`Regenerated: ${regenerated.join(", ")}`);
  return lines.join("\n");
}
