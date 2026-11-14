/* structure: entities (ELK layered; cards with a field grid, references as crow's-foot lines
   entering at their field) and tree (ELK mrtree) (visuals PRD §5.3). Keys are marked with a
   short tag (PK, FK, UK), never with colour alone. An exact multiplicity (umf.visual 1.1.0) that
   no crow's foot states, such as 2..5, is written beside the end of the line, never widened. */

import { BASE, boxes, layout, routes } from "./elk.mjs";
import { TOKENS, TYPE, WEIGHT, badges, drawEdge, drawNode, labelSize, wrappedLabelSize, sizeNode, stepsOf } from "../grammar.mjs";
import { fit, placeLabels } from "./route.mjs";
import { BOUNDS } from "../schema/validate.mjs";

const HEAD = 34, ROW = 22, PAD = 12, TAG = { pk: "PK", fk: "FK", uk: "UK" };

/* The marker for one end: its cardinality, or the cardinality whose bounds a multiplicity states
   exactly; otherwise none, and `count` is the multiplicity's own notation. */
export function endMark(cardinality, multiplicity) {
  if (cardinality) return { kind: cardinality };
  if (!multiplicity) return {};
  const kind = Object.keys(BOUNDS).find((k) => BOUNDS[k][0] === multiplicity.min && BOUNDS[k][1] === multiplicity.max);
  return kind ? { kind } : { count: multiplicity.text ?? `${multiplicity.min}..${multiplicity.max ?? "*"}` };
}

/* The field an end names: by its stable id (umf.visual 1.1.0) or by its displayed name. */
export const fieldIndex = (fields, end) => (fields ?? []).findIndex((f) => (end.fieldId !== undefined && f.id === end.fieldId) || (end.fieldId === undefined && end.field !== undefined && f.name === end.field));

export async function layoutStructure(v, ctx) {
  return v.form === "tree" ? tree(v, ctx) : entities(v, ctx);
}

async function tree(v, { theme, m }) {
  const sizes = new Map(v.nodes.map((n) => [n.id, sizeNode(m, n)]));
  const edges = v.nodes.filter((n) => n.parent).map((n) => ({ id: `${n.parent}>${n.id}`, from: n.parent, to: n.id }));
  const out = await layout({ id: "root", layoutOptions: { ...BASE, "elk.algorithm": "mrtree", "elk.direction": "DOWN", "elk.spacing.nodeNode": "24", "elk.mrtree.edgeRoutingMode": "AVOID_OVERLAP" },
    children: v.nodes.map((n) => ({ id: n.id, width: sizes.get(n.id).w, height: sizes.get(n.id).h })), edges: edges.map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })) });
  const placed = boxes(out);
  const items = [];
  // Parent to children as an orthogonal comb: down from the parent, across, down into each child.
  for (const e of edges) {
    const a = placed.get(e.from), b = placed.get(e.to);
    const mid = (a.y + a.h + b.y) / 2;
    const points = [[a.x + a.w / 2, a.y + a.h], [a.x + a.w / 2, mid], [b.x + b.w / 2, mid], [b.x + b.w / 2, b.y]].filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]);
    const item = drawEdge(theme, m, { ...e, kind: "data" }, points.length > 1 ? points : [[a.x, a.y], [b.x, b.y]], null, { cls: "uxb-edge", headless: true });
    item.id = null;
    items.push(item);
  }
  for (const n of v.nodes) { const b = placed.get(n.id); items.push(drawNode(theme, m, n, sizes.get(n.id), b.x, b.y)); }
  return fit({ width: out.width, height: out.height, items });
}

function cardSize(m, node, fields) {
  const name = m.width(node.label, TYPE.header, WEIGHT.bold);
  const nameCol = Math.max(0, ...fields.map((f) => m.width(f.name, TYPE.label, f.keys?.includes("pk") ? WEIGHT.bold : WEIGHT.regular)));
  const tags = fields.map((f) => (f.keys ?? []).map((k) => TAG[k]).join(" ")).filter(Boolean);
  const tagCol = tags.length ? Math.ceil(Math.max(...tags.map((t) => m.width(t, TYPE.label, WEIGHT.bold))) + 10) : 0;
  const typeCol = Math.max(0, ...fields.map((f) => m.width(f.type ?? "", TYPE.label, WEIGHT.regular)));
  const w = Math.ceil(Math.max(140, name + 2 * PAD, tagCol + nameCol + 24 + typeCol + 2 * PAD));
  return { w, h: fields.length ? HEAD + fields.length * ROW + 6 : HEAD + 4, nameCol, tagCol };
}

