/* AI journeys in the assessment (FEAT-011 AIX-01 to AIX-03; ADR-028
   decision 8; US-082; CONTRACT-006 `journeys[].ai`, `journeys[].scenarios`;
   CONTRACT-005 "AI markup").

   An AI journey is walked in three scenarios: normal, error-prone and
   risky. Its rubric's AI heuristics are the catalogue's AI rules for the
   journey's roles (`when.aiRole`), `review` checks included (AIR-02), read
   from the app's installed @ux-builder/ui catalogue. The risky scenario
   ends at the approval (`data-piq-ai="approval"`): it is recorded, Deny is
   chosen (`data-piq-ai-control="deny"`), and nothing more is taken. An
   approve control (`data-piq-ai-control="approve"`) is never activated,
   in any scenario: like a denied action (FEAT-009 ENV-01), no manifest can
   allow it. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const own = createRequire(import.meta.url);
export const SCENARIOS = ["normal", "errorProne", "risky"];
export const AI_ROLES = ["generative", "assistant", "agent"];
export const NEVER_APPROVE = "the assessment never approves (ADR-028 decision 8, FEAT-009 ENV-01)";

/* The interaction rules of the app's installed @ux-builder/ui, else this package's. */
export function catalogueRules(cwd = process.cwd()) {
  for (const r of [createRequire(join(cwd, "package.json")), own]) {
    try {
      const c = JSON.parse(readFileSync(r.resolve("@ux-builder/ui/catalogue.json"), "utf8"));
      if (c.interaction?.rules?.length) return { rules: c.interaction.rules, version: c.packages?.["@ux-builder/ui"] ?? c.interaction.version ?? null };
    } catch { /* next */ }
  }
  return { rules: [], version: null };
}

/* The AI heuristics for a set of roles: every rule whose when.aiRole names one of them. */
export function aiHeuristics(rules, roles) {
  return rules.filter((r) => r.when?.aiRole?.some((x) => roles.includes(x))).map((r) => ({
    rule: r.id, title: r.title, statement: r.statement, roles: r.when.aiRole.filter((x) => roles.includes(x)),
    review: r.checks.some((c) => c.kind === "review"), checks: r.checks.map((c) => `${c.kind}:${c.id}`),
  }));
}

/* The screens a blueprint journey passes through: its entry, its steps' and its alternates'. */
export function screensOf(bj) {
  const at = (s) => String(s.screen ?? "").replace(/^modal:.*/, "");
  return [...new Set([bj.entry, ...(bj.steps ?? []).map(at), ...(bj.alternates ?? []).flatMap((a) => (a.steps ?? []).map(at))].filter(Boolean))];
}

/* The journey's AI roles: its blueprint screens' ai.roles when it has them, else every AI role. */
export function rolesOf(bj, blueprint) {
  if (bj && blueprint) {
    const on = new Set(screensOf(bj));
    const roles = [...new Set((blueprint.screens ?? []).filter((s) => on.has(s.id)).flatMap((s) => s.ai?.roles ?? []))];
    if (roles.length) return { roles: AI_ROLES.filter((r) => roles.includes(r)), source: "blueprint" };
  }
  return { roles: [...AI_ROLES], source: "all" };
}

/* The high-impact step a risky scenario stops at: the manifest's
   `scenarios.risky.step`, else the first blueprint step marked risky (1-based). */
export function riskyStep(j) {
  const s = j.scenarios?.risky?.step;
  if (s != null) return s;
  const i = (j.steps ?? []).findIndex((x) => x.scenario === "risky");
  return i >= 0 ? i + 1 : null;
}

/* What each scenario's walkthrough is, for plan.json (AIX-02). */
export function walkthroughs(j) {
  const sc = j.scenarios ?? {};
  return SCENARIOS.map((scenario) => {
    const s = sc[scenario] ?? {};
    const base = { scenario, description: s.description ?? null, ...(s.inputs !== undefined ? { inputs: s.inputs } : {}) };
    if (scenario === "normal") return { ...base, state: "ai", records: "the task as intended" };
    if (scenario === "errorProne") return { ...base, state: "recoverable-error", records: "whether the error is shown in place, and whether the user can recover without restarting", rules: ["agent.recover", "ai.improve-request"] };
    return { ...base, state: "ai", step: riskyStep(j), stop: `at the approval (data-piq-ai="approval"): record it, choose Deny (data-piq-ai-control="deny") and stop; with no approval before step ${riskyStep(j) ?? "?"}, stop before it and record agent.approve-high-impact (P1)`, never: "approve", rules: ["agent.approve-high-impact"] };
  });
}

