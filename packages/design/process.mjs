/* The guided design process as the person sees it (CONTRACT-008 Commands,
   FEAT-018 GDL-79): its eight steps, what the person does in each, what
   comes out, the terms each introduces and the checkpoint that closes it;
   change mode's four steps; and where the person is now. */

import { readFileSync } from "node:fs";
import { DesignError } from "./app.mjs";
import { logEvent } from "./metrics.mjs";
import { readState, writeState } from "./state.mjs";

export const STEPS = [
  { n: 1, name: "Define intent", activity: "define", you: "Say what people should accomplish and how you'll know it worked; the agent reads what exists first and asks the rest together, and one narrative answer is fine.", produces: "The experience brief", terms: ["experience brief", "user story", "acceptance criterion", "assumption", "hypothesis"] },
  { n: 2, name: "Understand users", activity: "define", you: "Correct the agent's hypotheses about who the users are and what they need; bring any research.", produces: "Target users, jobs to be done, research evidence", terms: ["target user", "job to be done", "evidence", "confidence"] },
  { n: 3, name: "Model tasks", activity: "define", you: "Confirm the tasks people must accomplish, the business rules they meet, and which simplifications to accept.", produces: "Tasks and business rules in the blueprint", terms: ["blueprint", "task", "business rule"], checkpoint: "core-1" },
  { n: 4, name: "Explore alternatives", activity: "explore", you: "Compare two or more ways to do the same tasks, side by side, and choose one.", produces: "Alternative blueprints, a comparison, the rubric, a decision record", terms: ["journey", "alternative", "rubric", "decision record"], checkpoint: "core-2" },
  { n: 5, name: "Design the structure", activity: "explore", you: "Say which kinds of experience and screen sizes the app is for; then check each screen's purpose and the order of what it shows.", produces: "The modalities and screen sizes you choose; screens with their purpose and content; wireframes", terms: ["modality", "size class", "screen", "pattern", "wireframe"] },
  { n: 6, name: "Prototype", activity: "experience", you: "Click through the prototype and say what to change; choose the app's theme if it has none yet; then the chosen design is built in the app.", produces: "Exploratory prototypes; the validated prototype", terms: ["exploratory prototype", "theme", "validated prototype"] },
  { n: 7, name: "Test with people", activity: "validate", you: "Run or watch sessions with real users; decide which findings to fix.", produces: "A test kit, findings, the UX evaluation report", terms: ["UI audit", "usability assessment", "test kit", "finding", "evaluation report"], checkpoint: "core-3" },
  { n: 8, name: "Refine and improve", activity: "validate", you: "Look at how people use the app; decide what to try next and whether to release it.", produces: "Production insights, diagnoses, experiments", terms: ["journey event", "insight", "experiment"], checkpoint: "experiment, release" },
];
export const CHANGE_STEPS = [
  { n: 1, name: "Challenge", you: "Say what the change is for; the agent asks what happens without it and what the simplest version is." },
  { n: 2, name: "Impact", you: "See everything the change reaches and the complexity it adds." },
  { n: 3, name: "Decide", you: "Accept, adjust or drop the change; a change to something already tested asks significant-change first." },
  { n: 4, name: "Apply", you: "Review the changed items, then the agent applies the change everywhere it reaches." },
];
/* The steps whose items a checkpoint closes (GDL-79): it does not pass while they await review. */
export const CLOSES = { "core-1": [1, 2, 3], "core-2": [4], "core-3": [5, 6, 7], experiment: [8], release: [8] };

export const stepsOf = (mode) => (mode === "change" ? CHANGE_STEPS : STEPS);

/* Where the person is: { mode, step, of, name, text }. */
export function progress(state) {
  const steps = stepsOf(state.mode);
  if (state.mode !== "change" && state.activity === "baseline" && !state.step) return { mode: "full", step: 0, of: steps.length, name: "Baseline", text: `Baseline, before step 1 of ${steps.length}` };
  const step = Math.min(Math.max(state.step ?? firstOf(state.activity), 1), steps.length);
  const name = steps[step - 1].name;
  return { mode: state.mode, step, of: steps.length, name, text: `${state.mode === "change" ? "Change mode, step" : "Step"} ${step} of ${steps.length}: ${name}` };
}
/* The first step of an activity. */
export const firstOf = (activity) => STEPS.find((s) => s.activity === activity)?.n ?? 1;

/* ux-builder-design overview. */
export function overview() {
  return {
    steps: STEPS.map(({ n, name, activity, you, produces, terms, checkpoint }) => ({ n, name, activity, you, produces, terms, ...(checkpoint ? { checkpoint } : {}) })),
    change: CHANGE_STEPS,
    review: "After each step, the agent shows you what it produced and moves on only when you approve it. The foundations (the brief, target users, jobs, stories, business rules and decisions) come a table per kind, every row in full, for your feedback and approval. What is built from them comes as one coverage map: you look at its exceptions and what changed, not each item again. Records (evidence, reports, insights) need no approval: you decide what to do about what they found. An approval holds until the meaning changes, and then you see only the change.",
    ids: "Along the way you will see short IDs: U-1 is a target user, J-1 a job to be done, J-find a journey, T-1 a task, BR-1 a business rule, US-1 a user story and UXD-1 a decision. The agent says what each is the first time; `ux-builder-design explain ids` lists them all.",
  };
}

