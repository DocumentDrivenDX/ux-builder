/* comparison (visuals PRD §5.6): matrix, quadrant and before-after, our own placement.

   matrix: a table, items as columns and criteria as rows. A rating is a row of filled, half and
   empty circles out of its scale's max; support is a mark (a tick, a cross, a half circle) and its
   word, so nothing is said by colour alone. The chosen item's column has an accent rule over its
   header, its name in the accent, and the reason under it.

   quadrant: two rated criteria as axes, each labelled with plain words at both ends; items as
   points, the chosen one in the accent; items on the same spot share one point and list their
   names.

   before-after: two panels with the same rows; a row whose value changed is marked in the second
   panel with an accent bar and the word "changed". */

import { TOKENS, TYPE, WEIGHT } from "../grammar.mjs";
import { fit } from "./route.mjs";

const PAD = 12, ROW_PAD = 10, CRIT_W = 200, COL_MIN = 150, COL_MAX = 300, TABLE_MAX = 1000, DOT = 6;

export function layoutComparison(v, ctx) {
  if (v.form === "quadrant") return quadrant(v, ctx);
  if (v.form === "before-after") return beforeAfter(v, ctx);
  return matrix(v, ctx);
}

const valueOf = (c, item, crit) => c.values.find((x) => x.item === item && x.criterion === crit);

/* What a value says in words: for the text equivalent and for the mark's label. */
export function valueWords(crit, value) {
  if (!value) return "—";
  if (crit.measure === "rating") return `${value.rating} of ${crit.max ?? 5}`;
  if (crit.measure === "support") return { yes: "Yes", no: "No", partial: "Partly" }[value.support] ?? "—";
  return value.text ?? "—";
}

/* A rating's circles: filled up to the rating, a half for .5, empty to the max. */
function ratingShapes(x, y, rating, max) {
  const shapes = [];
  for (let i = 0; i < max; i++) {
    const cx = x + DOT + i * (2 * DOT + 5), cy = y;
    const fill = rating >= i + 1 ? TOKENS.strong : "none";
    shapes.push({ t: "circle", cx, cy, r: DOT, fill, stroke: TOKENS.strong, sw: 1.5, on: TOKENS.surface });
    if (rating > i && rating < i + 1) shapes.push({ t: "path", d: `M${cx} ${cy - DOT} A${DOT} ${DOT} 0 0 0 ${cx} ${cy + DOT} Z`, fill: TOKENS.strong });
  }
  return shapes;
}

/* A support mark: a tick, a cross or a half circle, in the strong text colour. */
function supportShapes(x, y, support) {
  if (support === "yes") return [{ t: "path", d: `M${x} ${y} L${x + 4} ${y + 4} L${x + 11} ${y - 5}`, fill: "none", stroke: TOKENS.strong, sw: 2, on: TOKENS.surface }];
  if (support === "no") return [{ t: "path", d: `M${x} ${y - 5} L${x + 10} ${y + 5} M${x + 10} ${y - 5} L${x} ${y + 5}`, fill: "none", stroke: TOKENS.strong, sw: 2, on: TOKENS.surface }];
  if (support === "partial") return [
    { t: "circle", cx: x + 5, cy: y, r: 5.5, fill: "none", stroke: TOKENS.strong, sw: 1.5, on: TOKENS.surface },
    { t: "path", d: `M${x + 5} ${y - 5.5} A5.5 5.5 0 0 0 ${x + 5} ${y + 5.5} Z`, fill: TOKENS.strong },
  ];
  return [];
}

/* One cell's shapes and height: wrapped text, or a mark and its words. */
function cell(m, crit, value, x, y, w, owner) {
  const shapes = [], lh = m.lineHeight(TYPE.detail);
  if (crit.measure === "rating" && value) {
    shapes.push(...ratingShapes(x, y + 9, value.rating, crit.max ?? 5));
    const words = valueWords(crit, value), wx = x + (crit.max ?? 5) * (2 * DOT + 5) + 6;
    shapes.push({ t: "text", x: wx, y: y + 13, text: words, size: TYPE.detail, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.surface, w: m.width(words, TYPE.detail, WEIGHT.regular), owner });
    return { shapes, h: 20 };
  }
  if (crit.measure === "support" && value) {
    shapes.push(...supportShapes(x, y + 9, value.support));
    const words = valueWords(crit, value);
    shapes.push({ t: "text", x: x + 18, y: y + 13, text: words, size: TYPE.detail, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.surface, w: m.width(words, TYPE.detail, WEIGHT.regular), owner });
    return { shapes, h: 20 };
  }
  const lines = m.wrap(valueWords(crit, value), TYPE.detail, WEIGHT.regular, w);
  lines.forEach((line, i) => shapes.push({ t: "text", x, y: y + 13 + i * lh, text: line, size: TYPE.detail, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.surface, w: m.width(line, TYPE.detail, WEIGHT.regular), owner }));
  return { shapes, h: Math.max(1, lines.length) * lh + 4 };
}

