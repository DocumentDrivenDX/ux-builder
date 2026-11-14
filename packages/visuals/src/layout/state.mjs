/* state: machine (ELK) and lifecycle (own: the main path on one row, every other transition in
   its own lane below it) (visuals PRD §5.4). States are pills; the initial state has a filled dot
   leading in; final states have a double outline; failure and cancel paths are muted and dashed. */

import { BASE, boxes, layout, routes } from "./elk.mjs";
import { TOKENS, TYPE, WEIGHT, badges, drawEdge, drawGroup, drawNode, labelSize, wrappedLabelSize, sizeNode, stepsOf } from "../grammar.mjs";
import { fit, placeLabels } from "./route.mjs";

const elkSize = ({ w, h }) => ({ width: w, height: h });
const DOT = 7, MARGIN = 32, GAP = 72, LANE = 30;

const labelOf = (t) => `${t.event}${t.guard ? ` [${t.guard}]` : ""}${t.action ? ` / ${t.action}` : ""}`;
const edgeOf = (t) => ({ id: t.id, from: t.from, to: t.to, label: labelOf(t), status: t.status, emphasis: t.emphasis,
  kind: t.path === "failure" ? "return" : t.path === "alternate" ? "control" : t.path === "main" ? "action" : undefined });

function drawState(theme, m, node, size, x, y, final) {
  const item = drawNode(theme, m, node, size, x, y, { cls: "uxb-state", pill: true });
  item.box.kind = "state";
  if (final) {
    const outer = item.shapes[0];
    item.shapes.splice(1, 0, { t: "rect", x: outer.x + 3, y: outer.y + 3, w: outer.w - 6, h: outer.h - 6, r: (outer.h - 6) / 2, fill: "none", stroke: outer.stroke, sw: outer.sw, on: outer.fill });
  }
  return item;
}

function initialMark(theme, target) {
  const cx = target.x - 34, cy = target.y + target.h / 2;
  const sw = theme.px("piq-size-diagram-stroke");
  return { id: null, cls: "uxb-initial", data: {}, shapes: [
    { t: "circle", cx, cy, r: DOT, fill: TOKENS.strong },
    { t: "path", d: `M${cx + DOT} ${cy} L${target.x - 9} ${cy}`, fill: "none", stroke: TOKENS.strong, sw, on: TOKENS.ground },
    { t: "path", d: `M${target.x - 9} ${cy - 3.8} L${target.x} ${cy} L${target.x - 9} ${cy + 3.8} Z`, fill: TOKENS.strong, stroke: TOKENS.strong, sw, on: TOKENS.ground },
  ] };
}

export async function layoutState(v, ctx) {
  return v.form === "lifecycle" ? lifecycle(v, ctx) : machine(v, ctx);
}

async function machine(v, { theme, m }) {
  const sizes = new Map(v.nodes.map((n) => [n.id, sizeNode(m, n, { minWidth: 96 })]));
  const finals = new Set(v.state.final ?? []);
  const edges = v.state.transitions.map(edgeOf);
  const children = (parent) => v.nodes.filter((n) => (n.parent ?? null) === parent).map((n) => {
    const kids = children(n.id);
    return kids.length ? { id: n.id, layoutOptions: { "elk.padding": "[top=40,left=16,bottom=16,right=16]" }, children: kids }
      : { id: n.id, width: sizes.get(n.id).w, height: sizes.get(n.id).h };
  });
  const out = await layout({ id: "root", layoutOptions: { ...BASE, "elk.direction": "RIGHT", "elk.padding": "[top=32,left=72,bottom=32,right=32]" }, children: children(null),
    edges: edges.map((e) => ({ id: e.id, sources: [e.from], targets: [e.to], labels: [{ text: e.label, ...elkSize(labelSize(m, e.label)) }] })) });
  const placed = boxes(out), routed = routes(out);
  const items = [];
  const stepIds = stepsOf(v.steps);
  // Composite states are regions behind everything: containers outermost first, then transitions, then the states inside.
  const composite = new Set(v.nodes.filter((n) => v.nodes.some((c) => c.parent === n.id)).map((n) => n.id));
  const depthOf = (n) => (n.parent ? 1 + depthOf(v.nodes.find((x) => x.id === n.parent)) : 1);
  const leaves = v.nodes.filter((n) => !composite.has(n.id));
  const chips = placeLabels(edges.map((e) => ({ id: e.id, points: routed.get(e.id).points, size: labelSize(m, e.label), wrapped: wrappedLabelSize(m, e.label) })),
    [...leaves.map((n) => placed.get(n.id)), ...[...composite].map((id) => { const b = placed.get(id); return { x: b.x, y: b.y, w: b.w, h: 36 }; })]);
  for (const n of v.nodes.filter((x) => composite.has(x.id)).sort((a, b) => depthOf(a) - depthOf(b))) {
    const b = placed.get(n.id);
    const region = drawGroup(m, { id: n.id, label: n.label, status: n.status }, { x: b.x, y: b.y, w: b.w, h: b.h }, depthOf(n));
    region.cls = "uxb-state";
    region.shapes[0].stroke = TOKENS.edgeMuted;
    region.shapes[0].sw = theme.px("piq-size-diagram-stroke");
    region.shapes[0].r = theme.px("piq-radius-diagram-node") + 4;
    items.push({ ...region, steps: stepIds.get(n.id) });
  }
  for (const e of edges) items.push({ ...drawEdge(theme, m, e, routed.get(e.id).points, chips.get(e.id), { cls: "uxb-transition" }), steps: stepIds.get(e.id) });
  for (const n of leaves) {
    const b = placed.get(n.id);
    items.push({ ...drawState(theme, m, n, { ...sizes.get(n.id), w: b.w, h: b.h }, b.x, b.y, finals.has(n.id)), steps: stepIds.get(n.id) });
  }
  items.push(initialMark(theme, placed.get(v.state.initial)));
  items.push(...badges(v.steps, anchorsOf(items), m));
  return fit({ width: out.width, height: out.height, items });
}