export function overviewText(o) {
  const L = ["The guided design process: eight steps. You decide at each checkpoint; the agent does the work in between.", ""];
  for (const s of o.steps) {
    L.push(`Step ${s.n} of ${o.steps.length}: ${s.name}`, `  You: ${s.you}`, `  Out of it: ${s.produces}`, `  Terms: ${s.terms.join(", ")}`);
    if (s.checkpoint) L.push(`  Then checkpoint ${s.checkpoint}: you decide whether to go on.`);
    L.push("");
  }
  L.push(o.review, "", o.ids, "", `Change mode, for an everyday change to what exists: ${o.change.map((s) => `${s.n} ${s.name}`).join(", ")}.`);
  return L.join("\n");
}

/* ux-builder-design step next|<n>. `pending` lists the current step's items awaiting review. */
export function setStep(app, { to, pending = () => [] } = {}) {
  const state = readState(app);
  const steps = stepsOf(state.mode);
  const now = progress(state).step;
  let n;
  if (to === "next") {
    const waiting = pending(now);
    if (waiting.length) throw new DesignError(`step ${now} has items awaiting the person's review: ${waiting.join(", ")}. Show each, collect feedback and record the approval (ux-builder-design review approve <item> --answer "<their words>") before moving on.`);
    n = now + 1;
  } else n = Number(to);
  if (!Number.isInteger(n) || n < 1 || n > steps.length) throw new DesignError(`step is next or 1 to ${steps.length}, not "${to ?? ""}"`);
  // Only a passed (or skipped) checkpoint moves the person past the steps it closes (CONTRACT-008: the person decides).
  if (state.mode !== "change") {
    const latest = new Map(state.checkpoints.map((c) => [c.id, c.status]));
    const blocking = ["core-1", "core-2", "core-3"].find((id) => n > Math.max(...CLOSES[id]) && !["passed", "skipped"].includes(latest.get(id)));
    if (blocking) throw new DesignError(`step ${n} is past checkpoint ${blocking}, which ${latest.get(blocking) === "declined" ? "the person answered no or not yet" : "has not been asked"}: ask it (ux-builder-design state checkpoint ${blocking} --answer "<their words>") before going on.`);
  }
  state.step = n;
  if (state.mode !== "change") state.activity = STEPS[n - 1].activity;
  writeState(app, state);
  logEvent(app, "step", { step: n, mode: state.mode });
  return progress(state);
}

const GLOSSARY_FILE = JSON.parse(readFileSync(new URL("./glossary.json", import.meta.url), "utf8"));
export const GLOSSARY = GLOSSARY_FILE.terms;
/* The short IDs the guide shows (U-1, J-1, T-1, BR-1…): what each names and where it lives. */
export const IDS = GLOSSARY_FILE.ids.map((x) => ({ ...x, re: new RegExp(x.pattern) }));
/* What an ID names: { id, kind, where, term? }, or null. */
export function idKind(id) {
  const x = IDS.find((i) => i.re.test(String(id).trim()));
  return x ? { id: String(id).trim(), format: x.id, kind: x.kind, where: x.where, ...(x.term ? { term: x.term } : {}) } : null;
}
const key = (t) => String(t).toLowerCase().trim().replace(/[-_]+/g, " ").replace(/(ies)$/, "y").replace(/(?<!s)s$/, "");

/* ux-builder-design explain [<term>] [--step <n>]: what a term means and why it is valuable. */
export function explain({ term, step } = {}) {
  // An ID (U-1, J-find, BR-2) or "ids": what it names, with its term when the glossary has one.
  if (term && /^ids?$/i.test(term.trim())) return { ids: IDS.map(({ re, pattern, ...x }) => x), terms: [] };
  const named = term ? idKind(term) : null;
  if (named) return { ids: [named], terms: named.term ? GLOSSARY.filter((x) => key(x.term) === key(named.term)) : [] };
  if (term) {
    const t = GLOSSARY.find((x) => key(x.term) === key(term));
    if (!t) throw new DesignError(`"${term}" is not in the glossary; it has ${GLOSSARY.map((x) => x.term).join(", ")}`);
    return { terms: [t] };
  }
  if (step != null) {
    const n = Number(step);
    if (!STEPS.some((s) => s.n === n)) throw new DesignError(`--step is 1 to ${STEPS.length}, not "${step}"`);
    return { step: n, terms: GLOSSARY.filter((x) => x.step === n) };
  }
  return { terms: GLOSSARY };
}
export const explainText = (r) => [
  ...(r.ids ?? []).map((x) => `${x.id}: ${x.kind[0].toUpperCase()}${x.kind.slice(1)}. Where: ${x.where}.`),
  ...r.terms.map((t) => `${t.term}: ${t.means}\n  Why it matters: ${t.why}`),
].join("\n\n");
