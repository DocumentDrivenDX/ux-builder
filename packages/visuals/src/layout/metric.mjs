/* metric (visuals PRD §5.7): stat, bar, line and meter, our own placement.

   One series is drawn in the accent, several in the series colours in their fixed order; every
   number, label and legend is body text, so a colour only marks. Good and bad come from the
   status colours with an arrow drawn beside them, never colour alone; a change with no good
   direction is neutral. Numbers carry their unit and the format's precision. Gridlines are the
   muted edge colour, quiet. With four series or fewer a line chart labels each line at its end
   instead of a legend. */

import { TOKENS, TYPE, WEIGHT } from "../grammar.mjs";
import { dateLabel, dateTicks, day, formatValue, niceTicks, triangle, withUnit } from "./chart.mjs";
import { fit } from "./route.mjs";

const PAD = 16, PLOT_W = 640, PLOT_H = 260, BIG = 44;

export function layoutMetric(v, ctx) {
  return { stat, bar, line, meter }[v.form](v, ctx);
}

const colourOf = (metric, i) => (metric.series.length === 1 ? TOKENS.accent : TOKENS.series(i));
const text = (m, x, y, s, { size = TYPE.detail, weight = WEIGHT.regular, fill = TOKENS.text, on = TOKENS.ground, anchor, owner = "metric" } = {}) =>
  ({ t: "text", x, y, text: s, size, weight, fill, on, w: m.width(s, size, weight), owner, ...(anchor ? { anchor } : {}) });

/* A change's direction, tone and words: up or down, positive, negative or neutral. */
function change(metric, from, to, since) {
  const delta = to - from;
  if (delta === 0) return { up: null, tone: null, words: `no change${since ? ` since ${since}` : ""}` };
  const up = delta > 0, good = metric.good ? (metric.good === "up") === up : null;
  const words = `${up ? "+" : "−"}${formatValue(Math.abs(delta), metric.format)}${since ? ` since ${since}` : ""}`;
  return { up, tone: good === null ? null : good ? "positive" : "negative", words };
}

