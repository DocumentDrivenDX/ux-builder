/* ux-builder-audit assess validate-report <run-dir>: check a run package
   (FEAT-009 COV-01 to COV-03, JRN-02 to JRN-05, FND-01 to FND-04, DOC-01
   to DOC-04, TRC-03, RUN-01; CONTRACT-006 "Records", "Increments 2 and 3").

   Every record validates against its schema; on top of what a schema can
   say, the rules that keep an assessment honest: no pair left out of the
   coverage matrix, no assessed pair without evidence, no visual judgment
   from DOM text alone, no observation on a blocked step, heuristics only as
   proposed criteria, no real-user claim without real-user evidence,
   components that exist in the app's installed catalogue, no duplicate
   findings, validation work for uncertain severe concerns, proposals aimed
   at HELIX artifacts that still exist, and qualified findings where the
   alignment review found a conflict. Returns the problems; writes nothing. */

import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { findingId } from "./plan.mjs";

const own = createRequire(import.meta.url);
const RECORDS = ["run", "requirements", "traceability", "alignment", "baseline", "plan", "coverage", "walkthrough", "backlog", "proposals", "comparison", "evidence"];
const json = (f) => JSON.parse(readFileSync(f, "utf8"));

/* The app's installed catalogue, for component names (FND-02). */
function catalogueFor(dir, run) {
  const app = run?.config?.appDir != null ? resolve(dir, run.config.appDir) : null;
  for (const r of [app && createRequire(join(app, "package.json")), own].filter(Boolean)) {
    try { const c = json(r.resolve("@ux-builder/ui/catalogue.json")); return { version: c.packages?.["@ux-builder/ui"] ?? null, names: new Map([...c.widgets, ...c.patterns].map((x) => [x.name, x.tier ? "pattern" : "widget"])) }; } catch { /* next */ }
  }
  return null;
}

