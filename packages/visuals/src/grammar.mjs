/* The visual grammar every layout draws with (SD-007): sizes, and shapes by role, status and
   kind, each painted with a CONTRACT-001 token name. Layouts place; this decides how a thing
   looks. A shape's `on` names the token it sits on, so contrast can be checked. */

export const TYPE = { name: 14, detail: 12, label: 12, group: 12, badge: 12, header: 13 };
export const WEIGHT = { regular: 400, bold: 600 };
const PAD_X = 14, PAD_Y = 10, MAX_TEXT = 200, MIN_W = 112, ICON = 18;
export const GROUP_PAD = { top: 34, side: 16, bottom: 16 };

const T = (name) => `piq-color-${name}`;
export const TOKENS = {
  ground: T("ground"), surface: T("surface"), sunken: T("surface-sunken"), text: T("text"), strong: T("text-strong"),
  muted: T("text-muted"), accent: T("accent"), onAccent: T("on-accent"), edge: T("diagram-edge"), edgeStrong: T("diagram-edge-strong"),
  edgeMuted: T("diagram-edge-muted"), region: (depth) => T(`diagram-region-${Math.min(3, Math.max(1, depth))}`),
  placeholder: T("lifecycle-placeholder"), decided: T("lifecycle-decided"), unknown: T("lifecycle-unknown"),
  // The categorical colours in their fixed order (FEAT-017): marks only, never text.
  series: (i) => T(`series-${(i % 8) + 1}`),
  status: (s) => T(`status-${s}`), statusSubtle: (s) => T(`status-${s}-subtle`),
};

/** Sizes of a node box and its wrapped lines. */
export function sizeNode(m, node, { minWidth = MIN_W } = {}) {
  const icon = node.role === "actor" || node.role === "store" || node.role === "document" ? ICON + 6 : 0;
  const name = m.wrap(node.label, TYPE.name, WEIGHT.bold, MAX_TEXT);
  const detail = node.detail ? m.wrap(node.detail, TYPE.detail, WEIGHT.regular, MAX_TEXT) : [];
  const textW = Math.max(...name.map((l) => m.width(l, TYPE.name, WEIGHT.bold)), ...detail.map((l) => m.width(l, TYPE.detail, WEIGHT.regular)), 0);
  const w = Math.ceil(Math.max(minWidth, textW + icon + 2 * PAD_X));
  const h = Math.ceil(2 * PAD_Y + name.length * m.lineHeight(TYPE.name) + (detail.length ? 2 + detail.length * m.lineHeight(TYPE.detail) : 0));
  return { w, h, name, detail, icon };
}

/** The fill, stroke and text tokens of a node, from its role, status and emphasis. */
export function nodePaint(node) {
  const external = node.role === "external" || node.role === "platform";
  // Muted text only on the surface: the gate guarantees body text, not muted text, on sunken and tinted fills (FR-74).
  let fill = external ? TOKENS.sunken : TOKENS.surface, stroke = TOKENS.edgeMuted, strong = false, dash = null, text = TOKENS.strong, detail = external ? TOKENS.text : TOKENS.muted;
  if (node.role === "own") { stroke = TOKENS.accent; strong = true; }
  // On a lifecycle tint the detail is body text: the gate guarantees body text there (FR-74), not muted text.
  if (node.status === "placeholder") { fill = TOKENS.placeholder; detail = TOKENS.text; }
  if (node.status === "decided") { fill = TOKENS.decided; dash = "6 4"; detail = TOKENS.text; }
  if (node.status === "unknown") { fill = TOKENS.unknown; dash = "2 3"; text = TOKENS.text; detail = TOKENS.text; }
  if (node.emphasis === "muted") { text = fill === TOKENS.surface ? TOKENS.muted : TOKENS.text; stroke = TOKENS.edgeMuted; strong = false; }
  if (node.emphasis === "focus") { stroke = TOKENS.accent; strong = true; }
  return { fill, stroke, strong, dash, text, detail };
}

