/* sequence: lifelines and ladder (visuals PRD §5.2). Own arithmetic: participants in columns,
   one row per message, each message numbered; phases as tinted bands behind their rows. Below
   the width it is given, lifelines fall back to the ladder (CONTRACT-009 NARROW_FALLBACK). */

import { TOKENS, TYPE, WEIGHT, arrow, drawNode, edgePaint, roundedPath, sizeNode, stepsOf } from "../grammar.mjs";

const MARGIN = 24, GAP = 48, ROW = 44, LOOP = 36, BADGE_R = 11;

export function layoutSequence(v, ctx) {
  if (v.form === "lifelines") {
    const scene = lifelines(v, ctx);
    if (!ctx.width || scene.width <= ctx.width) return scene;
    ctx.warnings.push({ code: "NARROW_FALLBACK", message: `Lifelines need ${scene.width}px; drawn as a ladder for ${ctx.width}px` });
  }
  return ladder(v, ctx);
}

function badge(m, n, cx, cy, step) {
  const text = String(n);
  return { t: "group", shapes: [
    { t: "circle", cx, cy, r: BADGE_R, fill: TOKENS.accent },
    { t: "text", x: cx, y: cy + TYPE.badge * 0.35, anchor: "middle", text, size: TYPE.badge, weight: WEIGHT.bold, fill: TOKENS.onAccent, on: TOKENS.accent, w: m.width(text, TYPE.badge, WEIGHT.bold), owner: null },
  ], step };
}

