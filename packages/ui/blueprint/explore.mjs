/* Exploring alternatives (FEAT-018 GDL-26 to GDL-30; SD-006 Score,
   Compare): what each journey of a blueprint asks of its user, labelled
   predicted, and one page comparing alternative blueprints for the same
   tasks. Pure functions of their inputs: the same blueprints and judgments
   give the same bytes. Internal to @ux-builder/ui/blueprint. */

import { checkBlueprint } from "./index.mjs";
import { flowGraph } from "./project.mjs";
import { toSvg } from "./svg.mjs";

const list = (x) => (Array.isArray(x) ? x : []);

/* The flow as a graph of screen IDs: screen → [screens its actions lead to]. */
function edges(bp) {
  const out = new Map();
  for (const s of list(bp.screens).filter((x) => x?.id)) {
    out.set(s.id, list(s.actions).map((a) => a?.to).filter((to) => typeof to === "string" && !/^(back|external|state:|modal:)/.test(to)));
  }
  return out;
}

/* The fewest steps from one screen to another over the flow, or null. */
function shortest(bp, from, to) {
  if (from === to) return 0;
  const next = edges(bp);
  const seen = new Set([from]);
  let frontier = [from], depth = 0;
  while (frontier.length) {
    depth++;
    const nf = [];
    for (const s of frontier) for (const t of next.get(s) ?? []) {
      if (t === to) return depth;
      if (!seen.has(t)) { seen.add(t); nf.push(t); }
    }
    frontier = nf;
  }
  return null;
}

/* Per journey, what it asks of its user: { journey, task, steps, shortestPath,
   screens, modals, requiredInputs, decisions, hops, findings, patterns:
   { reused, introduced }, label: "predicted" }. */
export function score(bp) {
  const screens = new Map(list(bp?.screens).filter((s) => s?.id).map((s) => [s.id, s]));
  const destinationOf = new Map(list(bp?.destinations).map((d) => [d.screen, d.id]));
  const findings = checkBlueprint(bp);
  const journeys = list(bp?.journeys).filter((j) => j?.id);
  return journeys.map((j, ji) => {
    const steps = list(j.steps).filter((s) => s?.screen);
    const ids = [...new Set(steps.map((s) => s.screen))];
    const modals = steps.filter((s) => { const a = list(screens.get(s.screen)?.actions).find((x) => x?.id === s.action); return typeof a?.to === "string" && a.to.startsWith("modal:"); }).length;
    let hops = 0, at = destinationOf.get(steps[0]?.screen) ?? null;
    for (const s of steps.slice(1)) { const d = destinationOf.get(s.screen); if (d && d !== at) { hops++; at = d; } }
    const elsewhere = new Set(list(bp.screens).filter((s) => s?.id && !ids.includes(s.id)).map((s) => s.pattern));
    const patterns = [...new Set(ids.map((id) => screens.get(id)?.pattern).filter(Boolean))];
    const own = findings.filter((f) => f.path.startsWith(`/journeys/${ji}`) || ids.some((id) => { const i = list(bp.screens).findIndex((s) => s?.id === id); return i >= 0 && (f.path === `/screens/${i}` || f.path.startsWith(`/screens/${i}/`)); }));
    return {
      journey: j.id,
      task: j.task ?? null,
      label: "predicted",
      steps: steps.length,
      shortestPath: steps.length ? shortest(bp, steps[0].screen, steps.at(-1).screen) : null,
      screens: ids.length,
      modals,
      requiredInputs: steps.reduce((n, s) => n + list(s.inputs?.required).length, 0),
      decisions: steps.filter((s) => s.decision).length,
      hops,
      findings: own.length,
      patterns: { reused: patterns.filter((p) => elsewhere.has(p)).length, introduced: patterns.filter((p) => !elsewhere.has(p)).length },
    };
  });
}

/* Lower is better for every dimension but reused patterns. */
export const DIMENSIONS = ["steps", "screens", "modals", "requiredInputs", "decisions", "hops", "findings", "patternsIntroduced"];
const valueOf = (s, d) => (d === "patternsIntroduced" ? s.patterns.introduced : s[d]);
const LABELS = { steps: "Steps", screens: "Screens", modals: "Modals", requiredInputs: "Required inputs", decisions: "Decisions", hops: "Navigation hops", findings: "Check findings", patternsIntroduced: "Patterns introduced" };

/* The task IDs of a blueprint, sorted. */
const taskIds = (bp) => list(bp?.tasks).map((t) => t?.id).filter(Boolean).sort();

/* Compare alternatives: [{ name, blueprint }], judgments: { [name]: [{ criterion,
   value, reasoning }] }. Returns { differ } when their tasks differ, else
   { scores, best, html }. */
