/* Diagnosis and experiments (CONTRACT-008 Commands, FEAT-018 GDL-66 to
   GDL-69): from an insight, the observation, at least two explanations, a
   hypothesis and the blueprint alternative that tests it; then an
   experiment, started only after the person answers the `experiment`
   checkpoint, and ended with its result compared against the hypothesis
   before the `release` checkpoint. Metrics HELIX does not define yet are
   proposed to it as metric-definition patches, never written into it. */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { parse as parseYaml, stringify as toYaml } from "yaml";
import { DesignError, bpFile, proposalsDir, ux, writeInApp } from "./app.mjs";
import { helixRoot, parseDocument } from "./documents.mjs";
import { uiDecisions } from "./decisions.mjs";
import { addDiagnosisText } from "./insights.mjs";
import { readState, writeState } from "./state.mjs";

const docsDir = (app) => ux(app, "experiments");
const list = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]).map(String).map((s) => s.trim()).filter(Boolean);
const today = () => new Date().toISOString().slice(0, 10);
const nextId = (xs, prefix) => `${prefix}-${Math.max(0, ...xs.map((x) => Number(String(x.id ?? "").split("-")[1]) || 0)) + 1}`;

/* ux-builder-design diagnose --insight INS-<date> --observation <o> --explanation <e>... --hypothesis <h> --alternative <name>. */
export function diagnose(app, { insight, observation, explanations, hypothesis, alternative } = {}) {
  explanations = list(explanations);
  if (!/^INS-\d{4}-\d{2}-\d{2}$/.test(insight ?? "")) throw new DesignError(`--insight names an insights document, such as INS-2026-10-23, not "${insight ?? ""}"`);
  if (!observation?.trim()) throw new DesignError("diagnose needs --observation: what the insight shows");
  if (explanations.length < 2) throw new DesignError(`diagnose needs at least two --explanation: what else could explain it (got ${explanations.length})`);
  if (!hypothesis?.trim()) throw new DesignError("diagnose needs --hypothesis: If …, then …, because …");
  if (!alternative?.trim()) throw new DesignError("diagnose needs --alternative: the blueprint alternative that tests the hypothesis");
  const state = readState(app);
  if (!existsSync(join(app, bpFile(app, alternative))) && !state.alternatives.some((a) => a.name === alternative)) throw new DesignError(`no alternative ${alternative}: make it with ux-builder-blueprint alternative new ${alternative}`);
  state.diagnoses ??= [];
  const d = { id: nextId(state.diagnoses, "D"), insight, observation: observation.trim(), explanations, hypothesis: hypothesis.trim(), alternative: alternative.trim() };
  state.diagnoses.push(d);
  writeState(app, state);
  const path = addDiagnosisText(app, insight, [`### ${d.id}`, "", `- **Observation**: ${d.observation}`, ...d.explanations.map((e, i) => `- **Explanation ${i + 1}**: ${e}`), `- **Hypothesis**: ${d.hypothesis}`, `- **Alternative**: ${d.alternative} (\`${bpFile(app, d.alternative)}\`)`, ""]);
  return { ...d, path };
}

function unifiedDiff(path, before, after) {
  const d = mkdtempSync(join(tmpdir(), "metric-"));
  try {
    writeFileSync(join(d, "a"), before ?? ""); writeFileSync(join(d, "b"), after);
    const out = spawnSync("diff", ["-u", before == null ? "/dev/null" : join(d, "a"), join(d, "b")], { encoding: "utf8" }).stdout;
    return out.replace(/^--- .*$/m, `--- ${before == null ? "/dev/null" : `a/${path}`}`).replace(/^\+\+\+ .*$/m, `+++ b/${path}`);
  } finally { rmSync(d, { recursive: true, force: true }); }
}

/* The metrics HELIX defines: the names of <root>/06-iterate/metrics/*.yaml,
   and each one's tolerance when it gives one. */
function definedMetrics(app) {
  const root = helixRoot(app);
  if (!root) return null;
  const dir = join(app, root, "06-iterate/metrics");
  const names = new Set(), tolerances = {};
  if (!existsSync(dir)) return { root, names, tolerances };
  for (const f of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))) {
    const file = f.replace(/\.ya?ml$/, "");
    names.add(file);
    try {
      const y = parseYaml(readFileSync(join(dir, f), "utf8"));
      if (y?.name) names.add(String(y.name));
      if (y?.tolerance != null) for (const n of [file, y.name].filter(Boolean)) tolerances[n] = y.tolerance;
    } catch { /* not YAML: its file name stands */ }
  }
  return { root, names, tolerances };
}

