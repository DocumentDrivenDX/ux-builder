/* timeline (visuals PRD §5.5): milestones, roadmap and history, our own placement.

   The scale is dates (whole UTC days) or named periods in order. milestones: one quiet axis with
   ticks; the events of one day share a dot, their names stacked over the date, on the first level
   above or below the axis where they clear the labels already there, joined to the dot by a leader. roadmap: lanes as rows, spans as
   rounded bars in the lane's series colour (built solid, decided or placeholder an outline,
   dashed), each span's label above its bar in body text, markers as vertical rules (today in the
   accent). history: a vertical list for narrow pages, newest last, each event's date beside a dot
   on a rule. Below their minimum width, milestones and roadmap become a history (KND-06). */

import { TOKENS, TYPE, WEIGHT } from "../grammar.mjs";
import { dateLabel, dateTicks, day } from "./chart.mjs";
import { fit } from "./route.mjs";

export const MIN_WIDTH = { milestones: 560, roadmap: 560 };
const PAD = 16, AXIS_W = 960, LANE_COL = 150, BAR_H = 14;

export function layoutTimeline(v, ctx) {
  const narrow = ctx.width && MIN_WIDTH[v.form] && ctx.width < MIN_WIDTH[v.form];
  if (narrow) ctx.warnings?.push({ code: "NARROW_FALLBACK", message: `timeline/${v.form} is drawn as a history below ${MIN_WIDTH[v.form]}px` });
  if (v.form === "history" || narrow) return history(v, ctx);
  return v.form === "roadmap" ? roadmap(v, ctx) : milestones(v, ctx);
}

/* Where things sit on the scale: a day number, or a period's index (its column's middle). */
function scaleOf(t) {
  if (t.scale.kind === "period") {
    const index = new Map(t.scale.periods.map((p, i) => [p.id, i]));
    return { periods: t.scale.periods, pos: (id) => index.get(id), span: [0, t.scale.periods.length - 1], label: (id) => t.scale.periods[index.get(id)]?.label ?? id };
  }
  const all = [...(t.events ?? []).map((e) => day(e.at)), ...(t.spans ?? []).flatMap((s) => [day(s.start), day(s.end)]), ...(t.markers ?? []).map((k) => day(k.at))];
  const a = Math.min(...all), b = Math.max(...all);
  return { pos: day, span: [a, Math.max(b, a + 1)], label: (iso) => dateLabel(day(iso)) };
}

const textShape = (m, x, y, s, { size = TYPE.detail, weight = WEIGHT.regular, fill = TOKENS.text, on = TOKENS.ground, anchor, owner = "timeline" } = {}) =>
  ({ t: "text", x, y, text: s, size, weight, fill, on, w: m.width(s, size, weight), owner, ...(anchor ? { anchor } : {}) });