/** A node's shapes at a position: box, role mark, name and detail. */
export function drawNode(theme, m, node, size, x, y, { radius, cls = "uxb-node", pill = false } = {}) {
  const p = nodePaint(node);
  const r = pill ? size.h / 2 : radius ?? theme.px("piq-radius-diagram-node");
  const sw = theme.px(p.strong ? "piq-size-diagram-stroke-strong" : "piq-size-diagram-stroke");
  const shapes = [{ t: "rect", x, y, w: size.w, h: size.h, r, fill: p.fill, stroke: p.stroke, sw, dash: p.dash, on: TOKENS.ground }];
  const left = x + PAD_X + size.icon;
  // A box taller than its text (widened for its lines) centres the text, so it reads as one shape.
  const content = 2 * PAD_Y + size.name.length * m.lineHeight(TYPE.name) + (size.detail.length ? 2 + size.detail.length * m.lineHeight(TYPE.detail) : 0);
  const dy = Math.max(0, Math.round((size.h - content) / 2));
  if (size.icon) shapes.push(...roleMark(node.role, x + PAD_X, y + dy + PAD_Y + 1, p.stroke, sw, p.fill));
  let baseline = y + dy + PAD_Y + TYPE.name;
  for (const line of size.name) {
    shapes.push({ t: "text", x: left, y: baseline, text: line, size: TYPE.name, weight: WEIGHT.bold, fill: p.text, on: p.fill, w: m.width(line, TYPE.name, WEIGHT.bold), owner: node.id });
    baseline += m.lineHeight(TYPE.name);
  }
  baseline += 2 - m.lineHeight(TYPE.name) + m.lineHeight(TYPE.detail);
  for (const line of size.detail) {
    shapes.push({ t: "text", x: left, y: baseline - (m.lineHeight(TYPE.detail) - TYPE.detail), text: line, size: TYPE.detail, weight: WEIGHT.regular, fill: p.detail, on: p.fill, w: m.width(line, TYPE.detail, WEIGHT.regular), owner: node.id });
    baseline += m.lineHeight(TYPE.detail);
  }
  return { id: node.id, cls, data: { role: node.role, status: node.status, emphasis: node.emphasis }, box: { kind: "node", x, y, w: size.w, h: size.h }, shapes };
}

/* A small mark that says what a node is without colour: a person, a store, a document. */
export function roleMark(role, x, y, stroke, sw, fill, s = ICON) {
  if (role === "actor") return [
    { t: "circle", cx: x + s / 2, cy: y + s * 0.3, r: s * 0.22, fill: "none", stroke, sw },
    { t: "path", d: `M${x + s * 0.12} ${y + s} C${x + s * 0.12} ${y + s * 0.62} ${x + s * 0.88} ${y + s * 0.62} ${x + s * 0.88} ${y + s}`, fill: "none", stroke, sw },
  ];
  if (role === "store") return [
    { t: "path", d: `M${x} ${y + 3} L${x} ${y + s - 3} C${x} ${y + s + 1} ${x + s} ${y + s + 1} ${x + s} ${y + s - 3} L${x + s} ${y + 3}`, fill, stroke, sw },
    { t: "ellipse", cx: x + s / 2, cy: y + 3, rx: s / 2, ry: 3, fill, stroke, sw },
  ];
  return [
    { t: "path", d: `M${x + 2} ${y} L${x + s - 5} ${y} L${x + s - 1} ${y + 4} L${x + s - 1} ${y + s} L${x + 2} ${y + s} Z`, fill, stroke, sw },
    { t: "path", d: `M${x + s - 5} ${y} L${x + s - 5} ${y + 4} L${x + s - 1} ${y + 4}`, fill: "none", stroke, sw },
  ];
}

/** Stroke tokens and dash of an edge from its kind, status and emphasis. */
export function edgePaint(edge) {
  let stroke = TOKENS.edge, strong = false, dash = null;
  if (edge.kind === "action") { stroke = TOKENS.edgeStrong; strong = true; }
  if (edge.kind === "control") dash = "6 4";
  if (edge.kind === "return") { stroke = TOKENS.edgeMuted; dash = "4 4"; }
  if (edge.status === "decided" || edge.status === "placeholder") dash = "6 4";
  if (edge.status === "unknown" || edge.emphasis === "muted") { stroke = TOKENS.edgeMuted; dash = dash ?? "2 3"; }
  if (edge.emphasis === "focus") { stroke = TOKENS.accent; strong = true; }
  return { stroke, strong, dash };
}

const fmt = (n) => Math.round(n * 100) / 100;

