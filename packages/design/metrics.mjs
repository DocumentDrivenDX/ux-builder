/* How the guided design spends the person's time (CONTRACT-008 Commands,
   FEAT-018 GDL-83): an event per approval, checkpoint, step, feedback and
   human turn in .ux-builder/metrics.jsonl, kept on the person's machine,
   and a summary against the targets: at most 10 approvals before testing,
   at least 80% of turns new information or decisions, no approval reopened
   by formatting or metadata, a first prototype within 30 active minutes. */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DesignError } from "./app.mjs";

export const METRICS_FILE = ".ux-builder/metrics.jsonl";
export const TURN_KINDS = ["answer", "decision", "approval", "correction", "question", "other"];
export const MILESTONES = ["prototype", "testing", "release"];
/* A turn that brings new information or makes a decision. */
const MEANINGFUL = new Set(["answer", "decision", "approval", "correction"]);
export const TARGETS = { approvalsBeforeTesting: 10, meaningfulShare: 0.8, reopenedByFormat: 0, minutesToPrototype: 30 };
const IDLE = 10 * 60 * 1000;

/* Append one event; never fails the command that records it. */
export function logEvent(app, type, data = {}, at = new Date().toISOString()) {
  // A moment, never a bare date: a date reads as midnight and stretches every span across it (VIP List session 4).
  if (!/T\d\d:\d\d/.test(String(at))) at = new Date().toISOString();
  try {
    const file = join(app, METRICS_FILE);
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify({ type, at, ...data }) + "\n");
  } catch { /* metrics are a convenience */ }
}

export function readEvents(app) {
  const file = join(app, METRICS_FILE);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }).sort((a, b) => a.at.localeCompare(b.at));
}

/* A turn the person took, recorded by the command that takes their words
   (--answer), so a declined `metrics turn` cannot leave the log empty.
   `sameTurn`: these words came in the same message as the last recorded
   ones, so no new turn is counted. Returns the turn's ID. */
export function personTurn(app, { kind, answer, sameTurn = false, at } = {}) {
  const turns = readEvents(app).filter((e) => e.type === "turn");
  const last = turns.at(-1);
  if (sameTurn && last?.turn) return last.turn;
  const turn = `t${turns.length + 1}`;
  logEvent(app, "turn", { kind, turn, implicit: true, ...(answer ? { answer: answer.trim() } : {}) }, at);
  return turn;
}

/* ux-builder-design metrics turn --kind <kind> [--note]. A turn the
   command that took the person's words already recorded (an approval, a
   decision, an answer in the last 5 minutes, with no turn logged after it)
   is not counted twice. */
export function logTurn(app, { kind, note, at } = {}) {
  if (!TURN_KINDS.includes(kind)) throw new DesignError(`--kind is one of ${TURN_KINDS.join(", ")}, not "${kind ?? ""}"`);
  const last = readEvents(app).filter((e) => e.type === "turn").at(-1);
  const now = Date.parse(at ?? new Date().toISOString());
  if (last?.implicit && !last.confirmed && ["answer", "decision", "approval"].includes(kind) && now - Date.parse(last.at) <= 5 * 60 * 1000) {
    logEvent(app, "turn-confirmed", { turn: last.turn, kind }, at);
    return { type: "turn", kind, merged: last.turn };
  }
  logEvent(app, "turn", { kind, ...(note ? { note } : {}) }, at);
  return { type: "turn", kind };
}

/* ux-builder-design metrics mark <milestone>. */
export function mark(app, { name, at } = {}) {
  if (!MILESTONES.includes(name)) throw new DesignError(`metrics mark takes ${MILESTONES.join(", ")}, not "${name ?? ""}"`);
  logEvent(app, "milestone", { name }, at);
  return { type: "milestone", name };
}

/* Active minutes from a to b: gaps over 10 minutes are idle. */
function active(events, from, to) {
  let ms = 0;
  const ts = events.map((e) => Date.parse(e.at)).filter((t) => t >= from && t <= to).sort((x, y) => x - y);
  for (let k = 1; k < ts.length; k++) ms += Math.min(ts[k] - ts[k - 1], IDLE);
  return Math.round(ms / 60000);
}

/* The estimate given for a step, and how long the step has taken since:
   { estimate, minutes, over } or null. The first status of a step records
   its estimate (estimate events), so estimate and actual can be compared. */
export function estimateFor(app, step, minutes) {
  const ev = readEvents(app);
  let given = ev.find((e) => e.type === "estimate" && e.step === step);
  if (!given && minutes != null) { logEvent(app, "estimate", { step, minutes }); return { estimate: minutes, minutes: 0, over: false }; }
  if (!given) return null;
  const since = active(ev, Date.parse(given.at), Date.now());
  return { estimate: given.minutes, minutes: since, over: since > given.minutes };
}

/* ux-builder-design metrics: the summary. `carried` is the approvals that
   held through a formatting or metadata change (review.carried). */
