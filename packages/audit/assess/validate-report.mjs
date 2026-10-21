/* ux-builder-audit assess validate-report <run-dir>: check a run package
   (FEAT-009 COV-01, FND-01, TRC-03, RUN-01; CONTRACT-006 "Run package",
   "Records").

   Every record validates against its schema; on top of what a schema can
   say: a finding with no evidence carries an uncertainty, a finding that
   cites a HELIX ID the alignment review found in conflict is qualified, and
   every evidence reference resolves. Returns the problems; writes nothing. */

import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

const own = createRequire(import.meta.url);
const RECORDS = ["run", "requirements", "traceability", "alignment", "baseline", "coverage", "backlog"];

export function validateReport(dir) {
  const problems = [];
  const add = (file, path, message) => problems.push({ file, path, message });
  if (!existsSync(join(dir, "run.json"))) { add("run.json", "/", "missing: every run package has a run record"); return problems; }
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const check = (name, file) => {
    let data;
    try { data = JSON.parse(readFileSync(join(dir, file), "utf8")); } catch (e) { add(file, "/", `not JSON: ${e.message}`); return null; }
    const v = ajv.getSchema(name) ?? ajv.addSchema(JSON.parse(readFileSync(own.resolve(`../schema/${name}.schema.json`), "utf8")), name).getSchema(name);
    if (!v(data)) for (const e of v.errors) if (e.keyword !== "if") add(file, e.instancePath || "/", e.keyword === "required" ? `needs "${e.params.missingProperty}"` : e.message);
    return data;
  };
  const got = {};
  for (const name of RECORDS) if (existsSync(join(dir, `${name}.json`))) got[name] = check(name, `${name}.json`);
  const checkpoints = existsSync(join(dir, "checkpoints")) ? readdirSync(join(dir, "checkpoints")).filter((c) => existsSync(join(dir, "checkpoints", c, "inspection.json"))) : [];
  for (const c of checkpoints) check("inspection", join("checkpoints", c, "inspection.json"));

  // Evidence resolves: a file in the package, or a checkpoint of this run.
  const resolves = (ref) => checkpoints.includes(ref) || existsSync(join(dir, ref));
  for (const [i, e] of (got.coverage?.entries ?? []).entries()) for (const [k, ref] of (e.evidence ?? []).entries()) if (!resolves(ref)) add("coverage.json", `/entries/${i}/evidence/${k}`, `${ref} is not in the package`);
  const conflicted = new Set((got.alignment?.conflicts ?? []).flatMap((c) => c.ids ?? []));
  for (const [i, f] of (got.backlog?.findings ?? []).entries()) {
    if (!f.evidence_refs?.length && !f.uncertainty) add("backlog.json", `/findings/${i}`, `${f.id} has no evidence and no uncertainty label`);
    for (const [k, ref] of (f.evidence_refs ?? []).entries()) if (!resolves(ref)) add("backlog.json", `/findings/${i}/evidence_refs/${k}`, `${ref} is not in the package`);
    const hit = (f.source_refs ?? []).filter((id) => conflicted.has(id));
    if (hit.length && !(f.qualified ?? []).includes("alignment")) add("backlog.json", `/findings/${i}`, `${f.id} relies on ${hit.join(", ")}, which the alignment review found in conflict; mark it qualified: [alignment]`);
    if (!f.source_refs?.length && !/proposed/i.test(f.expected_behavior_or_proposed_requirement ?? "")) add("backlog.json", `/findings/${i}`, `${f.id} cites no requirement and proposes no criterion`);
  }
  return problems.map((p) => ({ ...p, file: relative(dir, join(dir, p.file)) }));
}
