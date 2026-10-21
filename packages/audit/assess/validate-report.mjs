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
   alignment review found a conflict, and an AI journey's findings each
   naming the AI rule or heuristic they are about (FEAT-011 AIX-03). With
   walkthrough videos (FEAT-013; CONTRACT-006 "Walkthrough videos"): steps
   that can be replayed, secrets only by reference, plain-English findings,
   and annotations that show only findings of the backlog, at the
   checkpoints they cite, never after a chapter stopped.
   Returns the problems; writes nothing. */

import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { SECRETS } from "./manifest.mjs";
import { findingId } from "./plan.mjs";

const own = createRequire(import.meta.url);
const RECORDS = ["run", "requirements", "traceability", "alignment", "baseline", "plan", "coverage", "walkthrough", "backlog", "proposals", "comparison", "evidence"];
const json = (f) => JSON.parse(readFileSync(f, "utf8"));

/* The app's installed catalogue, for component names (FND-02). */
function catalogueFor(dir, run) {
  const app = run?.config?.appDir != null ? resolve(dir, run.config.appDir) : null;
  for (const r of [app && createRequire(join(app, "package.json")), own].filter(Boolean)) {
    try { const c = json(r.resolve("@ux-builder/ui/catalogue.json")); return { version: c.packages?.["@ux-builder/ui"] ?? null, names: new Map([...c.widgets, ...c.patterns].map((x) => [x.name, x.tier ? "pattern" : "widget"])), rules: (c.interaction?.rules ?? []).map((x) => x.id) }; } catch { /* next */ }
  }
  return null;
}

/* What makes a plain-English caption technical (FEAT-013 ANN-03): a rule
   ID, a token, or a component's name as code would write it. A one-word
   name (Button, Tabs) is ordinary English unless written as <Button>. */
