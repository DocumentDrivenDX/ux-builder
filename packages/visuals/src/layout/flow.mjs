/* flow: network, pipeline, zoned and lanes (visuals PRD §5.1). ELK lays out network and pipeline;
   zoned and lanes are our own placement (zoned.mjs, lanes.mjs). */

import { BASE, boxes, layout, routes } from "./elk.mjs";
import { GROUP_PAD, TYPE, WEIGHT, badges, drawEdge, drawGroup, drawNode, labelSize, wrappedLabelSize, sizeNode, stepsOf } from "../grammar.mjs";
import { fit, placeLabels, placeTopLabel } from "./route.mjs";
import { layoutZoned } from "./zoned.mjs";
import { layoutLanes } from "./lanes.mjs";

const LINE_ROOM = 36, BUSY = 4;
const pad = (p) => `[top=${p.top},left=${p.side},bottom=${p.bottom},right=${p.side}]`;

export async function layoutFlow(v, ctx) {
  if (v.form === "zoned") return layoutZoned(v, ctx);
  if (v.form === "lanes") return layoutLanes(v, ctx);
  const { theme, m } = ctx;
  const form = v.form;
  const sizes = new Map(v.nodes.map((n) => [n.id, sizeNode(m, n)]));
  // A box many lines leave or enter on one side is widened along that side, so ELK spaces their ends
  // apart instead of packing them into a bundle (ELK spreads a side's ends evenly across it).
  const across = "h";
  for (const n of v.nodes) {
    const out = (v.edges ?? []).filter((e) => e.from === n.id && e.to !== n.id).length;
    const into = (v.edges ?? []).filter((e) => e.to === n.id && e.from !== n.id).length;
    const s = sizes.get(n.id);
    if (Math.max(out, into) >= BUSY) s[across] = Math.max(s[across], Math.max(out, into) * LINE_ROOM + 24);
  }
  const groups = v.groups ?? [];
  const childrenOf = (parent) => [
    ...groups.filter((g) => (g.parent ?? null) === parent).map(groupNode),
    ...v.nodes.filter((n) => (n.group ?? null) === parent).map((n) => ({ id: n.id, width: sizes.get(n.id).w, height: sizes.get(n.id).h })),
  ];
  function groupNode(g) {
    // Wide enough for its label and room to step past a line coming in from above.
    const min = Math.ceil(m.width(g.label, TYPE.group, WEIGHT.bold) + 2 * 12 + 48);
    return { id: g.id, layoutOptions: { ...spacing, "elk.padding": pad(GROUP_PAD), "elk.nodeSize.constraints": "[MINIMUM_SIZE]", "elk.nodeSize.minimum": `(${min}, 0)` }, children: childrenOf(g.id) };
  }
  const options = { ...BASE, "elk.direction": "RIGHT" };
  // ELK reads spacing per graph level: regions and tiers get the same room between lines as the root.
  const spacing = Object.fromEntries(Object.entries(BASE).filter(([k]) => k.includes("spacing")));
  let top = childrenOf(null);
  if (form === "pipeline") options["elk.layered.cycleBreaking.strategy"] = "MODEL_ORDER";
  if (form === "pipeline") options["elk.layered.thoroughness"] = "40";

  const edges = (v.edges ?? []).map((e) => ({ id: e.id, sources: [e.from], targets: [e.to], labels: e.label ? [{ text: e.label, ...dims(labelSize(m, e.label)) }] : [] }));
  const out = await layout({ id: "root", layoutOptions: options, children: top, edges });
  const placed = boxes(out), routed = routes(out);

  const items = [];
  const depthOf = (g) => (g.parent ? 1 + depthOf(groups.find((x) => x.id === g.parent)) : 1);
  const allRoutes = [...routed.values()].map((r) => r.points);
  const labelBoxes = [];
  for (const g of [...groups].sort((a, b) => depthOf(a) - depthOf(b))) {
    const b = placed.get(g.id);
    const width = m.width(g.label, TYPE.group, WEIGHT.bold);
    const { x, grow } = placeTopLabel(b, width, allRoutes);
    // A region is drawn only for reading: it may widen to hold its label when nothing else is in the way.
    let at = x;
    if (grow > 0) { if (!collides({ ...b, w: b.w + grow }, g, groups, placed, v.nodes)) b.w += grow; else at = b.x + 12; }
    labelBoxes.push({ x: at - 4, y: b.y + 4, w: width + 8, h: 22 });
    items.push(drawGroup(m, g, { x: b.x, y: b.y, w: b.w, h: b.h }, depthOf(g), at));
  }
  // Edges with the same ends and kind travel as one line under one chip naming each.
  const bundles = new Map();
  for (const e of v.edges ?? []) {
    const key = `${e.from}>${e.to}>${e.kind ?? ""}`;
    if (!bundles.has(key)) bundles.set(key, []);
    bundles.get(key).push(e);
  }
  const lead = new Map(), text = new Map();
  for (const list of bundles.values()) {
    for (const e of list) lead.set(e.id, list[0]);
    const labels = list.map((e) => e.label).filter(Boolean);
    if (labels.length) text.set(list[0].id, labels.join(" · "));
  }
  const obstacles = [...v.nodes.map((n) => placed.get(n.id)), ...labelBoxes];
  const chips = placeLabels([...bundles.values()].map(([e]) => ({ id: e.id, points: routed.get(e.id).points, size: text.has(e.id) ? labelSize(m, text.get(e.id)) : null, wrapped: text.has(e.id) ? wrappedLabelSize(m, text.get(e.id)) : null })), obstacles);
  const stepIds = stepsOf(v.steps);
  for (const e of v.edges ?? []) {
    const first = lead.get(e.id), isLead = first.id === e.id;
    const drawn = isLead && text.has(e.id) ? { ...e, label: text.get(e.id) } : { ...e, label: isLead ? e.label : undefined };
    const item = drawEdge(theme, m, drawn, routed.get(first.id).points, isLead ? chips.get(e.id) : null);
    if (!isLead) item.edge.bundle = first.id;
    items.push({ ...item, steps: stepIds.get(e.id) });
  }
  for (const n of v.nodes) {
    const b = placed.get(n.id);
    items.push({ ...drawNode(theme, m, n, sizes.get(n.id), b.x, b.y), steps: stepIds.get(n.id) });
  }
  for (const g of items) if (g.cls === "uxb-group") g.steps = stepIds.get(g.id);
  const anchors = new Map();
  for (const it of items) {
    if (it.box) anchors.set(it.id, { x: it.box.x, y: it.box.y });
    else if (it.edge) anchors.set(it.id, it.edge.label ? { x: it.edge.label.x - 14, y: it.edge.label.y + it.edge.label.h / 2, dir: -1 } : midpoint(it.edge.points));
  }
  items.push(...badges(v.steps, anchors, m));
  return fit({ width: out.width, height: out.height, items });
}

const dims = ({ w, h }) => ({ width: w, height: h });

/* Whether a region's box would overlap a node or a region that is neither inside it nor around it. */
function collides(box, group, groups, placed, nodes) {
  const within = (id) => { for (let g = groups.find((x) => x.id === id); g; g = groups.find((x) => x.id === g.parent)) if (g.id === group.id) return true; return false; };
  const around = (id) => { for (let g = group; g; g = groups.find((x) => x.id === g.parent)) if (g.id === id) return true; return false; };
  const hit = (o) => box.x < o.x + o.w && o.x < box.x + box.w && box.y < o.y + o.h && o.y < box.y + box.h;
  return groups.some((g) => g.id !== group.id && !within(g.id) && !around(g.id) && hit(placed.get(g.id)))
    || nodes.some((n) => !within(n.group) && hit(placed.get(n.id)));
}

function midpoint(points) {
  const i = Math.floor((points.length - 1) / 2);
  return { x: (points[i][0] + points[i + 1][0]) / 2, y: (points[i][1] + points[i + 1][1]) / 2 };
}
