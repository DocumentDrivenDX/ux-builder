/* Steps 4 to 6 as one batch (FEAT-018 GDL-87; US-166): the agent
   recommends the alternative, the modality and frame, and the theme
   together ("I'll go with these unless you object"), and the person's one
   answer is recorded once: the alternative chosen, a decision for it and
   for the theme, approved with that answer; the modality; checkpoint
   core-2; steps 4 and 5 decided by the batch. The batch's one prototype
   is the app, built on the theme and checked at step 6 (VIP List session
   3 needed five records for one "Go with those three", and the step 4
   and 5 prototypes were never shown). */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bpFile, DesignError } from "./app.mjs";
import { checkpoint } from "./checkpoints.mjs";
import { decisionAdd } from "./decisions.mjs";
import { logEvent, personTurn } from "./metrics.mjs";
import { confirmModality } from "./modality.mjs";
import { progress, STEPS } from "./process.mjs";
import { approveBatch } from "./review.mjs";
import { readState, writeState } from "./state.mjs";

const list = (x) => (Array.isArray(x) ? x : []);
export const BATCH = [4, 5, 6];

export function stepBatch(app, { answer, alternative, reason, modalities, sizeClasses, frame, theme, now = new Date().toISOString() } = {}) {
  if (!answer?.trim()) throw new DesignError("step batch needs --answer: the person's answer to the three defaults, in their words");
  if (!theme?.trim()) throw new DesignError("step batch needs --theme: the theme the app is built on (plain, until a brand theme is released)");
  if (!list(modalities).length) throw new DesignError("step batch needs --modality: the modalities the person accepted");
  let state = readState(app);
  const n = progress(state).step;
  if (n !== 4) throw new DesignError(`step batch records steps 4 to 6 together, from step 4; the design is at step ${n}. Nothing was recorded.`);
  const candidates = list(state.alternatives).filter((a) => a.status !== "rejected");
  if (candidates.length > 1 && !alternative) throw new DesignError(`step batch needs --alternative: one of ${candidates.map((a) => a.name).join(", ")}. Nothing was recorded.`);
  const alt = alternative ? list(state.alternatives).find((a) => a.name === alternative) : null;
  if (alternative && !alt) throw new DesignError(`no alternative ${alternative}; the design has ${list(state.alternatives).map((a) => a.name).join(", ") || "none"}. Nothing was recorded.`);
  if (alt && !existsSync(join(app, alt.file))) throw new DesignError(`${alt.file} is missing. Nothing was recorded.`);
  if (list(modalities).includes("responsive-web") && !frame) throw new DesignError("step batch needs --frame for responsive-web: the app frame the person accepted. Nothing was recorded.");
  const words = answer.trim();

  // The person's one turn; everything after it is recorded in the same turn.
  const turn = personTurn(app, { kind: "decision", answer: words, at: now });
  const made = [];
  if (alt) {
    const why = reason?.trim() || words;
    writeFileSync(join(app, bpFile(app)), readFileSync(join(app, alt.file), "utf8"));
    const date = now.slice(0, 10);
    state = readState(app);
    state.alternatives = list(state.alternatives).map((a) => ({ ...a, status: a.name === alt.name ? "chosen" : "rejected", reason: a.name === alt.name ? why : `${alt.name} was chosen: ${why}`, date }));
    writeState(app, state);
    if (candidates.length > 1) made.push(decisionAdd(app, { question: list(state.questions).find((q) => q.status === "open")?.text ?? "Which alternative does the design take?", options: candidates.map((a) => a.name), choice: alt.name, why }).id);
    state = readState(app);
    for (const q of list(state.questions)) if (q.status === "open" && candidates.length > 1) { q.status = "answered"; break; }
    writeState(app, state);
  }
  made.push(decisionAdd(app, { question: "Which theme is the app built on?", options: [theme.trim(), "wait for a brand theme"], choice: theme.trim(), why: `${words} A brand theme is swapped in when it is released; nothing waits on it.` }).id);
  // Approved with the batch answer: the decisions it made and the alternatives it settled.
  const approved = approveBatch(app, { decisions: made.map((id) => `decision:${id}`), answer: words, now: now.slice(0, 10) });
  confirmModality(app, { answer: words, modalities, sizeClasses, frame, sameTurn: true });
  const passed = list(readState(app).checkpoints).some((c) => c.id === "core-2" && ["passed", "skipped"].includes(c.status));
  if (!passed) checkpoint(app, { id: "core-2", answer: words, sameTurn: true, now });

  state = readState(app);
  for (const s of [4, 5]) state.stepPrototypes = { ...(state.stepPrototypes ?? {}), [s]: { ...(state.stepPrototypes?.[s] ?? { dir: "", assumptions: [], rounds: [] }), at: now, batch: true, decision: { choice: "continue", answer: words, at: now, turn } } };
  state.step = 6;
  state.activity = STEPS[5].activity;
  state.next = `Build the app on ${theme.trim()} (npm create @ux-builder/app@latest . -- --theme ${theme.trim()}), then draw and check the step 6 prototype, the app (ux-builder-design prototype --step, --check), and show it: the batch's one prototype. Then ask continue, revise or finish.`;
  writeState(app, state);
  logEvent(app, "step", { step: 6, mode: state.mode, batch: true }, now);
  return { steps: [4, 5], alternative: alt?.name ?? null, decisions: made, approved, modalities, theme: theme.trim(), turn, now: progress(state).text, next: state.next };
}

export const stepBatchText = (r) => `Steps 4 and 5 recorded with one answer${r.alternative ? `: ${r.alternative} chosen` : ""}, ${r.decisions.join(" and ")} approved, the modality recorded, checkpoint core-2 answered. ${r.now}. ${r.next}`;