function milestones(v, { m }) {
  const t = v.timeline, sc = scaleOf(t), [a, b] = sc.span;
  const x = (at) => PAD + 40 + ((sc.pos(at) - a) / (b - a || 1)) * (AXIS_W - 80);
  const events = [...(t.events ?? [])].sort((p, q) => sc.pos(p.at) - sc.pos(q.at) || p.id.localeCompare(q.id));
  const days = [];
  for (const e of events) { const last = days.at(-1); if (last && sc.pos(last.at) === sc.pos(e.at)) last.events.push(e); else days.push({ at: e.at, events: [e] }); }
  const lh = m.lineHeight(TYPE.detail);
  // Levels alternate above and below the axis, nearest first; each day takes the first that is clear.
  const levels = [];
  const placed = days.map((d) => {
    const cx = x(d.at), names = d.events.map((e) => e.label), sub = sc.label(d.at);
    const w = Math.max(...names.map((n) => m.width(n, TYPE.detail, WEIGHT.bold)), m.width(sub, TYPE.label, WEIGHT.regular));
    const box = { l: cx - w / 2 - 6, r: cx + w / 2 + 6 };
    let k = 0;
    for (;; k++) { if (!levels[k] || levels[k] <= box.l) break; }
    levels[k] = box.r;
    return { d, cx, names, sub, w, h: names.length * lh + 14, level: k };
  });
  // Each level is as tall as the tallest label block on it.
  const levelH = (k) => Math.max(...placed.filter((p) => p.level === k).map((p) => p.h), 0) + 12;
  const reach = (up) => { let s = 0; for (let k = up ? 0 : 1; k < levels.length; k += 2) s += levelH(k); return s; };
  const above = reach(true), below = reach(false);
  const axisY = PAD + above + 8;
  const shapes = [{ t: "path", d: `M${PAD} ${axisY} L${PAD + AXIS_W} ${axisY}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1.5, on: TOKENS.ground }];
  const items = [];
  // Ticks under the axis when nothing is placed there, else over the top labels.
  const tickY = axisY + 22;
  if (t.scale.kind !== "period") for (const tk of dateTicks(a, b)) {
    const tx = PAD + 40 + ((tk.at - a) / (b - a || 1)) * (AXIS_W - 80);
    if (tx < PAD || tx > PAD + AXIS_W) continue;
    shapes.push({ t: "path", d: `M${tx} ${axisY - 4} L${tx} ${axisY + 4}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1, on: TOKENS.ground });
    if (!below) shapes.push(textShape(m, tx, tickY, tk.label, { size: TYPE.label, anchor: "middle" }));
  }
  // Where each level's block starts, outward from the axis.
  const offset = (k) => { let s = 0; for (let j = k % 2; j < k; j += 2) s += levelH(j); return s; };
  for (const p of placed) {
    const up = p.level % 2 === 0;
    const top = up ? axisY - 12 - offset(p.level) - p.h : axisY + 16 + offset(p.level);
    shapes.push({ t: "path", d: `M${p.cx} ${axisY} L${p.cx} ${up ? top + p.h + 2 : top - 2}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1, on: TOKENS.ground });
    const open = p.d.events.every((e) => e.status === "decided" || e.status === "placeholder");
    shapes.push({ t: "circle", cx: p.cx, cy: axisY, r: 5, fill: open ? TOKENS.ground : TOKENS.strong, stroke: TOKENS.strong, sw: 1.5, on: TOKENS.ground });
    const id = p.d.events.map((e) => e.id).join("+");
    items.push({ id, cls: "uxb-event", data: {}, box: { kind: "event", x: p.cx - p.w / 2 - 2, y: top, w: p.w + 4, h: p.h }, shapes: [
      ...p.names.map((n, i) => textShape(m, p.cx, top + TYPE.detail + i * lh, n, { weight: WEIGHT.bold, fill: TOKENS.strong, anchor: "middle", owner: id })),
      textShape(m, p.cx, top + p.names.length * lh + 11, p.sub, { size: TYPE.label, anchor: "middle", owner: id }),
    ] });
  }
  for (const k of t.markers ?? []) shapes.push(...marker(m, k, x(k.at), PAD, axisY + below + 24));
  const height = axisY + Math.max(below + 16, 30) + PAD;
  return fit({ width: PAD * 2 + AXIS_W, height, items: [{ id: null, cls: "uxb-axis", data: {}, shapes }, ...items] }, 8);
}

/* A marker: a vertical rule with its label at the top; today in the accent. */
function marker(m, k, x, top, bottom) {
  const today = k.kind === "today", stroke = today ? TOKENS.accent : TOKENS.edgeMuted;
  return [
    { t: "path", d: `M${x} ${top + 16} L${x} ${bottom}`, fill: "none", stroke, sw: today ? 2 : 1.5, dash: k.kind === "deadline" ? "6 4" : null, on: TOKENS.ground },
    textShape(m, x, top + 10, k.label, { size: TYPE.label, weight: WEIGHT.bold, fill: today ? TOKENS.accent : TOKENS.text, anchor: "middle" }),
  ];
}

function roadmap(v, { m }) {
  const t = v.timeline, sc = scaleOf(t);
  const lanes = t.lanes?.length ? t.lanes : [{ id: null, label: "" }];
  const laneOf = (s) => (t.lanes?.length ? s.lane : null);
  const x0 = PAD + LANE_COL;
  // Periods are columns, each at least as wide as the longest word a span's label holds; a span
  // covers its start's column through its end's. Dates are a line.
  const cols = sc.periods?.length;
  const word = Math.max(0, ...(t.spans ?? []).flatMap((s) => s.label.split(/\s+/).map((w) => m.width(w, TYPE.detail, WEIGHT.regular))));
  const colW = cols ? Math.max((AXIS_W - LANE_COL) / cols, word + 16) : 0;
  const plotW = cols ? colW * cols : AXIS_W - LANE_COL, width = LANE_COL + plotW;
  const [a, b] = sc.span;
  const xs = (s) => (cols ? [x0 + sc.pos(s.start) * colW + 4, x0 + (sc.pos(s.end) + 1) * colW - 4] : [x0 + ((day(s.start) - a) / (b - a || 1)) * plotW, x0 + ((day(s.end) - a) / (b - a || 1)) * plotW]);
  const lh = m.lineHeight(TYPE.detail), shapes = [], items = [];
  let y = PAD + 30;
  // The scale across the top.
  if (cols) sc.periods.forEach((p, i) => shapes.push(textShape(m, x0 + (i + 0.5) * colW, PAD + 12, p.label, { size: TYPE.label, weight: WEIGHT.bold, anchor: "middle", fill: TOKENS.strong })));
  else for (const tk of dateTicks(a, b)) shapes.push(textShape(m, x0 + ((tk.at - a) / (b - a || 1)) * plotW, PAD + 12, tk.label, { size: TYPE.label, anchor: "middle" }));
  const top = y;
  lanes.forEach((lane, li) => {
    const spans = (t.spans ?? []).filter((s) => laneOf(s) === lane.id).sort((p, q) => xs(p)[0] - xs(q)[0]);
    // Each span on the first row of its lane where it clears the spans already there.
    const rows = [];
    const placed = spans.map((s) => {
      const [l, r] = xs(s), label = m.wrap(s.label, TYPE.detail, WEIGHT.regular, Math.max(r - l, 90));
      const w = Math.max(r - l, ...label.map((x) => m.width(x, TYPE.detail, WEIGHT.regular)));
      let k = 0;
      for (;; k++) if (!rows[k] || rows[k] <= l) break;
      rows[k] = l + w;
      return { s, l, r, label, row: k };
    });
    const rowH = Math.max(1, ...placed.map((p) => p.label.length)) * lh + BAR_H + 14;
    const laneH = Math.max(1, rows.length) * rowH + 8;
    shapes.push({ t: "rect", x: PAD, y, w: width, h: laneH, fill: TOKENS.region(li % 2 + 1) });
    m.wrap(lane.label, TYPE.detail, WEIGHT.bold, LANE_COL - 16).forEach((line, k) => shapes.push(textShape(m, PAD + 10, y + 20 + k * lh, line, { weight: WEIGHT.bold, fill: TOKENS.text, on: TOKENS.region(li % 2 + 1) })));
    const series = TOKENS.series(li);
    for (const p of placed) {
      const ry = y + 8 + p.row * rowH, region = TOKENS.region(li % 2 + 1);
      const solid = !p.s.status || p.s.status === "built";
      // A row's bars share one line: under its tallest label.
      const barY = ry + Math.max(...placed.filter((q) => q.row === p.row).map((q) => q.label.length)) * lh + 4;
      items.push({ id: p.s.id, cls: "uxb-span", data: { status: p.s.status, lane: lane.id }, box: { kind: "span", x: p.l, y: ry, w: Math.max(p.r - p.l, ...p.label.map((x) => m.width(x, TYPE.detail, WEIGHT.regular))), h: barY + BAR_H - ry }, shapes: [
        ...p.label.map((line, k) => textShape(m, p.l, barY - 4 - (p.label.length - k) * lh + 12, line, { on: region, owner: p.s.id })),
        { t: "rect", x: p.l, y: barY, w: p.r - p.l, h: BAR_H, r: BAR_H / 2, fill: solid ? series : region, stroke: series, sw: 2, dash: solid ? null : "5 4", on: region },
      ] });
    }
    y += laneH + 4;
  });
  for (const k of t.markers ?? []) {
    const x = cols ? x0 + (sc.pos(k.at) + 0.5) * colW : x0 + ((day(k.at) - a) / (b - a || 1)) * plotW;
    shapes.push(...marker(m, k, x, top - 30, y));
  }
  return fit({ width: PAD * 2 + width, height: y + PAD, items: [{ id: null, cls: "uxb-axis", data: {}, shapes }, ...items] }, 8);
}

function history(v, { m }) {
  const t = v.timeline, sc = scaleOf(t);
  const entries = [...(t.events ?? []).map((e) => ({ id: e.id, at: e.at, label: e.label, detail: e.detail, status: e.status })),
    ...(t.spans ?? []).map((s) => ({ id: s.id, at: s.start, label: s.label, detail: s.start === s.end ? s.detail : `${sc.label(s.start)} to ${sc.label(s.end)}${s.detail ? `. ${s.detail}` : ""}`, status: s.status }))]
    .sort((p, q) => sc.pos(p.at) - sc.pos(q.at) || p.id.localeCompare(q.id));
  const DATE_W = Math.max(...entries.map((e) => m.width(sc.label(e.at), TYPE.label, WEIGHT.regular))) + 8, RULE = PAD + DATE_W + 14, TEXT_X = RULE + 18, TEXT_W = 300;
  const lh = m.lineHeight(TYPE.detail), shapes = [], items = [];
  let y = PAD;
  const rows = entries.map((e) => {
    const label = m.wrap(e.label, TYPE.detail, WEIGHT.bold, TEXT_W), detail = e.detail ? m.wrap(e.detail, TYPE.label, WEIGHT.regular, TEXT_W) : [];
    return { e, label, detail, h: label.length * lh + detail.length * m.lineHeight(TYPE.label) + 14 };
  });
  const total = rows.reduce((s, r) => s + r.h, 0);
  shapes.push({ t: "path", d: `M${RULE} ${PAD + 6} L${RULE} ${PAD + total - 10}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1.5, on: TOKENS.ground });
  for (const r of rows) {
    const open = r.e.status === "decided" || r.e.status === "placeholder";
    shapes.push({ t: "circle", cx: RULE, cy: y + 8, r: 5, fill: open ? TOKENS.ground : TOKENS.strong, stroke: TOKENS.strong, sw: 1.5, on: TOKENS.ground });
    const sub = [];
    r.label.forEach((line, k) => sub.push(textShape(m, TEXT_X, y + 12 + k * lh, line, { weight: WEIGHT.bold, fill: TOKENS.strong, owner: r.e.id })));
    r.detail.forEach((line, k) => sub.push(textShape(m, TEXT_X, y + 12 + r.label.length * lh + k * m.lineHeight(TYPE.label), line, { size: TYPE.label, owner: r.e.id })));
    sub.push(textShape(m, RULE - 14, y + 12, sc.label(r.e.at), { size: TYPE.label, anchor: "end", owner: r.e.id }));
    items.push({ id: r.e.id, cls: "uxb-event", data: { status: r.e.status }, box: { kind: "event", x: PAD, y, w: TEXT_X + TEXT_W - PAD, h: r.h }, shapes: sub });
    y += r.h;
  }
  return fit({ width: TEXT_X + TEXT_W + PAD, height: y + PAD, items: [{ id: null, cls: "uxb-axis", data: {}, shapes }, ...items] }, 8);
}
