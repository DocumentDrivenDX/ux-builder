/* ux-builder-design rubric (CONTRACT-008 Rubric, FEAT-018 GDL-37 to GDL-39,
   GDL-57, GDL-59; SD-006 Rubric): an alternative's UX quality, dimension by
   dimension. Each predicted value says its basis: computed from the
   blueprint, the check and the audit, a judgment the agent recorded with
   its reasoning, or "to validate" when there is neither. The observed side
   comes from human testing. Nothing is averaged; an alternative that fails
   a baseline is not recommendable, whatever else it scores. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { checkBlueprint, score } from "@ux-builder/ui/blueprint";
import { DesignError, bpFile } from "./app.mjs";
import { latestInsights } from "./insights.mjs";
import { observedDimensions, observedMeasures } from "./sessions.mjs";
import { readState } from "./state.mjs";
import { reportsOf } from "@ux-builder/ui/blueprint/paths";

const require = createRequire(import.meta.url);
export const RUBRIC = JSON.parse(readFileSync(require.resolve("@ux-builder/ui/catalogue.json"), "utf8")).interaction.rubric;

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const list = (x) => (Array.isArray(x) ? x : []);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/* The blueprint of an alternative: app.blueprint.<name>.json, or the app's own. */
function blueprintOf(app, name) {
  const file = name && name !== "current" ? bpFile(app, name) : bpFile(app);
  const bp = readJson(join(app, file));
  if (!bp) throw new DesignError(`no ${file}${name ? `: make it with ux-builder-blueprint alternative new ${name}` : ""}`);
  return { file, bp };
}

/* What the plan alone predicts, per dimension: { value, basis: "computed", measures } or null. */
function computed(bp, app) {
  const scores = score(bp);
  const findings = checkBlueprint(bp);
  const count = (rule) => findings.filter((f) => f.rule === rule).length;
  const steps = sum(scores.map((s) => s.steps)), shortest = sum(scores.map((s) => s.shortestPath ?? s.steps));
  const inputs = sum(scores.map((s) => s.requiredInputs)), decisions = sum(scores.map((s) => s.decisions)), hops = sum(scores.map((s) => s.hops));
  const screens = list(bp.screens).filter((s) => s?.id);
  const content = screens.filter((s) => Array.isArray(s.content));
  const audit = readJson(join(app, reportsOf(app).auditReport, "report.json"));
  const out = {};
  if (scores.length) {
    const notWalkable = count("journey.walkable"), unrealized = count("task.realized");
    out["task-effectiveness"] = { value: notWalkable || unrealized ? `${notWalkable} journey problem${notWalkable === 1 ? "" : "s"}, ${unrealized} task${unrealized === 1 ? "" : "s"} with no journey` : "every journey walkable, every task realized", basis: "computed", measures: { journeys: scores.length, notWalkable, unrealizedTasks: unrealized }, fails: notWalkable + unrealized > 0 };
    out["task-efficiency"] = { value: `${steps} steps against a shortest ${shortest}; ${inputs} required input${inputs === 1 ? "" : "s"}`, basis: "computed", measures: { steps, shortestPath: shortest, requiredInputs: inputs } };
    out["cognitive-load"] = { value: `${decisions} decision${decisions === 1 ? "" : "s"} over ${steps} steps${content.length ? `; ${(sum(content.map((s) => s.content.length)) / content.length).toFixed(1)} content items per screen` : ""}`, basis: "computed", measures: { decisions, steps, ...(content.length ? { contentPerScreen: Number((sum(content.map((s) => s.content.length)) / content.length).toFixed(1)) } : {}), requiredInputs: inputs } };
    out.discoverability = { value: `${hops} navigation hop${hops === 1 ? "" : "s"} between destinations`, basis: "computed", measures: { hops } };
  }
  const reused = sum(scores.map((s) => s.patterns.reused)), introduced = sum(scores.map((s) => s.patterns.introduced));
  if (scores.length || count("consistency.same-kind")) out.consistency = { value: `${count("consistency.same-kind")} inconsistent interaction${count("consistency.same-kind") === 1 ? "" : "s"}; patterns ${reused} reused, ${introduced} introduced`, basis: "computed", measures: { inconsistencies: count("consistency.same-kind"), patternsReused: reused, patternsIntroduced: introduced } };
  if (audit?.summary) out.accessibility = { value: `${audit.summary.error} audit error${audit.summary.error === 1 ? "" : "s"}`, basis: "computed", measures: { auditErrors: audit.summary.error, auditWarnings: audit.summary.warning }, fails: audit.summary.error > 0 };
  if (screens.length) {
    const withError = screens.filter((s) => list(s.states).includes("error")).length;
    const tasks = list(bp.tasks), withExceptions = tasks.filter((t) => list(t.exceptions).length).length;
    out["error-recovery"] = { value: `${withError} of ${screens.length} screens declare an error state${tasks.length ? `; ${withExceptions} of ${tasks.length} tasks name their exceptions` : ""}`, basis: "computed", measures: { screensWithErrorState: withError, screens: screens.length, ...(tasks.length ? { tasksWithExceptions: withExceptions, tasks: tasks.length } : {}) } };
  }
  return out;
}

/* Observed values per dimension, from the human findings the test kits
   imported: { [dimension]: { value, evidence, verdict } }. They are of the
   app (or validated prototype) people tried: the current blueprint, and
   the chosen alternative. */