function matrix(v, { m }) {
  const c = v.comparison, items = c.items, chosen = c.chosen?.item;
  const col = Math.max(COL_MIN, Math.min(COL_MAX, (TABLE_MAX - CRIT_W) / items.length));
  const width = CRIT_W + items.length * col;
  const lh = m.lineHeight(TYPE.detail), shapes = [];
  // Header: each item's name, the chosen one in the accent with its reason under it.
  const heads = items.map((it) => {
    const name = m.wrap(it.label, TYPE.header, WEIGHT.bold, col - 2 * PAD);
    const reason = it.id === chosen ? m.wrap(`Chosen: ${c.chosen.reason}`, TYPE.detail, WEIGHT.regular, col - 2 * PAD) : [];
    return { it, name, reason, h: name.length * m.lineHeight(TYPE.header) + (reason.length ? 4 + reason.length * lh : 0) };
  });
  const headH = Math.max(...heads.map((h) => h.h)) + 2 * ROW_PAD + 4;
  shapes.push({ t: "rect", x: 0, y: 0, w: width, h: headH, fill: TOKENS.sunken });
  heads.forEach((h, i) => {
    const x = CRIT_W + i * col + PAD, mine = h.it.id === chosen;
    if (mine) shapes.push({ t: "rect", x: CRIT_W + i * col, y: 0, w: col, h: 4, fill: TOKENS.accent, stroke: TOKENS.accent, sw: 0.01, on: TOKENS.surface });
    let y = ROW_PAD + 4 + TYPE.header;
    for (const line of h.name) { shapes.push({ t: "text", x, y, text: line, size: TYPE.header, weight: WEIGHT.bold, fill: TOKENS.strong, on: TOKENS.sunken, w: m.width(line, TYPE.header, WEIGHT.bold), owner: "matrix" }); y += m.lineHeight(TYPE.header); }
    y += 4 - m.lineHeight(TYPE.header) + lh;
    for (const line of h.reason) { shapes.push({ t: "text", x, y, text: line, size: TYPE.detail, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.sunken, w: m.width(line, TYPE.detail, WEIGHT.regular), owner: "matrix" }); y += lh; }
  });
  // Rows: the criterion, then each item's value.
  let y = headH;
  for (const crit of c.criteria) {
    const label = m.wrap(crit.label, TYPE.detail, WEIGHT.bold, CRIT_W - 2 * PAD);
    const cells = items.map((it, i) => cell(m, crit, valueOf(c, it.id, crit.id), CRIT_W + i * col + PAD, y + ROW_PAD, col - 2 * PAD, "matrix"));
    const h = Math.max(label.length * lh + 4, ...cells.map((x) => x.h)) + 2 * ROW_PAD;
    shapes.push({ t: "path", d: `M0 ${y} L${width} ${y}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1, on: TOKENS.surface });
    label.forEach((line, k) => shapes.push({ t: "text", x: PAD, y: y + ROW_PAD + 13 + k * lh, text: line, size: TYPE.detail, weight: WEIGHT.bold, fill: TOKENS.strong, on: TOKENS.surface, w: m.width(line, TYPE.detail, WEIGHT.bold), owner: "matrix" }));
    for (const x of cells) shapes.push(...x.shapes);
    y += h;
  }
  shapes.push({ t: "path", d: `M0 ${y} L${width} ${y}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1, on: TOKENS.surface });
  const items_ = [{ id: "matrix", cls: "uxb-matrix", data: {}, box: { kind: "table", x: 0, y: 0, w: width, h: y }, shapes }];
  return { ...fit({ width, height: y, items: items_ }, 0), background: TOKENS.surface };
}

function quadrant(v, { m }) {
  const c = v.comparison, byId = new Map(c.criteria.map((x) => [x.id, x]));
  const cx = byId.get(c.axes.x), cy = byId.get(c.axes.y), S = 440, L = 120, T = 30;
  const max = (crit) => crit.max ?? 5;
  // Ratings inset from the frame, so a point at 0 or the max is inside the plot.
  const IN = 36;
  const px = (r) => L + IN + (r / max(cx)) * (S - 2 * IN), py = (r) => T + S - IN - (r / max(cy)) * (S - 2 * IN);
  const shapes = [
    { t: "rect", x: L, y: T, w: S, h: S, fill: TOKENS.surface, stroke: TOKENS.edgeMuted, sw: 1, on: TOKENS.ground },
    { t: "path", d: `M${L + S / 2} ${T} L${L + S / 2} ${T + S} M${L} ${T + S / 2} L${L + S} ${T + S / 2}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1, dash: "4 4", on: TOKENS.surface },
  ];
  const text = (x, y, s, opts = {}) => ({ t: "text", x, y, text: s, size: TYPE.detail, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.ground, w: m.width(s, TYPE.detail, opts.weight ?? WEIGHT.regular), owner: "quadrant", ...opts });
  // Axis names and their plain-word ends.
  shapes.push(text(L + S / 2, T + S + 40, cx.label, { anchor: "middle", weight: WEIGHT.bold, fill: TOKENS.strong }));
  shapes.push(text(L, T + S + 20, cx.low ?? "Low"), text(L + S, T + S + 20, cx.high ?? "High", { anchor: "end" }));
  const yName = m.wrap(cy.label, TYPE.detail, WEIGHT.bold, L - 16);
  yName.forEach((line, i) => shapes.push(text(L - 12, T + S / 2 + i * m.lineHeight(TYPE.detail), line, { anchor: "end", weight: WEIGHT.bold, fill: TOKENS.strong })));
  for (const [words, y] of [[cy.high ?? "High", T + 12], [cy.low ?? "Low", T + S - 4]]) {
    m.wrap(words, TYPE.detail, WEIGHT.regular, L - 16).forEach((line, i, all) => shapes.push(text(L - 12, y + (i - (y > T + S / 2 ? all.length - 1 : 0)) * m.lineHeight(TYPE.detail), line, { anchor: "end" })));
  }
  // Points: items on the same spot share one, with every name beside it.
  const spots = new Map();
  for (const it of c.items) {
    const rx = valueOf(c, it.id, cx.id)?.rating, ry = valueOf(c, it.id, cy.id)?.rating;
    if (rx === undefined || ry === undefined) continue;
    const key = `${rx},${ry}`;
    spots.set(key, [...(spots.get(key) ?? []), { it, rx, ry }]);
  }
  // Each point's names go right of it, else left, else below: the first place clear of every
  // other point and every name already placed.
  const placed = [...spots.values()].map((g) => ({ x: px(g[0].rx), y: py(g[0].ry), w: 0, h: 0 }));
  const dots = placed.map((p) => ({ x: p.x - 9, y: p.y - 9, w: 18, h: 18 }));
  const taken = [...dots];
  const hits = (b) => taken.some((o) => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
  const lh = m.lineHeight(TYPE.detail);
  for (const group of spots.values()) {
    const { rx, ry } = group[0], x = px(rx), y = py(ry);
    const chosen = group.some((g) => g.it.id === c.chosen?.item);
    shapes.push({ t: "circle", cx: x, cy: y, r: 7, fill: chosen ? TOKENS.accent : TOKENS.strong, stroke: TOKENS.surface, sw: 2 });
    const names = group.map((g) => ({ g, label: g.it.id === c.chosen?.item ? `${g.it.label} (chosen)` : g.it.label }));
    const w = Math.max(...names.map((n) => m.width(n.label, TYPE.detail, WEIGHT.bold))), h = names.length * lh;
    const options = [
      { x: x + 12, y: y - h / 2, anchor: null },
      { x: x - 12 - w, y: y - h / 2, anchor: "end" },
      { x: x - w / 2, y: y + 12, anchor: "middle" },
      { x: x - w / 2, y: y - 12 - h, anchor: "middle" },
    ];
    const pick = options.find((o) => !hits({ x: o.x, y: o.y, w, h })) ?? options[0];
    taken.push({ x: pick.x, y: pick.y, w, h });
    names.forEach((n, i) => {
      const tx = pick.anchor === "end" ? pick.x + w : pick.anchor === "middle" ? pick.x + w / 2 : pick.x;
      shapes.push({ ...text(tx, pick.y + TYPE.detail + i * lh, n.label, { weight: n.g.it.id === c.chosen?.item ? WEIGHT.bold : WEIGHT.regular, fill: TOKENS.strong, on: TOKENS.surface }), ...(pick.anchor ? { anchor: pick.anchor } : {}) });
    });
  }
  // As wide as the furthest label reaches.
  const right = Math.max(L + S, ...shapes.filter((s) => s.t === "text").map((s) => (s.anchor === "end" ? s.x : s.anchor === "middle" ? s.x + s.w / 2 : s.x + s.w)));
  const width = Math.ceil(right + 16), height = T + S + 56;
  return fit({ width, height, items: [{ id: "quadrant", cls: "uxb-quadrant", data: {}, box: { kind: "plot", x: 0, y: 0, w: width, h: height }, shapes }] }, 0);
}

function beforeAfter(v, { m }) {
  const c = v.comparison, [a, b] = c.items, lh = m.lineHeight(TYPE.detail);
  const LABEL_W = 240, VAL_W = 300, PANEL = LABEL_W + VAL_W + 2 * PAD, GUTTER = 32;
  const shapes = [];
  const rows = c.criteria.map((crit) => {
    const label = m.wrap(crit.label, TYPE.detail, WEIGHT.bold, LABEL_W - PAD);
    const va = valueOf(c, a.id, crit.id), vb = valueOf(c, b.id, crit.id);
    const changed = valueWords(crit, va) !== valueWords(crit, vb);
    const h = Math.max(label.length * lh, ...[va, vb].map((x) => (crit.measure === "text" ? m.wrap(valueWords(crit, x), TYPE.detail, WEIGHT.regular, VAL_W - PAD).length * lh : 20))) + 2 * ROW_PAD;
    return { crit, label, va, vb, changed, h };
  });
  const headH = 40;
  [a, b].forEach((it, p) => {
    const x0 = p * (PANEL + GUTTER);
    shapes.push({ t: "rect", x: x0, y: 0, w: PANEL, h: headH, fill: TOKENS.sunken });
    shapes.push({ t: "text", x: x0 + PAD, y: 26, text: it.label, size: TYPE.header, weight: WEIGHT.bold, fill: TOKENS.strong, on: TOKENS.sunken, w: m.width(it.label, TYPE.header, WEIGHT.bold), owner: "before-after" });
    let y = headH;
    for (const r of rows) {
      shapes.push({ t: "path", d: `M${x0} ${y} L${x0 + PANEL} ${y}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1, on: TOKENS.surface });
      r.label.forEach((line, k) => shapes.push({ t: "text", x: x0 + PAD, y: y + ROW_PAD + 13 + k * lh, text: line, size: TYPE.detail, weight: WEIGHT.bold, fill: TOKENS.strong, on: TOKENS.surface, w: m.width(line, TYPE.detail, WEIGHT.bold), owner: "before-after" }));
      shapes.push(...cell(m, r.crit, p ? r.vb : r.va, x0 + PAD + LABEL_W, y + ROW_PAD, VAL_W - PAD, "before-after").shapes);
      if (p && r.changed) {
        shapes.push({ t: "rect", x: x0, y: y + 4, w: 4, h: r.h - 8, fill: TOKENS.accent, stroke: TOKENS.accent, sw: 0.01, on: TOKENS.surface });
        shapes.push({ t: "text", x: x0 + PANEL - PAD, y: y + ROW_PAD + 13, anchor: "end", text: "changed", size: TYPE.label, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.surface, w: m.width("changed", TYPE.label, WEIGHT.regular), owner: "before-after" });
      }
      y += r.h;
    }
    shapes.push({ t: "path", d: `M${x0} ${y} L${x0 + PANEL} ${y}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1, on: TOKENS.surface });
  });
  const width = 2 * PANEL + GUTTER, height = headH + rows.reduce((s, r) => s + r.h, 0);
  return { ...fit({ width, height, items: [{ id: "before-after", cls: "uxb-before-after", data: {}, box: { kind: "table", x: 0, y: 0, w: width, h: height }, shapes }] }, 0), background: TOKENS.surface };
}
