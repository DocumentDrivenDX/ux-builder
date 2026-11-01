/* Finish for me (FEAT-018 GDL-85; US-171; ADR-043 rule 5): when the
   person stops being guided, the agent drafts what the remaining steps
   would produce, and this writes every downstream artifact from it: the
   brief, wireframes, a step prototype with its check, a test kit and the
   HELIX documents, applied directly and marked assumed on this path
   alone. A summary says what the person confirmed, what was assumed, what
   to check first and what was not done. Checkpoints it passes are
   skipped, never passed. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkBlueprint } from "@ux-builder/ui/blueprint";
import { propose, writeProposals } from "@ux-builder/ui/blueprint/propose";
import { bpFile, DesignError, layout, ux, writeInApp } from "./app.mjs";
import { brief } from "./brief.mjs";
import { checkpoint } from "./checkpoints.mjs";
import { logEvent, personTurn } from "./metrics.mjs";
import { progress, STEPS } from "./process.mjs";
import { proposalsApply, proposalsPreview } from "./proposals.mjs";
import { coverageMap, pendingReviews } from "./review.mjs";
import { readState, writeState } from "./state.mjs";
import { stepCheck, stepPrototype, withDefaults } from "./stepproto.mjs";
import { testKit } from "./testkit.mjs";

const list = (x) => (Array.isArray(x) ? x : []);
export const FINISH_REASON = "finished by the agent at the person's request";
const NOTE = "> Generated or changed by the agent when the person asked it to finish the design (ux-builder-design finish): what it added is assumed, not confirmed by the person.";

/* Mark a HELIX document assumed: `ux-builder: { assumed: true }` in its
   frontmatter and a note under its title. Returns whether it changed. */
export function markAssumed(text) {
  if (/^ux-builder:\s*\n\s+assumed: true/m.test(text)) return null;
  let out = text;
  if (out.startsWith("---\n")) out = out.replace(/^---\n([\s\S]*?)\n---\n/, (_, fm) => `---\n${fm}\nux-builder:\n  assumed: true\n---\n`);
  else out = `---\nux-builder:\n  assumed: true\n---\n\n${out}`;
  out = /^# .*$/m.test(out) ? out.replace(/^(# .*)$/m, `$1\n\n${NOTE}`) : `${out.trimEnd()}\n\n${NOTE}\n`;
  return out;
}

async function drawWireframes(bp, dir) {
  const { wireframes, writeWireframes } = await import("@ux-builder/ui/blueprint/wireframes");
  return writeWireframes(await wireframes(bp), dir);
}

/* ux-builder-design finish --answer <their words>. */
export async function finish(app, { answer, audit, write, wireframes = drawWireframes, now = new Date().toISOString() } = {}) {
  if (!answer?.trim()) throw new DesignError("finish needs --answer: the person's request to finish, in their words");
  const state0 = readState(app);
  const n = progress(state0).step;
  let bp;
  try { bp = JSON.parse(readFileSync(join(app, bpFile(app)), "utf8")); } catch (e) { throw new DesignError(`${bpFile(app)}: ${e.message}`); }
  // The agent drafts first: a blueprint with errors, or a job nothing serves, is not finished.
  const problems = [
    ...checkBlueprint(bp).filter((f) => f.severity === "error" && !(f.rule === "blueprint.valid" && /needs "supports"|\/supports needs/.test(f.message))).map((f) => `${f.rule} ${f.path || "/"}: ${f.message}`),
    ...coverageMap(app).exceptions.filter((e) => e.id.startsWith("gap:")).map((e) => e.text),
  ];
  if (problems.length) throw new DesignError(`the design is not drafted far enough to finish: draft the rest first, then run finish again. Nothing was written.\n${problems.map((p) => `  - ${p}`).join("\n")}`, problems.map((p) => ({ path: "finish", message: p })));

  personTurn(app, { kind: "decision", answer, at: now });
  const written = [], notDone = [];
  const attempt = (what, f) => { try { return f(); } catch (e) { notDone.push(`${what}: ${e.message.split("\n")[0]}`); return null; } };

  const b = attempt("the experience brief", () => brief(app));
  if (b) written.push(...b.written);
  const sp = await stepPrototype(app, { ...(write ? { write } : {}), now }).catch((e) => { notDone.push(`the step prototype: ${e.message.split("\n")[0]}`); return null; });
  if (sp) {
    written.push(`${sp.dir}/index.html`);
    const c = await stepCheck(app, { ...(audit ? { audit } : {}), now }).catch((e) => { notDone.push(`its check: ${e.message.split("\n")[0]}`); return null; });
    if (c) written.push(`${sp.dir}/check-${c.round}.json`);
  }
  // Wireframes from the blueprint as the prototype drew it (its defaults filled in).
  const { bp: drawn } = withDefaults(app, bp, structuredClone(readState(app)));
  const wDir = layout(app).wireframes;
  await Promise.resolve().then(() => wireframes(drawn, join(app, wDir))).then(() => written.push(`${wDir}/`), (e) => notDone.push(`the wireframes: ${e.message.split("\n")[0]}`));
  // The test kit is a usability study's (ADR-042): its plan proposed into HELIX, its materials run output.
  const kit = attempt("the test kit", () => testKit(app, { study: "usability" }));
  if (kit) written.push(kit.run ?? kit.path ?? "the test kit");

  // HELIX: propose from the blueprint, then apply every pending proposal, each document marked assumed.
  const applied = [];
  const r = attempt("the HELIX proposals", () => propose(bp, { blueprintFile: resolve(app, bpFile(app)) }));
  if (r && !r.marker) notDone.push("HELIX documents: no HELIX marker (.helix.yml) in this app, so nothing was proposed");
  else if (r) {
    writeProposals(r, join(app, layout(app).proposals));
    const ids = proposalsPreview(app).proposals.map((p) => p.id);
    const done = ids.length ? attempt("applying the HELIX proposals", () => proposalsApply(app, { accepted: ids })) : null;
    for (const a of list(done?.applied)) {
      const abs = join(app, a.target);
      if (!existsSync(abs)) continue;
      const marked = markAssumed(readFileSync(abs, "utf8"));
      if (marked) writeFileSync(abs, marked);
      applied.push(a.target);
    }
  }

  // The checkpoints not yet answered are skipped, never passed.
  const skipped = [];
  for (const id of ["core-1", "core-2", "core-3"]) {
    if (readState(app).checkpoints.some((c) => c.id === id && ["passed", "skipped"].includes(c.status))) continue;
    checkpoint(app, { id, skip: true, reason: FINISH_REASON, sameTurn: true, now });
    skipped.push(id);
  }

  const state = readState(app);
  const summaryPath = ux(app, "finish-summary.md");
  writeInApp(app, summaryPath, summaryText({ state, step: n, answer, applied, skipped, written, notDone, pending: pendingReviews(app), bp }));
  state.finished = { at: now, step: n, answer: answer.trim(), summary: summaryPath };
  writeState(app, state);
  logEvent(app, "finished", { step: n }, now);
  return { step: n, answer: answer.trim(), written, applied, skipped, notDone, summary: summaryPath,
    assumed: state.assumptions.filter((a) => ["assumed", "hypothesis"].includes(a.status)).length,
    next: `Show the person the prototype${sp ? ` (${sp.dir}/index.html)` : ""} and the summary (${summaryPath}), starting with what to check first.` };
}