/** An orthogonal polyline as a path with rounded corners. */
export function roundedPath(points, radius = 8) {
  if (points.length < 2) return "";
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1], [x, y] = points[i], [nx, ny] = points[i + 1];
    const r = Math.min(radius, Math.hypot(x - px, y - py) / 2, Math.hypot(nx - x, ny - y) / 2);
    const ax = x - Math.sign(x - px) * r, ay = y - Math.sign(y - py) * r;
    const bx = x + Math.sign(nx - x) * r, by = y + Math.sign(ny - y) * r;
    d += ` L${fmt(ax)} ${fmt(ay)} Q${fmt(x)} ${fmt(y)} ${fmt(bx)} ${fmt(by)}`;
  }
  const [lx, ly] = points.at(-1);
  return `${d} L${fmt(lx)} ${fmt(ly)}`;
}

/** An arrowhead at the end of a polyline, and the polyline shortened to its base. */
export function arrow(points, { open = false, size = 9 } = {}) {
  const [x, y] = points.at(-1), [px, py] = points.at(-2);
  const len = Math.hypot(x - px, y - py) || 1;
  const ux = (x - px) / len, uy = (y - py) / len;
  const bx = x - ux * size, by = y - uy * size, half = size * 0.42;
  const head = `M${fmt(bx - uy * half)} ${fmt(by + ux * half)} L${fmt(x)} ${fmt(y)} L${fmt(bx + uy * half)} ${fmt(by - ux * half)}`;
  const line = points.slice(0, -1).concat([[open ? x : bx, open ? y : by]]);
  return { line, head: open ? head : `${head} Z`, open };
}

/** An edge's shapes: the line, its head and a label chip. */
export function drawEdge(theme, m, edge, points, labelBox, { cls = "uxb-edge", headless = false, open = false, head = null } = {}) {
  const p = edgePaint(edge);
  const sw = theme.px(p.strong ? "piq-size-diagram-stroke-strong" : "piq-size-diagram-stroke");
  const shapes = [];
  if (headless) shapes.push({ t: "path", d: roundedPath(points), fill: "none", stroke: p.stroke, sw, dash: p.dash, on: TOKENS.ground });
  else {
    const a = arrow(points, { open });
    shapes.push({ t: "path", d: roundedPath(a.line), fill: "none", stroke: p.stroke, sw, dash: p.dash, on: TOKENS.ground });
    // The head takes the line's colour unless the form sets one (zoned draws them in the accent, as deploy.py does).
    const hc = head ?? p.stroke;
    shapes.push({ t: "path", d: a.head, fill: a.open ? "none" : hc, stroke: hc, sw, on: TOKENS.ground });
  }
  let label = null;
  if (labelBox && edge.label) {
    shapes.push({ t: "rect", x: labelBox.x, y: labelBox.y, w: labelBox.w, h: labelBox.h, r: 4, fill: TOKENS.ground });
    const lines = labelBox.lines ?? [edge.label], lh = m.lineHeight(TYPE.label);
    lines.forEach((line, i) => shapes.push({ t: "text", x: labelBox.x + labelBox.w / 2, y: labelBox.y + labelBox.h / 2 + TYPE.label * 0.35 + (i - (lines.length - 1) / 2) * lh, anchor: "middle", text: line, size: TYPE.label,
      weight: WEIGHT.regular, fill: edge.emphasis === "muted" ? TOKENS.muted : TOKENS.text, on: TOKENS.ground, w: m.width(line, TYPE.label, WEIGHT.regular), owner: `${edge.id}#label` }));
    label = { kind: "label", x: labelBox.x, y: labelBox.y, w: labelBox.w, h: labelBox.h };
  }
  return { id: edge.id, cls, data: { kind: edge.kind, status: edge.status, emphasis: edge.emphasis }, edge: { points, label, from: edge.from, to: edge.to }, shapes };
}

/** The chip an edge label sits on, centred at a point. */
export function labelSize(m, text) {
  return { w: Math.ceil(m.width(text, TYPE.label, WEIGHT.regular) + 12), h: 18 };
}

/** The same label on two lines as even as its words allow, or null when it is one word. */
export function wrappedLabelSize(m, text) {
  const full = m.width(text, TYPE.label, WEIGHT.regular);
  if (!text || !/\s/.test(text.trim())) return null;
  for (let w = full / 2; w <= full; w += 8) {
    const lines = m.wrap(text, TYPE.label, WEIGHT.regular, w);
    if (lines.length === 2) return { w: Math.ceil(Math.max(...lines.map((l) => m.width(l, TYPE.label, WEIGHT.regular))) + 12), h: 2 * m.lineHeight(TYPE.label) + 6, lines };
  }
  return null;
}

