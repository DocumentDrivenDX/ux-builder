/* HELIX binding for the assessment (FEAT-009 HLX-01 to HLX-05; ADR-026
   decision 2; CONTRACT-006 "HELIX resolution").

   Reads an app's HELIX inputs the way HELIX does and never writes them:
   the .helix.yml marker (found walking up to the git root), the flow it
   selects, the artifact catalogue (graph.yml and each type's meta.yml), and
   the instances under the flow's root with their ddx: frontmatter. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";

export class HelixError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/* The git root above dir (the directory holding .git), else null. */
export function gitRoot(dir) {
  for (let d = resolve(dir); ; d = dirname(d)) {
    if (existsSync(join(d, ".git"))) return d;
    if (dirname(d) === d) return null;
  }
}

/* The first .helix.yml walking up from dir to the git root, as HELIX
   discovers it; or the explicit path. */
export function findMarker(dir, explicit) {
  if (explicit) { const p = resolve(dir, explicit); return existsSync(p) ? p : null; }
  const stop = gitRoot(dir) ?? resolve(dir);
  for (let d = resolve(dir); ; d = dirname(d)) {
    if (existsSync(join(d, ".helix.yml"))) return join(d, ".helix.yml");
    if (d === stop || dirname(d) === d) return null;
  }
}

/* Parse and check the marker; refuse what HELIX refuses (its codes). */
export function readMarker(file) {
  const repo = gitRoot(dirname(file)) ?? dirname(file);
  let data;
  try { data = parseYaml(readFileSync(file, "utf8")); } catch (e) { throw new HelixError("M001", `${file}: ${e.message.split("\n")[0]}`); }
  const flows = data?.flows ?? data?.methodologies;
  if (!Array.isArray(flows) || !flows.length) throw new HelixError("M001", `${file}: no flows: list`);
  const seen = new Set();
  const out = flows.map((f) => {
    if (!f?.id || !f?.root) throw new HelixError("M001", `${file}: every flow needs id and root`);
    if (seen.has(f.id)) throw new HelixError("M003", `${file}: flow "${f.id}" is listed twice`);
    seen.add(f.id);
    const root = resolve(repo, f.root);
    if (relative(repo, root).startsWith("..") || isAbsolute(relative(repo, root))) throw new HelixError("M002", `${file}: flow "${f.id}" root ${f.root} is outside the repository`);
    if (!existsSync(root) || !statSync(root).isDirectory()) throw new HelixError("M006", `${file}: flow "${f.id}" root ${f.root} does not exist`);
    return { id: f.id, root, rootRel: relative(repo, root) || ".", ...(f.instance ? { instance: f.instance } : {}) };
  });
  const def = data.defaults?.flow;
  if (def && !seen.has(def)) throw new HelixError("M004", `${file}: defaults.flow "${def}" is not one of the flows`);
  return { file, repo, flows: out, defaultFlow: def ?? null, graph: data.graph ?? data.catalog ?? null };
}

/* The flow to assess: the manifest's, else defaults.flow, else the only one. */
export function resolveFlow(marker, wanted) {
  if (wanted) {
    const f = marker.flows.find((x) => x.id === wanted || x.instance === wanted);
    if (!f) throw new HelixError("flow", `the marker has no flow "${wanted}"; it lists ${marker.flows.map((x) => x.id).join(", ")}`);
    return f;
  }
  if (marker.defaultFlow) return marker.flows.find((x) => x.id === marker.defaultFlow);
  if (marker.flows.length === 1) return marker.flows[0];
  throw new HelixError("ambiguous", `the marker lists ${marker.flows.length} flows and no defaults.flow; set helix.flow to one of: ${marker.flows.map((x) => `${x.id} (root ${x.rootRel})`).join(", ")}`);
}

