/* HELIX proposals the person approves (US-156): what `ux-builder-blueprint
   propose` (and experiment start, the evaluation's backlog patch) left in
   docs/ux-builder/helix-proposals/, read back one line each, and the ones
   the person accepts applied to HELIX in one step, so nobody copies drafts,
   repairs metadata or removes conflicting documents by hand.

   The pending set is proposals.json's proposals (<id>.patch, unified diffs)
   and drafts (drafts/<path>, whole documents for types HELIX does not
   define), and any other *.patch under the folder (metrics/, backlog/).
   Applying is all or nothing: every accepted proposal is applied in memory
   first, a new document whose ddx.id another HELIX document already holds
   takes the next free ID of its kind (its file renamed, and every reference
   to the old ID in what the person accepted rewritten), each result must
   have frontmatter that parses with a well-formed ddx.id, and only then is
   anything written; a failed write puts back what was there. Applied
   proposals move to helix-proposals/applied/. propose's format keeps links
   one way (ddx.links in the document that links), so there is no
   back-reference list in the linked document to update. */

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { DesignError, proposalsDir, writeInApp } from "./app.mjs";
import { helixRoot, parseDocument } from "./documents.mjs";

const posix = (p) => p.split(sep).join("/");
const lines = (t) => (t === "" ? [] : t.replace(/\n$/, "").split("\n"));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const WELL_FORMED = /^[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)*$/;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------- the pending set */

/* Every pending proposal: { id, kind, target, file, section, after, source }, and problems reading them. */
function pending(app) {
  const dir = proposalsDir(app);
  const abs = join(app, dir);
  const out = [], problems = [];
  if (!existsSync(abs)) return { dir, list: out, problems, manifest: null };
  let manifest = null;
  if (existsSync(join(abs, "proposals.json"))) {
    try { manifest = JSON.parse(readFileSync(join(abs, "proposals.json"), "utf8")); } catch (e) { problems.push(`${dir}/proposals.json does not parse: ${e.message}`); }
  }
  for (const p of manifest?.proposals ?? []) out.push({ id: p.id, kind: p.target?.kind === "new" ? "new" : "patch", target: p.path, file: p.file ?? `${p.id}.patch`, section: p.section ?? null, after: p.after_patch?.replace(/\.patch$/, "") ?? null, source: "patch" });
  for (const d of manifest?.drafts ?? []) out.push({ id: d.id, kind: "new", target: d.path, file: d.file ?? `drafts/${d.path}`, section: (d.sections ?? []).join(", ") || null, after: null, source: "draft" });
  // Patches proposals.json does not list (experiment metrics, the improvement backlog).
  const listed = new Set(out.map((p) => p.file));
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const rel = posix(relative(abs, p));
      if (statSync(p).isDirectory()) { if (rel !== "applied" && rel !== "drafts") walk(p); continue; }
      if (!name.endsWith(".patch") || listed.has(rel)) continue;
      const head = parsePatch(readFileSync(p, "utf8"));
      out.push({ id: rel.replace(/\.patch$/, ""), kind: head.isNew ? "new" : "patch", target: head.path, file: rel, section: null, after: null, source: "patch" });
    }
  };
  walk(abs);
  return { dir, list: out, problems, manifest };
}

/* A unified diff for one file: { path, isNew, hunks: [{ start, old, add, lines }] } or { error }. */
function parsePatch(text) {
  const ls = lines(text);
  const files = ls.filter((l) => l.startsWith("+++ ")).length;
  if (files !== 1) return { error: files ? "it changes more than one file" : "it is not a unified diff" };
  const from = ls.find((l) => l.startsWith("--- "))?.slice(4);
  const path = ls.find((l) => l.startsWith("+++ ")).slice(4).replace(/^b\//, "");
  const hunks = [];
  let cur = null;
  for (const l of ls) {
    const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h) { cur = { start: Number(h[1]), oldCount: h[2] == null ? 1 : Number(h[2]), lines: [] }; hunks.push(cur); continue; }
    if (cur && /^[ +-]/.test(l) && !l.startsWith("+++ ") && !l.startsWith("--- ")) cur.lines.push(l);
    else if (cur && l === "") cur.lines.push(" ");
  }
  if (!hunks.length) return { error: "it has no hunks" };
  return { path, isNew: from === "/dev/null", hunks };
}

