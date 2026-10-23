/* ux-builder-design status (CONTRACT-008 Commands, FEAT-018 GDL-02,
   GDL-76): where the loop stands, in plain words, for the agent opening a
   session or a person without one. */

import { uxDocuments } from "./documents.mjs";
import { readState } from "./state.mjs";

const ACTIVITY = { baseline: "Baseline", define: "Define", explore: "Explore", experience: "Experience", validate: "Validate" };
const UNTESTED = new Set(["assumed", "hypothesis", "current-state"]);

export function status(app) {
  const s = readState(app);
  const chosen = s.alternatives.find((a) => a.status === "chosen") ?? null;
  const untested = s.assumptions.filter((a) => UNTESTED.has(a.status));
  const open = s.questions.filter((q) => q.status === "open");
  const result = {
    activity: s.activity,
    mode: s.mode,
    startedFrom: s.startedFrom,
    chosen: chosen?.name ?? null,
    untestedAssumptions: untested.length,
    openQuestions: open.map((q) => q.text),
    checkpoints: s.checkpoints.map((c) => ({ id: c.id, status: c.status })),
    openIssues: s.issues.filter((i) => i.status === "open").length,
    runningExperiments: s.experiments.filter((e) => e.status === "running").map((e) => e.id),
    next: s.next,
    documents: uxDocuments(app),
  };
  result.text = summary(result);
  return result;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function summary(r) {
  const lines = [];
  lines.push(`${ACTIVITY[r.activity]}, in ${r.mode === "change" ? "change mode" : "the full loop"}${r.startedFrom === "existing" ? ", in an existing app" : ""}.`);
  lines.push(r.chosen ? `${r.chosen} is chosen.` : "No alternative is chosen yet.");
  lines.push(r.untestedAssumptions ? `${plural(r.untestedAssumptions, "assumption is", "assumptions are")} untested.` : "No untested assumptions.");
  if (r.openQuestions.length) lines.push(`Open ${r.openQuestions.length === 1 ? "question" : "questions"}: ${r.openQuestions.join("; ")}`);
  else lines.push("No open questions.");
  const passed = r.checkpoints.filter((c) => c.status === "passed").map((c) => c.id);
  const skipped = r.checkpoints.filter((c) => c.status === "skipped").map((c) => c.id);
  if (passed.length) lines.push(`Checkpoints passed: ${passed.join(", ")}.`);
  if (skipped.length) lines.push(`Checkpoints skipped: ${skipped.join(", ")}.`);
  if (r.openIssues) lines.push(`${plural(r.openIssues, "usability issue is", "usability issues are")} open.`);
  if (r.runningExperiments.length) lines.push(`Running: ${r.runningExperiments.join(", ")}.`);
  lines.push(r.next ? `Next: ${r.next}` : "Next: not set.");
  if (r.documents.length) lines.push(`Documents: ${r.documents.map((d) => d.path).join(", ")}.`);
  return lines.join("\n");
}
