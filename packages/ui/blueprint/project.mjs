/* What the blueprint's flow and journeys project into documents and
   drawings (FEAT-012 DRF-01, DRW-01; ADR-030 decisions 5 and 6). Internal to
   @ux-builder/ui/blueprint: propose.mjs and draw.mjs use it.

   Pure functions of the blueprint: the same blueprint gives the same text,
   in blueprint order, so drafts and drawings are deterministic. Graphs are
   { nodes: [{ id, label, sub?, shape }], edges: [{ from, to, label?, dashed? }] }:
   draw.mjs writes each one as Mermaid and as SVG, so the two show the same
   thing. */

import catalogue from "../catalogue.json" with { type: "json" };

const list = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === "object") : []);
const SIZE_ORDER = catalogue.sizeClasses.map((s) => s.name);
const DEFAULT_SIZES = ["compact", "medium", "expanded"];

/* The size classes the blueprint supports, in catalogue order. */
export const sizesOf = (bp) => {
  const s = Array.isArray(bp?.supports?.sizeClasses) && bp.supports.sizeClasses.length ? bp.supports.sizeClasses : DEFAULT_SIZES;
  return SIZE_ORDER.filter((n) => s.includes(n));
};

/* Where AppShell puts a destination at a size class (its catalogue entry):
   a bottom bar of up to five below medium (four and More when there are
   more, the rest in a drawer), a rail at medium, side navigation from
   expanded. */
export function placement(size, index, count) {
  if (size === "compact") return count <= 5 || index < 4 ? "Bottom bar" : "More (drawer)";
  if (size === "medium") return "Rail";
  return "Side navigation";
}

/* Screens by ID with their modals (nested ones too), in blueprint order. */
export function screensOf(bp) {
  const screens = new Map();
  const walk = (modals, into) => { for (const m of list(modals)) { if (typeof m.id === "string" && !into.has(m.id)) into.set(m.id, m); walk(m.modals, into); } };
  for (const s of list(bp?.screens)) {
    if (typeof s.id !== "string" || screens.has(s.id)) continue;
    const modals = new Map();
    walk(s.modals, modals);
    screens.set(s.id, { s, modals });
  }
  return screens;
}

const titleOf = (screens, id) => screens.get(id)?.s.title ?? id;

/* Where an action's `to` leads from a node ({ screen, modal? }). */
export function target(to, at, screens) {
  if (typeof to !== "string") return null;
  if (to === "back") return { kind: "back" };
  if (to === "external") return { kind: "external" };
  if (to.startsWith("modal:")) return screens.get(at.screen)?.modals.has(to.slice(6)) ? { kind: "modal", screen: at.screen, modal: to.slice(6) } : null;
  if (to.startsWith("state:")) return { kind: "state", screen: at.screen, modal: at.modal, state: to.slice(6) };
  return screens.has(to) ? { kind: "screen", screen: to } : null;
}

/* A Mermaid- and SVG-safe node ID. */
export const nodeId = (n) => (n.modal ? `${n.screen}__${n.modal}` : n.screen).replace(/[^A-Za-z0-9_]/g, "_");
const modalOf = (screens, n) => screens.get(n.screen)?.modals.get(n.modal);
export const nodeTitle = (screens, n) => (n.modal ? modalOf(screens, n)?.title || n.modal : titleOf(screens, n.screen));
const actionsOf = (screens, n) => list(n.modal ? modalOf(screens, n)?.actions : screens.get(n.screen)?.s.actions);

/* A journey step's node: a screen, or modal:<id> of the screen it is on. */
function stepNode(st, current, screens) {
  if (typeof st?.screen !== "string") return null;
  if (st.screen.startsWith("modal:")) return current && screens.get(current.screen)?.modals.has(st.screen.slice(6)) ? { screen: current.screen, modal: st.screen.slice(6) } : null;
  return screens.has(st.screen) ? { screen: st.screen } : null;
}