/* Apply hunks to [{ t, added }] lines: the new lines, or { error } naming the hunk that does not fit. */
function applyHunks(base, hunks) {
  const out = base.slice();
  let shift = 0;
  for (const [k, h] of hunks.entries()) {
    const old = h.lines.filter((l) => l[0] !== "+").map((l) => l.slice(1));
    const repl = h.lines.filter((l) => l[0] !== "-").map((l) => ({ t: l.slice(1), added: l[0] === "+" }));
    const fits = (at) => at >= 0 && at + old.length <= out.length && old.every((t, i) => out[at + i].t === t);
    const want = (h.oldCount === 0 ? h.start : h.start - 1) + shift;
    // Exactly where the patch says, else the nearest place the same lines stand (as patch's offset).
    let at = -1;
    for (let d = 0; d <= out.length && at < 0; d++) at = fits(want - d) ? want - d : fits(want + d) ? want + d : -1;
    if (at < 0) return { error: `hunk ${k + 1} (line ${h.start}) no longer matches: the document has changed since it was proposed` };
    // Kept lines keep their own origin (a line an earlier accepted patch added stays added).
    let oi = 0;
    for (const r of repl) if (!r.added) r.added = out[at + oi++].added;
    out.splice(at, old.length, ...repl);
    shift += repl.length - old.length;
  }
  return { lines: out };
}

/* ----------------------------------------------------------- the plan */

/* Every HELIX document by ddx.id: Map id -> [paths], app-relative. */
function helixIndex(app, root) {
  const index = new Map();
  const base = join(app, root);
  if (!existsSync(base)) return index;
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) { if (!["node_modules", ".git"].includes(name)) walk(p); continue; }
      if (!name.endsWith(".md")) continue;
      const id = parseDocument(readFileSync(p, "utf8")).front?.ddx?.id;
      if (id != null) { const k = String(id); index.set(k, [...(index.get(k) ?? []), posix(relative(app, p))]); }
    }
  };
  walk(base);
  return index;
}

/* The accepted proposals applied in memory: { items, files, problems }.
   items: { p, problems, collisions, path, renumbered, title }; files: Map
   final path -> { before, after, items }. Writes nothing. */
