/* ux-builder-design advance --until-decision (CONTRACT-008 Commands,
   FEAT-018 GDL-83): the safe, deterministic work the agent would otherwise
   do in many calls (check the documents, carry approvals through formatting
   changes, work out the coverage map, find unverified claims and pending
   proposals), then the one decision the person must make next, with a
   recommendation and what happens after it. It changes nothing a person
   must approve. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { proposalsDir } from "./app.mjs";
import { validate } from "./documents.mjs";
import { budget, budgetText, intake } from "./intake.mjs";
import { modalityStatus } from "./modality.mjs";
import { CLOSES, progress } from "./process.mjs";
import { unverifiedClaims } from "./research.mjs";
import { carried, coverageMap, pendingReviews, reviewTable } from "./review.mjs";
import { readState } from "./state.mjs";

const list = (x) => (Array.isArray(x) ? x : []);
const kindOf = (id) => id.split(":")[0];

/* Pending HELIX proposals, read from proposals.json; [] without one. */
function pendingProposals(app) {
  const p = join(app, proposalsDir(app), "proposals.json");
  if (!existsSync(p)) return [];
  try { const j = JSON.parse(readFileSync(p, "utf8")); return [...list(j.proposals), ...list(j.drafts)].map((x) => x.id); } catch { return []; }
}

export function advance(app) {
  const state = readState(app);
  const done = [], validated = [];
  // Safe work: check, carry, map.
  const v = validate(app);
  validated.push(`${v.documents.length} design document${v.documents.length === 1 ? "" : "s"}: ${v.problems.length ? `${v.problems.length} problem${v.problems.length === 1 ? "" : "s"}` : "no problems"}${v.warnings.length ? `, ${v.warnings.length} warning${v.warnings.length === 1 ? "" : "s"}` : ""}`);
  const kept = carried(app);
  if (kept.length) done.push(`kept ${kept.length} approval${kept.length === 1 ? "" : "s"} through a formatting or metadata change: ${kept.join(", ")}`);
  const map = coverageMap(app);
  done.push(`worked out the coverage map: ${map.rows.length} job${map.rows.length === 1 ? "" : "s"}, ${map.exceptions.length} exception${map.exceptions.length === 1 ? "" : "s"}`);
  const claims = unverifiedClaims(app);
  const proposals = pendingProposals(app);
  const pending = pendingReviews(app);
  const step = progress(state).step;
  const passed = (id) => list(state.checkpoints).some((c) => c.id === id && ["passed", "skipped"].includes(c.status));

  // The agent's own work comes before any question: problems, unverified claims, feedback to address.
  const work = [];
  if (v.problems.length) work.push(`fix ${v.problems.length} document problem${v.problems.length === 1 ? "" : "s"} (ux-builder-design validate lists them)`);
  if (claims.length) work.push(`check ${claims.length} direction-changing claim${claims.length === 1 ? "" : "s"} against ${claims.length === 1 ? "its source" : "their sources"} before showing ${claims.length === 1 ? "it" : "them"}: ${claims.map((c) => `${c.evidence} ${c.id}`).join(", ")} (evidence claim verify, or mark low confidence)`);
  const fb = list(state.feedback).filter((f) => f.status === "open");
  if (fb.length) work.push(`address the person's feedback ${fb.map((f) => `${f.id} on ${f.item}`).join(", ")}, and record how (review respond)`);

  const decision = nextDecision({ app, state, pending, map, proposals, step, passed });
  const b = budget(app);
  const r = { step: progress(state).text, done, validated, work, decision, budget: b };
  r.text = [
    `${r.step}.`, ...done.map((d) => `Done: ${d}.`), ...validated.map((x) => `Checked: ${x}.`),
    ...(work.length ? ["Before asking, the agent must:", ...work.map((w) => `  ${w}`)] : []),
    decision ? `Decision for the person: ${decision.question}` : "No decision is waiting on the person.",
    ...(decision ? [`  Show: ${decision.show}`, `  Recommended: ${decision.recommend}`, `  Record: ${decision.record}`, `  After: ${decision.after}`] : []),
    budgetText(b),
  ].join("\n");
  return r;
}