export function observedFor(app, alternative, predicted = {}) {
  let chosen = null;
  try { chosen = readState(app).alternatives.find((a) => a.status === "chosen")?.name ?? null; } catch { /* no design state */ }
  if (![undefined, "current", chosen].includes(alternative)) return {};
  const dims = observedDimensions(app, predicted);
  // Production use, from the latest insights, beside what people did in tests (FEAT-018 GDL-65).
  const ins = latestInsights(app);
  const started = sum(list(ins?.journeys).map((j) => j.started)), completed = sum(list(ins?.journeys).map((j) => j.completed));
  if (started) {
    const rate = completed / started;
    const prod = `${Math.round(rate * 100)}% of ${started} journeys completed in production (${ins.id})`;
    const cites = [ins.id, ...list(ins.sources).map((x) => x.id)];
    const te = dims["task-effectiveness"];
    dims["task-effectiveness"] = te ? { ...te, value: `${te.value}; ${prod}`, evidence: [...te.evidence, ...cites] }
      : { value: prod, evidence: cites, verdict: predicted["task-effectiveness"]?.fails ? (rate >= 0.8 ? "contradicts" : "supports") : rate < 0.8 ? "contradicts" : "supports" };
  }
  return dims;
}

/* ux-builder-design rubric [--alternative <name>]. */
export function rubric(app, { alternative } = {}) {
  const { file, bp } = blueprintOf(app, alternative);
  const name = alternative ?? "current";
  let judgments = [];
  try { judgments = list(readState(app).alternatives.find((a) => a.name === name)?.judgments); } catch { /* no design state */ }
  const judged = (d) => judgments.find((j) => [d.id, d.name.toLowerCase()].includes(String(j.criterion).trim().toLowerCase()));
  const calc = computed(bp, app);
  const observed = observedFor(app, name, calc);
  const dimensions = RUBRIC.map((d) => {
    const c = calc[d.id];
    const j = judged(d);
    const predicted = c ? { value: c.value, basis: "computed", measures: c.measures }
      : j ? { value: j.value, basis: "judgment", reasoning: j.reasoning }
      : { value: "to validate", basis: "to validate" };
    return { id: d.id, name: d.name, question: d.question, baseline: d.baseline, predicted, observed: observed[d.id] ?? null, ...(c?.fails ? { fails: true } : {}) };
  });
  // Per kit task across sessions, and the problems seen in two or more (FEAT-018 GDL-57).
  const m = Object.keys(observed).length ? observedMeasures(app) : null;
  const fails = dimensions.filter((d) => d.baseline && d.fails).map((d) => d.id);
  // A baseline with nothing predicted is not passed: it is unchecked.
  const unchecked = dimensions.filter((d) => d.baseline && d.predicted.basis === "to validate").map((d) => d.id);
  // What people did outweighs the prediction: a baseline they contradicted is not met.
  const contradicted = dimensions.filter((d) => d.baseline && d.observed?.verdict === "contradicts").map((d) => d.id);
  return { alternative: name, file, dimensions: dimensions.map(({ fails: _, ...d }) => d), recommendable: fails.length === 0 && contradicted.length === 0, ...(unchecked.length ? { unchecked } : {}), ...(contradicted.length ? { contradictedBaselines: contradicted } : {}), ...(fails.length || contradicted.length ? { notRecommendable: [fails.length ? `fails the baseline${fails.length > 1 ? "s" : ""} ${fails.join(" and ")}` : null, contradicted.length ? `people contradicted the baseline${contradicted.length > 1 ? "s" : ""} ${contradicted.join(" and ")}` : null].filter(Boolean).join("; ") } : {}), observedTasks: m?.tasks ?? [], recurring: m?.recurring ?? [] };
}

export function rubricText(r) {
  const lines = [`${r.alternative} (${r.file}), predicted:`];
  for (const d of r.dimensions) lines.push(`  ${d.name}${d.baseline ? " (baseline)" : ""}: ${d.predicted.value} [${d.predicted.basis}${d.predicted.reasoning ? `: ${d.predicted.reasoning}` : ""}]${d.observed ? `; observed: ${d.observed.value}${d.observed.verdict === "contradicts" ? " (contradicts the prediction)" : ""}` : ""}`);
  if (r.observedTasks.length) {
    lines.push("Observed per task:");
    for (const t of r.observedTasks) lines.push(`  ${t.kit} task ${t.task} (${t.journey}): ${Math.round(t.completionRate * 100)}% completed, median ${t.medianSeconds ?? "–"} s, ${Math.round(t.errorRate * 100)}% with errors, ${t.assists} assist${t.assists === 1 ? "" : "s"} (${t.sessions} sessions)`);
    for (const p of r.recurring) lines.push(`  Seen in ${p.sessions} sessions: ${p.problem}`);
  }
  const pending = r.unchecked?.length ? ` ${r.unchecked.join(" and ").replace(/^./, (c) => c.toUpperCase())} ${r.unchecked.length === 1 ? "is" : "are"} not checked yet${r.unchecked.includes("accessibility") ? " (run the audit: npm run audit)" : ""}.` : "";
  lines.push(r.recommendable ? `Recommendable: no baseline fails.${pending} No overall score is given.` : `Not recommendable: ${r.notRecommendable}.`);
  return lines.join("\n");
}