export function compareAlternatives(alternatives, { judgments = {}, title = "Alternatives" } = {}) {
  const sets = alternatives.map((a) => ({ name: a.name, tasks: taskIds(a.blueprint) }));
  const all = [...new Set(sets.flatMap((s) => s.tasks))].sort();
  const differ = all.filter((t) => sets.some((s) => !s.tasks.includes(t)));
  if (differ.length) return { differ, missing: sets.map((s) => ({ name: s.name, lacks: all.filter((t) => !s.tasks.includes(t)) })).filter((s) => s.lacks.length) };

  const scores = Object.fromEntries(alternatives.map((a) => [a.name, score(a.blueprint)]));
  // Journeys are compared by task where they have one, else by journey ID.
  const key = (s) => s.task ?? s.journey;
  const keys = [...new Set(Object.values(scores).flat().map(key))].sort();
  const best = {};
  for (const k of keys) {
    best[k] = {};
    for (const d of DIMENSIONS) {
      const vals = alternatives.map((a) => ({ name: a.name, v: scores[a.name].find((s) => key(s) === k) })).filter((x) => x.v).map((x) => ({ name: x.name, v: valueOf(x.v, d) })).filter((x) => x.v != null);
      if (!vals.length) continue;
      const min = Math.min(...vals.map((x) => x.v));
      best[k][d] = vals.filter((x) => x.v === min).map((x) => x.name);
    }
  }
  return { scores, best, html: page({ alternatives, scores, best, keys, key, judgments, title }) };
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page({ alternatives, scores, best, keys, key, judgments, title }) {
  const names = alternatives.map((a) => a.name);
  const tables = keys.map((k) => {
    const rows = DIMENSIONS.map((d) => `<tr><th scope="row">${esc(LABELS[d])}</th>${names.map((n) => {
      const s = scores[n].find((x) => key(x) === k);
      const v = s ? valueOf(s, d) : null;
      const isBest = (best[k][d] ?? []).includes(n) && names.length > 1;
      return `<td${isBest ? ' class="best"' : ""}>${v == null ? "–" : esc(v)}${isBest ? ' <span class="mark">best</span>' : ""}</td>`;
    }).join("")}</tr>`).join("\n");
    return `<section><h3>${esc(k)}</h3><table><thead><tr><th scope="col">Predicted</th>${names.map((n) => `<th scope="col">${esc(n)}</th>`).join("")}</tr></thead><tbody>\n${rows}\n</tbody></table></section>`;
  }).join("\n");
  const judged = names.some((n) => list(judgments[n]).length) ? `<section><h2>Design judgments</h2><p class="note">Preliminary judgments, not measured results.</p>${names.map((n) => `<h3>${esc(n)}</h3><ul>${list(judgments[n]).map((j) => `<li><strong>${esc(j.criterion)}</strong>: ${esc(j.value)}. <em>Preliminary judgment, not a measured result.</em> ${esc(j.reasoning)}</li>`).join("") || "<li>None recorded.</li>"}</ul>`).join("\n")}</section>` : "";
  const flows = `<section><h2>Flows</h2><div class="flows">${alternatives.map((a) => `<figure><figcaption>${esc(a.name)}</figcaption>${toSvg(flowGraph(a.blueprint), "LR")}</figure>`).join("\n")}</div><p class="note">Wireframes of each alternative: ux-builder-blueprint wireframes &lt;file&gt;.</p></section>`;
  const findings = `<section><h2>Check findings</h2>${alternatives.map((a) => { const f = checkBlueprint(a.blueprint); return `<h3>${esc(a.name)}</h3><ul>${f.map((x) => `<li>${esc(x.severity)} ${esc(x.rule)} ${esc(x.path)}: ${esc(x.message)}</li>`).join("") || "<li>No findings.</li>"}</ul>`; }).join("\n")}</section>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:72rem;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;margin:.5rem 0 1.5rem}th,td{border:1px solid #9994;padding:.25rem .6rem;text-align:left}td.best{font-weight:600}.mark{font-size:.7rem;border:1px solid;border-radius:1rem;padding:0 .4rem}.flows{display:grid;grid-template-columns:repeat(auto-fit,minmax(20rem,1fr));gap:1rem}figure{margin:0}svg{max-width:100%;height:auto}.note{font-style:italic}</style>
</head><body>
<h1>${esc(title)}</h1>
<p>${names.map(esc).join(", ")}. Every number is predicted from the blueprint: fewer is better, and the best per row is marked.</p>
<section><h2>Scores per task</h2>
${tables}
</section>
${judged}
${flows}
${findings}
</body></html>
`;
}
