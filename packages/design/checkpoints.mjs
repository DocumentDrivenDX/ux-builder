/* Checkpoints and mode (CONTRACT-008 Commands, FEAT-018 GDL-05, GDL-06,
   GDL-75): the points where the guide stops and asks the person one
   question, and whether it runs the full loop or change mode. A
   checkpoint's answer is kept in the design state and written to the trace
   as a decision, so its history survives a rewritten state. */

import { recordDecision } from "@ux-builder/trace";
import { DesignError } from "./app.mjs";
import { CLOSES, firstOf, STEPS } from "./process.mjs";
import { logEvent } from "./metrics.mjs";
import { pendingReviews } from "./review.mjs";
import { readState, writeState } from "./state.mjs";

export const CHECKPOINTS = {
  "core-1": "the intended experience and its success criteria",
  "core-2": "the interaction model to pursue",
  "core-3": "whether the validated experience goes to production implementation",
  "significant-change": "a significant design change to something already validated",
  experiment: "an experiment that real users will see",
  release: "a production release of a changed experience",
};

/* A passed core checkpoint moves the loop to the step after the ones it
   closes (core-1 to step 4, core-2 to step 5, Design the structure), and
   what the guide does there first: the loop moves on only forward. */
const ORDER = ["baseline", "define", "explore", "experience", "validate"];
const MOVES = ["core-1", "core-2"];
const STRUCTURE = "Ask which modalities and screen sizes the app is for (ux-builder-design modality), then check each screen's purpose and the order of what it shows";
export const FIRST_STEP = {
  baseline: "Go through what HELIX's backfill drafted from the app (the PRD and stories, as proposals) and the blueprint drawn from its screens with the person, and ask what to improve",
  define: "Interview the person about what users must accomplish, then draft the brief and ask core-1",
  explore: "Draft at least two alternatives for the open questions, compare them and ask core-2",
  experience: "Prototype the chosen design for the person to try; then build the validated prototype",
  validate: "Write a test kit and test the design with people",
};

/* Write the checkpoint to the trace; a trace that cannot be written warns
   and never stops the checkpoint being recorded (as ADR-035 rule 2 asks). */
function traceCheckpoint(app, id, { answer, skip, declined, reason }) {
  try {
    return recordDecision(app, skip
      ? { chose: `Skipped checkpoint ${id}`, why: reason, kind: "checkpoint", checkpoint: id }
      : { chose: answer, why: `The person's answer at checkpoint ${id}: ${CHECKPOINTS[id]}${declined ? " (declined: not yet)" : ""}.`, kind: "checkpoint", checkpoint: id }, { by: "agent" });
  } catch (e) {
    process.emitWarning(`the checkpoint was not written to the trace: ${e.message}`);
    return null;
  }
}

export function checkpoint(app, { id, answer, skip = false, declined = false, reason, now = new Date().toISOString() } = {}) {
  if (!Object.hasOwn(CHECKPOINTS, id)) throw new DesignError(`"${id ?? ""}" is not a checkpoint; use one of ${Object.keys(CHECKPOINTS).join(", ")}`);
  if (skip && answer) throw new DesignError("give --answer or --skip, not both");
  if (skip && declined) throw new DesignError("--declined goes with --answer: the person said no or not yet");
  if (skip && !reason?.trim()) throw new DesignError(`skipping ${id} needs --reason: why the person chose to go on without it`);
  if (!skip && !answer?.trim()) throw new DesignError(`checkpoint ${id} needs --answer <the person's answer>, or --skip --reason <why>`);
  // A checkpoint is not passed while items of the steps it closes await the person's review (GDL-79).
  if (!skip && !declined && CLOSES[id]) {
    const waiting = pendingReviews(app, { steps: CLOSES[id] });
    if (waiting.length) throw new DesignError(`checkpoint ${id} cannot be passed yet: ${waiting.length} item${waiting.length === 1 ? "" : "s"} await${waiting.length === 1 ? "s" : ""} the person's review: ${waiting.map((w) => w.id).join(", ")}. Show each foundation kind as a table (ux-builder-design review table <kind>) and the built items as the coverage map (review map), and record the approvals (review approve --kind <kind> | map --answer "<their words>"). Nothing was recorded.`);
  }
  const state = structuredClone(readState(app));
  // A "no" or "not yet" is an answer too, but it never counts as passed.
  const entry = skip ? { id, status: "skipped", reason: reason.trim(), at: now } : { id, status: declined ? "declined" : "passed", answer: answer.trim(), at: now };
  state.checkpoints.push(entry);
  // A passed core checkpoint moves the loop on, and a next action that waited on it gives way.
  const moved = entry.status === "passed" && MOVES.includes(id) && moveOn(state, id);
  writeState(app, state);
  logEvent(app, "checkpoint", { id, status: entry.status }, now);
  if (moved) logEvent(app, "step", { step: state.step, mode: state.mode }, now);
  const event = traceCheckpoint(app, id, { answer, skip, declined, reason });
  return { checkpoint: entry, about: CHECKPOINTS[id], activity: state.activity, ...(moved ? { moved: true, step: state.step } : {}), next: state.next, trace: event ? { episode: event.episode, seq: event.seq } : null };
}

/* Move the loop to the step after those checkpoint `id` closes, and its
   activity, when it is behind. Returns whether it moved. */
function moveOn(state, id) {
  const n = Math.max(...CLOSES[id]) + 1, to = STEPS[n - 1].activity;
  const activity = ORDER.indexOf(to) > ORDER.indexOf(state.activity), step = state.mode !== "change" && (state.step ?? 0) < n;
  if (!activity && !step) return false;
  if (activity) state.activity = to;
  if (step) state.step = n;
  const first = n === firstOf(to) ? FIRST_STEP[to] : STRUCTURE;
  if (!state.next || state.checkpoints.some((c) => c.status === "passed" && state.next.includes(c.id)) || [...Object.values(FIRST_STEP), STRUCTURE].includes(state.next)) state.next = first;
  return true;
}

/* Move the loop on to `to` when it is behind, replacing a next action that
   waited on a checkpoint already passed. Returns whether it moved. */
export function advance(state, to) {
  if (ORDER.indexOf(to) <= ORDER.indexOf(state.activity)) return false;
  state.activity = to;
  if (state.mode !== "change") state.step = firstOf(to);
  if (!state.next || state.checkpoints.some((c) => c.status === "passed" && state.next.includes(c.id)) || Object.values(FIRST_STEP).includes(state.next)) state.next = FIRST_STEP[to];
  return true;
}

export function setMode(app, { mode, why } = {}) {
  if (!["full", "change"].includes(mode)) throw new DesignError(`mode is full or change, not "${mode ?? ""}"`);
  const state = structuredClone(readState(app));
  // Each mode has its own steps: change mode starts at its first; the full loop resumes at its activity's.
  if (state.mode !== mode) state.step = mode === "change" ? 1 : firstOf(state.activity);
  state.mode = mode;
  if (why?.trim()) state.modeReason = why.trim(); else delete state.modeReason;
  writeState(app, state);
  return { mode, ...(state.modeReason ? { why: state.modeReason } : {}) };
}