function lifelines(v, { theme, m }) {
  const { participants, messages } = v.sequence;
  const index = new Map(participants.map((p, i) => [p.id, i]));
  const sizes = participants.map((p) => sizeNode(m, p, { minWidth: 96 }));
  const labelW = (msg) => m.width(msg.label, TYPE.label, WEIGHT.regular) + 2 * BADGE_R + 20;
  // Column centres: far enough apart for their headers, then for every label that spans them.
  const x = [];
  sizes.forEach((s, i) => { x.push(i === 0 ? MARGIN + s.w / 2 : x[i - 1] + sizes[i - 1].w / 2 + GAP + s.w / 2); });
  const spans = messages.filter((msg) => msg.kind !== "note").map((msg) => {
    const a = index.get(msg.from), b = index.get(msg.to);
    return a === b ? { lo: a, hi: Math.min(a + 1, participants.length - 1), need: LOOP + labelW(msg) + 12, self: true } : { lo: Math.min(a, b), hi: Math.max(a, b), need: labelW(msg) };
  }).sort((p, q) => (p.hi - p.lo) - (q.hi - q.lo));
  let tail = 0;
  for (const s of spans) {
    if (s.self && s.lo === s.hi) { tail = Math.max(tail, s.need); continue; }
    const short = s.need - (x[s.hi] - x[s.lo]);
    if (short > 0) for (let i = s.hi; i < x.length; i++) x[i] += short;
  }
  const headerH = Math.max(...sizes.map((s) => s.h));
  const top = MARGIN + 8;
  const items = [];
  const stepIds = stepsOf(v.steps);
  const groups = v.groups ?? [];
  let y = top + headerH + 36;
  // A note's span and lines are fixed here, once, so its box always holds what is drawn in it.
  const noteOf = (msg) => {
    const a = x[index.get(msg.from)], b = x[index.get(msg.to)];
    let lo = Math.min(a, b) - 70, hi = Math.max(a, b) + 70;
    if (hi - lo < 200) { const c = (lo + hi) / 2; lo = c - 100; hi = c + 100; }
    if (lo < MARGIN) { hi += MARGIN - lo; lo = MARGIN; }
    const lines = m.wrap(msg.label, TYPE.label, WEIGHT.regular, hi - lo - 20);
    return { lo, hi, lines, h: Math.max(28, lines.length * m.lineHeight(TYPE.label) + 12) };
  };
  const rows = messages.map((msg) => {
    const note = msg.kind === "note" ? noteOf(msg) : null;
    const rowY = y;
    y += note ? note.h + 16 : msg.from === msg.to ? ROW + 16 : ROW;
    return { msg, y: rowY, noteH: note?.h ?? 0, note };
  });
  const bottom = y + 8;
  const width = Math.ceil(Math.max(x.at(-1) + sizes.at(-1).w / 2 + Math.max(MARGIN, tail), ...rows.filter((r) => r.note).map((r) => r.note.hi + MARGIN)));
  // Phase bands first, behind everything.
  for (const g of groups) {
    const mine = rows.filter((r) => r.msg.group === g.id);
    if (!mine.length) continue;
    const y0 = Math.min(...mine.map((r) => r.y)) - 30, y1 = Math.max(...mine.map((r) => r.y + (r.noteH || 0))) + 14;
    const label = `${g.role === "phase" ? "" : `${g.role} · `}${g.label}`;
    items.push({ id: g.id, cls: "uxb-group", data: { role: g.role }, steps: stepIds.get(g.id), box: { kind: "band", x: 8, y: y0, w: width - 16, h: y1 - y0 }, shapes: [
      { t: "rect", x: 8, y: y0, w: width - 16, h: y1 - y0, r: 6, fill: TOKENS.region(1) },
      { t: "text", x: 18, y: y0 + 16, text: label, size: TYPE.group, weight: WEIGHT.bold, fill: TOKENS.text, on: TOKENS.region(1), w: m.width(label, TYPE.group, WEIGHT.bold), owner: g.id },
    ] });
  }
  // Participants and their lifelines.
  participants.forEach((p, i) => {
    const s = sizes[i];
    const head = drawNode(theme, m, p, s, x[i] - s.w / 2, top + (headerH - s.h), { cls: "uxb-participant" });
    head.box.kind = "participant";
    head.shapes.unshift({ t: "path", d: `M${x[i]} ${top + headerH} L${x[i]} ${bottom}`, fill: "none", stroke: TOKENS.edgeMuted, sw: theme.px("piq-size-diagram-stroke"), dash: "3 4", on: TOKENS.ground });
    items.push({ ...head, steps: stepIds.get(p.id) });
  });
  // Messages, numbered in order.
  rows.forEach(({ msg, y: rowY, noteH, note }, n) => {
    const a = x[index.get(msg.from)], b = x[index.get(msg.to)];
    const steps = stepIds.get(msg.id);
    if (msg.kind === "note") {
      const { lo, hi, lines } = note;
      const shapes = [{ t: "rect", x: lo, y: rowY - 14, w: hi - lo, h: noteH, r: 4, fill: TOKENS.sunken, stroke: TOKENS.edgeMuted, sw: theme.px("piq-size-diagram-stroke"), on: TOKENS.ground }];
      lines.forEach((line, i) => shapes.push({ t: "text", x: lo + 10, y: rowY + 2 + i * m.lineHeight(TYPE.label), text: line, size: TYPE.label, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.sunken, w: m.width(line, TYPE.label, WEIGHT.regular), owner: msg.id }));
      const b1 = badge(m, n + 1, lo - BADGE_R - 4, rowY - 2);
      items.push({ id: msg.id, cls: "uxb-message", data: { kind: "note" }, steps, box: { kind: "note", x: lo, y: rowY - 14, w: hi - lo, h: noteH }, shapes: [...shapes, ...b1.shapes] });
      return;
    }
    const p = edgePaint({ kind: msg.kind === "return" ? "return" : msg.kind === "call" ? "action" : undefined, status: msg.status, emphasis: msg.emphasis });
    const sw = theme.px(p.strong ? "piq-size-diagram-stroke-strong" : "piq-size-diagram-stroke");
    const points = a === b ? [[a, rowY], [a + LOOP, rowY], [a + LOOP, rowY + 18], [a + 2, rowY + 18]] : [[a, rowY], [b, rowY]];
    const head = arrow(points, { open: msg.kind === "async" });
    const shapes = [
      { t: "path", d: roundedPath(head.line, 6), fill: "none", stroke: p.stroke, sw, dash: p.dash, on: TOKENS.ground },
      { t: "path", d: head.head, fill: head.open ? "none" : p.stroke, stroke: p.stroke, sw, on: TOKENS.ground },
    ];
    const tw = m.width(msg.label, TYPE.label, WEIGHT.regular);
    const lx = a === b ? a + LOOP + 10 : (a + b) / 2 - tw / 2 + BADGE_R;
    const label = { x: lx - 4, y: rowY - 24, w: tw + 8, h: 18 };
    shapes.push({ t: "rect", x: label.x, y: label.y, w: label.w, h: label.h, r: 4, fill: TOKENS.ground });
    shapes.push({ t: "text", x: lx, y: rowY - 10, text: msg.label, size: TYPE.label, weight: WEIGHT.regular, fill: TOKENS.text, on: TOKENS.ground, w: tw, owner: `${msg.id}#label` });
    const bx = a === b ? a + LOOP + 10 + tw + BADGE_R + 8 : lx - BADGE_R - 8;
    shapes.push(...badge(m, n + 1, bx, rowY - 15).shapes);
    items.push({ id: msg.id, cls: "uxb-message", data: { kind: msg.kind ?? "call", status: msg.status, emphasis: msg.emphasis }, steps,
      edge: { points, label, from: msg.from, to: msg.to }, shapes });
  });
  return { width, height: Math.ceil(bottom + MARGIN), items };
}