/* A tolerance as an amount in the metric's units: a number, a percent of
   the control ("5%"), or a number with a unit ("100ms", "3 s"). */
export function toleranceOf(t, control) {
  if (t == null || t === "") return 0;
  if (typeof t === "number") return Math.abs(t);
  const m = String(t).trim().match(/^(-?[0-9.]+)\s*(%|[a-z]*)$/i);
  if (!m) return 0;
  return m[2] === "%" ? Math.abs(control * Number(m[1]) / 100) : Math.abs(Number(m[1]));
}

/* A proposed metric-definition for a metric HELIX lacks: helix-proposals/metrics/<name>.patch. */
function proposeMetric(app, root, name, { experiment, role }) {
  const path = `${root.replace(/\/$/, "")}/06-iterate/metrics/${name}.yaml`;
  const yaml = toYaml({ name, description: `${role === "guardrail" ? "Guardrail" : "Success metric"} for ${experiment}: <fill in what it measures>`, unit: "<percent|seconds|count>", direction: role === "guardrail" ? "<lower|higher: the side that is worse>" : "higher", command: "<fill in: the repeatable query over the app's exported journey events that emits the value>", output_pattern: "<regex with a capture group>", baseline: null, target: null, tolerance: null, last_verified: null, interpretation: `Read with ${experiment}; never trusted before its command has been run (last_verified).`, labels: { experiment, source: "ux-builder-design" } });
  return writeInApp(app, `${proposalsDir(app)}/metrics/${name}.patch`, unifiedDiff(path, null, yaml));
}

/* ux-builder-design experiment start --decision ADR-<nnn> --variant <alt> --metric <m> [--guardrail <m>]... --duration <days>. */
export function experimentStart(app, { decision, variant, metric, guardrails, duration } = {}) {
  guardrails = list(guardrails);
  if (!/^ADR-[0-9]{3,}$/.test(decision ?? "")) throw new DesignError(`--decision names the decision the experiment tests, its ADR such as ADR-008, not "${decision ?? ""}"`);
  const tested = uiDecisions(app).find((d) => d.id === decision);
  if (!tested) throw new DesignError(`no UX decision ${decision}: no ADR tagged area:ui has that ID`);
  if (!variant?.trim()) throw new DesignError("experiment start needs --variant: the blueprint alternative shown to some people");
  if (!metric?.trim()) throw new DesignError("experiment start needs --metric: the success metric");
  const days = Number(duration);
  if (!Number.isInteger(days) || days < 1) throw new DesignError(`--duration is a whole number of days, not "${duration ?? ""}"`);
  const state = readState(app);
  // One answered `experiment` checkpoint for each experiment: this one needs its own.
  const answered = state.checkpoints.filter((c) => c.id === "experiment" && c.status === "passed").length;
  if (answered <= state.experiments.length) throw new DesignError(`checkpoint experiment has not been answered for this experiment: ask the person "Run this experiment?" and record it with ux-builder-design state checkpoint experiment --answer "<their words>" first. Nothing was written.`);
  const id = nextId(state.experiments, "EXP");
  const diag = [...(state.diagnoses ?? [])].reverse().find((d) => d.alternative === variant);
  const question = tested.title;
  const hypothesis = diag?.hypothesis ?? `If people get ${variant}, then ${metric} improves, because it answers "${question}" better.`;
  const links = [["tests", decision], ...(diag ? [["informed_by", diag.insight]] : [])];
  const text = ["---", "ux:", `  id: ${id}`, "  type: experiment", "  status: running", `  started: ${today()}`, "  links:", ...links.flatMap(([kind, to]) => [`    - kind: ${kind}`, `      to: ${to}`]), "---", "", `# ${id}: ${variant} for ${decision}`, "",
    "## Hypothesis", "", `${hypothesis} (tests ${decision}${diag ? `; from ${diag.id} on ${diag.insight}` : ""})`, "",
    "## Variant", "", `${variant} (\`${bpFile(app, variant)}\`), behind the app's own feature flag; the rest see the current design.`, "",
    "## Metrics", "", `- **Success**: ${metric}`, `- **Guardrails**: ${guardrails.join(", ") || "none named"}`, "",
    "## Duration", "", `${days} days`, "",
    "## Result", "", "Filled when it ends: `ux-builder-design experiment end " + id + " --result <file>`.", "",
    "## Decision", "", "Filled at the release checkpoint.", ""].join("\n");
  const path = writeInApp(app, `${docsDir(app)}/${id}.md`, text);
  state.experiments.push({ id, status: "running", decision, variant });
  state.next = `${id} is running for ${days} days; then run experiment end ${id} --result <file>.`;
  writeState(app, state);
  // Metrics HELIX does not define are proposed to it, never written into it.
  const defined = definedMetrics(app);
  const proposed = defined ? [[metric, "success"], ...guardrails.map((g) => [g, "guardrail"])].filter(([m]) => !defined.names.has(m)).map(([m, role]) => proposeMetric(app, defined.root, m, { experiment: id, role })) : [];
  return { id, path, status: "running", decision, variant, metric, guardrails, duration: days, hypothesis, proposed };
}