/* A multiplicity no crow's foot states, written just off the end of the line. */
function countLabel(m, text, [x, y], [px, py]) {
  const len = Math.hypot(x - px, y - py) || 1, ux = (x - px) / len, uy = (y - py) / len;
  const w = m.width(text, TYPE.label, WEIGHT.regular), cx = x - ux * 20, cy = y - uy * 20;
  // Above a horizontal end, beside a vertical one, so the text never sits on its own line.
  return Math.abs(ux) >= Math.abs(uy)
    ? { t: "text", x: cx, y: cy - 6, anchor: "middle", text, size: TYPE.label, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.ground, w }
    : { t: "text", x: cx + 8, y: cy + 4, text, size: TYPE.label, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.ground, w };
}

/* Crow's-foot marks at the end of a line, for its cardinality. */
function cardinality(kind, [x, y], [px, py], stroke, sw) {
  const len = Math.hypot(x - px, y - py) || 1, ux = (x - px) / len, uy = (y - py) / len, nx = -uy, ny = ux;
  const at = (d, s) => [x - ux * d + nx * s, y - uy * d + ny * s];
  const line = (a, b) => ({ t: "path", d: `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`, fill: "none", stroke, sw, on: TOKENS.ground });
  const bar = (d) => line(at(d, -6), at(d, 6));
  const crow = () => [line(at(0, -7), at(12, 0)), line(at(0, 7), at(12, 0)), line(at(0, 0), at(12, 0))];
  const ring = (d) => ({ t: "circle", cx: x - ux * d, cy: y - uy * d, r: 4.5, fill: TOKENS.ground, stroke, sw, on: TOKENS.ground });
  if (kind === "exactly-one") return [bar(6), bar(11)];
  if (kind === "zero-or-one") return [bar(6), ring(16)];
  if (kind === "one-or-many") return [...crow(), bar(16)];
  if (kind === "zero-or-many") return [...crow(), ring(19)];
  return [];
}

