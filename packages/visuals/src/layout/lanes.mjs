/* flow/lanes (visuals PRD §5.1, the field guide's plate): own placement, ported from HELIX
   documentor's field_guide.py, because ELK cannot match it (ADR-042). Lanes left to right, each
   lane's boxes stacked and centred on one shared axis; a gap wide enough for the labels crossing it.
   A box's lines into the next lane fan out: the topmost target wholly above is reached from the box's
   top, the bottommost wholly below from its bottom, the rest leave down its right side on nested
   corridors. A line within a lane drops straight down; one that skips a lane runs over the top; one
   that goes back runs under the bottom. The request's path (the lines the steps focus) is drawn
   heavy with numbered marks; other calls quiet. The lane holding the project's own part is shaded.

   The spine: from the first lane, the node in each lane that carries the flow on to another lane
   (the best connected, when several do) sits on the axis, and the rest of its lane stacks below it;
   a lane the flow does not pass through stays a centred stack. With no steps the visual is a system
   map rather than a field guide (HELIX's solution overview): the spine's lines are the heavy path, a
   lone own part is filled with the accent, a person is a silhouette, and a legend says what the
   drawing uses. */

import { TOKENS, WEIGHT, arrow, edgePaint, markShapes, roundedPath, roleMark, stepMarks, stepsOf } from "../grammar.mjs";
import { fit } from "./route.mjs";

const PAD = 40, HEAD = 58, LANE_GAP = 90, FAN_GAP = 112, NODE_GAP = 22, RIM = 16, AXIS_H = 88, MIN_W = 170, MAX_W = 260;
const NAME = 18, DETAIL = 13, LABEL = 12, LANE_HEAD = 12, TRACK = 0.12, ONE_LINE = 150, FIGURE = 34, LEGEND_H = 44;
const TINT = { mix: [TOKENS.accent, 10, TOKENS.surface] }, TINT_LINE = { mix: [TOKENS.accent, 50, TOKENS.surface] };