export function metrics(app, { carried = [] } = {}) {
  const all = readEvents(app);
  const confirmed = new Set(all.filter((e) => e.type === "turn-confirmed").map((e) => e.turn));
  const ev = all.map((e) => (e.type === "turn" && confirmed.has(e.turn) ? { ...e, confirmed: true } : e));
  // Time is measured from events with a time of day: an older log's bare date reads as midnight and would
  // start the session hours early (VIP List session 4: "first prototype: 13 active minutes" for 3).
  const first = ev.find((e) => /T\d\d:\d\d/.test(String(e.at)));
  const start = first ? Date.parse(first.at) : null;
  const turns = ev.filter((e) => e.type === "turn");
  const byKind = Object.fromEntries(TURN_KINDS.map((k) => [k, turns.filter((t) => t.kind === k).length]));
  const meaningful = turns.filter((t) => MEANINGFUL.has(t.kind)).length;
  // Testing starts at the testing milestone, or when the loop reaches step 7 and stays there (US-161-AC4):
  // a step-7 event the loop leaves for an earlier step is a correction, not testing.
  let stayed = null;
  for (const e of ev.filter((x) => x.type === "step")) stayed = e.step >= 7 ? stayed ?? e.at : null;
  const testingAt = ev.find((e) => e.type === "milestone" && e.name === "testing")?.at ?? stayed;
  const approvals = ev.filter((e) => e.type === "approval");
  // The person's approvals: one per turn of theirs that approved anything (several items or
  // kinds in one message are one approval; the same words in two messages are two). Approvals
  // logged before turns were recorded fall back to their distinct answers.
  const answers = (xs) => new Set(xs.map((a, k) => a.turn ?? a.answer ?? `#${k}`)).size;
  const before = answers(approvals.filter((a) => !testingAt || a.at < testingAt));
  const reopened = approvals.flatMap((a) => a.reopened ?? []);
  const formatOnly = approvals.flatMap((a) => a.formatOnly ?? []);
  const proto = ev.find((e) => e.type === "milestone" && e.name === "prototype");
  const decisions = ev.filter((e) => e.type === "approval" || e.type === "checkpoint" || (e.type === "turn" && e.kind === "decision")).map((e) => Date.parse(e.at));
  const gaps = decisions.slice(1).map((t, k) => active(ev, decisions[k], t)).sort((a, b) => a - b);
  // One entry per step: consecutive events for the same step (a checkpoint and the decision both log one)
  // are one; the time before the first step event is the session's first step (step 1 had none).
  const steps = ev.filter((e) => e.type === "step").filter((e, k, xs) => !k || xs[k - 1].step !== e.step);
  if (steps.length && start != null && Date.parse(steps[0].at) > start) steps.unshift({ step: Math.max(1, steps[0].step - 1), at: ev[0].at });
  const byStep = steps.map((s, k) => ({ step: s.step, minutes: active(ev, Date.parse(s.at), steps[k + 1] ? Date.parse(steps[k + 1].at) : Date.parse(ev.at(-1).at)) }));
  const r = {
    events: ev.length,
    activeMinutes: start == null ? 0 : active(ev, start, Date.parse(ev.at(-1).at)),
    turns: turns.length, byKind, meaningfulShare: turns.length ? Math.round((meaningful / turns.length) * 100) / 100 : null,
    approvals: approvals.length, personApprovals: answers(approvals), approvalsBeforeTesting: before,
    reopenedByFormat: { count: formatOnly.length, items: [...new Set(formatOnly)] },
    reopened: { count: reopened.length, items: [...new Set(reopened)] },
    carried: { count: carried.length, items: carried },
    feedback: ev.filter((e) => e.type === "feedback").length,
    checkpoints: ev.filter((e) => e.type === "checkpoint").map((e) => ({ id: e.id, status: e.status, at: e.at })),
    minutesToPrototype: proto && start != null ? active(ev, start, Date.parse(proto.at)) : null,
    minutesBetweenDecisions: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
    byStep,
  };
  r.targets = [
    { target: `at most ${TARGETS.approvalsBeforeTesting} approvals before testing`, value: before, met: before <= TARGETS.approvalsBeforeTesting },
    { target: `at least ${TARGETS.meaningfulShare * 100}% of turns new information or decisions`, value: r.meaningfulShare, percent: true, met: r.meaningfulShare == null ? null : r.meaningfulShare >= TARGETS.meaningfulShare },
    { target: "no approval reopened by formatting or metadata", value: formatOnly.length, met: formatOnly.length === 0, note: `${carried.length} held through such a change` },
    { target: `a first prototype within ${TARGETS.minutesToPrototype} active minutes`, value: r.minutesToPrototype, met: r.minutesToPrototype == null ? null : r.minutesToPrototype <= TARGETS.minutesToPrototype },
  ];
  return r;
}

export function metricsText(r) {
  const yes = (m) => (m == null ? "not yet" : m ? "met" : "missed");
  return [
    `${r.activeMinutes} active minutes, ${r.events} events.`,
    `Turns: ${r.turns} (${Object.entries(r.byKind).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ") || "none logged"}); ${r.meaningfulShare == null ? "no turns logged" : `${Math.round(r.meaningfulShare * 100)}% new information or decisions`}.`,
    `Approvals: ${r.personApprovals} given by the person (${r.approvalsBeforeTesting} before testing), recorded as ${r.approvals} approval${r.approvals === 1 ? "" : "s"}; reopened ${r.reopened.count}${r.reopened.items.length ? ` (${r.reopened.items.join(", ")})` : ""}, ${r.reopenedByFormat.count} by formatting alone; ${r.carried.count} held through a formatting or metadata change.`,
    `First prototype: ${r.minutesToPrototype == null ? "not yet" : `${r.minutesToPrototype} active minutes, to when it was marked as first tried`}; between decisions: ${r.minutesBetweenDecisions == null ? "–" : `${r.minutesBetweenDecisions} minutes (median)`}.`,
    "Targets:", ...r.targets.map((t) => `  ${yes(t.met)}: ${t.target}${t.value != null ? ` (${t.percent ? `${Math.round(t.value * 100)}%` : t.value})` : ""}`),
  ].join("\n");
}