/* A walk of steps: each step with its node, its action and where that leads. */
export function walk(steps, screens, start = null) {
  let current = start;
  return list(steps).map((st) => {
    const node = stepNode(st, current, screens) ?? current;
    current = node;
    const action = node && typeof st.action === "string" ? actionsOf(screens, node).find((a) => a.id === st.action) ?? null : null;
    const to = action && node ? target(action.to, node, screens) : null;
    return { st, node, action, to };
  });
}

/* The journey's steps and each alternate's, walked. */
export function walkJourney(j, screens) {
  const main = walk(j.steps, screens);
  const alternates = list(j.alternates).map((alt) => {
    const from = Number.isInteger(alt.from) ? main[alt.from] : null;
    return { alt, from: alt.from, steps: walk(alt.steps, screens, from?.node ?? null) };
  });
  return { main, alternates };
}

/* What an action does, in words: "Entry opens", "the user leaves the app". */
function outcome(to, screens) {
  if (!to) return null;
  if (to.kind === "screen") return `**${titleOf(screens, to.screen)}** opens`;
  if (to.kind === "modal") return `the **${nodeTitle(screens, to)}** dialog opens`;
  if (to.kind === "back") return "they go back";
  if (to.kind === "state") return `the screen shows its ${to.state} state`;
  return "they leave the app";
}
const plain = (s) => String(s ?? "").replace(/\*\*/g, "");

/* One sentence for a walked step. */
function sentence(w, screens) {
  const where = w.node ? `**${nodeTitle(screens, w.node)}**` : `"${w.st.screen}"`;
  const state = w.st.state ? ` (${w.st.state})` : "";
  if (w.action) {
    const then = outcome(w.to, screens);
    return `On ${where}${state}, the user chooses **${w.action.label ?? w.action.id}**${then ? `; ${then}` : ""}.${w.st.expect ? ` It shows its ${w.st.expect} state.` : ""}`;
  }
  if (typeof w.st.action === "string") return `On ${where}${state}, the user takes "${w.st.action}".`;
  return `On ${where}${state}, the user sees ${w.st.expect ? `its ${w.st.expect} state` : "the result"}.`;
}

/* A story's Walkthrough from its journey: one numbered step per journey step
   (US-089-AC1). */
export function walkthrough(j, screens) {
  const { main } = walkJourney(j, screens);
  return [`<!-- From blueprint journey ${j.id} (ux-builder-blueprint propose). -->`, ...main.map((w, k) => `${k + 1}. ${sentence(w, screens)}`)].join("\n");
}

/* Story test plan scenarios: one row per step and per alternate, each
   citing the journey's criteria (US-089-AC4). */
export function scenarioRows(j, screens) {
  const { main, alternates } = walkJourney(j, screens);
  const ac = Array.isArray(j.criteria) && j.criteria.length ? j.criteria.join(", ") : "—";
  const cell = (s) => { const t = plain(s).replace(/\|/g, "\\|"); return t.charAt(0).toUpperCase() + t.slice(1); };
  const where = (w) => (w.node ? nodeTitle(screens, w.node) : String(w.st.screen)) + (w.st.state ? ` (${w.st.state})` : "");
  const rows = main.map((w, k) => `| ${j.id} step ${k + 1}${w.st.scenario ? ` (${w.st.scenario})` : ""} | ${ac} | ${cell(where(w))} | ${cell(w.action ? `Choose ${w.action.label ?? w.action.id}` : "None")} | ${cell(w.action ? (outcome(w.to, screens) ?? "—") + (w.st.expect ? `; ${w.st.expect} state` : "") : w.st.expect ? `Its ${w.st.expect} state` : "The result is shown")} |`);
  alternates.forEach(({ alt, from, steps }, i) => {
    const first = steps[0], last = steps[steps.length - 1];
    const label = [`${j.id} alternate ${i + 1}`, alt.reason, alt.scenario].filter(Boolean).join(" — ");
    const did = steps.filter((w) => w.action).map((w, k) => `${w.action.label ?? w.action.id}${k ? ` on ${where(w)}` : ""}`);
    const end = last ? (last.action ? outcome(last.to, screens) : last.st.expect ? `Its ${last.st.expect} state` : `${where(last)} is shown`) : "—";
    rows.push(`| ${cell(label)} | ${ac} | ${cell(`From step ${Number.isInteger(from) ? from + 1 : "?"}: ${first ? where(first) : "—"}`)} | ${cell(did.length ? did.map((d) => `Choose ${d}`).join(", then ") : "None")} | ${cell(end ?? "—")} |`);
  });
  return [`<!-- From blueprint journey ${j.id} (ux-builder-blueprint propose): one row per step and per alternate. -->`, "| Scenario | AC IDs | Screen / State | Action | Expected Result |", "|----------|--------|----------------|--------|-----------------|", ...rows].join("\n");
}