function plan(app, all, chosen) {
  const root = helixRoot(app);
  const problems = [];
  const items = chosen.map((p) => ({ p, problems: [], collisions: [], path: p.target, renumbered: null, title: null, created: false }));
  if (!root) { problems.push("the app has no HELIX (.helix.yml): there is nothing to apply proposals to"); return { items, files: new Map(), problems }; }
  const rootRel = posix(relative(app, resolve(app, root)));
  const index = helixIndex(app, root);
  const dir = proposalsDir(app);
  const work = new Map(); // path -> { lines, existed, before, items }
  const onDisk = (path) => existsSync(join(app, path));
  const accepted = new Set(chosen.map((p) => p.id));

  for (const it of items) {
    const { p } = it;
    const bad = (m) => it.problems.push(m);
    const src = join(app, dir, p.file);
    if (!existsSync(src)) { bad(`its file ${dir}/${p.file} is missing`); continue; }
    if (p.after && !accepted.has(p.after) && all.some((q) => q.id === p.after)) { bad(`it applies after ${p.after}, which is not accepted`); continue; }
    let path = p.target, base, existed, hunks = null, text = readFileSync(src, "utf8");
    if (p.source === "patch") {
      const parsed = parsePatch(text);
      if (parsed.error) { bad(`${dir}/${p.file} is not a patch ux-builder can apply: ${parsed.error}`); continue; }
      path = parsed.path; hunks = parsed.hunks;
      it.created = parsed.isNew;
    } else it.created = true;
    it.path = path;
    const rel = posix(relative(app, resolve(app, path)));
    if (rel !== path || rel.startsWith("..") || !(rel + "/").startsWith(`${rootRel}/`)) { bad(`its target ${path} is outside HELIX (${rootRel}/)`); continue; }
    const have = work.get(path);
    if (it.created) {
      if (have || onDisk(path)) { bad(`${path} already exists; propose again to patch it instead`); continue; }
      base = []; existed = false;
    } else if (have) { base = have.lines; existed = have.existed; }
    else if (onDisk(path)) { base = lines(readFileSync(join(app, path), "utf8")).map((t) => ({ t, added: false })); existed = true; }
    else { bad(`${path}, the document it changes, does not exist`); continue; }
    let next;
    if (hunks) { const r = applyHunks(base, hunks); if (r.error) { bad(`does not apply to ${path}: ${r.error}`); continue; } next = r.lines; }
    else next = lines(text).map((t) => ({ t, added: true }));
    work.set(path, { lines: next, existed, before: have?.before ?? (existed ? readFileSync(join(app, path), "utf8") : null), items: [...(have?.items ?? []), it] });
  }

  // New documents whose ID another document holds take the next free ID of its kind.
  const renames = new Map();
  const taken = new Set(index.keys());
  const newIds = new Map(); // id -> path of the accepted new document holding it
  for (const it of items) {
    if (!it.created || it.problems.length) continue;
    const w = work.get(it.path);
    const id = parseDocument(w.lines.map((l) => l.t).join("\n") + "\n").front?.ddx?.id;
    if (id == null) continue; // reported by the checks below
    const k = String(id);
    const other = (index.get(k) ?? []).find((x) => x !== it.path) ?? (newIds.has(k) && newIds.get(k) !== it.path ? newIds.get(k) : null);
    if (!other) { newIds.set(k, it.path); continue; }
    const m = /^([A-Z]+)-(\d+)$/.exec(k);
    if (!m) { it.problems.push(`its ID ${k} is already used by ${other}, and is not numbered, so it cannot be renumbered`); continue; }
    if (renames.has(k)) { it.problems.push(`its ID ${k} is also renumbered for another accepted proposal; accept one of them at a time`); continue; }
    const used = [...taken, ...newIds.keys(), ...renames.values()].map((x) => new RegExp(`^${m[1]}-(\\d+)$`).exec(x)?.[1]).filter(Boolean).map(Number);
    let n = Math.max(0, ...used) + 1, to, path;
    const rename = (num) => `${m[1]}-${String(num).padStart(m[2].length, "0")}`;
    for (;; n++) {
      to = rename(n);
      const file = it.path.split("/").pop();
      path = `${dirname(it.path)}/${file.replace(new RegExp(`\\b${escRe(k)}\\b`), to)}`;
      if (!onDisk(path) && !work.has(path) && !index.has(to)) break;
    }
    renames.set(k, to);
    newIds.set(to, path);
    it.collisions.push({ id: k, with: other, becomes: to });
    it.renumbered = { from: k, to };
    work.set(path, work.get(it.path));
    if (path !== it.path) work.delete(it.path);
    // Every accepted proposal on that document (sections patched after the first) follows it.
    const was = it.path;
    for (const x of items) if (x.path === was) x.path = path;
  }
  // Every reference to a renumbered ID in what the person accepted: the new documents, and the lines patches add.
  if (renames.size) {
    const re = new RegExp(`\\b(${[...renames.keys()].map(escRe).join("|")})\\b`, "g");
    for (const w of work.values()) for (const l of w.lines) if (l.added) l.t = l.t.replace(re, (x) => renames.get(x));
  }

  // Each result: frontmatter that parses, with a well-formed ddx.id (HELIX's Markdown documents).
  const files = new Map();
  for (const [path, w] of work) {
    const after = w.lines.map((l) => l.t).join("\n") + "\n";
    files.set(path, { before: w.before, after, items: w.items });
    if (!path.endsWith(".md")) continue;
    const doc = parseDocument(after);
    const say = (m) => { for (const it of w.items) it.problems.push(m); };
    if (doc.error) say(`${path}: its frontmatter does not parse (${doc.error.split("\n")[0]})`);
    else if (!doc.front) say(`${path}: it has no frontmatter (HELIX documents carry ddx: id and type)`);
    else if (doc.front.ddx?.id == null) say(`${path}: its frontmatter has no ddx.id`);
    else if (!WELL_FORMED.test(String(doc.front.ddx.id))) say(`${path}: its ddx.id "${doc.front.ddx.id}" is not well formed (such as FEAT-001 or design-system)`);
    else if (w.items.some((it) => it.created)) for (const it of w.items) it.title ??= /^#\s+(.+)$/m.exec(doc.body)?.[1] ?? null;
  }
  return { items, files, problems };
}

const line = (it) => {
  const { p } = it;
  const what = p.kind === "new" ? `creates ${it.path}${it.title ? ` (${it.title})` : ""}` : `changes ${it.path}${p.section ? ` (${p.section})` : ""}`;
  const notes = [
    ...it.collisions.map((c) => `ID ${c.id} is already ${c.with}'s, so it becomes ${c.becomes}`),
    ...it.problems.map((m) => `problem: ${m}`),
  ];
  return `- ${p.id}: ${what}${notes.length ? `; ${notes.join("; ")}` : ""}`;
};

/* ---------------------------------------------------------- the commands */

/* Every pending proposal, one line each: what it creates or changes, an ID
   it would renumber, and any problem. Writes nothing. */
