/* structure/stack and structure/nested (visuals PRD §5.3): our own placement, since neither needs a
   graph engine. A stack is horizontal bands, top to bottom in the order of structure.layers, each
   band's parts in a row (wrapping) beside the band's name; bands alternate the first two region
   tints. Nested is boxes inside boxes: a node with children is a container in the region tint of
   its depth with its name top-left, its children packed in rows inside it; a node without children
   is a part. */

import { TOKENS, TYPE, WEIGHT, drawNode, sizeNode, stepsOf } from "../grammar.mjs";
import { fit } from "./route.mjs";

const PAD = 16, GAP = 14, BAND_GAP = 6, NAME_COL_MAX = 180, MAX_ROW = 1040, HEAD = 34;

export function layoutBlocks(v, ctx) {
  return v.form === "nested" ? nested(v, ctx) : stack(v, ctx);
}

/* Parts in rows no wider than max: each row as wide as its parts, a row's parts sharing its height. */
function pack(sizes, max) {
  const rows = [];
  let row = [], w = 0;
  for (const s of sizes) {
    if (row.length && w + GAP + s.w > max) { rows.push(row); row = []; w = 0; }
    w += (row.length ? GAP : 0) + s.w;
    row.push(s);
  }
  if (row.length) rows.push(row);
  const width = Math.max(0, ...rows.map((r) => r.reduce((a, s, i) => a + s.w + (i ? GAP : 0), 0)));
  const height = rows.reduce((a, r, i) => a + Math.max(...r.map((s) => s.h)) + (i ? GAP : 0), 0);
  return { rows, width, height };
}

function stack(v, { theme, m }) {
  const layers = [...(v.structure?.layers ?? [])];
  const known = new Set(layers.map((l) => l.id));
  if (v.nodes.some((n) => !known.has(n.layer))) layers.push({ id: null, label: "Other" });
  const stepIds = stepsOf(v.steps);
  const nameW = Math.min(NAME_COL_MAX, Math.max(...layers.map((l) => m.width(l.label, TYPE.group, WEIGHT.bold))) + 4);
  const bands = layers.map((l) => {
    const nodes = v.nodes.filter((n) => (l.id === null ? !known.has(n.layer) : n.layer === l.id));
    const sizes = nodes.map((n) => ({ n, ...sizeNode(m, n) }));
    return { l, name: m.wrap(l.label, TYPE.group, WEIGHT.bold, nameW), packed: pack(sizes, MAX_ROW) };
  }).filter((b) => b.packed.rows.length);
  const inner = Math.max(...bands.map((b) => b.packed.width));
  const width = PAD + nameW + 2 * PAD + inner + PAD;
  const items = [];
  let y = 0;
  bands.forEach((b, i) => {
    const nameH = b.name.length * m.lineHeight(TYPE.group);
    const h = Math.max(b.packed.height, nameH) + 2 * PAD, fill = TOKENS.region(i % 2 + 1);
    const shapes = [{ t: "rect", x: 0, y, w: width, h, r: theme.px("piq-radius-diagram-node"), fill }];
    b.name.forEach((line, k) => shapes.push({ t: "text", x: PAD, y: y + PAD + TYPE.group + k * m.lineHeight(TYPE.group), text: line, size: TYPE.group, weight: WEIGHT.bold, fill: TOKENS.text, on: fill, w: m.width(line, TYPE.group, WEIGHT.bold), owner: `layer:${b.l.id}` }));
    items.push({ id: `layer:${b.l.id}`, cls: "uxb-group", data: { role: "layer" }, box: { kind: "group", x: 0, y, w: width, h }, shapes });
    let ry = y + PAD;
    for (const row of b.packed.rows) {
      let x = PAD + nameW + 2 * PAD;
      const rh = Math.max(...row.map((s) => s.h));
      for (const s of row) {
        items.push({ ...drawNode(theme, m, s.n, s, x, ry + (rh - s.h) / 2), steps: stepIds.get(s.n.id) });
        x += s.w + GAP;
      }
      ry += rh + GAP;
    }
    y += h + BAND_GAP;
  });
  return fit({ width, height: y - BAND_GAP, items }, 0);
}

function nested(v, { theme, m }) {
  const kids = new Map();
  for (const n of v.nodes) if (n.parent) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n]);
  const stepIds = stepsOf(v.steps);
  // Size bottom up: a part is its node box; a container wraps its children's rows.
  const size = (n, depth) => {
    const children = kids.get(n.id) ?? [];
    if (!children.length) return { n, ...sizeNode(m, n), leaf: true };
    const inner = children.map((c) => size(c, depth + 1));
    const packed = pack(inner, MAX_ROW - 2 * PAD * depth);
    const label = m.width(n.label, TYPE.group, WEIGHT.bold) + 2 * PAD;
    return { n, depth, packed, w: Math.max(label, packed.width + 2 * PAD), h: HEAD + packed.height + PAD };
  };
  const roots = v.nodes.filter((n) => !n.parent).map((n) => size(n, 1));
  const top = pack(roots, MAX_ROW);
  const items = [];
  const place = (s, x, y) => {
    if (s.leaf) { items.push({ ...drawNode(theme, m, s.n, s, x, y), steps: stepIds.get(s.n.id) }); return; }
    const fill = TOKENS.region(((s.depth - 1) % 3) + 1);
    items.push({ id: s.n.id, cls: "uxb-group", data: { role: s.n.role, status: s.n.status }, steps: stepIds.get(s.n.id), box: { kind: "group", x, y, w: s.w, h: s.h }, shapes: [
      { t: "rect", x, y, w: s.w, h: s.h, r: theme.px("piq-radius-diagram-node"), fill, ...(s.n.role === "own" ? { stroke: TOKENS.accent, sw: theme.px("piq-size-diagram-stroke-strong"), on: TOKENS.ground } : {}) },
      { t: "text", x: x + PAD, y: y + 22, text: s.n.label, size: TYPE.group, weight: WEIGHT.bold, fill: TOKENS.text, on: fill, w: m.width(s.n.label, TYPE.group, WEIGHT.bold), owner: s.n.id },
    ] });
    let ry = y + HEAD;
    for (const row of s.packed.rows) {
      let rx = x + PAD;
      const rh = Math.max(...row.map((c) => c.h));
      for (const c of row) { place(c, rx, ry); rx += c.w + GAP; }
      ry += rh + GAP;
    }
  };
  let y = 0;
  for (const row of top.rows) {
    let x = 0;
    const rh = Math.max(...row.map((s) => s.h));
    for (const s of row) { place(s, x, y); x += s.w + GAP; }
    y += rh + GAP;
  }
  return fit({ width: top.width, height: y - GAP, items }, 0);
}
