/* Proposed changes to an app's HELIX artifacts (FEAT-009 DOC-01 to DOC-04,
   HLX-06; US-064; CONTRACT-006 "Increments 2 and 3").

   propose() writes a patch in the run package, never in the documents: an
   added acceptance criterion on an existing story (by ddx.id), a proposed
   section on any other existing artifact, or a new instance of a catalogue
   type, named by its naming rule, numbered by its ID format and drafted from
   its template. checkWrites() lists anything changed under the flow's root
   or the app since the run began; applyCheck() tells whether a proposal's
   target still has the revision it was written against. */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { instances, revisionOf } from "./helix.mjs";
import { runDir } from "./plan.mjs";

const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const sha = (s) => createHash("sha256").update(s).digest("hex");
const slug = (s) => (s ?? "proposal").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "proposal";

/* A unified diff from a to b, with the target's repository path in the headers. */
function diff(path, before, after) {
  const d = mkdtempSync(join(tmpdir(), "propose-"));
  try {
    writeFileSync(join(d, "a"), before ?? ""); writeFileSync(join(d, "b"), after);
    const out = spawnSync("diff", ["-u", before == null ? "/dev/null" : join(d, "a"), join(d, "b")], { encoding: "utf8" }).stdout;
    return out.replace(/^--- .*$/m, `--- ${before == null ? "/dev/null" : `a/${path}`}`).replace(/^\+\+\+ .*$/m, `+++ b/${path}`);
  } finally { rmSync(d, { recursive: true, force: true }); }
}

/* The next free ID of a catalogue type: its prefix and the next number, as wide as its pattern. */
function nextId(type, docs) {
  const m = /^\^?([A-Z]+)-\[0-9\]\{(\d+)\}\$?$/.exec(type.pattern?.source ?? "");
  if (!m) return null;
  const [, prefix, width] = m;
  // Numbers taken by an ID, or by a file name (a document without frontmatter still holds its number).
  const used = docs.flatMap((d) => [d.id && new RegExp(`^${prefix}-(\\d+)$`).exec(d.id)?.[1], new RegExp(`(?:^|/)${prefix}-(\\d+)-[^/]*$`).exec(d.path)?.[1]]).filter(Boolean).map(Number);
  return `${prefix}-${String((used.length ? Math.max(...used) : 0) + 1).padStart(Number(width), "0")}`;
}

/* Add a criterion to a story's acceptance criteria, after its last one. */
function withCriterion(text, storyId, criterion, finding) {
  const ids = [...text.matchAll(new RegExp(`${storyId}-AC(\\d+)`, "g"))].map((m) => Number(m[1]));
  const id = `${storyId}-AC${(ids.length ? Math.max(...ids) : 0) + 1}`;
  const line = `- [ ] **${id}** — ${criterion} *(Proposed by the UX assessment, ${finding}.)*`;
  const lines = text.split("\n");
  const last = lines.map((l, i) => (/^\s*-\s*\[[ xX]\]\s*\*\*US-\d+-AC\d+\*\*/.test(l) ? i : -1)).filter((i) => i >= 0).pop();
  if (last != null) lines.splice(last + 1, 0, line);
  else lines.push("", "## Acceptance Criteria", "", line);
  return { text: lines.join("\n"), id };
}