export function proposalsPreview(app) {
  const { dir, list, problems } = pending(app);
  const { items, problems: global } = plan(app, list, list);
  const proposals = items.map((it) => ({ id: it.p.id, kind: it.p.kind, target: it.path, title: it.title ?? it.p.section ?? null, summary: line(it).slice(2), collisions: it.collisions, problems: it.problems }));
  const all = [...problems, ...(list.length ? global : [])];
  const text = [
    list.length ? `${plural(list.length, "HELIX proposal")} pending in ${dir}/:` : `No HELIX proposals pending in ${dir}/.`,
    ...items.map(line),
    ...all.map((m) => `Problem: ${m}`),
    ...(list.length ? ["Nothing was written. Apply the ones the person accepts by their IDs."] : []),
  ].join("\n");
  return { proposals, problems: all, text };
}

/* Apply the accepted proposals to HELIX, all or nothing. { accepted: [ids], dryRun }. */
export function proposalsApply(app, { accepted, dryRun = false } = {}) {
  const ids = [...new Set((Array.isArray(accepted) ? accepted : accepted == null ? [] : [accepted]).map(String).map((s) => s.trim()).filter(Boolean))];
  if (!ids.length) throw new DesignError("name the proposals the person accepted (their IDs, from the preview); nothing was written");
  const { dir, list, problems: reading, manifest } = pending(app);
  const unknown = ids.filter((id) => !list.some((p) => p.id === id));
  if (unknown.length) throw new DesignError(`no pending proposal ${unknown.join(", ")} in ${dir}/ (pending: ${list.map((p) => p.id).join(", ") || "none"}); nothing was written`);
  const chosen = list.filter((p) => ids.includes(p.id));
  const { items, files, problems } = plan(app, list, chosen);
  const all = [...reading, ...problems, ...items.flatMap((it) => it.problems.map((m) => `${it.p.id}: ${m}`))];
  if (all.length) throw new DesignError(`nothing was written; ${plural(all.length, "problem")}:\n${all.map((m) => `  - ${m}`).join("\n")}`, { problems: all });

  const applied = items.map((it) => ({ id: it.p.id, target: it.path, ...(it.renumbered ? { renumbered: it.renumbered } : {}) }));
  const left = list.length - chosen.length;
  const summary = (verb) => [
    `${verb} ${plural(applied.length, "proposal")} to HELIX:`,
    ...items.map((it) => `- ${it.p.id}: ${it.p.kind === "new" ? "created" : "changed"} ${it.path}${it.renumbered ? ` (as ${it.renumbered.to}: ${it.renumbered.from} is ${it.collisions[0].with}'s; references rewritten)` : ""}`),
    `${plural(left, "proposal")} still pending in ${dir}/.`,
  ].join("\n");
  if (dryRun) return { applied, dryRun: true, text: summary("Would apply") };

  // Write, keeping what was there to put back if a write fails; then move the applied proposals out of the pending set.
  const written = [], moved = [];
  try {
    for (const [path, f] of files) {
      const abs = join(app, path);
      mkdirSync(dirname(abs), { recursive: true });
      written.push([abs, existsSync(abs) ? readFileSync(abs, "utf8") : null]);
      writeFileSync(abs, f.after);
    }
    for (const p of chosen) {
      const from = join(app, dir, p.file), to = join(app, dir, "applied", p.file);
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
      moved.push([from, to]);
    }
    if (manifest) {
      const done = new Set(ids);
      const appliedFile = (f) => `applied/${f}`;
      const next = {
        ...manifest,
        proposals: (manifest.proposals ?? []).filter((p) => !done.has(p.id)),
        drafts: (manifest.drafts ?? []).filter((d) => !done.has(d.id)),
        applied: [...(manifest.applied ?? []), ...items.map((it) => ({ id: it.p.id, path: it.path, file: appliedFile(it.p.file), ...(it.renumbered ? { renumbered: it.renumbered } : {}) }))],
      };
      writeInApp(app, `${dir}/proposals.json`, JSON.stringify(next, null, 2) + "\n");
    }
  } catch (e) {
    for (const [from, to] of moved.reverse()) try { renameSync(to, from); } catch { /* best effort */ }
    for (const [abs, before] of written.reverse()) try { if (before == null) rmSync(abs, { force: true }); else writeFileSync(abs, before); } catch { /* best effort */ }
    throw new DesignError(`applying failed (${e.message}); what was written was put back, and nothing changed`);
  }
  return { applied, text: summary("Applied") };
}