/* DESIGN.md's navigation table: each destination's place at each supported
   size class (US-089-AC3). */
export function navTable(bp) {
  const screens = screensOf(bp);
  const dests = list(bp.destinations);
  const sizes = sizesOf(bp);
  return [
    `<!-- From the blueprint's destinations (ux-builder-blueprint propose); AppShell places them. -->`,
    `| Destination | Screen | ${sizes.join(" | ")} |`,
    `|---|---|${sizes.map(() => "---").join("|")}|`,
    ...dests.map((d, i) => `| ${d.label ?? d.id} | ${titleOf(screens, d.screen)} (\`${d.screen}\`) | ${sizes.map((s) => placement(s, i, dests.length)).join(" | ")} |`),
  ].join("\n");
}

/* ----------------------------------------------------------- graphs */

/* The flow: screens and modals joined by actions; destinations from the
   app's navigation (US-089-AC2, US-090-AC1). */
export function flowGraph(bp) {
  const screens = screensOf(bp);
  const nodes = [], edges = [], seen = new Set();
  const add = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } return n.id; };
  if (bp.kind !== "view" && list(bp.destinations).length) {
    add({ id: "nav", label: "Navigation", shape: "pill" });
    for (const d of list(bp.destinations)) if (screens.has(d.screen)) edges.push({ from: "nav", to: nodeId({ screen: d.screen }), label: d.label ?? d.id });
  }
  for (const [id, { s, modals }] of screens) {
    add({ id: nodeId({ screen: id }), label: s.title ?? id, sub: s.pattern, shape: "box" });
    for (const [mid, m] of modals) add({ id: nodeId({ screen: id, modal: mid }), label: m.title || mid, sub: m.kind ?? "modal", shape: "modal" });
  }
  for (const [id, { modals }] of screens) {
    for (const at of [{ screen: id }, ...[...modals.keys()].map((m) => ({ screen: id, modal: m }))]) {
      for (const a of actionsOf(screens, at)) {
        const t = target(a.to, at, screens);
        if (!t) continue;
        const label = a.label ?? a.id;
        if (t.kind === "screen" || t.kind === "modal") edges.push({ from: nodeId(at), to: nodeId(t), label });
        else if (t.kind === "state") edges.push({ from: nodeId(at), to: nodeId(at), label: `${label} (${t.state})` });
        else if (t.kind === "back") edges.push(at.modal ? { from: nodeId(at), to: nodeId({ screen: id }), label, dashed: true } : { from: nodeId(at), to: add({ id: "back", label: "Back", shape: "pill" }), label, dashed: true });
        else edges.push({ from: nodeId(at), to: add({ id: "external", label: "External", shape: "pill" }), label, dashed: true });
      }
    }
  }
  return { nodes, edges };
}

/* The IA map: the app, its destinations at each supported size class (where
   AppShell puts them), their screens, the screens actions lead to, and the
   modals (US-090-AC1). */
