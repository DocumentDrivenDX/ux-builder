/* Checkpoints and mode (CONTRACT-008 Commands, FEAT-018 GDL-05, GDL-06,
   GDL-75): the points where the guide stops and asks the person one
   question, and whether it runs the full loop or change mode. A
   checkpoint's answer is kept in the design state and written to the trace
   as a decision, so its history survives a rewritten state. */

import { recordDecision } from "@ux-builder/trace";
import { DesignError } from "./app.mjs";
import { readState, writeState } from "./state.mjs";

export const CHECKPOINTS = {
  "core-1": "the intended experience and its success criteria",
  "core-2": "the interaction model to pursue",
  "core-3": "whether the validated experience goes to production implementation",
  "significant-change": "a significant design change to something already validated",
  experiment: "an experiment that real users will see",
  release: "a production release of a changed experience",
};

/* Write the checkpoint to the trace; a trace that cannot be written warns
   and never stops the checkpoint being recorded (as ADR-035 rule 2 asks). */
function traceCheckpoint(app, id, { answer, skip, reason }) {
  try {
    return recordDecision(app, skip
      ? { chose: `Skipped checkpoint ${id}`, why: reason, kind: "checkpoint", checkpoint: id }
      : { chose: answer, why: `The person's answer at checkpoint ${id}: ${CHECKPOINTS[id]}.`, kind: "checkpoint", checkpoint: id }, { by: "agent" });
  } catch (e) {
    process.emitWarning(`the checkpoint was not written to the trace: ${e.message}`);
    return null;
  }
}

export function checkpoint(app, { id, answer, skip = false, reason, now = new Date().toISOString() } = {}) {
  if (!Object.hasOwn(CHECKPOINTS, id)) throw new DesignError(`"${id ?? ""}" is not a checkpoint; use one of ${Object.keys(CHECKPOINTS).join(", ")}`);
  if (skip && answer) throw new DesignError("give --answer or --skip, not both");
  if (skip && !reason?.trim()) throw new DesignError(`skipping ${id} needs --reason: why the person chose to go on without it`);
  if (!skip && !answer?.trim()) throw new DesignError(`checkpoint ${id} needs --answer <the person's answer>, or --skip --reason <why>`);
  const state = structuredClone(readState(app));
  const entry = skip ? { id, status: "skipped", reason: reason.trim(), at: now } : { id, status: "passed", answer: answer.trim(), at: now };
  state.checkpoints.push(entry);
  writeState(app, state);
  const event = traceCheckpoint(app, id, { answer, skip, reason });
  return { checkpoint: entry, about: CHECKPOINTS[id], trace: event ? { episode: event.episode, seq: event.seq } : null };
}

export function setMode(app, { mode, why } = {}) {
  if (!["full", "change"].includes(mode)) throw new DesignError(`mode is full or change, not "${mode ?? ""}"`);
  const state = structuredClone(readState(app));
  state.mode = mode;
  if (why?.trim()) state.modeReason = why.trim(); else delete state.modeReason;
  writeState(app, state);
  return { mode, ...(state.modeReason ? { why: state.modeReason } : {}) };
}