/* Numbered rows down the page: who calls whom, and what. */
function ladder(v, { m, width = 390 }) {
  const { participants, messages } = v.sequence;
  const name = new Map(participants.map((p) => [p.id, p.label]));
  const stepIds = stepsOf(v.steps);
  const textW = Math.max(160, width - 2 * MARGIN - 2 * BADGE_R - 12);
  const items = [];
  let y = MARGIN;
  const left = MARGIN + BADGE_R;
  const centres = [];
  messages.forEach((msg, n) => {
    const head = msg.kind === "note" ? `Note · ${name.get(msg.from)}` : `${name.get(msg.from)} → ${name.get(msg.to)}`;
    const headLines = m.wrap(head, TYPE.label, WEIGHT.bold, textW);
    const bodyLines = m.wrap(msg.label, TYPE.label, WEIGHT.regular, textW);
    const tx = left + BADGE_R + 12;
    const shapes = [];
    let ty = y + TYPE.label;
    for (const line of headLines) { shapes.push({ t: "text", x: tx, y: ty, text: line, size: TYPE.label, weight: WEIGHT.bold, fill: TOKENS.strong, on: TOKENS.ground, w: m.width(line, TYPE.label, WEIGHT.bold), owner: msg.id }); ty += m.lineHeight(TYPE.label); }
    for (const line of bodyLines) { shapes.push({ t: "text", x: tx, y: ty, text: line, size: TYPE.label, weight: WEIGHT.regular, fill: msg.kind === "return" ? TOKENS.muted : TOKENS.text, on: TOKENS.ground, w: m.width(line, TYPE.label, WEIGHT.regular), owner: msg.id }); ty += m.lineHeight(TYPE.label); }
    const h = ty - y - TYPE.label + 6;
    centres.push(y + 8);
    shapes.push(...badge(m, n + 1, left, y + 8).shapes);
    items.push({ id: msg.id, cls: "uxb-message", data: { kind: msg.kind ?? "call" }, steps: stepIds.get(msg.id), box: { kind: "row", x: tx - 2, y, w: textW + 4, h: h + 4 }, shapes });
    y += h + 16;
  });
  // The thread joining the numbers.
  if (centres.length > 1) items.unshift({ id: null, cls: "uxb-ladder", data: {}, shapes: [{ t: "path", d: `M${left} ${centres[0]} L${left} ${centres.at(-1)}`, fill: "none", stroke: TOKENS.edgeMuted, sw: 1.5, on: TOKENS.ground }] });
  return { width: Math.max(width, MARGIN * 2 + 200), height: Math.ceil(y + MARGIN - 16), items };
}