/** A group's region and its label, top-left. */
export function drawGroup(m, group, box, depth, labelX = box.x + 12) {
  const label = group.label;
  return { id: group.id, cls: "uxb-group", data: { role: group.role, status: group.status }, box: { kind: "group", ...box }, shapes: [
    { t: "rect", x: box.x, y: box.y, w: box.w, h: box.h, r: 6, fill: TOKENS.region(depth) },
    { t: "text", x: labelX, y: box.y + 20, text: label, size: TYPE.group, weight: WEIGHT.bold, fill: TOKENS.text, on: TOKENS.region(depth), w: m.width(label, TYPE.group, WEIGHT.bold), owner: group.id },
  ] };
}

/* When an unnumbered step happens (CONTRACT-083 Walkthroughs): the words its mark and its lead use. */
export const WHEN = {
  throughout: "Throughout", before: "Before", after: "After", background: "In the background",
  scheduled: "Scheduled", "on-failure": "On failure", optional: "If needed",
};
const MARK_SIZE = 12, MARK_TRACK = 0.06;

/** Each step's mark: a number for a step in the sequence, words for one with a `when`. */
export function stepMarks(steps) {
  const out = new Map();
  let n = 0;
  for (const step of steps ?? []) {
    if (!step.when) { out.set(step.id, { number: ++n, text: String(n) }); continue; }
    const words = step.tag ?? WHEN[step.when] ?? step.when;
    out.set(step.id, { when: step.when, text: words.toUpperCase(), lead: words[0].toUpperCase() + words.slice(1).toLowerCase() });
  }
  return out;
}

/** A step's mark at (cx, cy): a circle with its number, or a pill with its words. */
export function markShapes(m, mark, cx, cy, { r = 11, fill = TOKENS.accent, ink = TOKENS.onAccent, ring = null } = {}) {
  if (mark.number !== undefined) {
    return { badge: { cx, cy, r }, shapes: [
      { t: "circle", cx, cy, r, fill, ...(ring ? { stroke: ring, sw: 3 } : {}) },
      { t: "text", x: cx, y: cy + TYPE.badge * 0.35, anchor: "middle", text: mark.text, size: TYPE.badge, weight: WEIGHT.bold, fill: ink, on: fill, w: m.width(mark.text, TYPE.badge, WEIGHT.bold), owner: null },
    ] };
  }
  const tw = m.width(mark.text, MARK_SIZE, WEIGHT.bold) + mark.text.length * MARK_SIZE * MARK_TRACK, w = tw + 2 * r;
  return { badge: { cx, cy, r, w }, shapes: [
    { t: "rect", x: cx - w / 2, y: cy - r, w, h: 2 * r, r, fill, ...(ring ? { stroke: ring, sw: 3 } : {}) },
    { t: "text", x: cx, y: cy + MARK_SIZE * 0.35, anchor: "middle", text: mark.text, size: MARK_SIZE, weight: WEIGHT.bold, tracking: MARK_TRACK, fill: ink, on: fill, w: tw, owner: null },
  ] };
}

/** Step marks: an accent number, or a pill of words, per step on each item it focuses. */
export function badges(steps, anchors, m) {
  const out = [];
  // Several marks on one item line up from its anchor, each 2px clear of the last.
  const used = new Map(), marks = stepMarks(steps);
  for (const step of steps ?? []) {
    for (const id of step.focus) {
      const at = anchors.get(id);
      if (!at) continue;
      const mark = marks.get(step.id), width = markShapes(m, mark, 0, 0).badge.w ?? 22, from = used.get(id) ?? -11;
      used.set(id, from + width + 2);
      const cx = at.x + (at.dir ?? 1) * (from + width / 2), cy = at.y;
      out.push({ id: `${step.id}--${id}`, cls: "uxb-step", data: {}, steps: [step.id], ...markShapes(m, mark, cx, cy) });
    }
  }
  return out;
}

/** Each item's step ids, for data-steps. */
export function stepsOf(steps) {
  const out = new Map();
  for (const step of steps ?? []) for (const id of step.focus) out.set(id, [...(out.get(id) ?? []), step.id]);
  return out;
}