export function validateReport(dir) {
  const problems = [];
  const add = (file, path, message) => problems.push({ file, path, message });
  if (!existsSync(join(dir, "run.json"))) { add("run.json", "/", "missing: every run package has a run record"); return problems; }
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const check = (name, file) => {
    let data;
    try { data = json(join(dir, file)); } catch (e) { add(file, "/", `not JSON: ${e.message}`); return null; }
    const v = ajv.getSchema(name) ?? ajv.addSchema(json(own.resolve(`../schema/${name}.schema.json`)), name).getSchema(name);
    if (!v(data)) for (const e of v.errors) if (e.keyword !== "if") add(file, e.instancePath || "/", e.keyword === "required" ? `needs "${e.params.missingProperty}"` : e.message);
    return data;
  };
  const got = {};
  for (const name of RECORDS) if (existsSync(join(dir, `${name}.json`))) got[name] = check(name, `${name}.json`);
  const checkpoints = existsSync(join(dir, "checkpoints")) ? readdirSync(join(dir, "checkpoints")).filter((c) => existsSync(join(dir, "checkpoints", c, "inspection.json"))) : [];
  for (const c of checkpoints) check("inspection", join("checkpoints", c, "inspection.json"));
  const resolves = (ref) => checkpoints.includes(ref) || existsSync(join(dir, ref));

  // Coverage (COV-01): every planned pair accounted for; evidence that resolves.
  const entries = got.coverage?.entries ?? [];
  for (const j of got.plan?.journeys ?? []) for (const s of j.states) if (!entries.some((e) => e.journey === j.id && e.state === s.state)) add("coverage.json", "/entries", `${j.id} × ${s.state} is planned but missing from the matrix`);
  for (const [i, e] of entries.entries()) for (const [k, ref] of (e.evidence ?? []).entries()) if (!resolves(ref)) add("coverage.json", `/entries/${i}/evidence/${k}`, `${ref} is not in the package`);

  // Walkthroughs (JRN-02 to JRN-05).
  for (const [i, j] of (got.walkthrough?.journeys ?? []).entries()) for (const [k, s] of (j.steps ?? []).entries()) {
    const at = `/journeys/${i}/steps/${k}`;
    if (s.status === "blocked" || s.status === "not-assessed") {
      if (!s.reason) add("walkthrough.json", at, `step ${s.n} is ${s.status} without a reason`);
      if (s.observation) add("walkthrough.json", at, `step ${s.n} is ${s.status} but records an observation; nothing was observed`);
      continue;
    }
    if (s.checkpoint && (!s.url || !s.observation)) add("walkthrough.json", at, `step ${s.n}'s checkpoint needs its URL and observation`);
    if (s.checkpoint && !resolves(s.checkpoint)) add("walkthrough.json", `${at}/checkpoint`, `${s.checkpoint} is not a checkpoint in the package`);
    if (s.observation?.visual && !(s.observation.basis ?? []).includes("screenshot")) add("walkthrough.json", `${at}/observation`, `step ${s.n} makes a visual judgment without a screenshot; DOM text alone cannot show how a screen looks`);
  }

  // Findings (FND-01 to FND-04, COV-02, COV-03, TRC-03).
  const findings = got.backlog?.findings ?? [];
  const conflicted = new Set((got.alignment?.conflicts ?? []).flatMap((c) => c.ids ?? []));
  const catalogue = findings.some((f) => f.component_mapping?.length) ? catalogueFor(dir, got.run) : null;
  const seen = new Set();
  if (got.backlog && !Array.isArray(got.backlog.user_validation)) add("backlog.json", "/", 'needs "user_validation": the claims only representative users can confirm (an empty list if none)');
  for (const [i, f] of findings.entries()) {
    const at = `/findings/${i}`;
    if (seen.has(f.id)) add("backlog.json", at, `${f.id} appears twice; merge them (assess merge)`);
    seen.add(f.id);
    if (f.id && f.finding_type && f.id !== findingId(f)) add("backlog.json", `${at}/id`, `${f.id} is not this finding's stable ID (${findingId(f)}); run assess merge`);
    if (!f.evidence_refs?.length && !f.uncertainty) add("backlog.json", at, `${f.id} has no evidence and no uncertainty label`);
    for (const [k, ref] of (f.evidence_refs ?? []).entries()) if (!resolves(ref)) add("backlog.json", `${at}/evidence_refs/${k}`, `${ref} is not in the package`);
    const hit = (f.source_refs ?? []).filter((id) => conflicted.has(id));
    if (hit.length && !(f.qualified ?? []).includes("alignment")) add("backlog.json", at, `${f.id} relies on ${hit.join(", ")}, which the alignment review found in conflict; mark it qualified: [alignment]`);
    const proposed = /^Proposed criterion:/.test(f.expected_behavior_or_proposed_requirement ?? "");
    if (!f.source_refs?.length && !proposed) add("backlog.json", at, `${f.id} cites no requirement and proposes no criterion`);
    if (f.finding_type === "heuristic" && !proposed) add("backlog.json", `${at}/expected_behavior_or_proposed_requirement`, `${f.id} is a heuristic concern: state it as "Proposed criterion: …", a recommendation, not an existing obligation`);
    if (f.finding_type === "real-user" && !(f.evidence_refs ?? []).some((r) => r.startsWith("evidence/real-user/"))) add("backlog.json", at, `${f.id} is typed real-user without evidence from real users (evidence/real-user/…)`);
    if (["P0", "P1"].includes(f.priority) && f.confidence?.level === "low" && f.validation_work !== true) add("backlog.json", at, `${f.id} is a low-confidence ${f.priority}: mark validation_work: true; neither downgrade it nor state it as proven`);
    for (const [k, c] of (f.component_mapping ?? []).entries()) {
      if (!catalogue || c.work === "custom-gap") continue;
      if (!catalogue.names.has(c.name)) add("backlog.json", `${at}/component_mapping/${k}`, `${c.name} is not in the app's installed @ux-builder/ui ${catalogue.version}; name a real one or mark the work custom-gap`);
      else if (c.version !== catalogue.version) add("backlog.json", `${at}/component_mapping/${k}/version`, `the app has @ux-builder/ui ${catalogue.version}, not ${c.version}`);
    }
  }

  // Proposals (DOC-01 to DOC-04).
  for (const [i, p] of (got.proposals?.proposals ?? []).entries()) {
    const at = `/proposals/${i}`;
    if (!resolves(p.patch ?? "")) add("proposals.json", `${at}/patch`, `${p.patch} is not in the package`);
    else if (/^[-+]{1}(?:ddx:|  id:|  type:)/m.test(readFileSync(join(dir, p.patch), "utf8").split("\n").filter((l) => !/^(---|\+\+\+) /.test(l)).join("\n")) && p.target?.kind === "existing") add("proposals.json", `${at}/patch`, `${p.id}'s patch changes the target's ddx: frontmatter`);
    for (const fid of p.findings ?? []) if (!findings.some((f) => f.id === fid)) add("proposals.json", `${at}/findings`, `${fid} is not a finding in the backlog`);
    for (const k of ["writes", "keeps", "dependencies", "verification"]) if (!p.plan || !(k in p.plan)) add("proposals.json", `${at}/plan`, `${p.id}'s implementation plan needs "${k}"`);
  }
  // The backlog proposed as the app's improvement-backlog (HLX-06).
  const bl = got.proposals?.backlog;
  if (bl?.patch && !resolves(bl.patch)) add("proposals.json", "/backlog/patch", `${bl.patch} is not in the package`);
  for (const [k, fid] of (bl?.findings ?? []).entries()) if (!findings.some((f) => f.id === fid)) add("proposals.json", `/backlog/findings/${k}`, `${fid} is not a finding in the backlog`);

  // The evidence index lists only what is in the package (RUN-01).
  for (const [i, f] of (got.evidence?.files ?? []).entries()) if (f?.path && !existsSync(join(dir, f.path))) add("evidence.json", `/files/${i}`, `${f.path} is not in the package`);
  return problems;
}
