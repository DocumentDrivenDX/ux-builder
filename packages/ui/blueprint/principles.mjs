/* Project rules from an app's experience principles (FEAT-018 GDL-16;
   CONTRACT-008 Project principles; SD-006 Project rules): the principles a
   check can express, from .ux-builder/principles.json, checked against the
   blueprint. Each finding names its principle. Deterministic. */

/* The kinds a principle's rule may take, and what each checks. */
export const PRINCIPLE_KINDS = ["no-step-before", "max-required-inputs", "max-steps", "no-modal-in"];

const journeysOf = (bp) => (Array.isArray(bp?.journeys) ? bp.journeys.filter((j) => j?.id) : []);
const screenOf = (bp, id) => (bp?.screens ?? []).find((s) => s?.id === id);

/* A principle's key: its own, else its words as a slug (ADR-042: principles go by their words, not an ID). */
const keyOf = (p) => p.key ?? p.id ?? String(p.text ?? "principle").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/* Findings for each principle with a rule: [{ rule: "project.<key>", … }]. */
export function principleFindings(bp, principles = []) {
  const findings = [];
  const add = (p, path, message, fix) => findings.push({ rule: `project.${keyOf(p)}`, severity: "warning", path, message: `${message} (principle "${p.text}")`, fix });
  for (const p of principles) {
    const r = p?.rule;
    if (!r?.kind) continue;
    if (!PRINCIPLE_KINDS.includes(r.kind)) { add(p, "/", `Unknown principle rule "${r.kind}"`, `Use one of ${PRINCIPLE_KINDS.join(", ")}.`); continue; }
    journeysOf(bp).forEach((j, i) => {
      const steps = Array.isArray(j.steps) ? j.steps.filter((s) => s?.screen) : [];
      const path = `/journeys/${i}`;
      if (r.kind === "no-step-before") {
        const first = steps[0] ?? (j.entry ? { screen: j.entry } : null);
        const s = first && screenOf(bp, first.screen);
        if (first && ((r.screens ?? []).includes(first.screen) || (s && (r.patterns ?? []).includes(s.pattern)))) {
          add(p, path, `Journey ${j.id} starts on ${first.screen}${s?.pattern ? ` (${s.pattern})` : ""}, before the user reaches their goal`, `Move ${first.screen} later in ${j.id}, or make it optional.`);
        }
      }
      if (r.kind === "max-steps" && Number.isInteger(r.max) && steps.length > r.max) {
        add(p, path, `Journey ${j.id} has ${steps.length} steps, more than ${r.max}`, "Remove or combine steps.");
      }
      if (r.kind === "max-required-inputs" && Number.isInteger(r.max)) {
        const n = steps.reduce((t, s) => t + (s.inputs?.required?.length ?? 0), 0);
        if (n > r.max) add(p, path, `Journey ${j.id} asks for ${n} required inputs, more than ${r.max}`, "Infer, default or defer some inputs.");
      }
      if (r.kind === "no-modal-in" && (!r.journeys || r.journeys.includes(j.id))) {
        const modal = steps.find((s) => {
          const action = (screenOf(bp, s.screen)?.actions ?? []).find((a) => a?.id === s.action);
          return typeof action?.to === "string" && action.to.startsWith("modal:");
        });
        if (modal) add(p, path, `Journey ${j.id} opens a modal at ${modal.screen}:${modal.action}`, "Show it in place instead of a modal.");
      }
    });
  }
  return findings;
}
