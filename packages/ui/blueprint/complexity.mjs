/* The complexity a blueprint change adds (FEAT-018 GDL-12, CONTRACT-005 as
   amended by CONTRACT-008): per journey, the screens, steps, required
   inputs and decisions added and removed between a base blueprint and this
   one, and a simplicity.delta-decided warning for a journey that grows with
   no recorded decision naming what it gained. Deterministic. */

const sorted = (xs) => [...new Set(xs)].sort();

/* A step's name, stable across edits: its screen and the action taken or
   the state reached. */
export const stepKey = (s) => `${s.screen}${s.action ? `:${s.action}` : s.state ? `@${s.state}` : ""}`;

/* What each journey asks of its user: its screens, steps, required inputs
   and decisions, over its main steps and its alternates. */
export function journeyLoad(bp) {
  const out = new Map();
  for (const j of Array.isArray(bp?.journeys) ? bp.journeys : []) {
    if (!j?.id) continue;
    const steps = [...(j.steps ?? []), ...(j.alternates ?? []).flatMap((a) => a?.steps ?? [])].filter((s) => s?.screen);
    out.set(j.id, {
      screens: sorted(steps.map((s) => s.screen)),
      steps: sorted(steps.map(stepKey)),
      inputs: sorted(steps.flatMap((s) => s.inputs?.required ?? [])),
      decisions: sorted(steps.map((s) => s.decision).filter(Boolean)),
    });
  }
  return out;
}

const KINDS = ["screens", "steps", "inputs", "decisions"];
const minus = (a, b) => a.filter((x) => !b.includes(x));

/* Per journey and for the app's screens: { added, removed } of each kind.
   Journeys are listed in id order; unchanged ones are left out. */
export function complexityDelta(base, next) {
  const a = journeyLoad(base), b = journeyLoad(next);
  const journeys = [];
  for (const id of sorted([...a.keys(), ...b.keys()])) {
    const before = a.get(id) ?? { screens: [], steps: [], inputs: [], decisions: [] };
    const after = b.get(id) ?? { screens: [], steps: [], inputs: [], decisions: [] };
    const added = Object.fromEntries(KINDS.map((k) => [k, minus(after[k], before[k])]));
    const removed = Object.fromEntries(KINDS.map((k) => [k, minus(before[k], after[k])]));
    if (KINDS.some((k) => added[k].length || removed[k].length)) {
      journeys.push({ journey: id, status: !a.has(id) ? "new" : !b.has(id) ? "removed" : "changed", added, removed, grew: KINDS.some((k) => added[k].length) });
    }
  }
  const ids = (bp) => sorted((bp?.screens ?? []).map((s) => s?.id).filter(Boolean));
  return { screens: { added: minus(ids(next), ids(base)), removed: minus(ids(base), ids(next)) }, journeys };
}

/* Does a recorded decision name this addition? By its screen, or by the
   step, input or decision text appearing in what it chose or its goal. */
function named(item, decisions) {
  const screen = item.split(/[:@]/)[0];
  return decisions.some((d) => d?.screen === screen || [d?.chose, d?.goal, ...(d?.relied ?? [])].some((t) => typeof t === "string" && t.includes(item)));
}

/* simplicity.delta-decided: a journey that grows needs a decision naming
   each screen, step, required input and decision it gained (the five
   answers, GDL-11). decisions: the trace's decision events. */
export function deltaFindings(delta, decisions = []) {
  const findings = [];
  delta.journeys.forEach((j) => {
    if (!j.grew) return;
    const unnamed = KINDS.flatMap((k) => j.added[k].map((x) => ({ kind: k, item: x }))).filter(({ item }) => !named(item, decisions));
    if (!unnamed.length) return;
    findings.push({
      rule: "simplicity.delta-decided",
      severity: "warning",
      path: `/journeys/${j.journey}`,
      message: `Journey ${j.journey} grows with no recorded decision naming ${unnamed.map((u) => `${u.kind.replace(/s$/, "")} "${u.item}"`).join(", ")}.`,
      fix: "Challenge the addition first; if it stays, record why with its five answers: npx ux-builder-trace decide --kind addition --screen <id> --chose <what> --why <why> --goal … --without … --simplest … --assumptions … --validation …",
    });
  });
  return findings;
}