export function layoutLanes(v, { theme, m }) {
  const groups = v.groups ?? [];
  const parentOf = new Map(groups.map((g) => [g.id, g.parent]));
  const laneOfGroup = (id) => { let g = id; while (parentOf.get(g)) g = parentOf.get(g); return g; };
  const lanes = groups.filter((g) => !g.parent && g.role === "lane").map((g) => ({ group: g, ids: v.nodes.filter((n) => laneOfGroup(n.group) === g.id).map((n) => n.id) }))
    .filter((l) => l.ids.length);
  const laneOf = new Map(lanes.flatMap((l, i) => l.ids.map((id) => [id, i])));
  const node = new Map(v.nodes.map((n) => [n.id, n]));
  const edges = (v.edges ?? []).filter((e) => e.from !== e.to && laneOf.has(e.from) && laneOf.has(e.to));
  const stepIds = stepsOf(v.steps);
  // Each edge's step mark (a number, or words for a step outside the sequence): the first step that focuses it.
  const marks = stepMarks(v.steps), number = new Map();
  for (const s of v.steps ?? []) for (const id of s.focus) if (!number.has(id)) number.set(id, marks.get(s.id));
  const markOf = (id, x = 0, y = 0) => markShapes(m, number.get(id), x, y, { r: 12, fill: TOKENS.strong, ink: TOKENS.surface, ring: TOKENS.surface });

  // A system map (no reading order) rather than a field guide.
  const map = !(v.steps ?? []).length;
  // The spine: lane by lane, the node the flow passes on through, entered from the last one.
  const passesOn = (id) => edges.some((e) => e.from === id && laneOf.get(e.to) !== laneOf.get(id));
  const degree = (id) => edges.filter((e) => e.from === id || e.to === id).length;
  const spine = [];
  for (const lane of lanes) {
    const prev = spine.at(-1);
    const next = lane.ids.filter((id) => passesOn(id) && (prev === undefined || edges.some((e) => e.from === prev && e.to === id)))
      .sort((a, b) => degree(b) - degree(a))[0];
    if (!next) break;
    lane.spine = next;
    // The rest stack below it, or above when it sends or takes a line under the bottom, so that line drops straight.
    const under = edges.some((e) => (e.from === next || e.to === next) && laneOf.get(e.to) - laneOf.get(e.from) < -1);
    const rest = lane.ids.filter((id) => id !== next);
    lane.ids = under ? [...rest, next] : [next, ...rest];
    spine.push(next);
  }
  const onSpine = new Set(spine);
  const spineEdge = (e) => onSpine.has(e.from) && onSpine.has(e.to);
  const filled = map && v.nodes.filter((n) => n.role === "own").length === 1;

  // Labels: one line, or two when one would spill past its gap onto a box; within max when given.
  const labelLines = (text, max) => {
    if (!text) return [];
    if (max && m.width(text, LABEL, WEIGHT.regular) > max) return m.wrap(text, LABEL, WEIGHT.regular, max);
    if (m.width(text, LABEL, WEIGHT.regular) <= ONE_LINE) return [text];
    const full = m.width(text, LABEL, WEIGHT.regular);
    for (let w = full / 2 + 10; w <= full; w += 6) { const lines = m.wrap(text, LABEL, WEIGHT.regular, w); if (lines.length <= 2) return lines; }
    return [text];
  };
  const widest = (lines) => Math.max(0, ...lines.map((l) => m.width(l, LABEL, WEIGHT.regular)));
  // Boxes: as wide as name or detail needs, within bounds; a lane's boxes share its widest.
  const person = (n) => n.role === "actor";
  const figure = (n) => map && person(n);
  const boxes = new Map();
  for (const n of v.nodes) {
    if (!laneOf.has(n.id)) continue;
    const indent = person(n) ? 30 : 20;
    const widest = Math.max(m.width(n.label, NAME, WEIGHT.bold), n.detail ? m.width(n.detail, DETAIL, WEIGHT.regular) : 0) + 2 * indent;
    const w = Math.max(MIN_W, Math.min(MAX_W, widest));
    boxes.set(n.id, { w, h: 0, indent });
  }
  const lineBreaks = (n, w) => {
    const b = boxes.get(n.id);
    const name = m.wrap(n.label, NAME, WEIGHT.bold, w - 2 * b.indent), detail = n.detail ? m.wrap(n.detail, DETAIL, WEIGHT.regular, w - 2 * b.indent) : [];
    return { name, detail, h: (figure(n) ? FIGURE + 18 : 30) + name.length * m.lineHeight(NAME) + detail.length * m.lineHeight(DETAIL) };
  };
  for (const lane of lanes) {
    lane.w = Math.max(...lane.ids.map((id) => boxes.get(id).w));
    lane.owned = lane.ids.some((id) => node.get(id).role === "own");
    for (const id of lane.ids) { const b = boxes.get(id); b.w = lane.w; b.h = lineBreaks(node.get(id), lane.w).h; }
    // A station on the path, alone in its lane, gets room for the lines it sends.
    if (lane.ids.length === 1) { const b = boxes.get(lane.ids[0]); b.h = Math.max(b.h, AXIS_H); }
  }
  // Two boxes stacked in a lane that a line joins stand apart by its label and mark; the label stays
  // inside the lane, clear of the lines in the gap beside it.
  const inLane = (id) => boxes.get(id).w / 2 + RIM - 18;
  const gapBelow = (a, b) => {
    const e = edges.find((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));
    if (!e) return NODE_GAP;
    return Math.max(NODE_GAP, labelLines(e.label, inLane(a)).length * m.lineHeight(LABEL) + 18, number.has(e.id) ? 44 : 0);
  };
  const stack = (lane) => lane.ids.reduce((s, id, i) => s + boxes.get(id).h + (i ? gapBelow(lane.ids[i - 1], id) : 0), 0);
  // How far a lane reaches above and below the axis: its spine node centred on it, else its stack.
  const above = (lane) => {
    if (!lane.spine) return stack(lane) / 2;
    const k = lane.ids.indexOf(lane.spine), h = boxes.get(lane.spine).h;
    return lane.ids.slice(0, k).reduce((s, id, i) => s + boxes.get(id).h + gapBelow(id, lane.ids[i + 1]), 0) + h / 2;
  };
  const below = (lane) => stack(lane) - above(lane);
  const up = Math.max(...lanes.map(above)), down = Math.max(...lanes.map(below));

  // The gap after each lane: wide enough for the longest label line crossing it, wider for a fan.
  const gaps = lanes.map(() => LANE_GAP);
  const fans = new Map();
  for (const e of edges) {
    const i = laneOf.get(e.from);
    if (laneOf.get(e.to) !== i + 1) continue;
    gaps[i] = Math.max(gaps[i], widest(labelLines(e.label)) + 30);
    fans.set(e.from, (fans.get(e.from) ?? 0) + 1);
  }
  for (const [id, count] of fans) if (count > 1) gaps[laneOf.get(id)] = Math.max(gaps[laneOf.get(id)], FAN_GAP);

  // Room over the lanes for lines that skip forward, and under them for lines that step back.
  const hops = edges.map((e) => laneOf.get(e.to) - laneOf.get(e.from));
  const OVER = hops.some((h) => h > 1) ? 34 : 0, UNDER = hops.some((h) => h < 0) ? 34 : 0;
  const head = HEAD + OVER;
  // Place: lanes left to right on the shared axis.
  const axis = head + up;
  let x = PAD;
  lanes.forEach((lane, i) => {
    lane.x = x;
    let y = axis - above(lane);
    lane.ids.forEach((id, k) => { const b = boxes.get(id); Object.assign(b, { x, y }); y += b.h + (k < lane.ids.length - 1 ? gapBelow(id, lane.ids[k + 1]) : 0); });
    x += lane.w + gaps[i];
  });
  const width = x - gaps.at(-1) + PAD, height = head + up + down + PAD + UNDER;
  const cy = (b) => b.y + b.h / 2, cx = (b) => b.x + b.w / 2;
  const first = (id) => lanes[laneOf.get(id)].ids[0] === id, last = (id) => lanes[laneOf.get(id)].ids.at(-1) === id;

  // Route.
  const lines = [];
  const over = (e, up) => {
    const src = boxes.get(e.from), tgt = boxes.get(e.to), y0 = up ? src.y : src.y + src.h;
    const long = Math.abs(cy(tgt) - y0) >= 72;
    lines.push({ e, points: [[cx(src), y0], [cx(src), cy(tgt)], [tgt.x, cy(tgt)]], label: { x: tgt.x - 10, y: cy(tgt), anchor: "end" },
      mark: long ? [cx(src), (y0 + cy(tgt)) / 2] : [(cx(src) + tgt.x) / 2, cy(tgt)] });
  };
  const side = (from, all) => {
    const src = boxes.get(from), right = src.x + src.w;
    // The main flow along the axis runs straight from the middle; the others leave above and below it.
    const straight = all.filter((e) => spineEdge(e) && Math.abs(cy(boxes.get(e.to)) - cy(src)) < 1);
    for (const e of straight) {
      // Its label above the line, or below it when a line coming back into the box runs above.
      const mid = (right + boxes.get(e.to).x) / 2, y = cy(src), under = y + 13 + labelLines(e.label).length * m.lineHeight(LABEL);
      lines.push({ e, points: [[right, y], [boxes.get(e.to).x, y]], label: [{ x: mid, y, anchor: "middle" }, { x: mid, y: under, anchor: "middle" }], mark: [mid, y] });
    }
    const list = all.filter((e) => !straight.includes(e));
    const n = list.length, at = straight.length ? [...Array(n + 1).keys()].map((k) => k + 1).filter((k) => k !== Math.round((n + 2) / 2)).slice(0, n) : null;
    const exits = new Map(list.map((e, k) => [e, src.y + (src.h * (at ? at[k] : k + 1)) / ((at ? n + 2 : n + 1))]));
    const ty = (e) => cy(boxes.get(e.to));
    const ups = list.filter((e) => ty(e) < exits.get(e) - 10).sort((a, b) => ty(a) - ty(b));
    const downs = list.filter((e) => ty(e) > exits.get(e) + 10).sort((a, b) => ty(b) - ty(a));
    const slot = new Map([...ups.map((e, k) => [e, k]), ...downs.map((e, k) => [e, k])]);
    const corridors = Math.max(ups.length, downs.length, 1);
    for (const e of list) {
      const tgt = boxes.get(e.to), y = exits.get(e);
      if (!slot.has(e)) { const mid = (right + tgt.x) / 2; lines.push({ e, points: [[right, y], [tgt.x, y]], label: { x: mid, y, anchor: "middle" }, mark: [mid, y] }); continue; }
      const xc = right + (gaps[laneOf.get(from)] * (slot.get(e) + 1)) / (corridors + 1);
      // The label sits over the entry run, so the mark goes on the climb or a long drop; on a short drop, on the entry run.
      const climb = cy(tgt) < y || cy(tgt) - y >= 72;
      // Over the entry run, or over the exit run when the entry run's label would sit on the exit run.
      lines.push({ e, points: [[right, y], [xc, y], [xc, cy(tgt)], [tgt.x, cy(tgt)]], label: [{ x: tgt.x - 10, y: cy(tgt), anchor: "end" }, { x: xc - 8, y, anchor: "end" }],
        mark: climb ? [xc, (y + cy(tgt)) / 2] : [(xc + tgt.x) / 2, cy(tgt)] });
    }
  };
  const forward = new Map(), back = new Map();
  for (const e of edges) {
    const hop = laneOf.get(e.to) - laneOf.get(e.from);
    if (hop === 1) forward.set(e.from, [...(forward.get(e.from) ?? []), e]);
    else if (hop === -1) back.set(laneOf.get(e.to), [...(back.get(laneOf.get(e.to)) ?? []), e]);
    else if (hop === 0) {
      const a = boxes.get(e.from), b = boxes.get(e.to);
      const [top, bottom] = b.y >= a.y + a.h ? [a.y + a.h, b.y] : [b.y + b.h, a.y];
      const pts = b.y >= a.y + a.h ? [[cx(a), top], [cx(a), bottom]] : [[cx(a), a.y], [cx(a), b.y + b.h]];
      lines.push({ e, points: pts, label: { x: cx(a) + 14, y: (top + bottom) / 2, anchor: "start" }, max: inLane(e.from), mark: [cx(a), (top + bottom) / 2] });
    } else {
      // Over the top (a skip forward) or under the bottom (a step back). Each end uses its box's top
      // or bottom when nothing in its lane is in the way, otherwise its side and the gap beside it.
      const a = boxes.get(e.from), b = boxes.get(e.to), up = hop > 0, y = up ? 26 : height - 18;
      const clear = (id) => (up ? first(id) : last(id));
      const beside = (id, toward) => {
        const i = laneOf.get(id), box = boxes.get(id);
        return toward > 0 ? box.x + box.w + gaps[i] / 3 : box.x - (i ? gaps[i - 1] : PAD) / 3;
      };
      const end = (id, dir) => {
        const box = boxes.get(id);
        if (clear(id)) return [[cx(box), up ? box.y : box.y + box.h], [cx(box), y]];
        const xs = beside(id, dir), port = up ? box.y + box.h / 4 : box.y + (box.h * 3) / 4;
        return [[dir > 0 ? box.x + box.w : box.x, port], [xs, port], [xs, y]];
      };
      // The source faces the target's way; the target is entered from the side facing the source.
      const from = end(e.from, Math.sign(hop)), into = end(e.to, -Math.sign(hop)).reverse();
      const pts = [...from, ...into];
      const mid = (pts[from.length - 1][0] + pts[from.length][0]) / 2;
      lines.push({ e, points: pts, label: { x: mid, y, anchor: "middle" }, mark: [mid, y] });
    }
  }
  // A step back to the next lane crosses the gap between them: out of the source's left side, along a
  // corridor near the source, into the target's right side a quarter down (clear of its own exits).
  for (const [i, list] of back) {
    const gapRight = lanes[i].x + lanes[i].w + gaps[i];
    [...list].sort((a, b) => cy(boxes.get(a.from)) - cy(boxes.get(b.from))).forEach((e, k) => {
      const src = boxes.get(e.from), tgt = boxes.get(e.to);
      const xc = gapRight - (gaps[i] * (k + 1)) / (list.length + 3), y1 = cy(src), y2 = tgt.y + tgt.h / 4;
      const pts = y1 === y2 ? [[src.x, y1], [tgt.x + tgt.w, y2]] : [[src.x, y1], [xc, y1], [xc, y2], [tgt.x + tgt.w, y2]];
      lines.push({ e, points: pts, label: { x: tgt.x + tgt.w + 10, y: y2, anchor: "start-above" }, mark: [(xc + tgt.x + tgt.w) / 2, y2] });
    });
  }
  for (const [from, list] of forward) {
    const sorted = [...list].sort((a, b) => cy(boxes.get(a.to)) - cy(boxes.get(b.to)));
    const src = boxes.get(from), rest = [];
    for (const e of sorted) {
      const tgt = boxes.get(e.to);
      if (e === sorted[0] && tgt.y + tgt.h < src.y && first(from)) over(e, true);
      else if (e === sorted.at(-1) && tgt.y > src.y + src.h && last(from)) over(e, false);
      else rest.push(e);
    }
    side(from, rest);
  }

  // Draw: lane regions and headers, lines, boxes, labels, then marks.
  const items = [];
  lanes.forEach((lane, i) => {
    const header = `${String(i + 1).padStart(2, "0")} / ${lane.group.label.toUpperCase()}`;
    const shapes = [];
    if (lane.owned || (lane.ids.length > 1 && !map)) {
      const r = { x: lane.x - RIM, y: head - 12, w: lane.w + 2 * RIM, h: height - UNDER - head - PAD / 2 + 12, r: 16 };
      shapes.push(lane.owned ? { t: "rect", ...r, fill: TINT, stroke: TINT_LINE, sw: 1.5, dash: "6 5" } : { t: "rect", ...r, fill: "none", stroke: "piq-color-border", sw: 1.5 });
    }
    const hw = m.width(header, LANE_HEAD, WEIGHT.bold) + header.length * LANE_HEAD * TRACK;
    shapes.push({ t: "text", x: lane.x, y: head - 22, text: header, size: LANE_HEAD, weight: WEIGHT.bold, tracking: TRACK, font: "piq-font-mono", fill: TOKENS.muted, on: TOKENS.surface, w: hw, owner: null });
    items.push({ id: lane.group.id, cls: "uxb-group", data: { role: "lane" }, steps: stepIds.get(lane.group.id), box: { kind: "group", x: lane.x - RIM, y: head - 12, w: lane.w + 2 * RIM, h: height - UNDER - head - PAD / 2 + 12 }, shapes });
  });
  const heavy = (e) => number.has(e.id) || e.emphasis === "focus" || (map && spineEdge(e));
  for (const l of lines) {
    const strong = heavy(l.e);
    const stroke = strong ? TOKENS.strong : TOKENS.edgeMuted, sw = strong ? 2.5 : 1.5, dash = l.e.kind === "return" || l.e.status === "decided" ? "6 4" : map ? edgePaint(l.e).dash : null;
    const a = arrow(l.points, { size: strong ? 10 : 8 });
    items.push({ id: l.e.id, cls: "uxb-edge", data: { kind: l.e.kind, status: l.e.status }, steps: stepIds.get(l.e.id), edge: { points: l.points, label: null, from: l.e.from, to: l.e.to },
      shapes: [{ t: "path", d: roundedPath(a.line, 4), fill: "none", stroke, sw, dash, on: TOKENS.surface }, { t: "path", d: a.head, fill: stroke, stroke, sw: 1, on: TOKENS.surface }] });
  }
  for (const n of v.nodes) {
    const b = boxes.get(n.id);
    if (!b) continue;
    const own = n.role === "own", { name, detail } = lineBreaks(n, b.w);
    const solidOwn = own && filled, fig = figure(n);
    const fill = solidOwn ? TOKENS.accent : own || fig ? TOKENS.surface : TOKENS.sunken;
    const ink = solidOwn ? TOKENS.onAccent : TOKENS.strong, quiet = solidOwn ? TOKENS.onAccent : own ? TOKENS.muted : TOKENS.text;
    // A person in a system map is a figure over its name, with no box.
    const shapes = fig ? roleMark("actor", b.x + (b.w - FIGURE) / 2, b.y + 6, TOKENS.strong, 2, "none", FIGURE)
      : [{ t: "rect", x: b.x, y: b.y, w: b.w, h: b.h, r: person(n) ? b.h / 2 : 10, fill, stroke: own ? TOKENS.accent : TOKENS.edgeMuted, sw: own ? 2.5 : 1.5,
        dash: n.status === "decided" || n.status === "unknown" ? "6 4" : null, on: TOKENS.surface }];
    if (n.role === "store" || n.role === "document") shapes.push(...roleMark(n.role, b.x + b.w - 30, b.y + 12, TOKENS.edgeMuted, 1.5, fill, 16));
    const block = name.length * m.lineHeight(NAME) + detail.length * m.lineHeight(DETAIL);
    let y = fig ? b.y + FIGURE + 18 + NAME * 0.95 : b.y + (b.h - block) / 2 + NAME * 0.95;
    const tx = fig ? b.x + b.w / 2 : b.x + b.indent, anchor = fig ? "middle" : undefined;
    for (const line of name) { shapes.push({ t: "text", x: tx, anchor, y, text: line, size: NAME, weight: WEIGHT.bold, fill: ink, on: fill, w: m.width(line, NAME, WEIGHT.bold), owner: n.id }); y += m.lineHeight(NAME); }
    y += -m.lineHeight(NAME) + m.lineHeight(DETAIL) - 2;
    for (const line of detail) { shapes.push({ t: "text", x: tx, anchor, y, text: line, size: DETAIL, weight: WEIGHT.regular, fill: quiet, on: fill, w: m.width(line, DETAIL, WEIGHT.regular), owner: n.id }); y += m.lineHeight(DETAIL); }
    items.push({ id: n.id, cls: "uxb-node", data: { role: n.role, status: n.status, emphasis: n.emphasis }, steps: stepIds.get(n.id), box: { kind: "node", x: b.x, y: b.y, w: b.w, h: b.h }, shapes });
  }
  // Labels with a halo above every line and box edge, then the marks on top. A label with more than
  // one place takes the first clear of every line, box and mark.
  const lh = m.lineHeight(LABEL);
  const segments = lines.flatMap((l) => l.points.slice(1).map((p, i) => [l.points[i], p]));
  const solid = [...boxes.values()].filter((b) => b.x !== undefined).map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }))
    .concat(lines.filter((l) => number.has(l.e.id)).map((l) => { const b = markOf(l.e.id, ...l.mark).badge, w = b.w ?? 2 * b.r; return { x: b.cx - w / 2, y: b.cy - b.r, w, h: 2 * b.r }; }));
  const crosses = ([[x1, y1], [x2, y2]], b) => Math.max(x1, x2) > b.x && Math.min(x1, x2) < b.x + b.w && Math.max(y1, y2) > b.y && Math.min(y1, y2) < b.y + b.h;
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const boxAt = (at, text) => {
    const w = widest(text), top = at.anchor === "start" ? at.y - (lh * text.length) / 2 - 2 : at.y - 9 - lh * text.length;
    const left = at.anchor === "end" ? at.x - w : at.anchor === "middle" ? at.x - w / 2 : at.x;
    return { x: left - 3, y: top, w: w + 6, h: lh * text.length + 4 };
  };
  for (const l of lines) {
    const text = labelLines(l.e.label, l.max);
    if (!text.length) continue;
    const places = [l.label].flat();
    const at = places.find((p) => { const b = boxAt(p, text); return !segments.some((s) => crosses(s, b)) && !solid.some((o) => overlaps(o, b)); }) ?? places[0];
    const box = boxAt(at, text), top = box.y;
    const align = at.anchor === "start-above" ? "start" : at.anchor;
    const item = items.find((it) => it.id === l.e.id);
    item.edge.label = box;
    items.push({ id: null, cls: "uxb-label", data: {}, shapes: text.map((line, i) => ({ t: "text", x: at.x,
      anchor: align === "start" ? null : align, y: top + LABEL + i * lh, text: line, size: LABEL, weight: WEIGHT.regular, fill: TOKENS.muted, halo: TOKENS.surface, on: TOKENS.surface,
      w: m.width(line, LABEL, WEIGHT.regular), owner: `${l.e.id}#label` })) });
  }
  for (const l of lines) {
    if (!number.has(l.e.id)) continue;
    items.push({ id: `${l.e.id}--step`, cls: "uxb-step", data: {}, steps: stepIds.get(l.e.id), ...markOf(l.e.id, ...l.mark) });
  }
  // A system map's legend: the line weights and the roles it draws, under everything else.
  if (map) {
    const shapes = [], y = height + LEGEND_H / 2 - 6;
    let lx = PAD;
    const entry = (swatch, text) => {
      shapes.push(...swatch(lx, y));
      const w = m.width(text, LABEL, WEIGHT.regular);
      shapes.push({ t: "text", x: lx + 36, y: y + 4, text, size: LABEL, weight: WEIGHT.regular, fill: TOKENS.muted, on: TOKENS.surface, w, owner: null });
      lx += 36 + w + 28;
    };
    const line = (sw, stroke, dash = null) => (x0, y0) => [{ t: "path", d: `M${x0} ${y0} L${x0 + 28} ${y0}`, fill: "none", stroke, sw, dash, on: TOKENS.surface }];
    const drawn = lines.map((l) => l.e);
    if (drawn.some(heavy)) entry(line(2.5, TOKENS.strong), "The main flow");
    if (drawn.some((e) => !heavy(e))) entry(line(1.5, TOKENS.edgeMuted), "Other calls");
    if (drawn.some((e) => edgePaint(e).dash)) entry(line(1.5, TOKENS.edgeMuted, "6 4"), "Guidance or constraint");
    const ownNode = v.nodes.find((n) => n.role === "own" && boxes.has(n.id));
    if (ownNode) entry((x0, y0) => [{ t: "rect", x: x0, y: y0 - 7, w: 28, h: 14, r: 3, fill: filled ? TOKENS.accent : TOKENS.surface, stroke: TOKENS.accent, sw: 2, on: TOKENS.surface }], "The project's own part");
    if (lanes.some((l) => l.owned)) entry((x0, y0) => [{ t: "rect", x: x0, y: y0 - 7, w: 28, h: 14, r: 3, fill: TINT, stroke: TINT_LINE, sw: 1, dash: "4 3" }], "Shaded: what the project holds");
    if (v.nodes.some((n) => n.role === "store" && boxes.has(n.id))) entry((x0, y0) => roleMark("store", x0 + 6, y0 - 8, TOKENS.edgeMuted, 1.5, TOKENS.surface, 16), "A store");
    items.push({ id: null, cls: "uxb-legend", data: {}, shapes });
  }
  return { ...fit({ width, height: height + (map ? LEGEND_H : 0), items }, 12), background: TOKENS.surface };
}