export function iaGraph(bp) {
  const screens = screensOf(bp);
  const nodes = [{ id: "app", label: bp.name ?? "App", sub: bp.kind === "view" ? "view" : "app", shape: "pill" }], edges = [];
  const placed = new Set();
  const screen = (id) => { const n = nodeId({ screen: id }); if (!placed.has(n)) { placed.add(n); nodes.push({ id: n, label: titleOf(screens, id), sub: screens.get(id).s.pattern, shape: "box" }); } return n; };
  const dests = list(bp.destinations).filter((d) => screens.has(d.screen));
  const roots = [];
  if (bp.kind !== "view" && dests.length) {
    for (const size of sizesOf(bp)) {
      const sid = `size_${size.replace(/[^a-z0-9]/g, "_")}`;
      nodes.push({ id: sid, label: size, sub: [...new Set(dests.map((_, i) => placement(size, i, dests.length)))].join(", "), shape: "pill" });
      edges.push({ from: "app", to: sid });
      dests.forEach((d, i) => {
        const did = `${sid}__${String(d.id ?? i).replace(/[^A-Za-z0-9_]/g, "_")}`;
        nodes.push({ id: did, label: d.label ?? d.id, sub: placement(size, i, dests.length), shape: "pill" });
        edges.push({ from: sid, to: did });
        edges.push({ from: did, to: screen(d.screen) });
        roots.push(d.screen);
      });
    }
  } else if (screens.size) {
    const first = [...screens.keys()][0];
    edges.push({ from: "app", to: screen(first) });
    roots.push(first);
  }
  // Screens the navigation does not reach directly hang under the first screen whose action leads there.
  const queue = [...new Set(roots)], reached = new Set(queue);
  while (queue.length) {
    const id = queue.shift();
    const { modals } = screens.get(id);
    for (const at of [{ screen: id }, ...[...modals.keys()].map((m) => ({ screen: id, modal: m }))]) {
      for (const a of actionsOf(screens, at)) {
        const t = target(a.to, at, screens);
        if (t?.kind === "screen" && !reached.has(t.screen)) { reached.add(t.screen); queue.push(t.screen); edges.push({ from: screen(id), to: screen(t.screen), label: a.label ?? a.id, dashed: true }); }
      }
    }
  }
  for (const id of screens.keys()) if (!reached.has(id)) { nodes.push({ id: nodeId({ screen: id }), label: titleOf(screens, id), sub: `${screens.get(id).s.pattern} (unreached)`, shape: "box" }); placed.add(nodeId({ screen: id })); }
  for (const [id, { modals }] of screens) for (const [mid, m] of modals) {
    nodes.push({ id: nodeId({ screen: id, modal: mid }), label: m.title || mid, sub: "modal", shape: "modal" });
    edges.push({ from: nodeId({ screen: id }), to: nodeId({ screen: id, modal: mid }), dashed: true });
  }
  return { nodes, edges };
}

/* One journey: its steps in order, and each alternate branching from its
   step (US-090-AC1). */
export function journeyGraph(j, screens) {
  const { main, alternates } = walkJourney(j, screens);
  const nodes = [], edges = [];
  const where = (w) => (w.node ? nodeTitle(screens, w.node) : String(w.st.screen));
  const end = (w, id) => {
    if (!w?.action || !w.to) return;
    const label = w.action.label ?? w.action.id;
    const t = w.to;
    const name = t.kind === "screen" || t.kind === "modal" ? nodeTitle(screens, t) : t.kind === "state" ? `${where(w)} (${t.state})` : t.kind === "back" ? "Back" : "External";
    nodes.push({ id: `${id}_end`, label: name, shape: t.kind === "back" || t.kind === "external" ? "pill" : t.kind === "modal" ? "modal" : "box" });
    edges.push({ from: id, to: `${id}_end`, label });
  };
  main.forEach((w, k) => {
    nodes.push({ id: `s${k + 1}`, label: `${k + 1}. ${where(w)}`, sub: w.st.state ?? w.st.expect ?? undefined, shape: w.node?.modal ? "modal" : "box" });
    if (k > 0) edges.push({ from: `s${k}`, to: `s${k + 1}`, label: main[k - 1].action ? main[k - 1].action.label ?? main[k - 1].action.id : undefined });
  });
  if (main.length) end(main[main.length - 1], `s${main.length}`);
  alternates.forEach(({ alt, from, steps }, i) => {
    const origin = Number.isInteger(from) && from < main.length ? `s${from + 1}` : null;
    if (!origin || !steps.length) return;
    const a = `a${i + 1}`;
    // The alternate's first step is on the step it branches from; the rest follow it.
    let prev = origin;
    steps.forEach((w, k) => {
      if (k === 0) return;
      const id = `${a}_${k}`;
      nodes.push({ id, label: `${where(w)}`, sub: [alt.reason ?? `alternate ${i + 1}`, w.st.state ?? w.st.expect].filter(Boolean).join(", "), shape: w.node?.modal ? "modal" : "box" });
      edges.push({ from: prev, to: id, label: steps[k - 1].action ? steps[k - 1].action.label ?? steps[k - 1].action.id : undefined, dashed: true });
      prev = id;
    });
    const last = steps[steps.length - 1];
    if (steps.length === 1 || last.action) {
      if (last.action && last.to) {
        const id = `${a}_end`;
        const t = last.to;
        nodes.push({ id, label: t.kind === "screen" || t.kind === "modal" ? nodeTitle(screens, t) : t.kind === "state" ? `${where(last)} (${t.state})` : t.kind === "back" ? "Back" : "External", sub: alt.reason ?? `alternate ${i + 1}`, shape: t.kind === "modal" ? "modal" : t.kind === "back" || t.kind === "external" ? "pill" : "box" });
        edges.push({ from: prev, to: id, label: last.action.label ?? last.action.id, dashed: true });
      }
    }
  });
  return { nodes, edges };
}