async function entities(v, { theme, m }) {
  const fieldsOf = new Map((v.structure.entities ?? []).map((e) => [e.node, e.fields]));
  const sizes = new Map(v.nodes.map((n) => [n.id, cardSize(m, n, fieldsOf.get(n.id) ?? [])]));
  const refs = v.structure.references ?? [];
  const out = await layout({ id: "root", layoutOptions: { ...BASE, "elk.direction": "RIGHT", "elk.layered.spacing.nodeNodeBetweenLayers": "96" },
    children: v.nodes.map((n) => ({ id: n.id, width: sizes.get(n.id).w, height: sizes.get(n.id).h })),
    edges: refs.map((r) => ({ id: r.id, sources: [r.from.node], targets: [r.to.node], labels: r.label ? [{ text: r.label, width: labelSize(m, r.label).w, height: labelSize(m, r.label).h }] : [] })) });
  const placed = boxes(out), routed = routes(out);
  const rowY = (end) => {
    const b = placed.get(end.node), i = fieldIndex(fieldsOf.get(end.node), end);
    return i < 0 ? null : b.y + HEAD + i * ROW + ROW / 2;
  };
  // Enter (and leave) at the field's row: move the last horizontal leg to that row.
  const fieldRoute = (r, points) => {
    let pts = points.map((p) => [...p]);
    for (const [end, idx] of [["to", pts.length - 1], ["from", 0]]) {
      const y = r[end].field !== undefined || r[end].fieldId !== undefined ? rowY(r[end]) : null;
      if (y === null || pts.length < 2) continue;
      const tip = pts[idx], next = pts[end === "to" ? idx - 1 : idx + 1];
      if (tip[1] !== next[1]) continue;
      if (pts.length === 2) {
        const midX = (pts[0][0] + pts[1][0]) / 2;
        pts = end === "to" ? [pts[0], [midX, pts[0][1]], [midX, y], [pts[1][0], y]] : [[pts[0][0], y], [midX, y], [midX, pts[1][1]], pts[1]];
      } else { tip[1] = y; next[1] = y; }
    }
    return pts;
  };
  const items = [];
  const stepIds = stepsOf(v.steps);
  const lines = refs.map((r) => ({ r, points: fieldRoute(r, routed.get(r.id).points) }));
  const chips = placeLabels(lines.map(({ r, points }) => ({ id: r.id, points, size: r.label ? labelSize(m, r.label) : null, wrapped: r.label ? wrappedLabelSize(m, r.label) : null })), v.nodes.map((n) => placed.get(n.id)));
  for (const { r, points } of lines) {
    const item = drawEdge(theme, m, { id: r.id, from: r.from.node, to: r.to.node, label: r.label }, points, chips.get(r.id), { cls: "uxb-reference", headless: true });
    const stroke = item.shapes[0].stroke, sw = item.shapes[0].sw;
    for (const [mark, tip, next] of [[endMark(r.fromCardinality, r.fromMultiplicity), points[0], points[1]], [endMark(r.toCardinality, r.toMultiplicity), points.at(-1), points.at(-2)]]) {
      item.shapes.push(...cardinality(mark.kind, tip, next, stroke, sw));
      if (mark.count) item.shapes.push(countLabel(m, mark.count, tip, next));
    }
    items.push({ ...item, steps: stepIds.get(r.id) });
  }
  for (const n of v.nodes) {
    const b = placed.get(n.id), size = sizes.get(n.id), fields = fieldsOf.get(n.id) ?? [];
    const r = theme.px("piq-radius-diagram-node"), sw = theme.px("piq-size-diagram-stroke");
    const shapes = [
      { t: "rect", x: b.x, y: b.y, w: b.w, h: b.h, r, fill: TOKENS.surface, stroke: TOKENS.edgeMuted, sw, on: TOKENS.ground },
      ...(fields.length ? [{ t: "path", d: `M${b.x + 1} ${b.y + HEAD} L${b.x + b.w - 1} ${b.y + HEAD}`, fill: "none", stroke: TOKENS.edgeMuted, sw, on: TOKENS.surface }] : []),
      { t: "text", x: b.x + PAD, y: b.y + 22, text: n.label, size: TYPE.header, weight: WEIGHT.bold, fill: TOKENS.strong, on: TOKENS.surface, w: m.width(n.label, TYPE.header, WEIGHT.bold), owner: n.id },
    ];
    fields.forEach((f, i) => {
      const y = b.y + HEAD + i * ROW + 15 + 3;
      const tag = (f.keys ?? []).map((k) => TAG[k]).join(" ");
      if (tag) shapes.push({ t: "text", x: b.x + PAD, y, text: tag, size: TYPE.label, weight: WEIGHT.bold, fill: TOKENS.muted, on: TOKENS.surface, w: m.width(tag, TYPE.label, WEIGHT.bold), owner: n.id });
      const weight = f.keys?.includes("pk") ? WEIGHT.bold : WEIGHT.regular;
      shapes.push({ t: "text", x: b.x + PAD + size.tagCol, y, text: f.name, size: TYPE.label, weight, fill: TOKENS.strong, on: TOKENS.surface, w: m.width(f.name, TYPE.label, weight), owner: n.id });
      if (f.type) shapes.push({ t: "text", x: b.x + b.w - PAD, y, anchor: "end", text: f.type, size: TYPE.label, weight: WEIGHT.regular, fill: TOKENS.muted, on: TOKENS.surface, w: m.width(f.type, TYPE.label, WEIGHT.regular), owner: n.id });
    });
    items.push({ id: n.id, cls: "uxb-entity", data: { role: n.role, status: n.status }, steps: stepIds.get(n.id), box: { kind: "entity", x: b.x, y: b.y, w: b.w, h: b.h }, shapes });
  }
  return fit({ width: out.width, height: out.height, items });
}
