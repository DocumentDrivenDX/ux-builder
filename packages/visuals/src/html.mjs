/* What the plate and the presentation share: an offline page in the theme, the legend of the
   roles a visual draws, and each step's focus box from the layout report. */

import { TOKENS, edgePaint, nodePaint, stepMarks } from "./grammar.mjs";
import { escape } from "./svg/write.mjs";

export { escape };

/** The page's colour variables, from the theme (resolved, or var() with fallbacks in "both"). */
export function pageVars(theme) {
  const v = (name, token) => `--uxb-${name}:${theme.color(token)};`;
  return v("ground", TOKENS.ground) + v("surface", TOKENS.surface) + v("sunken", TOKENS.sunken) + v("text", TOKENS.text) + v("strong", TOKENS.strong)
    + v("muted", TOKENS.muted) + v("accent", TOKENS.accent) + v("on-accent", TOKENS.onAccent) + v("rule", TOKENS.edgeMuted) + v("region", TOKENS.region(1))
    + `--uxb-font:${theme.fontAttr()};`;
}

export function page({ title, theme, css, body, script = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
:root{${pageVars(theme)}color-scheme:${theme.appearance === "dark" ? "dark" : theme.appearance === "both" ? "light dark" : "light"}}
*{box-sizing:border-box}
body{margin:0;background:var(--uxb-ground);color:var(--uxb-text);font-family:var(--uxb-font);line-height:1.45}
h1,h2,h3{color:var(--uxb-strong);line-height:1.2}
button{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--uxb-accent);outline-offset:2px}
.uxb-visual{max-width:100%;height:auto;display:block}
${css}
</style>
</head>
<body>
${body}
${script ? `<script type="module">\n${script}\n</script>` : ""}
</body>
</html>
`;
}

/** One box around everything a step focuses, in visual coordinates. */
export function focusBoxes(visual, layout) {
  const boxes = new Map(layout.boxes.map((b) => [b.id, b]));
  const edges = new Map(layout.edges.map((e) => [e.id, e]));
  const marks = stepMarks(visual.steps);
  return (visual.steps ?? []).map((step) => {
    const xs = [], ys = [];
    const take = (b) => { if (b) { xs.push(b.x, b.x + b.width); ys.push(b.y, b.y + b.height); } };
    for (const id of step.focus) {
      take(boxes.get(id));
      const e = edges.get(id);
      if (e) { for (const [x, y] of e.points) { xs.push(x); ys.push(y); } take(boxes.get(e.label)); }
    }
    const box = xs.length ? { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } : null;
    // A step outside the sequence is titled with when it happens.
    const mark = marks.get(step.id), title = mark.lead ? `${mark.lead}: ${step.title}` : step.title;
    return { id: step.id, title, ...(step.caption ? { caption: step.caption } : {}), box };
  });
}

const ROLES = {
  own: "this project's own part (accent outline)", actor: "a person (head-and-shoulders mark)", store: "where data is kept (cylinder mark)",
  document: "a document (folded-corner mark)", external: "a system outside the project (sunken fill)", platform: "a platform the project runs on (sunken fill)",
};
const STATUSES = { placeholder: "a stand-in, not the real thing yet", decided: "decided, not built (dashed outline)", unknown: "not known yet (dotted outline)" };
const KINDS = { action: "an action (heavy line)", data: "data travelling", control: "a control signal (dashed)", return: "a return (light dashed line)" };

/** A legend of the roles, statuses and line kinds a visual actually draws, each with a swatch. */
export function legend(visual, theme) {
  const nodes = [...(visual.nodes ?? []), ...(visual.sequence?.participants ?? [])];
  const rows = [];
  const swatch = (node) => {
    const p = nodePaint(node);
    return `<svg width="28" height="18" aria-hidden="true"><rect x="1" y="1" width="26" height="16" rx="4" style="fill:${theme.color(p.fill)};stroke:${theme.color(p.stroke)};stroke-width:${p.strong ? 2 : 1.5}px${p.dash ? `;stroke-dasharray:${p.dash}` : ""}"/></svg>`;
  };
  const line = (edge) => {
    const p = edgePaint(edge);
    return `<svg width="28" height="18" aria-hidden="true"><path d="M2 9 L26 9" style="fill:none;stroke:${theme.color(p.stroke)};stroke-width:${p.strong ? 2 : 1.5}px${p.dash ? `;stroke-dasharray:${p.dash}` : ""}"/></svg>`;
  };
  for (const role of Object.keys(ROLES)) if (nodes.some((n) => n.role === role)) rows.push(`<li>${swatch({ role })}<span>${escape(ROLES[role])}</span></li>`);
  for (const status of Object.keys(STATUSES)) if (nodes.some((n) => n.status === status)) rows.push(`<li>${swatch({ status })}<span>${escape(STATUSES[status])}</span></li>`);
  const kinds = new Set([...(visual.edges ?? []).map((e) => e.kind), ...(visual.sequence?.messages ?? []).map((m) => (m.kind === "return" ? "return" : undefined))].filter(Boolean));
  for (const kind of Object.keys(KINDS)) if (kinds.has(kind)) rows.push(`<li>${line({ kind })}<span>${escape(KINDS[kind])}</span></li>`);
  return rows.length ? `<ul class="uxb-legend">${rows.join("")}</ul>` : "";
}

export function sourceLine(visual) {
  const s = visual.source;
  if (!s) return "";
  return `<p class="uxb-source">Drawn from <code>${escape(s.path)}</code>${s.view ? `, view <code>${escape(s.view)}</code>` : ""}${s.digest ? ` <span class="uxb-digest">(${escape(s.digest.slice(0, 19))}…)</span>` : ""}.</p>`;
}
