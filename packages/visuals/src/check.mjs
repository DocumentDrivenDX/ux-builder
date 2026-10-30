/* The quality bar on geometry (CONTRACT-009 Checks, visuals PRD §8): every finding names its
   code and the ids involved. An empty list means the drawing passes. */

import { contrast, parse } from "./theme/color.mjs";

const BUDGET = { "flow/network": 2, "flow/pipeline": 0, "flow/lanes": 0 };
const EPS = 0.5;

const segments = (points) => points.slice(1).map((p, i) => [points[i], p]);
/* Whether a segment passes through a box's interior (touching its border does not count). */
function through([[x1, y1], [x2, y2]], b, inset = 1) {
  const L = b.x + inset, R = b.x + b.width - inset, T = b.y + inset, B = b.y + b.height - inset;
  if (L >= R || T >= B) return false;
  if (y1 === y2) return y1 > T && y1 < B && Math.max(x1, x2) > L && Math.min(x1, x2) < R;
  if (x1 === x2) return x1 > L && x1 < R && Math.max(y1, y2) > T && Math.min(y1, y2) < B;
  return Math.max(x1, x2) > L && Math.min(x1, x2) < R && Math.max(y1, y2) > T && Math.min(y1, y2) < B;
}
/* Whether a horizontal and a vertical segment cross at a point inside both. */
function cross(a, b) {
  const [h, v] = a[0][1] === a[1][1] ? [a, b] : [b, a];
  if (h[0][1] !== h[1][1] || v[0][0] !== v[1][0]) return false;
  const y = h[0][1], x = v[0][0];
  return x > Math.min(h[0][0], h[1][0]) + EPS && x < Math.max(h[0][0], h[1][0]) - EPS && y > Math.min(v[0][1], v[1][1]) + EPS && y < Math.max(v[0][1], v[1][1]) - EPS;
}
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * @param {object} layout a layout report
 * @param {{theme?: object, scale?: number, minText?: number}} options theme from createTheme, for contrast
 */
export function check(layout, { theme, scale = 1, minText = 12 } = {}) {
  const out = [];
  const add = (code, ids, message) => out.push({ code, ids, message });
  const box = new Map(layout.boxes.map((b) => [b.id, b]));
  for (const t of layout.texts) {
    const owner = t.box && box.get(t.box);
    if (owner && (t.x < owner.x - EPS || t.x + t.width > owner.x + owner.width + EPS || t.y < owner.y - EPS || t.y + t.height > owner.y + owner.height + EPS))
      add("TEXT_OVERFLOW", [t.id], `"${t.text}" runs outside ${t.box}`);
    if (t.size * scale < minText - EPS) add("TEXT_TOO_SMALL", [t.id], `"${t.text}" is ${Math.round(t.size * scale * 10) / 10}px`);
  }
  const solids = layout.boxes.filter((b) => b.kind !== "group" && b.kind !== "label" && b.kind !== "band");
  // Paint order: a line drawn before a label's opaque chip runs under it and hides nothing.
  const textZ = new Map(layout.texts.filter((t) => t.box).map((t) => [t.box, t.z ?? 0]));
  const labels = layout.boxes.filter((b) => b.kind === "label");
  const groupTexts = layout.texts.filter((t) => box.get(t.box)?.kind === "group" || box.get(t.box)?.kind === "band");
  for (const e of layout.edges) {
    const ends = new Set([e.from, e.to]);
    for (const s of segments(e.points)) {
      for (const b of solids) if (!ends.has(b.id) && through(s, b)) add("EDGE_THROUGH_NODE", [e.id, b.id], `${e.id} passes through ${b.id}`);
      for (const l of labels) if (l.id !== e.label && through(s, l, 0) && (e.z ?? 1) > (textZ.get(l.id) ?? 0)) add("EDGE_THROUGH_LABEL", [e.id, l.id], `${e.id} is drawn over the label of ${l.id.replace(/#label$/, "")}`);
      for (const t of groupTexts) if (through(s, t, 0) && (e.z ?? 1) > (t.z ?? 0)) add("EDGE_THROUGH_LABEL", [e.id, t.box], `${e.id} is drawn over the label of ${t.box}`);
    }
  }
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) if (overlap(labels[i], labels[j])) add("LABEL_OVERLAP", [labels[i].id, labels[j].id], `${labels[i].id} overlaps ${labels[j].id}`);
    for (const b of solids) if (overlap(labels[i], b)) add("LABEL_OVERLAP", [labels[i].id, b.id], `${labels[i].id} covers ${b.id}`);
  }
  const budget = layout.budget ?? BUDGET[layout.form];
  if (budget !== undefined) {
    let crossings = 0;
    for (let i = 0; i < layout.edges.length; i++) for (let j = i + 1; j < layout.edges.length; j++)
      for (const a of segments(layout.edges[i].points)) for (const b of segments(layout.edges[j].points)) if (cross(a, b)) crossings++;
    if (crossings > budget) add("CROSSINGS", [], `${crossings} edge crossings; the ${layout.form} budget is ${budget}`);
  }
  if (theme) {
    for (const which of theme.appearance === "both" ? ["light", "dark"] : [undefined]) {
      for (const c of layout.colors) {
        const fg = parse(theme.hex(c.fg, which)), bg = parse(theme.hex(c.bg, which));
        const ratio = contrast(fg, bg), need = c.kind === "text" ? 4.5 : 3;
        if (ratio < need - 0.005) add("CONTRAST", [c.id], `${c.fg} on ${c.bg}${which ? ` (${which})` : ""} is ${ratio.toFixed(2)}:1; needs ${need}:1`);
      }
    }
  }
  return out;
}