// An approve control, named in a step's selector.
export const APPROVE_SELECTOR = /data-piq-ai-control\s*[~|^$*]?=\s*["']?approve\b/i;

/* In the page: the visible approval, or null (CONTRACT-005 AI markup). */
export function approvalProbe() {
  const shown = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const a = [...document.querySelectorAll('[data-piq-ai="approval"]')].find(shown);
  if (!a) return null;
  const controls = [...a.querySelectorAll("[data-piq-ai-control]")].map((c) => ({ control: c.getAttribute("data-piq-ai-control"), name: (c.getAttribute("aria-label") || c.textContent || "").trim().slice(0, 80) }));
  const focused = document.activeElement?.closest?.("[data-piq-ai-control]")?.getAttribute("data-piq-ai-control") ?? null;
  return { text: (a.innerText || "").trim().slice(0, 500), controls, approve: controls.some((c) => c.control === "approve"), deny: controls.some((c) => c.control === "deny"), focused: a.contains(document.activeElement) ? focused : null };
}

/* In the page: what an error-prone state shows (US-082-AC5). The error is
   shown in place when a visible failure (a step `data-piq-ai-status="failed"`,
   or an alert or failure text in the AI status region or AI content) is
   inside the AI's own region; recovery without restarting is a visible,
   enabled correction control there (retry, edit, regenerate, undo); a
   better request is possible when the request can be edited (an edit
   control, or the request still in its field). */
export function errorProbe() {
  const shown = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const region = (e) => e.closest('[data-piq-ai], [data-piq-ai-label], [data-piq-ai-actor]');
  const FAIL = /\b(error|failed|fail|couldn['’]t|could not|can['’]t|cannot|unable|blocked|went wrong|not allowed)\b/i;
  const failed = [...document.querySelectorAll('[data-piq-ai-status="failed"]')].filter(shown);
  const alerts = [...document.querySelectorAll('[role="alert"], [data-piq-ai="status"], [aria-invalid="true"]')].filter((e) => shown(e) && FAIL.test(e.innerText || e.getAttribute("aria-label") || ""));
  const inPlace = [...failed, ...alerts.filter(region)];
  const elsewhere = alerts.filter((e) => !region(e));
  const scope = inPlace.length ? [...new Set(inPlace.map((e) => region(e) ?? e))] : [...document.querySelectorAll("[data-piq-ai]")];
  const controls = [...new Set(scope.flatMap((r) => [...(r.parentElement ?? r).querySelectorAll('[data-piq-ai-control="retry"], [data-piq-ai-control="edit"], [data-piq-ai-control="regenerate"], [data-piq-ai-control="undo"]')]))]
    .filter((c) => shown(c) && !c.disabled && c.getAttribute("aria-disabled") !== "true").map((c) => c.getAttribute("data-piq-ai-control"));
  const kept = [...document.querySelectorAll("textarea, input[type=text], input:not([type])")].some((i) => shown(i) && i.value.trim());
  const describe = (e) => (e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 200);
  return {
    errorShown: inPlace.length + elsewhere.length > 0,
    errorShownInPlace: inPlace.length > 0,
    error: inPlace[0] ? describe(inPlace[0]) : elsewhere[0] ? describe(elsewhere[0]) : null,
    recoveryWithoutRestart: controls.length > 0,
    controls: [...new Set(controls)],
    requestEditable: controls.includes("edit") || kept,
  };
}

/* In the page: whether activating `selector` (a click) or the focused
   element (a key press) would activate an approve control. */
export function wouldApprove({ selector, key }) {
  const approve = (e) => !!e?.closest?.('[data-piq-ai-control="approve"]');
  if (selector) { try { return [...document.querySelectorAll(selector)].slice(0, 1).some(approve); } catch { return false; } }
  return /^(Enter|Space| )$/.test(key ?? "") && approve(document.activeElement);
}

/* The inspection findings of an error-prone checkpoint (agent.recover, ai.improve-request). */
export function errorFindings(probe) {
  const out = [];
  const f = (rule, message) => out.push({ rule, severity: "warning", finding_type: "observed", scenario: "errorProne", message });
  if (!probe.errorShownInPlace) f("agent.recover", probe.errorShown ? `the error is shown away from the step that failed (${probe.error}); it is not described in place` : "no error is shown where the agent erred or was blocked");
  if (!probe.recoveryWithoutRestart) f("agent.recover", "there is no way to retry, edit or undo the failed step without starting over");
  if (!probe.requestEditable) f("ai.improve-request", "the request cannot be refined: no edit control, and the request is not kept in its field");
  return out;
}
