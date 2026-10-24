/* Task metrics per walked journey (FEAT-018 GDL-52, GDL-53; US-139;
   CONTRACT-008 "Amendment to CONTRACT-006"): metrics.json from the
   walkthrough and the blueprint. Every metric is agent-measured: an agent
   navigates differently from people, so they show where a journey asks for
   more than it needs, not how people will do.

   Moves count the screen changes along the main path (alternates are left
   out); the shortest path is the blueprint's, over its actions, the same
   number `ux-builder-blueprint score` predicts. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { score } from "@ux-builder/ui/blueprint";
import { runBlueprint, stepScreen } from "./heuristics.mjs";

export const AGENT_NOTE = "Every metric here is agent-measured. An agent navigates differently from people: it reads every label, does not tire and does not guess, so these numbers show where a journey asks for more than its shortest path, not how people will do. Test with people for that.";
const read = (dir, f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null);
const seconds = (a, b) => { const t = (Date.parse(b) - Date.parse(a)) / 1000; return Number.isFinite(t) ? Math.round(t * 10) / 10 : null; };

/* One journey's metrics from its walked steps. */
export function journeyMetrics(j, { planJ = null, predicted = null } = {}) {
  const steps = (j.steps ?? []).filter((s) => s.alternate == null);
  const taken = steps.filter((s) => s.status !== "not-assessed");
  const path = [];
  for (const s of taken) { const sc = stepScreen(s, planJ); if (sc && sc !== path.at(-1)) path.push(sc); }
  let backtracks = 0;
  path.forEach((sc, i) => { if (path.slice(0, i).includes(sc)) backtracks++; });
  const moves = Math.max(0, path.length - 1);
  const stopped = steps.find((s) => s.status === "blocked" || s.status === "not-assessed");
  const completed = j.status ? j.status === "completed" : !stopped;
  const shortestPath = predicted?.shortestPath ?? null;
  const out = {
    journey: j.id, ...(planJ?.blueprint ? { blueprint: planJ.blueprint } : {}), label: "agent-measured",
    completed, interactions: taken.length, moves, shortestPath,
    extraInteractions: shortestPath == null ? null : Math.max(0, moves - shortestPath),
    pathTaken: path, backtracks,
    failedActions: taken.filter((s) => s.failed).length,
    informationNotFound: taken.filter((s) => s.notFound).map((s) => ({ n: s.n, what: s.notFound })),
    interfaceErrors: taken.filter((s) => s.error).map((s) => ({ n: s.n, error: s.error })),
    timePerStep: taken.map((s, i) => ({ n: s.n, seconds: s.at && taken[i + 1]?.at ? seconds(s.at, taken[i + 1].at) : null })),
  };
  if (!completed) {
    const at = stopped ?? taken.at(-1) ?? steps.at(-1);
    out.stoppedAt = at ? { n: at.n, action: at.action, screen: stepScreen(at, planJ), ...(at.reason ? { reason: at.reason } : {}) } : null;
  }
  return out;
}

/* metrics.json for a run: { schema, version, label, note, journeys }. */
export function metrics(dir, { blueprint: file } = {}) {
  const walk = read(dir, "walkthrough.json");
  if (!walk) throw Object.assign(new Error(`${dir} has no walkthrough.json: walk a journey first`), { code: "usage" });
  const plan = read(dir, "plan.json");
  const bp = runBlueprint(dir, file);
  const scores = bp ? score(bp) : [];
  const journeys = (walk.journeys ?? []).map((j) => {
    const planJ = (plan?.journeys ?? []).find((p) => p.id === j.id) ?? null;
    const predicted = scores.find((x) => x.journey === (planJ?.blueprint ?? j.id)) ?? null;
    return journeyMetrics(j, { planJ, predicted });
  });
  const record = { schema: "metrics", version: 1, label: "agent-measured", note: AGENT_NOTE, journeys };
  writeFileSync(join(dir, "metrics.json"), JSON.stringify(record, null, 2) + "\n");
  return record;
}

/* The report's lines for metrics.json: each metric labelled agent-measured. */
export function metricsLines(m) {
  const L = [m.note, ""];
  for (const j of m.journeys ?? []) {
    L.push(`### ${j.journey}${j.blueprint && j.blueprint !== j.journey ? ` (blueprint ${j.blueprint})` : ""}`, "");
    const row = (name, value) => L.push(`- ${name} (agent-measured): ${value}`);
    row("Completed", j.completed ? "yes" : `no — stopped at step ${j.stoppedAt?.n ?? "?"}${j.stoppedAt?.screen ? ` on ${j.stoppedAt.screen}` : ""}${j.stoppedAt?.reason ? ` (${j.stoppedAt.reason})` : ""}`);
    row("Interactions taken", j.interactions);
    row("Moves between screens", `${j.moves}; shortest path ${j.shortestPath ?? "unknown (no blueprint journey)"}${j.extraInteractions ? `; ${j.extraInteractions} more than needed` : ""}`);
    row("Path taken", j.pathTaken.join(" → ") || "none");
    row("Backtracks", j.backtracks);
    row("Failed actions", j.failedActions);
    row("Information not found", j.informationNotFound.length ? j.informationNotFound.map((x) => `step ${x.n}: ${x.what}`).join("; ") : "none");
    row("Interface errors", j.interfaceErrors.length ? j.interfaceErrors.map((x) => `step ${x.n}: ${x.error}`).join("; ") : "none");
    row("Time per step", j.timePerStep.some((t) => t.seconds != null) ? j.timePerStep.map((t) => `${t.n}: ${t.seconds ?? "–"} s`).join(", ") : "not recorded (steps have no times)");
    L.push("");
  }
  return L;
}
