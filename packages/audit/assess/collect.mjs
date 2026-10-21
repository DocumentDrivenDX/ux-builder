/* ux-builder-audit assess collect: the requirements-to-evidence map
   (FEAT-009 TRC-01 to TRC-04, HLX-04, HLX-05; US-058; CONTRACT-006
   "requirements.json", "traceability.json", "run.json").

   Lists every HELIX instance under the flow's root with its type, ID, path,
   content hash and git revision; extracts goals, roles, features, stories
   and acceptance criteria with their original IDs; and links each journey's
   criteria to the tests that cite them (`@covers`) or that the manifest
   maps. Text is quoted from its source with the path: evidence, never a
   second copy of authority. Writes only under the run directory. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve, sep } from "node:path";
import { criteriaOf, instances, revisionOf } from "./helix.mjs";

const own = createRequire(import.meta.url);
// The HELIX types an assessment reads (HLX-05): required, then optional.
export const READS = { required: ["product-vision", "prd", "feature-specification", "user-stories"], optional: ["concerns", "design-system", "contract", "test-plan", "story-test-plan"] };
// As tools/check-coverage.mjs: where test citations are not looked for.
const SKIP = new Set(["node_modules", "dist", "fixtures", "storybook-static", "test-results", "build", "coverage", ".git"]);
const CODE = /\.(m?[jt]sx?|cjs|py|rb|go|java|kt|swift)$/;

export const runId = (d = new Date()) => `R-${d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const git = (cwd, ...a) => { try { return execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const write = (dir, name, data) => writeFileSync(join(dir, name), JSON.stringify(data, null, 2) + "\n");

/* Installed versions, as the app has them (FEAT-009 AGW-04). */
export function versions(cwd) {
  const req = createRequire(join(cwd, "package.json"));
  const v = (spec, r = req) => { try { return JSON.parse(readFileSync(r.resolve(`${spec}/package.json`), "utf8")).version; } catch { return null; } };
  // ui: the app's own copy (null when it has none); uiUsedByAudit: the copy the audit's checks read.
  const ui = v("@ux-builder/ui");
  return { ui, uiUsedByAudit: ui ?? v("@ux-builder/ui", own), tokens: v("@ux-builder/tokens"), audit: JSON.parse(readFileSync(own.resolve("../package.json"), "utf8")).version, playwright: v("playwright") ?? v("playwright", own), node: process.versions.node };
}

/* Lines under a heading whose text matches re, as list items. */
const itemsUnder = (text, re) => {
  const out = [];
  let on = false;
  for (const line of text.split("\n")) {
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { on = re.test(h[2]); continue; }
    const li = on && /^\s*[-*]\s+(.+)$/.exec(line);
    if (li) out.push(li[1].trim());
  }
  return out;
};
const titleOf = (text) => (/^#\s+(.+)$/m.exec(text)?.[1] ?? "").replace(/^(?:US|FEAT)-\d+\s*[:—-]\s*/, "").trim();

/* Every @covers citation in the code under these roots: criterion → [file]. */
export function citations(roots) {
  const out = new Map();
  const visit = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) visit(p);
      else if (CODE.test(e.name)) for (const [, id] of readFileSync(p, "utf8").matchAll(/@covers\s+(US-\d+-AC\d+)/g)) (out.get(id) ?? out.set(id, new Set()).get(id)).add(p);
    }
  };
  for (const r of new Set(roots)) visit(r);
  return out;
}