function summaryText({ state, step, answer, applied, skipped, written, notDone, pending, bp }) {
  const approved = list(state.reviews).filter((r) => r.item !== "map");
  const passed = state.checkpoints.filter((c) => c.status === "passed");
  const assumed = state.assumptions.filter((a) => ["assumed", "hypothesis"].includes(a.status));
  const rules = list(bp.businessRules);
  const L = ["---", "ux:", "  id: finish-summary", "  type: finish-summary", "---", "", "# What the agent finished", "",
    `At step ${step} of ${STEPS.length} (${STEPS[step - 1]?.name ?? ""}) the person asked the agent to finish: "${answer.trim()}". Everything after that was drafted by the agent and is assumed until the person or the people who use it confirm it.`, "",
    "## What the person confirmed", "",
    ...(approved.length ? approved.map((r) => `- ${r.item}: "${r.answer}"`) : ["- No item was approved."]),
    ...passed.map((c) => `- Checkpoint ${c.id}: "${c.answer}"`), "",
    "## What was assumed", "",
    ...(assumed.length ? assumed.map((a) => `- ${a.id} (${a.status}): ${a.text}`) : ["- No recorded assumptions."]),
    ...(pending.length ? [`- Not reviewed by the person: ${pending.map((p) => p.id).join(", ")}`] : []),
    ...(applied.length ? [`- HELIX documents written or changed, marked assumed: ${applied.join(", ")}`] : []),
    ...(skipped.length ? [`- Checkpoints skipped (${FINISH_REASON}): ${skipped.join(", ")}`] : []), "",
    "## What to check first", "",
    ...(rules.length ? rules.map((r) => `- Business rule ${r.id}: what triggers it (${r.trigger ?? "not given"}) and how people recover (${r.recover ?? "not given"})`) : []),
    ...assumed.filter((a) => a.section === "users" || a.section === "outcome" || a.dimension).map((a) => `- ${a.id}: ${a.text}`),
    ...(!rules.length && !assumed.some((a) => a.section === "users" || a.section === "outcome" || a.dimension) ? ["- The step prototype, screen by screen, against what the person expects."] : []), "",
    "## What was not done", "",
    "- Testing with people: no one has used the design yet. The test kit is ready for it.",
    ...notDone.map((x) => `- ${x}`), "",
    "## Written", "", ...written.map((w) => `- ${w}`), ""];
  return L.join("\n");
}

export function finishText(r) {
  return [`Finished at step ${r.step}: ${r.written.length} artifact${r.written.length === 1 ? "" : "s"} written, ${r.applied.length} HELIX document${r.applied.length === 1 ? "" : "s"} applied and marked assumed, ${r.assumed} assumption${r.assumed === 1 ? "" : "s"} listed.`,
    ...(r.skipped.length ? [`Checkpoints skipped: ${r.skipped.join(", ")}.`] : []),
    ...(r.notDone.length ? ["Not done:", ...r.notDone.map((x) => `  ${x}`)] : []),
    `Summary: ${r.summary}.`, r.next].join("\n");
}