function lifecycle(v, { theme, m }) {
  const sizes = new Map(v.nodes.map((n) => [n.id, sizeNode(m, n, { minWidth: 96 })]));
  const finals = new Set(v.state.final ?? []);
  const main = v.state.transitions.filter((t) => t.path === "main");
  const path = [v.state.initial];
  for (let t = main.find((x) => x.from === v.state.initial); t && !path.includes(t.to); t = main.find((x) => x.from === t.to)) path.push(t.to);
  const off = v.nodes.map((n) => n.id).filter((id) => !path.includes(id));
  const rowH = Math.max(...path.map((id) => sizes.get(id).h));
  const loopsAbove = v.state.transitions.some((t) => t.from === t.to);
  const top = MARGIN + (loopsAbove ? 56 : 8);
  const pos = new Map();
  let x = MARGIN + 48;
  // Each gap on the main path is wide enough for the label of the transition that crosses it.
  const gapAfter = (id) => { const t = main.find((x) => x.from === id && path.indexOf(x.to) === path.indexOf(id) + 1); return t ? Math.max(GAP, labelSize(m, labelOf(t)).w + 64) : GAP; };
  for (const id of path) { const s = sizes.get(id); pos.set(id, { x, y: top + (rowH - s.h) / 2, w: s.w, h: s.h }); x += s.w + gapAfter(id); }
  // Only a main transition to the next state on the path runs along the row; a backward or skipping one takes a lane like any other.
  const onRow = (t) => t.path === "main" && path.includes(t.from) && path.indexOf(t.to) === path.indexOf(t.from) + 1;
  const others = v.state.transitions.filter((t) => !onRow(t) && t.from !== t.to);
  const laneTop = top + rowH + 28;
  const offY = laneTop + others.length * LANE + 24;
  let ox = MARGIN + 48;
  for (const id of off) { const s = sizes.get(id); pos.set(id, { x: ox, y: offY, w: s.w, h: s.h }); ox += s.w + GAP; }
  const edges = [];
  for (const t of v.state.transitions.filter(onRow)) {
    const a = pos.get(t.from), b = pos.get(t.to), y = top + rowH / 2;
    edges.push({ t, points: [[a.x + a.w, y], [b.x, y]] });
  }
  // Each other transition leaves its source's bottom, runs along its own lane, and enters its target from below (or above, for a state under the lanes).
  others.forEach((t, i) => {
    const a = pos.get(t.from), b = pos.get(t.to), lane = laneTop + i * LANE + LANE / 2;
    const ax = a.x + a.w * (0.35 + 0.3 * ((i % 3) / 2)), bx = b.x + b.w * (0.65 - 0.3 * ((i % 3) / 2));
    const startY = a.y < lane ? a.y + a.h : a.y, endY = b.y < lane ? b.y + b.h : b.y;
    edges.push({ t, points: [[ax, startY], [ax, lane], [bx, lane], [bx, endY]] });
  });
  for (const t of v.state.transitions.filter((t) => t.from === t.to)) {
    const a = pos.get(t.from), x0 = a.x + a.w * 0.35, x1 = a.x + a.w * 0.65;
    edges.push({ t, points: [[x0, a.y], [x0, a.y - 30], [x1, a.y - 30], [x1, a.y]] });
  }
  const chips = placeLabels(edges.map(({ t, points }) => ({ id: t.id, points, size: labelSize(m, labelOf(t)), wrapped: wrappedLabelSize(m, labelOf(t)) })), [...pos.values()]);
  const stepIds = stepsOf(v.steps);
  const items = [];
  for (const { t, points } of edges) items.push({ ...drawEdge(theme, m, edgeOf(t), points, chips.get(t.id), { cls: "uxb-transition" }), steps: stepIds.get(t.id) });
  for (const n of v.nodes) {
    const b = pos.get(n.id);
    items.push({ ...drawState(theme, m, n, sizes.get(n.id), b.x, b.y, finals.has(n.id)), steps: stepIds.get(n.id) });
  }
  items.push(initialMark(theme, pos.get(v.state.initial)));
  items.push(...badges(v.steps, anchorsOf(items), m));
  return fit({ width: x, height: offY, items });
}

function anchorsOf(items) {
  const out = new Map();
  for (const it of items) if (it.id && it.box) out.set(it.id, { x: it.box.x, y: it.box.y }); else if (it.id && it.edge?.label) out.set(it.id, { x: it.edge.label.x - 14, y: it.edge.label.y + it.edge.label.h / 2, dir: -1 });
  return out;
}
