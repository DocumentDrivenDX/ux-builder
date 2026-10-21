/* ux-builder-audit assess plan: the journey-and-state plan and the starting
   coverage matrix (FEAT-009 JRN-01, JRN-03, COV-01; US-060-AC1, US-061-AC1;
   CONTRACT-006 "Increments 2 and 3").

   From the manifest's journeys and collect's records: each journey's role,
   fixture, entry route, goal (its story's title), criteria with their text,
   expected outcomes and the E2E tests it can reuse; and every state class,
   applicable or not, with the manifest's reason. Every pair starts in
   coverage.json as not-assessed or not-applicable, so nothing can pass by
   being left out. A journey whose role's credential variable (auth.env) is
   not set meets an authentication barrier: its pairs start blocked, with
   the reason, and the plan stage is partial (AGW-02). Also merges findings
   and gives them stable IDs (FND-03). */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { STATES } from "./manifest.mjs";

const read = (dir, f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
const write = (dir, f, d) => writeFileSync(join(dir, f), JSON.stringify(d, null, 2) + "\n");
export const runDir = (manifest, resolved, out, run) => resolve(manifest.dir, out ?? resolved.evidence?.out ?? "ux-assessment", run);

export function plan({ manifest, resolved, out, run, agent, model, env = process.env }) {
  const dir = runDir(manifest, resolved, out, run);
  if (!existsSync(join(dir, "traceability.json"))) { const e = new Error(`no traceability.json in ${dir}: run assess collect --run ${run} first`); e.code = "blocked"; throw e; }
  const req = read(dir, "requirements.json"), trace = read(dir, "traceability.json");
  const stories = new Map(req.stories.map((s) => [s.id, s])), criteria = new Map(req.criteria.map((c) => [c.id, c]));
  const journeys = (resolved.journeys ?? []).map((j) => {
    const t = trace.journeys.find((x) => x.id === j.id) ?? { criteria: [] };
    const applies = j.states?.length ? j.states : STATES;
    return {
      id: j.id, story: j.story, role: j.role, fixture: j.fixture ?? null, entry: j.entry, priority: j.priority,
      goal: stories.get(j.story)?.title ?? null, source: stories.get(j.story)?.path ?? null,
      criteria: t.criteria.map((c) => ({ id: c.id, text: criteria.get(c.id)?.text ?? null, link: c.link })),
      expected: t.criteria.map((c) => criteria.get(c.id)?.text).filter(Boolean),
      reuses: [...new Set(t.criteria.flatMap((c) => c.tests.map((x) => x.file)))],
      states: STATES.map((state) => applies.includes(state) ? { state, applies: true } : { state, applies: false, reason: j.notApplicable?.[state] ?? "not listed in the manifest's states" }),
    };
  });
  write(dir, "plan.json", { schema: "plan", version: 1, run, journeys });
  // An authentication barrier: the role's credential is referenced but not set.
  const barrier = new Map();
  for (const j of journeys) {
    const auth = (resolved.roles ?? []).find((r) => r.id === j.role)?.auth;
    if (auth?.env && !env[auth.env]) barrier.set(j.id, `authentication barrier: role ${j.role}'s credential variable ${auth.env} is not set`);
  }
  // The matrix starts complete: every pair is accounted for before anything is walked (COV-01).
  const prior = existsSync(join(dir, "coverage.json")) ? read(dir, "coverage.json").entries : [];
  const entries = journeys.flatMap((j) => j.states.map((s) => {
    const was = prior.find((e) => e.journey === j.id && e.state === s.state);
    if (s.applies && barrier.has(j.id) && (!was || ["not-assessed", "blocked"].includes(was.status))) return { journey: j.id, state: s.state, status: "blocked", reason: barrier.get(j.id) };
    return was ?? (s.applies ? { journey: j.id, state: s.state, status: "not-assessed", reason: "planned; not walked yet" } : { journey: j.id, state: s.state, status: "not-applicable", reason: s.reason });
  }));
  write(dir, "coverage.json", { schema: "coverage", version: 1, entries });
  // The run record: the agent and model when known (RUN-02), and where the app is, for later checks.
  const runFile = join(dir, "run.json");
  const rec = existsSync(runFile) ? read(dir, "run.json") : { schema: "run", version: 1, id: run, startedAt: new Date().toISOString(), stages: [] };
  if (agent) rec.agent = { name: agent, ...(model ? { model } : {}) };
  rec.config = { ...rec.config, appDir: relative(dir, resolved.run.cwd) || ".", scope: scopeOf(resolved) };
  const stage = barrier.size ? { stage: "plan", status: "partial", reason: [...barrier].map(([id, why]) => `${id}: ${why}`).join("; ") } : { stage: "plan", status: "completed" };
  rec.stages = [...(rec.stages ?? []).filter((s) => s.stage !== "plan"), { ...stage, finishedAt: new Date().toISOString() }];
  write(dir, "run.json", rec);
  return { dir, journeys, entries, stage };
}

/* What makes two runs comparable (RUN-03): the app, its flow and its journeys. */
export const scopeOf = (resolved) => ({ app: resolved.app.name, flow: resolved.helix?.flow ?? null, journeys: (resolved.journeys ?? []).map((j) => j.id).sort() });

/* A finding's stable ID: the same problem in a rerun has the same ID (RUN-04). */
export const findingId = (f) => "F-" + createHash("sha256").update([f.finding_type, f.journey_id, f.state_id, f.key ?? f.title].join("\u0000")).digest("hex").slice(0, 10);

/* Merge findings of one user problem (FND-03): same type, journey, state and
   key. Every evidence, test and source reference is kept; the first
   finding's wording stands. Different keys stay separate. */
export function merge(findings) {
  const by = new Map();
  for (const f of findings) {
    const id = findingId(f);
    const g = by.get(id);
    if (!g) { by.set(id, { ...f, id }); continue; }
    for (const k of ["evidence_refs", "test_refs", "source_refs", "dependencies", "proposed_doc_changes"]) g[k] = [...new Set([...(g[k] ?? []), ...(f[k] ?? [])])];
    if (f.uncertainty && !g.evidence_refs.length) g.uncertainty ??= f.uncertainty;
  }
  return [...by.values()];
}