export function propose({ manifest, resolved, helix, out, run, finding: fid, target, newType, kind, criterion, test, testFile, keeps, title }) {
  const dir = runDir(manifest, resolved, out, run);
  const backlog = existsSync(join(dir, "backlog.json")) ? read(join(dir, "backlog.json")) : null;
  const finding = backlog?.findings.find((f) => f.id === fid);
  if (!finding) { const e = new Error(`no finding ${fid} in ${join(dir, "backlog.json")}`); e.code = "missing"; throw e; }
  const repo = helix.marker.repo;
  const docs = instances(helix.flow, helix.types, { repo, templates: helix.templates });
  const file = join(dir, "proposals.json");
  const all = existsSync(file) ? read(file) : { schema: "proposals", version: 1, proposals: [] };
  const id = `P-${all.proposals.length + 1}`;
  mkdirSync(join(dir, "proposals"), { recursive: true });
  let entry;
  if (target) {
    const doc = docs.find((d) => d.id === target);
    if (!doc) { const e = new Error(`no HELIX document with ddx.id ${target} in the flow`); e.code = "missing"; throw e; }
    const isStory = doc.type === "user-stories" && /^US-\d+$/.test(doc.id);
    const after = isStory ? withCriterion(doc.text, doc.id, criterion, fid) : { text: doc.text.replace(/\n*$/, "\n") + `\n## Proposed by the UX assessment (${run})\n\n- ${criterion} *(${fid})*\n`, id: null };
    writeFileSync(join(dir, "proposals", `${id}.patch`), diff(doc.path, doc.text, after.text));
    entry = { target: { kind: "existing", id: doc.id, type: doc.type, path: doc.path, revision: revisionOf(doc.abs), hash: doc.hash }, ...(after.id ? { criterion: after.id } : {}) };
  } else {
    const type = helix.types.find((t) => t.id === newType);
    if (!type) { const e = new Error(`the bound catalogue has no artifact type "${newType}"`); e.code = "missing"; throw e; }
    const nid = nextId(type, docs);
    const name = (type.naming ?? "{number}-{slug}.md").replace(/\{number\}|\[nnn\]/, nid?.split("-")[1] ?? "").replace(/\{[^}]*(slug|title|name)[^}]*\}|\[[^\]]*(slug|name)[^\]]*\]/, slug(title ?? finding.title));
    const path = relative(repo, join(helix.flow.root, type.dir, name)).split(sep).join("/");
    const body = (type.template ? readFileSync(type.template, "utf8") : `# ${nid}: ${title ?? finding.title}\n`).replace(/(US|FEAT|TD|STP|SD)-XXX/g, nid ?? "$&").replace(/\[(?:title|story-name|Feature Name|story title)[^\]]*\]/i, title ?? finding.title);
    const draft = `---\nddx:\n  id: ${nid}\n  type: ${type.id}\n  status: draft\n---\n\n${body.replace(/^---\n[\s\S]*?\n---\n\n?/, "")}${nid?.startsWith("US-") ? `\n- [ ] **${nid}-AC1** — ${criterion} *(Proposed by the UX assessment, ${fid}.)*\n` : `\n${criterion}\n`}`;
    writeFileSync(join(dir, "proposals", `${id}.patch`), diff(path, null, draft));
    entry = { target: { kind: "new", id: nid, type: type.id, path, template: { source: type.template ? relative(repo, type.template).split(sep).join("/") : null, catalog: helix.catalog.source, version: helix.catalog.version } } };
  }
  const proposal = {
    id, findings: [fid], ...entry, change: kind, ...(kind === "scope" ? { decision_needed: "prd" } : {}),
    patch: `proposals/${id}.patch`,
    test_change: { ...(testFile ? { path: testFile } : {}), description: test },
    plan: { writes: [entry.target.path, ...(testFile ? [testFile] : [])], keeps: keeps ?? "every existing acceptance criterion, and every behavioural assertion of the existing tests", dependencies: [], verification: test },
    evidence_refs: finding.evidence_refs ?? [],
  };
  all.proposals.push(proposal);
  writeFileSync(file, JSON.stringify(all, null, 2) + "\n");
  // The finding points at its proposal.
  finding.proposed_doc_changes = [...new Set([...(finding.proposed_doc_changes ?? []), id])];
  writeFileSync(join(dir, "backlog.json"), JSON.stringify(backlog, null, 2) + "\n");
  return { dir, proposal };
}

const git = (cwd, ...a) => { try { return execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return ""; } };
const changedSince = (repo, commit) => [...new Set([
  ...git(repo, "diff", "--name-only", commit).split("\n"),
  ...git(repo, "ls-files", "--others", "--exclude-standard").split("\n"),
].filter(Boolean))];

/* What changed under the flow's root or the app since the run began (DOC-03). */
export function checkWrites({ manifest, resolved, helix, out, run }) {
  const dir = runDir(manifest, resolved, out, run);
  const rec = read(join(dir, "run.json"));
  const repo = helix.marker.repo;
  const before = new Set(rec.app?.changed ?? []);
  const outRel = relative(repo, dir.replace(/\/[^/]+$/, "")).split(sep).join("/");
  const inScope = (p) => p.startsWith(helix.flow.rootRel.replace(/\/?$/, "/")) || p.startsWith((relative(repo, resolved.run.cwd).split(sep).join("/") || ".").replace(/^\.$/, "").replace(/(.)$/, "$1/"));
  return changedSince(repo, rec.app?.commit ?? "HEAD").filter((p) => !before.has(p) && !p.startsWith(outRel + "/") && inScope(p));
}

/* Whether a proposal's target is as it was when the proposal was written. */
export function applyCheck({ manifest, resolved, helix, out, run, proposal }) {
  const dir = runDir(manifest, resolved, out, run);
  const p = read(join(dir, "proposals.json")).proposals.find((x) => x.id === proposal);
  if (!p) return { ok: false, message: `no proposal ${proposal}` };
  const abs = join(helix.marker.repo, p.target.path);
  if (p.target.kind === "new") return existsSync(abs) ? { ok: false, message: `${p.target.path} already exists: another change created it; renumber the proposal` } : { ok: true, message: `${p.target.path} is still free` };
  if (!existsSync(abs)) return { ok: false, message: `${p.target.path} no longer exists` };
  const now = sha(readFileSync(abs, "utf8"));
  return now === p.target.hash ? { ok: true, message: `${p.target.id} is unchanged since ${p.target.revision?.slice(0, 8) ?? "the run"}` } : { ok: false, message: `conflict: ${p.target.id} (${p.target.path}) changed since the proposal was written; recheck it before applying` };
}
