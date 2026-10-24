/* ux-builder-design rubric (CONTRACT-008 Rubric, FEAT-018 GDL-37 to GDL-39,
   GDL-59; SD-006 Rubric): an alternative's UX quality, dimension by
   dimension. Each predicted value says its basis: computed from the
   blueprint, the check and the audit, a judgment the agent recorded with
   its reasoning, or "to validate" when there is neither. The observed side
   comes from human testing. Nothing is averaged; an alternative that fails
   a baseline is not recommendable, whatever else it scores. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { checkBlueprint, score } from "@ux-builder/ui/blueprint";
import { DesignError } from "./app.mjs";
import { readState } from "./state.mjs";

const require = createRequire(import.meta.url);
export const RUBRIC = JSON.parse(readFileSync(require.resolve("@ux-builder/ui/catalogue.json"), "utf8")).interaction.rubric;

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const list = (x) => (Array.isArray(x) ? x : []);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/* The blueprint of an alternative: app.blueprint.<name>.json, or the app's own. */
function blueprintOf(app, name) {
  const file = name && name !== "current" ? `app.blueprint.${name}.json` : "app.blueprint.json";
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
  const audit = readJson(join(app, "audit-report/report.json"));
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

/* Observed values per dimension, from imported human observations (B-035
   adds them): { [dimension]: { value, evidence } }. */
export function observedFor(app, alternative) {
  const store = readJson(join(app, ".ux-builder/observed.json"));
  return store?.[alternative ?? "current"] ?? {};
}

/* ux-builder-design rubric [--alternative <name>]. */
export function rubric(app, { alternative } = {}) {
  const { file, bp } = blueprintOf(app, alternative);
  const name = alternative ?? "current";
  let judgments = [];
  try { judgments = list(readState(app).alternatives.find((a) => a.name === name)?.judgments); } catch { /* no design state */ }
  const judged = (d) => judgments.find((j) => [d.id, d.name.toLowerCase()].includes(String(j.criterion).trim().toLowerCase()));
  const calc = computed(bp, app);
  const observed = observedFor(app, name);
  const dimensions = RUBRIC.map((d) => {
    const c = calc[d.id];
    const j = judged(d);
    const predicted = c ? { value: c.value, basis: "computed", measures: c.measures }
      : j ? { value: j.value, basis: "judgment", reasoning: j.reasoning }
      : { value: "to validate", basis: "to validate" };
    return { id: d.id, name: d.name, question: d.question, baseline: d.baseline, predicted, observed: observed[d.id] ?? null, ...(c?.fails ? { fails: true } : {}) };
  });
  const fails = dimensions.filter((d) => d.baseline && d.fails).map((d) => d.id);
  return { alternative: name, file, dimensions: dimensions.map(({ fails: _, ...d }) => d), recommendable: fails.length === 0, ...(fails.length ? { notRecommendable: `fails the baseline${fails.length > 1 ? "s" : ""} ${fails.join(" and ")}` } : {}) };
}

export function rubricText(r) {
  const lines = [`${r.alternative} (${r.file}), predicted:`];
  for (const d of r.dimensions) lines.push(`  ${d.name}${d.baseline ? " (baseline)" : ""}: ${d.predicted.value} [${d.predicted.basis}${d.predicted.reasoning ? `: ${d.predicted.reasoning}` : ""}]${d.observed ? `; observed: ${d.observed.value}` : ""}`);
  lines.push(r.recommendable ? "Recommendable: no baseline fails. No overall score is given." : `Not recommendable: ${r.notRecommendable}.`);
  return lines.join("\n");
}