/* Collect for a validated manifest. helix is validate()'s binding. */
export function collect({ manifest, resolved, helix, out, run = runId(), now = new Date() }) {
  const repo = helix.marker.repo;
  const dir = resolve(manifest.dir, out ?? resolved.evidence?.out ?? "ux-assessment", run);
  mkdirSync(dir, { recursive: true });
  const docs = instances(helix.flow, helix.types, { include: resolved.helix?.include, exclude: resolved.helix?.exclude, repo, templates: helix.templates });
  const known = new Set([...helix.types.map((t) => t.id), ...(helix.templates ?? []).map((t) => t.id)]);
  const ids = new Set(docs.map((d) => d.id).filter(Boolean));
  const problems = [];
  const documents = docs.map((d) => {
    const revision = revisionOf(d.abs);
    // info: worth knowing, not a gap (a README, a discovery note); warning: a gap in the documents.
    if (d.typedBy === "none") problems.push({ kind: "unclassified", severity: "info", path: d.path, detail: "not a HELIX artifact or report: no ddx.type, and no catalogue location or template title matches" });
    else if (d.typedBy === "location" || d.typedBy === "template") problems.push({ kind: "untyped", severity: "warning", path: d.path, detail: `typed ${d.type} by its ${d.typedBy === "location" ? "location" : "title (a HELIX template)"}; add ddx: frontmatter with id and type` });
    else if (helix.catalog.source !== "none" && !known.has(d.type)) problems.push({ kind: "type-not-in-catalogue", severity: "info", path: d.path, detail: `ddx.type ${d.type} is not an artifact type or template in the bound catalogue (${helix.catalog.source}${helix.catalog.version ? ` ${helix.catalog.version}` : ""})` });
    if (!d.id && ["user-stories", "feature-specification"].includes(d.type)) problems.push({ kind: "no-id", severity: "warning", path: d.path, detail: `a ${d.type} without a stable ddx.id` });
    if (d.id && !d.idValid) problems.push({ kind: "bad-id", severity: "warning", path: d.path, detail: `${d.id} does not match its type's ID format` });
    for (const l of d.links) if (!ids.has(l.to)) problems.push({ kind: "dangling-link", severity: "warning", path: d.path, detail: `links ${l.kind} to ${l.to}, which no document in the flow has as its ID` });
    return { id: d.id, type: d.type, typedBy: d.typedBy, path: d.path, revision, hash: d.hash, links: d.links };
  });
  const of = (type) => docs.filter((d) => d.type === type);
  for (const t of READS.required) if (!of(t).length) problems.push({ kind: "missing-type", severity: "warning", type: t, required: true, detail: `no ${t} in the flow` });
  for (const t of READS.optional) if (!of(t).length) problems.push({ kind: "missing-type", severity: "info", type: t, required: false, detail: `no ${t} in the flow` });

  const goals = of("product-vision").flatMap((d) => itemsUnder(d.text, /goal|outcome/i).map((text) => ({ text, source: d.path })));
  const roles = docs.filter((d) => ["prd", "product-vision"].includes(d.type)).flatMap((d) => [...d.text.matchAll(/^#{2,4}\s+(?:Primary |Secondary )?Persona:\s*(.+)$/gmi)].map((m) => ({ name: m[1].trim(), source: d.path })));
  const features = of("feature-specification").map((d) => ({ id: d.id, title: titleOf(d.text), path: d.path }));
  const stories = of("user-stories").map((d) => ({ id: d.id, title: titleOf(d.text), path: d.path, feature: d.links.find((l) => /^FEAT-/.test(l.to))?.to ?? null }));
  const criteria = of("user-stories").flatMap((d) => criteriaOf(d).map((c) => ({ id: c.id, story: d.id ?? c.id.replace(/-AC\d+$/, ""), text: c.text, path: d.path })));
  const knownCriteria = new Set(criteria.map((c) => c.id));

  // Links (TRC-02): explicit by @covers or the manifest, otherwise uncovered; the agent adds inferred ones.
  const cited = citations([resolved.run.cwd, repo]);
  for (const [id, files] of cited) if (!knownCriteria.has(id)) problems.push({ kind: "dangling-citation", severity: "warning", detail: `${id} is cited by ${[...files].map((f) => relative(repo, f)).join(", ")} but no story has it` });
  const journeys = (resolved.journeys ?? []).map((j) => {
    const all = criteria.filter((c) => c.story === j.story).map((c) => c.id);
    const wanted = j.criteria?.length ? j.criteria : all;
    return {
      id: j.id, story: j.story,
      criteria: wanted.map((id) => {
        const tests = [...(cited.get(id) ?? [])].map((f) => ({ file: relative(repo, f).split(sep).join("/"), via: "covers" }));
        for (const t of j.tests ?? []) tests.push({ file: t.file, ...(t.title ? { title: t.title } : {}), via: "manifest" });
        return { id, link: tests.length ? "explicit" : "uncovered", tests };
      }),
    };
  });

  write(dir, "requirements.json", { schema: "requirements", version: 1, documents, goals, roles, features, stories, criteria, problems });
  write(dir, "traceability.json", { schema: "traceability", version: 1, journeys });
  const runFile = join(dir, "run.json");
  const prior = existsSync(runFile) ? JSON.parse(readFileSync(runFile, "utf8")) : null;
  const stage = { stage: "collect", status: "completed", startedAt: now.toISOString(), finishedAt: new Date().toISOString() };
  const record = {
    schema: "run", version: 1, id: run, startedAt: prior?.startedAt ?? now.toISOString(),
    manifest: { path: relative(repo, manifest.file).split(sep).join("/"), version: manifest.data.version, hash: sha(manifest.text) },
    // What was already changed when the run began, so check-writes reports only the run's own (DOC-03).
    app: { name: resolved.app.name, commit: git(repo, "rev-parse", "HEAD"), dirty: !!git(repo, "status", "--porcelain"), changed: [...new Set([...(git(repo, "diff", "--name-only", "HEAD") ?? "").split("\n"), ...(git(repo, "ls-files", "--others", "--exclude-standard") ?? "").split("\n")].filter(Boolean))] },
    helix: { marker: relative(repo, helix.marker.file).split(sep).join("/"), flow: helix.flow.id, root: helix.flow.rootRel, catalog: { source: helix.catalog.source, path: helix.catalog.path, version: helix.catalog.version, commit: helix.catalog.commit } },
    documents: documents.map(({ id, path, revision, hash }) => ({ id, path, revision, hash })),
    versions: versions(resolved.run.cwd),
    ...(prior?.agent ? { agent: prior.agent } : {}),
    stages: [...(prior?.stages ?? []).filter((s) => s.stage !== "collect"), stage],
    config: { journeys: journeys.map((j) => j.id), include: resolved.helix?.include ?? [], exclude: resolved.helix?.exclude ?? [] },
  };
  write(dir, "run.json", record);
  return { dir, run: record, requirements: { documents, criteria, problems }, traceability: { journeys } };
}