/* The one decision that comes next, in the order the loop needs them. */
function nextDecision({ app, state, pending, map, proposals, step, passed }) {
  const foundations = pending.filter((p) => p.tier === "foundation");
  if (!state.checkpoints.length && !list(state.reviews).length && intake(app).ask.length && step <= 2) {
    const i = intake(app);
    return { kind: "intake", question: "the intake questions, asked together", show: `ux-builder-design intake: ${i.ask.join(", ")}`, recommend: "answer in one message; anything skipped becomes an assumption to test", record: "the brief, users and jobs, from their answer", after: "the brief and the users and jobs tables are drafted for review" };
  }
  if (foundations.length) {
    const kind = kindOf(foundations[0].id);
    const t = reviewTable(app, { kind, shown: false });
    return { kind: "table", table: kind, items: t.pending, question: `approve the ${kind} table (${t.pending.length} item${t.pending.length === 1 ? "" : "s"}${t.items.some((x) => x.diff) ? ", with what changed" : ""})`, show: `ux-builder-design review table ${kind}, every row in full`, recommend: "approve it, or say what to change in any row", record: `ux-builder-design review approve --kind ${kind} --answer "<their words>"`, after: foundations.length > t.pending.length ? `the next foundation table (${kindOf(foundations.find((f) => kindOf(f.id) !== kind).id)})` : "what is built from the foundations" };
  }
  const derived = pending.filter((p) => p.tier === "derived");
  if (derived.length) {
    return { kind: "map", items: derived.map((d) => d.id), exceptions: map.exceptions.map((e) => e.id), question: `approve the coverage map (${derived.length} built item${derived.length === 1 ? "" : "s"}${map.exceptions.length ? `, ${map.exceptions.length} exception${map.exceptions.length === 1 ? "" : "s"} to see one by one` : ""})`, show: "ux-builder-design review map", recommend: map.exceptions.length ? "fix each exception, or accept it in their words" : "approve it", record: `ux-builder-design review approve map --answer "<their words>"${map.exceptions.length ? " --accept <exception>…" : ""}`, after: passed("core-1") ? "the choice of approach at core-2" : "checkpoint core-1" };
  }
  if (!passed("core-1") && step >= 3) return checkpointDecision("core-1", "the intended experience and its success criteria, as approved", "the approaches are explored side by side");
  if (!passed("core-2") && passed("core-1") && step >= 4) return checkpointDecision("core-2", "the approaches compared side by side, and the recommended one", "the structure, modality and screens of the chosen approach");
  if (step >= 5 && !modalityStatus(app).confirmed) return { kind: "modality", question: "which kinds of experience and screen sizes the app is for, and for a web app its frame", show: "ux-builder-design explain modality; ux-builder-design explain \"app frame\", the four side by side; the sizes the evidence supports", recommend: `only the sizes the evidence shows people use${modalityStatus(app).recommended ? `, and the ${modalityStatus(app).recommended.frame} frame (${modalityStatus(app).recommended.why})` : ""}`, record: "ux-builder-design modality --answer \"<their words>\" --modality <list> --size-classes <list> --frame <frame>", after: "wireframes and the prototype are drawn" };
  if (proposals.length) return { kind: "proposals", items: proposals, question: `which of ${proposals.length} HELIX proposal${proposals.length === 1 ? "" : "s"} to apply`, show: "ux-builder-design proposals preview", recommend: "apply those the person agrees with; the rest stay pending", record: "ux-builder-design proposals apply --accepted <ids>", after: "HELIX holds the accepted changes, checked and with no clashing IDs" };
  if (step >= 7 && !passed("core-3") && pendingReviews(app, { steps: CLOSES["core-3"] }).length === 0 && list(state.reviews).length) return checkpointDecision("core-3", "the evaluation's findings and which to fix", "the validated experience goes to production implementation");
  return null;
}

function checkpointDecision(id, show, after) {
  return { kind: "checkpoint", checkpoint: id, question: `checkpoint ${id}`, show, recommend: "say yes when it is right, or what to change", record: `ux-builder-design state checkpoint ${id} --answer "<their words>"`, after };
}
