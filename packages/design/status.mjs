/* ux-builder-design status (CONTRACT-008 Commands, FEAT-018 GDL-02,
   GDL-76): where the loop stands, in plain words, for the agent opening a
   session or a person without one. */

import { jobsTable, usersTable, uxDocuments } from "./documents.mjs";
import { layout, ux } from "./app.mjs";
import { FIRST_STEP } from "./checkpoints.mjs";
import { modalityStatus } from "./modality.mjs";
import { progress } from "./process.mjs";
import { migrationPlan } from "./migrate.mjs";
import { pendingReviews } from "./review.mjs";
import { readState } from "./state.mjs";

const ACTIVITY = { baseline: "Baseline", define: "Define", explore: "Explore", experience: "Experience", validate: "Validate" };
const UNTESTED = new Set(["assumed", "hypothesis", "current-state"]);

/* Jobs by status, from docs/ux/jobs.md, else the design state's job
   points; and each hypothesis with its confidence (low, or none yet). */
function jobsSummary(app, s) {
  const table = jobsTable(app);
  const rows = table ? Object.entries(table).map(([id, j]) => ({ id, status: j.status, confidence: j.confidence || null }))
    : s.assumptions.filter((a) => a.section === "jobs" && a.status !== "refuted").map((a) => ({ id: a.id, status: a.status, confidence: null }));
  const byStatus = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  return { from: table ? ux(app, "jobs.md") : "design state", byStatus, hypotheses: rows.filter((r) => r.status === "hypothesis").map(({ id, confidence }) => ({ id, confidence })) };
}

export function status(app) {
  const s = readState(app);
  const chosen = s.alternatives.find((a) => a.status === "chosen") ?? null;
  const untested = s.assumptions.filter((a) => UNTESTED.has(a.status));
  const open = s.questions.filter((q) => q.status === "open");
  const pending = pendingReviews(app);
  const result = {
    // Where the person is, and what awaits their review (GDL-79).
    progress: progress(s),
    layout: layout(app).name,
    // What migrate would still move (GDL-80, GDL-82): an app on the new layout may keep its assessment and audit report at its top.
    toMigrate: migrationPlan(app).map((m) => m.from),
    awaitingReview: pending.map((p) => p.id),
    activity: s.activity,
    mode: s.mode,
    startedFrom: s.startedFrom,
    // A design folder (GDL-81): the app is built in place when the design is ready; null elsewhere.
    app: s.startedFrom === "design" ? (s.app ? { built: true, theme: s.app.theme, modalities: s.app.modalities } : { built: false, modalityRecorded: modalityStatus(app).confirmed }) : null,
    chosen: chosen?.name ?? null,
    untestedAssumptions: untested.length,
    openQuestions: open.map((q) => q.text),
    checkpoints: s.checkpoints.map((c) => ({ id: c.id, status: c.status })),
    openIssues: s.issues.filter((i) => i.status === "open").length,
    runningExperiments: s.experiments.filter((e) => e.status === "running").map((e) => e.id),
    next: s.next,
    jobs: jobsSummary(app, s),
    // Target users by status, from docs/ux/users.md (GDL-77); null without one.
    users: (() => { const t = usersTable(app); if (!t) return null; const byStatus = {}; for (const u of Object.values(t)) byStatus[u.status] = (byStatus[u.status] ?? 0) + 1; return { from: ux(app, "users.md"), byStatus }; })(),
    // The validated prototype is a prototype until core-3 says it goes to production (ADR-037 rule 4).
    prototype: s.prototype ? { branch: s.prototype.branch, status: s.checkpoints.filter((c) => c.id === "core-3").at(-1)?.status === "passed" ? "production" : "validated" } : null,
    documents: uxDocuments(app),
  };
  result.text = summary(result);
  return result;
}