function stat(v, { m }) {
  const metric = v.metric, s = metric.series[0], points = s.points;
  const last = points.at(-1).value, prev = metric.comparison ?? (points.length > 1 ? { label: points.at(-2).at ? dateLabel(day(points.at(-2).at), { year: false }) : "before", value: points.at(-2).value } : null);
  const shapes = [];
  const big = formatValue(last, metric.format), unit = metric.format?.kind === "percent" || metric.format?.kind === "currency" ? "" : metric.unit ?? "";
  shapes.push(text(m, PAD, PAD + BIG, big, { size: BIG, weight: WEIGHT.bold, fill: TOKENS.strong }));
  const bw = m.width(big, BIG, WEIGHT.bold);
  if (unit) shapes.push(text(m, PAD + bw + 8, PAD + BIG, unit, { size: TYPE.header, fill: TOKENS.text }));
  let y = PAD + BIG + 26;
  if (prev) {
    const c = change(metric, prev.value, last, prev.label);
    const ink = c.tone ? TOKENS.status(c.tone) : TOKENS.text;
    if (c.up !== null) shapes.push({ t: "path", d: triangle(PAD, y - 10, 10, c.up), fill: ink, stroke: ink, sw: 0.01, on: TOKENS.ground });
    shapes.push(text(m, PAD + (c.up !== null ? 16 : 0), y, c.words, { weight: WEIGHT.bold, fill: ink }));
    y += 12;
  }
  // The sparkline: the series in the accent, its last point marked.
  if (points.length > 1) {
    const W = 260, H = 48, vs = points.map((p) => p.value), lo = Math.min(...vs), hi = Math.max(...vs);
    const px = (i) => PAD + (i / (points.length - 1)) * W, py = (val) => y + 10 + H - ((val - lo) / (hi - lo || 1)) * H;
    shapes.push({ t: "path", d: points.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(2)} ${py(p.value).toFixed(2)}`).join(" "), fill: "none", stroke: TOKENS.accent, sw: 2, on: TOKENS.ground });
    shapes.push({ t: "circle", cx: px(points.length - 1), cy: py(last), r: 4, fill: TOKENS.accent, stroke: TOKENS.ground, sw: 2 });
    y += H + 20;
  }
  const width = Math.max(PAD + bw + 8 + m.width(unit, TYPE.header, WEIGHT.regular), 300) + PAD;
  return fit({ width, height: y + PAD, items: [{ id: s.id, cls: "uxb-stat", data: {}, box: { kind: "stat", x: 0, y: 0, w: width, h: y + PAD }, shapes: shapes.map((x) => (x.t === "text" ? { ...x, owner: s.id } : x)) }] }, 0);
}

function bar(v, { m }) {
  const metric = v.metric, cats = metric.axis?.categories ?? [...new Set(metric.series.flatMap((s) => s.points.map((p) => p.at)))].map((id) => ({ id, label: String(id) }));
  const n = metric.series.length, BAR = n > 1 ? 14 : 20, GROUP = n * BAR + (n - 1) * 3 + 16;
  const labelW = Math.min(220, Math.max(...cats.map((c) => m.width(c.label, TYPE.detail, WEIGHT.regular))) + 12);
  const all = metric.series.flatMap((s) => s.points.map((p) => p.value));
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all, metric.target ?? 0));
  const lo = ticks[0], hi = ticks.at(-1), x0 = PAD + labelW, W = PLOT_W - labelW;
  const px = (val) => x0 + ((val - lo) / (hi - lo)) * W;
  const shapes = [], top = PAD + (n > 1 ? 24 : 0), height = top + cats.length * GROUP;
  for (const tk of ticks) {
    shapes.push({ t: "path", d: `M${px(tk)} ${top} L${px(tk)} ${height}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 0.75, on: TOKENS.ground });
    shapes.push(text(m, px(tk), height + 16, formatValue(tk, metric.format), { size: TYPE.label, anchor: "middle" }));
  }
  cats.forEach((c, ci) => {
    const gy = top + ci * GROUP + 8;
    shapes.push(text(m, x0 - 10, gy + (n * BAR + (n - 1) * 3) / 2 + 4, c.label, { anchor: "end", fill: TOKENS.strong }));
    metric.series.forEach((s, si) => {
      const p = s.points.find((q) => q.at === c.id);
      if (!p) return;
      const y = gy + si * (BAR + 3), x1 = px(Math.max(lo, Math.min(0, p.value))), x2 = px(Math.max(0, p.value));
      if (x2 - x1 > 0.5) shapes.push({ t: "rect", x: x1, y, w: x2 - x1, h: BAR, r: 3, fill: colourOf(metric, si), stroke: colourOf(metric, si), sw: 0.01, on: TOKENS.ground });
      shapes.push(text(m, x2 + 6, y + BAR / 2 + 4, withUnit(p.value, metric).replace(` ${metric.unit}`, ""), { size: TYPE.label, weight: WEIGHT.bold, fill: TOKENS.strong }));
    });
  });
  if (metric.target !== undefined) {
    shapes.push({ t: "path", d: `M${px(metric.target)} ${top - 6} L${px(metric.target)} ${height}`, fill: "none", stroke: TOKENS.edgeStrong, sw: 1.5, dash: "5 4", on: TOKENS.ground });
    shapes.push(text(m, px(metric.target), top - 10, `Target ${withUnit(metric.target, metric)}`, { size: TYPE.label, anchor: "middle" }));
  }
  if (n > 1) shapes.push(...legend(m, metric, PAD, PAD + 6));
  shapes.push(text(m, x0 + W, height + 34, metric.unit ?? "", { size: TYPE.label, anchor: "end" }));
  return fit({ width: PAD * 2 + PLOT_W + 60, height: height + 44, items: [{ id: "chart", cls: "uxb-chart", data: {}, box: { kind: "plot", x: 0, y: 0, w: PAD * 2 + PLOT_W + 60, h: height + 44 }, shapes: shapes.map((x) => (x.t === "text" ? { ...x, owner: "chart" } : x)) }] }, 0);
}

/* A legend row: a swatch in the series colour and its name in body text. */
function legend(m, metric, x, y) {
  const out = [];
  metric.series.forEach((s, i) => {
    out.push({ t: "rect", x, y: y - 9, w: 16, h: 10, r: 2, fill: colourOf(metric, i), stroke: colourOf(metric, i), sw: 0.01, on: TOKENS.ground });
    out.push(text(m, x + 22, y, s.label, { size: TYPE.label }));
    x += 22 + m.width(s.label, TYPE.label, WEIGHT.regular) + 18;
  });
  return out;
}