export function jargon(text, catalogue) {
  const found = [];
  if (/--piq-|var\(--/.test(text)) found.push("a token");
  for (const id of catalogue?.rules ?? []) if (new RegExp(`(^|[^\\w.-])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`).test(text)) found.push(`the rule ID ${id}`);
  for (const n of catalogue?.names?.keys() ?? []) {
    const camel = /^[A-Z][a-z0-9]+[A-Z]|^[a-z]+[A-Z]/.test(n);
    if ((camel && new RegExp(`\\b${n}\\b`).test(text)) || new RegExp(`<${n}\\b`).test(text)) found.push(`the component name ${n}`);
  }
  return found;
}
const sentences = (t) => t.trim().split(/(?<=[.!?])\s+(?=\S)/).filter(Boolean).length;

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

  const hasVideo = existsSync(join(dir, "video"));

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
    // Replayable steps (FEAT-013 REP-01): what the agent did, with secrets by reference.
    const value = s.do?.value;
    if (typeof value === "string") { const hit = SECRETS.find(([re]) => re.test(value)); if (hit) add("walkthrough.json", `${at}/do/value`, `step ${s.n} records ${hit[1]} as a literal; record { secret: NAME } instead`); }
    if (hasVideo && !s.do) add("walkthrough.json", at, `step ${s.n} of ${j.id} is not replayable: record the browser action it took as "do" (goto, click, fill, press or waitFor)`);
  }

  // Findings (FND-01 to FND-04, COV-02, COV-03, TRC-03).
  const findings = got.backlog?.findings ?? [];
  const conflicted = new Set((got.alignment?.conflicts ?? []).flatMap((c) => c.ids ?? []));
  const catalogue = findings.some((f) => f.component_mapping?.length) ? catalogueFor(dir, got.run) : null;
  const seen = new Set();
  const aiJourneys = new Map((got.plan?.journeys ?? []).filter((j) => j.ai).map((j) => [j.id, (j.ai.heuristics ?? []).map((h) => h.rule)]));
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
    // A finding of an AI journey names the AI rule or heuristic it is about (FEAT-011 AIX-03; US-082-AC2).
    const ai = aiJourneys.get(f.journey_id);
    if (ai && !f.rule) add("backlog.json", at, `${f.id} is a finding of the AI journey ${f.journey_id}: name the AI rule or heuristic it is about (rule), one of ${ai.slice(0, 6).join(", ")}${ai.length > 6 ? ", …" : ""}`);
    else if (ai && !ai.includes(f.rule)) add("backlog.json", `${at}/rule`, `${f.rule} is not one of ${f.journey_id}'s AI heuristics in plan.json (the AI rules for its roles)`);
    if (["P0", "P1"].includes(f.priority) && f.confidence?.level === "low" && f.validation_work !== true) add("backlog.json", at, `${f.id} is a low-confidence ${f.priority}: mark validation_work: true; neither downgrade it nor state it as proven`);
    for (const [k, c] of (f.component_mapping ?? []).entries()) {
      if (!catalogue || c.work === "custom-gap") continue;
      if (!catalogue.names.has(c.name)) add("backlog.json", `${at}/component_mapping/${k}`, `${c.name} is not in the app's installed @ux-builder/ui ${catalogue.version}; name a real one or mark the work custom-gap`);
      else if (c.version !== catalogue.version) add("backlog.json", `${at}/component_mapping/${k}/version`, `the app has @ux-builder/ui ${catalogue.version}, not ${c.version}`);
    }
  }

  // Walkthrough videos (FEAT-013 ANN-01 to ANN-03, OUT-01, REP-05).
  if (hasVideo) {
    const vdir = join(dir, "video");
    const byId = new Map(findings.map((f) => [f.id, f]));
    const shown = new Set();
    for (const file of readdirSync(vdir).filter((f) => f.endsWith(".annotations.json")).sort()) {
      const rel = join("video", file);
      const a = check("annotations", rel);
      if (!a) continue;
      const chapters = new Map((a.chapters ?? []).map((c) => [c.id, c]));
      for (const [i, n] of (a.annotations ?? []).entries()) {
        const at = `/annotations/${i}`;
        const f = byId.get(n.finding);
        shown.add(n.finding);
        if (!f) { add(rel, `${at}/finding`, `${n.finding} is not a finding in the backlog; a video shows only the backlog's findings`); continue; }
        if (!(f.evidence_refs ?? []).some((r) => r === n.checkpoint || r.startsWith(`checkpoints/${n.checkpoint}/`) || r === `checkpoints/${n.checkpoint}`)) add(rel, `${at}/checkpoint`, `${n.finding} cites no evidence at ${n.checkpoint}; it is shown only where it was found`);
        const c = chapters.get(n.chapter);
        if (!c) add(rel, `${at}/chapter`, `${n.chapter} is not a chapter of this video`);
        else if (c.status === "stopped" && n.end > c.end) add(rel, at, `${n.finding} is shown after ${c.id} stopped (${c.reason ?? "the replayed state differed"}); nothing is shown on a state the replay did not reach`);
        if (n.start > n.end) add(rel, at, `${n.finding} ends before it starts`);
      }
    }
    if (existsSync(join(vdir, "video.json"))) {
      const v = check("video", join("video", "video.json"));
      for (const [i, x] of (v?.videos ?? []).entries()) for (const [k, f] of Object.entries(x.files ?? {})) if (!existsSync(join(vdir, f))) add("video/video.json", `/videos/${i}/files/${k}`, `${f} is not in video/`);
    }
    for (const id of shown) {
      const f = byId.get(id);
      if (f && !f.plain) add("backlog.json", `/findings/${findings.indexOf(f)}`, `${id} is shown in a video but has no "plain": its problem and recommendation in plain English`);
    }
  }
  // Plain English (FEAT-013 ANN-03): short, and in the user's terms.
  const plainCatalogue = findings.some((f) => f.plain) ? catalogue ?? catalogueFor(dir, got.run) : null;
  for (const [i, f] of findings.entries()) for (const k of ["problem", "recommendation"]) {
    const t = f.plain?.[k];
    if (!t) continue;
    const at = `/findings/${i}/plain/${k}`;
    if (sentences(t) > 2) add("backlog.json", at, `${f.id}'s plain ${k} is ${sentences(t)} sentences; keep it to one or two`);
    const words = jargon(t, plainCatalogue);
    if (words.length) add("backlog.json", at, `${f.id}'s plain ${k} names ${words.join(", ")}; say it in the user's terms and keep specifics in recommendation and component_mapping`);
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