/* What building the app in a design folder needs, in order (GDL-81). */
export const BUILD_NEEDS = (modalityRecorded) => `To build the app here when the design is ready: ${modalityRecorded ? "" : "record the person's answer on modality (ux-builder-design modality), then "}ask them for the theme (a released one, or one they make from their brand in the theme builder), then run npm create @ux-builder/app@latest . -- --theme <name>.`;

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function summary(r) {
  const lines = [];
  // Only the latest answer at a checkpoint stands: a decline after a pass, or a pass after a decline.
  const latest = new Map(r.checkpoints.map((c) => [c.id, c.status]));
  lines.push(`${r.progress.text} (${ACTIVITY[r.activity]}, in ${r.mode === "change" ? "change mode" : "the full loop"}${r.startedFrom === "existing" ? ", in an existing app" : r.startedFrom === "design" && !r.app?.built ? ", in a design folder" : ""}).`);
  if (r.app && !r.app.built) lines.push(`No app yet: this folder holds the design. ${BUILD_NEEDS(r.app.modalityRecorded)}`);
  else if (r.app?.built) lines.push(`The app was built here on the ${r.app.theme} theme (${r.app.modalities.join(", ")}).`);
  if (r.layout === "legacy") lines.push("This app is on the old layout (docs/ux/, app.blueprint.json at the top): run ux-builder-design migrate to move it under docs/ux-builder/.");
  else if (r.toMigrate?.length) lines.push(`Still at the app's top: ${r.toMigrate.join(", ")}; run ux-builder-design migrate to move ${r.toMigrate.length === 1 ? "it" : "them"} under docs/ux-builder/.`);
  if (r.awaitingReview.length) lines.push(`Awaiting your review: ${r.awaitingReview.length} item${r.awaitingReview.length === 1 ? "" : "s"} (${r.awaitingReview.slice(0, 5).join(", ")}${r.awaitingReview.length > 5 ? ", …" : ""}).`);
  lines.push(r.chosen ? `${r.chosen} is chosen.` : "No alternative is chosen yet.");
  lines.push(r.untestedAssumptions ? `${plural(r.untestedAssumptions, "assumption is", "assumptions are")} untested.` : "No untested assumptions.");
  if (r.openQuestions.length) lines.push(`Open ${r.openQuestions.length === 1 ? "question" : "questions"}: ${r.openQuestions.join("; ")}`);
  else lines.push("No open questions.");
  const passed = [...new Set(r.checkpoints.filter((c) => c.status === "passed").map((c) => c.id))];
  const skipped = r.checkpoints.filter((c) => c.status === "skipped").map((c) => c.id);
  if (passed.length) lines.push(`Checkpoints passed: ${passed.join(", ")}.`);
  if (skipped.length) lines.push(`Checkpoints skipped: ${skipped.join(", ")}.`);
  const declined = [...latest].filter(([, st]) => st === "declined").map(([id]) => id);
  if (declined.length) lines.push(`Checkpoints declined (no or not yet): ${declined.join(", ")}.`);
  const counts = Object.entries(r.jobs.byStatus).map(([k, n]) => `${n} ${k}`);
  if (counts.length) lines.push(`Jobs: ${counts.join(", ")}.`);
  if (r.users) lines.push(`Target users: ${Object.entries(r.users.byStatus).map(([k, n]) => `${n} ${k}`).join(", ")}.`);
  if (r.prototype) lines.push(`Prototype: ${r.prototype.status === "validated" ? `the validated prototype on ${r.prototype.branch} is still a prototype (core-3 ${latest.get("core-3") === "declined" ? "answered not yet" : "not answered"})` : `${r.prototype.branch} went to production at core-3`}.`);
  if (r.openIssues) lines.push(`${plural(r.openIssues, "usability issue is", "usability issues are")} open.`);
  if (r.runningExperiments.length) lines.push(`Running: ${r.runningExperiments.join(", ")}.`);
  lines.push(r.next ? `Next: ${r.next}` : `Next (not set; the activity's first step): ${FIRST_STEP[r.activity] ?? "not set"}.`);
  if (r.documents.length) lines.push(`Documents: ${r.documents.map((d) => d.path).join(", ")}.`);
  return lines.join("\n");
}