const versionOf = (root) => {
  for (const p of [join(root, "../.claude-plugin/plugin.json"), join(root, "../package.json"), join(root, "../VERSION")]) {
    try { const t = readFileSync(p, "utf8"); return p.endsWith("VERSION") ? t.trim() : JSON.parse(t).version ?? null; } catch { /* next */ }
  }
  return null;
};
const commitOf = (root) => { try { return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

/* Bind the catalogue in HELIX's order; record which source bound. */
export function bindCatalog(marker, setting = "auto", { env = process.env, home = homedir() } = {}) {
  const at = (source, root) => ({ source, path: root, version: versionOf(root), commit: commitOf(root) });
  const ok = (root) => root && existsSync(join(root, "graph.yml"));
  if (setting && setting !== "auto") {
    const root = resolve(dirname(marker.file), setting);
    const r = existsSync(root) && statSync(root).isFile() ? dirname(root) : root;
    if (!ok(r)) throw new HelixError("catalog", `helix.catalog ${setting} has no graph.yml`);
    return at("manifest", r);
  }
  if (marker.graph) {
    const p = resolve(marker.repo, marker.graph);
    const r = p.endsWith(".yml") ? dirname(p) : p;
    if (ok(r)) return at("marker", r);
  }
  if (ok(join(marker.repo, "workflows"))) return at("repository", join(marker.repo, "workflows"));
  if (env.CLAUDE_PLUGIN_ROOT && ok(join(env.CLAUDE_PLUGIN_ROOT, "workflows"))) return at("plugin", join(env.CLAUDE_PLUGIN_ROOT, "workflows"));
  if (ok(join(home, ".ddx/plugins/helix/workflows"))) return at("plugin", join(home, ".ddx/plugins/helix/workflows"));
  for (const base of [join(home, ".claude/plugins/cache"), join(home, ".claude/plugins/marketplaces")]) {
    for (const found of walk(base, 4).filter((d) => d.endsWith(`${sep}helix${sep}workflows`) || d.endsWith(`${sep}workflows`) && d.includes(`${sep}helix`))) if (ok(found)) return at("plugin", found);
  }
  return { source: "none", path: null, version: null, commit: null };
}

function walk(dir, depth) {
  const out = [];
  if (depth < 0 || !existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "node_modules" || e.name.startsWith(".git")) continue;
    const p = join(dir, e.name);
    out.push(p, ...walk(p, depth - 1));
  }
  return out;
}

/* A naming pattern (FEAT-{number}-{title}.md, status-report-[id]-[date].md) as a regex. */
const namingRe = (naming) => new RegExp("^" + naming.split(/(\{[^}]+\}|\[[^\]]+\])/).map((part) => /^[{[]/.test(part) ? (/number|nnn|id$/.test(part) ? "[0-9A-Za-z]+" : "[^/]+") : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("") + "$");

/* The artifact types: id, activity, location under the flow root, naming, ID pattern. */
export function loadTypes(catalog) {
  if (!catalog?.path) return [];
  const types = [];
  const acts = join(catalog.path, "activities");
  if (!existsSync(acts)) return types;
  for (const a of readdirSync(acts)) {
    const arts = join(acts, a, "artifacts");
    if (!existsSync(arts)) continue;
    for (const t of readdirSync(arts)) {
      const meta = join(arts, t, "meta.yml");
      if (!existsSync(meta)) continue;
      let m;
      try { m = parseYaml(readFileSync(meta, "utf8")); } catch { continue; }
      const loc = (m?.output?.location ?? "").replace(/^docs\/helix\//, "");
      const naming = m?.output?.naming ?? null;
      const dir = loc.endsWith("/") || !/\.[a-z]+$/.test(loc) ? loc.replace(/\/?$/, "/") : dirname(loc) === "." ? "" : dirname(loc) + "/";
      const file = loc.endsWith("/") ? null : loc.split("/").pop();
      types.push({ id: m?.artifact?.id ?? t, activity: m?.artifact?.activity ?? a.replace(/^\d+-/, ""), dir, naming: file && !/[{[]/.test(file) ? file : naming ?? file, re: namingRe(file && !/[{[]/.test(file) ? file : (naming ?? file ?? "")), pattern: m?.id_format?.pattern ? new RegExp(`^${m.id_format.pattern}$`) : null, template: existsSync(join(arts, t, "template.md")) ? join(arts, t, "template.md") : null });
    }
  }
  return types;
}

/* HELIX's report templates (workflows/templates/*.md: alignment review,
   backfill report, polish report…): each one's id and the opening of its
   title, so a report written from one is recognised even without frontmatter. */
export function loadTemplates(catalog) {
  const dir = catalog?.path && join(catalog.path, "templates");
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => {
    const h1 = /^#\s+(.+)$/m.exec(readFileSync(join(dir, f), "utf8"))?.[1] ?? "";
    const prefix = h1.split(/[:[{]/)[0].trim();
    return { id: f.replace(/\.md$/, ""), prefix, file: join(dir, f) };
  }).filter((t) => t.prefix.length >= 6);
}

/* A glob relative to the root as a regex: ** any depth, * one segment, ? one character. */
const globRe = (g) => new RegExp("^" + g.split(/(\*\*\/?|\*|\?)/).map((p) => p === "**/" ? "(?:.*/)?" : p === "**" ? ".*" : p === "*" ? "[^/]*" : p === "?" ? "[^/]" : p.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("") + "$");
export const globOutsideRoot = (g) => isAbsolute(g) || g.split("/").includes("..");

const frontmatter = (text) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) return null;
  try { return parseYaml(m[1]) ?? null; } catch { return null; }
};

/* Every Markdown instance under the flow's root, typed and identified. */
export function instances(flow, types, { include = [], exclude = [], repo, templates = [] } = {}) {
  const inc = include.map(globRe), exc = exclude.map(globRe);
  const files = [];
  const visit = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) { if (e.name !== "node_modules" && !e.name.startsWith(".")) visit(p); } else if (e.name.endsWith(".md")) files.push(p); } };
  visit(flow.root);
  const out = [];
  for (const abs of files.sort()) {
    const rel = relative(flow.root, abs).split(sep).join("/");
    if (inc.length && !inc.some((r) => r.test(rel))) continue;
    if (exc.some((r) => r.test(rel))) continue;
    const text = readFileSync(abs, "utf8");
    const fm = frontmatter(text)?.ddx ?? null;
    let type = fm?.type ?? null, typedBy = type ? "frontmatter" : "none";
    if (!type) {
      const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/") + 1) : "";
      const name = rel.split("/").pop();
      const t = types.find((x) => x.dir === dir && x.re.test(name));
      if (t) { type = t.id; typedBy = "location"; }
    }
    if (!type) {
      // A report written from a HELIX template, by its title.
      const h1 = /^#\s+(.+)$/m.exec(text)?.[1] ?? "";
      const t = templates.find((x) => h1.startsWith(x.prefix));
      if (t) { type = t.id; typedBy = "template"; }
    }
    const id = fm?.id != null ? String(fm.id) : null;
    const t = types.find((x) => x.id === type);
    const links = [...(Array.isArray(fm?.links) ? fm.links.map((l) => ({ kind: l.kind ?? "link", to: String(l.to) })) : []), ...(Array.isArray(fm?.depends_on) ? fm.depends_on.map((to) => ({ kind: "depends_on", to: String(to) })) : [])];
    out.push({ id, type, typedBy, path: relative(repo ?? flow.root, abs).split(sep).join("/"), abs, hash: createHash("sha256").update(text).digest("hex"), idValid: !id || !t?.pattern || t.pattern.test(id), links, text });
  }
  return out;
}

/* Acceptance criteria: HELIX's US-<n>-AC<m> at a list item's start. */
export function criteriaOf(doc) {
  const out = [];
  for (const m of doc.text.matchAll(/^\s*[-*]\s*(?:\[[ xX]\]\s*)?\*{0,2}(US-\d+-AC\d+)\*{0,2}\s*[—:-]\s*(.+)$/gm)) out.push({ id: m[1], text: m[2].trim() });
  return out;
}

/* The git revision that last touched a file, else null. */
export const revisionOf = (abs) => { try { return execFileSync("git", ["-C", dirname(abs), "log", "-1", "--format=%H", "--", abs], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null; } catch { return null; } };

/* Everything above for a manifest's helix section. */
export function bind(manifestDir, helix = {}) {
  const file = findMarker(manifestDir, helix.marker);
  if (!file) throw new HelixError("no-marker", `no .helix.yml between ${manifestDir} and the git root; the assessment needs HELIX documents`);
  const marker = readMarker(file);
  const flow = resolveFlow(marker, helix.flow);
  const catalog = bindCatalog(marker, helix.catalog ?? "auto");
  return { marker, flow, catalog, types: loadTypes(catalog), templates: loadTemplates(catalog) };
}