/* ux-builder-design experiment end <EXP-n> --result <file>. The result file:
   { metric, control, variant, guardrails: [{ metric, control, variant, better: lower|higher, tolerance? }] }. */
export function experimentEnd(app, { id, result } = {}) {
  if (!/^EXP-[1-9][0-9]*$/.test(id ?? "")) throw new DesignError(`experiment end needs an experiment ID such as EXP-1, not "${id ?? ""}"`);
  const state = readState(app);
  const exp = state.experiments.find((e) => e.id === id);
  if (!exp) throw new DesignError(`no experiment ${id} in the design state`);
  if (exp.status === "ended") throw new DesignError(`${id} has already ended`);
  if (!result) throw new DesignError("experiment end needs --result <file>: the measured success metric and guardrails, control and variant");
  const file = isAbsolute(result) ? result : existsSync(join(app, result)) ? join(app, result) : result;
  let r;
  try { r = JSON.parse(readFileSync(file, "utf8")); } catch (e) { throw new DesignError(`${result} is not a readable JSON result: ${e.message}`); }
  if (typeof r.control !== "number" || typeof r.variant !== "number") throw new DesignError(`${result} needs control and variant: the success metric's value for each`);
  const path = `${docsDir(app)}/${id}.md`;
  const text = readFileSync(join(app, path), "utf8");
  const metric = r.metric ?? text.match(/\*\*Success\*\*: (.+)/)?.[1] ?? "success";
  // A guardrail holds unless it got worse by more than its tolerance (the result's, else HELIX's metric definition's).
  const defined = definedMetrics(app);
  const guardrails = (Array.isArray(r.guardrails) ? r.guardrails : []).map((g) => {
    const better = g.better === "higher" ? "higher" : "lower";
    const worseBy = better === "higher" ? g.control - g.variant : g.variant - g.control;
    const tolerance = g.tolerance ?? defined?.tolerances?.[g.metric] ?? null;
    const allowed = toleranceOf(tolerance, g.control);
    return { metric: g.metric, control: g.control, variant: g.variant, better, ...(tolerance != null ? { tolerance } : {}), held: worseBy <= allowed };
  });
  const improved = r.variant > r.control;
  const supported = improved && guardrails.every((g) => g.held);
  const verdict = supported ? "supported" : improved ? "not supported: a guardrail got worse" : "not supported: the success metric did not improve";
  const lines = [`- **${metric}**: control ${r.control}, variant ${r.variant} (${improved ? "improved" : "did not improve"})`, ...guardrails.map((g) => `- **Guardrail ${g.metric}**: control ${g.control}, variant ${g.variant} (${g.held ? `held${g.tolerance != null ? `, within the tolerance ${g.tolerance}` : ""}` : `got worse${g.tolerance != null ? ` by more than the tolerance ${g.tolerance}` : ""}; ${g.better} is better`})`), `- **Hypothesis**: ${verdict}`, `- **Result file**: \`${result}\``];
  const next = text.replace(/status: running/, "status: ended").replace(/## Result\n\n[\s\S]*?(?=\n## Decision)/, `## Result\n\n${lines.join("\n")}\n`);
  writeInApp(app, path, next);
  exp.status = "ended";
  exp.result = supported ? "supported" : "not-supported";
  const ask = `Ask checkpoint release: "${supported ? `Release ${exp.variant ?? "the variant"} to everyone?` : `Keep the current design, or try another alternative?`}" Then: ux-builder-design state checkpoint release --answer "<their words>".`;
  state.next = ask;
  writeState(app, state);
  return { id, path, status: "ended", metric, control: r.control, variant: r.variant, improved, guardrails, hypothesis: verdict, supported, next: ask };
}
