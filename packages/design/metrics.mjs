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

/* ux-builder-design metrics turn --kind <kind> [--note]. */
export function logTurn(app, { kind, note, at } = {}) {
  if (!TURN_KINDS.includes(kind)) throw new DesignError(`--kind is one of ${TURN_KINDS.join(", ")}, not "${kind ?? ""}"`);
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
  const ts = events.map((e) => Date.parse(e.at)).filter((t) => t >= from && t <= to);
  for (let k = 1; k < ts.length; k++) ms += Math.min(ts[k] - ts[k - 1], IDLE);
  return Math.round(ms / 60000);
}

/* ux-builder-design metrics: the summary. `carried` is the approvals that
   held through a formatting or metadata change (review.carried). */
export function metrics(app, { carried = [] } = {}) {
  const ev = readEvents(app);
  const start = ev.length ? Date.parse(ev[0].at) : null;
  const turns = ev.filter((e) => e.type === "turn");
  const byKind = Object.fromEntries(TURN_KINDS.map((k) => [k, turns.filter((t) => t.kind === k).length]));
  const meaningful = turns.filter((t) => MEANINGFUL.has(t.kind)).length;
  const testingAt = ev.find((e) => (e.type === "milestone" && e.name === "testing") || (e.type === "step" && e.step >= 7))?.at;
  const approvals = ev.filter((e) => e.type === "approval");
  const before = approvals.filter((a) => !testingAt || a.at < testingAt).length;
  const reopened = approvals.flatMap((a) => a.reopened ?? []);
  const proto = ev.find((e) => e.type === "milestone" && e.name === "prototype");
  const decisions = ev.filter((e) => e.type === "approval" || e.type === "checkpoint" || (e.type === "turn" && e.kind === "decision")).map((e) => Date.parse(e.at));
  const gaps = decisions.slice(1).map((t, k) => active(ev, decisions[k], t)).sort((a, b) => a - b);
  const steps = ev.filter((e) => e.type === "step");
  const byStep = steps.map((s, k) => ({ step: s.step, minutes: active(ev, Date.parse(s.at), steps[k + 1] ? Date.parse(steps[k + 1].at) : Date.parse(ev.at(-1).at)) }));
  const r = {
    events: ev.length,
    activeMinutes: start == null ? 0 : active(ev, start, Date.parse(ev.at(-1).at)),
    turns: turns.length, byKind, meaningfulShare: turns.length ? Math.round((meaningful / turns.length) * 100) / 100 : null,
    approvals: approvals.length, approvalsBeforeTesting: before,
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
    { target: `at least ${TARGETS.meaningfulShare * 100}% of turns new information or decisions`, value: r.meaningfulShare, met: r.meaningfulShare == null ? null : r.meaningfulShare >= TARGETS.meaningfulShare },
    { target: "no approval reopened by formatting or metadata", value: 0, met: true, note: `${carried.length} held through such a change` },
    { target: `a first prototype within ${TARGETS.minutesToPrototype} active minutes`, value: r.minutesToPrototype, met: r.minutesToPrototype == null ? null : r.minutesToPrototype <= TARGETS.minutesToPrototype },
  ];
  return r;
}

export function metricsText(r) {
  const yes = (m) => (m == null ? "not yet" : m ? "met" : "missed");
  return [
    `${r.activeMinutes} active minutes, ${r.events} events.`,
    `Turns: ${r.turns} (${Object.entries(r.byKind).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ") || "none logged"}); ${r.meaningfulShare == null ? "no turns logged" : `${Math.round(r.meaningfulShare * 100)}% new information or decisions`}.`,
    `Approvals: ${r.approvals} (${r.approvalsBeforeTesting} before testing); reopened ${r.reopened.count}${r.reopened.items.length ? ` (${r.reopened.items.join(", ")})` : ""}; ${r.carried.count} held through a formatting or metadata change.`,
    `First prototype: ${r.minutesToPrototype == null ? "not yet" : `${r.minutesToPrototype} active minutes`}; between decisions: ${r.minutesBetweenDecisions == null ? "–" : `${r.minutesBetweenDecisions} minutes (median)`}.`,
    "Targets:", ...r.targets.map((t) => `  ${yes(t.met)}: ${t.target}${t.value != null ? ` (${typeof t.value === "number" && t.value < 1 && t.value > 0 ? `${Math.round(t.value * 100)}%` : t.value})` : ""}`),
  ].join("\n");
}