/* ----------------------------------------------------------- Mermaid */
const mq = (s) => String(s ?? "").replace(/"/g, "#quot;").replace(/\n/g, " ");
const SHAPES = { box: ["[", "]"], modal: ["[[", "]]"], pill: ["([", "])"] };

/* A graph as a Mermaid flowchart. */
export function mermaid(graph, direction = "LR") {
  const lines = [`flowchart ${direction}`];
  for (const n of graph.nodes) {
    const [o, c] = SHAPES[n.shape] ?? SHAPES.box;
    lines.push(`    ${n.id}${o}"${mq(n.label)}${n.sub ? `<br/><small>${mq(n.sub)}</small>` : ""}"${c}`);
  }
  for (const e of graph.edges) lines.push(`    ${e.from} ${e.dashed ? "-.->" : "-->"}${e.label ? `|"${mq(e.label)}"|` : ""} ${e.to}`);
  return lines.join("\n") + "\n";
}

/* The primary journey (the blueprint's first) as a Mermaid sequence diagram,
   for architecture's Data Flow (US-089-AC2). */
export function sequence(j, screens) {
  const { main } = walkJourney(j, screens);
  const parts = [], lines = [];
  const part = (n) => { const id = nodeId(n); if (!parts.some((p) => p.id === id)) parts.push({ id, name: `${nodeTitle(screens, n)}${n.modal ? " (dialog)" : ""}` }); return id; };
  main.forEach((w, k) => {
    if (!w.node) return;
    const at = part(w.node);
    if (w.st.state) lines.push(`    ${at}-->>User: ${mq(w.st.state)}`);
    if (w.action) {
      lines.push(`    User->>${at}: ${mq(w.action.label ?? w.action.id)}`);
      const t = w.to, next = main[k + 1]?.node;
      if (t?.kind === "screen" || t?.kind === "modal") lines.push(`    ${at}->>${part(t)}: opens`);
      else if (t?.kind === "back" && next) lines.push(`    ${at}->>${part(next)}: back`);
      else if (t?.kind === "state") lines.push(`    ${at}-->>User: ${mq(t.state)}`);
      else if (t?.kind === "external") lines.push(`    ${at}-->>User: leaves the app`);
    }
    if (w.st.expect) lines.push(`    ${at}-->>User: ${mq(w.st.expect)}`);
    if (!w.action && !w.st.expect && !w.st.state) lines.push(`    ${at}-->>User: shows the result`);
  });
  return ["```mermaid", "sequenceDiagram", `    %% Blueprint journey ${j.id} (${j.story ?? "no story"}), from ux-builder-blueprint propose.`, "    actor User", ...parts.map((p) => `    participant ${p.id} as ${mq(p.name)}`), ...lines, "```"].join("\n");
}

/* The flow as a fenced Mermaid flowchart, for the solution design. */
export const flowchartBlock = (bp) => ["<!-- From the blueprint's screens and actions (ux-builder-blueprint propose). -->", "```mermaid", mermaid(flowGraph(bp)).trimEnd(), "```"].join("\n");