function line(v, { m }) {
  const metric = v.metric, time = metric.axis?.kind !== "category";
  const xs = [...new Set(metric.series.flatMap((s) => s.points.map((p) => p.at)))];
  const ord = time ? (at) => day(at) : (at) => xs.indexOf(at);
  const a = Math.min(...xs.map(ord)), b = Math.max(...xs.map(ord));
  const all = metric.series.flatMap((s) => s.points.map((p) => p.value));
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all, metric.target ?? 0));
  const lo = ticks[0], hi = ticks.at(-1);
  const yLabelW = Math.max(...ticks.map((t) => m.width(formatValue(t, metric.format), TYPE.label, WEIGHT.regular))) + 10;
  const direct = metric.series.length <= 4;
  const endW = direct ? Math.max(...metric.series.map((s) => m.width(`${s.label} ${formatValue(s.points.at(-1).value, metric.format)}`, TYPE.label, WEIGHT.bold))) + 16 : 0;
  const x0 = PAD + yLabelW, top = PAD + (direct ? 8 : 28), W = PLOT_W - yLabelW, H = PLOT_H;
  const px = (at) => x0 + ((ord(at) - a) / (b - a || 1)) * W, py = (val) => top + H - ((val - lo) / (hi - lo)) * H;
  const shapes = [];
  for (const tk of ticks) {
    shapes.push({ t: "path", d: `M${x0} ${py(tk)} L${x0 + W} ${py(tk)}`, fill: "none", stroke: TOKENS.edgeMuted, sw: tk === 0 ? 1.25 : 0.75, on: TOKENS.ground });
    shapes.push(text(m, x0 - 8, py(tk) + 4, formatValue(tk, metric.format), { size: TYPE.label, anchor: "end" }));
  }
  const xticks = time ? dateTicks(a, b).map((t) => ({ x: x0 + ((t.at - a) / (b - a || 1)) * W, label: t.label })) : xs.map((at) => ({ x: px(at), label: String(at) }));
  for (const t of xticks) if (t.x >= x0 - 1 && t.x <= x0 + W + 1) shapes.push(text(m, t.x, top + H + 18, t.label, { size: TYPE.label, anchor: "middle" }));
  if (metric.target !== undefined) {
    shapes.push({ t: "path", d: `M${x0} ${py(metric.target)} L${x0 + W} ${py(metric.target)}`, fill: "none", stroke: TOKENS.edgeStrong, sw: 1.5, dash: "5 4", on: TOKENS.ground });
    shapes.push(text(m, x0 + 4, py(metric.target) - 6, `Target ${withUnit(metric.target, metric)}`, { size: TYPE.label }));
  }
  // Lines, then their end labels, nudged apart so none overlaps another.
  const ends = [];
  metric.series.forEach((s, i) => {
    const pts = [...s.points].sort((p, q) => ord(p.at) - ord(q.at));
    shapes.push({ t: "path", d: pts.map((p, k) => `${k ? "L" : "M"}${px(p.at).toFixed(2)} ${py(p.value).toFixed(2)}`).join(" "), fill: "none", stroke: colourOf(metric, i), sw: 2, on: TOKENS.ground });
    const lp = pts.at(-1);
    shapes.push({ t: "circle", cx: px(lp.at), cy: py(lp.value), r: 4, fill: colourOf(metric, i), stroke: TOKENS.ground, sw: 2 });
    ends.push({ s, i, y: py(lp.value), value: lp.value });
  });
  if (direct) {
    ends.sort((p, q) => p.y - q.y);
    for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 16);
    for (const e of ends) shapes.push(text(m, x0 + W + 10, e.y + 4, `${e.s.label} ${formatValue(e.value, metric.format)}`, { size: TYPE.label, weight: WEIGHT.bold, fill: TOKENS.strong }));
  } else shapes.push(...legend(m, metric, x0, PAD + 6));
  shapes.push(text(m, x0, top - (direct ? 0 : 0) + H + 36, metric.unit ?? "", { size: TYPE.label }));
  const width = x0 + W + endW + PAD, height = top + H + 46;
  return fit({ width, height, items: [{ id: "chart", cls: "uxb-chart", data: {}, box: { kind: "plot", x: 0, y: 0, w: width, h: height }, shapes: shapes.map((x) => (x.t === "text" ? { ...x, owner: "chart" } : x)) }] }, 0);
}

function meter(v, { m }) {
  const metric = v.metric, s = metric.series[0], value = s.points.at(-1).value, target = metric.target ?? 100;
  const share = Math.max(0, Math.min(1, value / target)), W = 480, H = 16;
  const words = `${withUnit(value, metric)} of ${formatValue(target, metric.format)} (${Math.round(share * 100)}%)`;
  const shapes = [
    text(m, PAD, PAD + 22, formatValue(value, metric.format), { size: 28, weight: WEIGHT.bold, fill: TOKENS.strong }),
    text(m, PAD + m.width(formatValue(value, metric.format), 28, WEIGHT.bold) + 8, PAD + 22, `of ${withUnit(target, metric)}`, { size: TYPE.header }),
    { t: "rect", x: PAD, y: PAD + 40, w: W, h: H, r: H / 2, fill: TOKENS.sunken, stroke: TOKENS.edgeMuted, sw: 1, on: TOKENS.ground },
  ];
  if (share > 0) shapes.push({ t: "rect", x: PAD, y: PAD + 40, w: Math.max(H, W * share), h: H, r: H / 2, fill: TOKENS.accent, stroke: TOKENS.accent, sw: 0.01, on: TOKENS.ground });
  shapes.push(text(m, PAD, PAD + 40 + H + 22, words, { size: TYPE.label }));
  const width = PAD * 2 + W, height = PAD + 40 + H + 34;
  return fit({ width, height, items: [{ id: s.id, cls: "uxb-meter", data: {}, box: { kind: "meter", x: 0, y: 0, w: width, h: height }, shapes: shapes.map((x) => (x.t === "text" ? { ...x, owner: s.id } : x)) }] }, 0);
}
