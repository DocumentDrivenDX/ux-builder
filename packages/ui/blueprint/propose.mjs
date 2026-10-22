/* ux-builder-blueprint propose: HELIX content drafted from the blueprint,
   as proposals a person applies (FEAT-012 DRF-01, DRF-02; ADR-030 decisions
   1 and 5; CONTRACT-004 Flows and journeys). Node only.

     import { propose, writeProposals } from "./propose.mjs";
     const r = propose(blueprint, { blueprintFile: "app.blueprint.json" });
     writeProposals(r, "helix-proposals");

   HELIX governs. propose reads the documents of the flow under the
   .helix.yml marker above the blueprint (found by type and ID from their
   ddx: frontmatter) and the installed HELIX's templates, and returns
   unified-diff patches; it never writes a HELIX document. Each proposal is
   one section:
   - a story's Walkthrough, from its journey;
   - a Mermaid flowchart of the flow, as the governing solution design's
     Screen Flow (after System Decomposition);
   - the primary journey's sequence diagram, as architecture's Data Flow;
   - DESIGN.md's navigation table (Destinations by Size Class, under
     Navigation and Active State);
   - the story test plan's Journey Scenarios (after Acceptance Criteria Test
     Mapping).
   - for HELIX's UX types (FEAT-015 RPT-09; US-104): an
     interaction-state-diagram and a wireframe per screen, a screen-flow for
     the feature and a user-journey-map per journey (ux-docs.mjs). When the
     installed HELIX defines the type, each is a patch like the rest; when it
     does not, the result names the missing types and holds each document as
     a draft (result.drafts), written under the output's drafts/ at the path
     the type would give it, from ux-builder's proposed template
     (helix-types/, a copy of docs/proposals/helix-ux-artifact-types).
   A section that is missing, empty or still the template's placeholder is
   drafted; one that already says the same is left; one that says something
   else is reported as a disagreement with both texts, and gets no patch. A
   document that does not exist yet is drafted from its template, at the
   type's output location, as a new file. The output is a function of the
   blueprint and the documents only, so two runs give the same patches. */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { findMarker, readMarker } from "./helix.mjs";
import { unifiedDiff } from "./diff.mjs";
import { flowchartBlock, navTable, scenarioRows, screensOf, sequence, walkthrough } from "./project.mjs";
import { stateModels } from "./states.mjs";
import { UX_TYPES, journeyMapSections, screenFlowSections, stateDiagramSections, wireframeSections } from "./ux-docs.mjs";

const SKIP = new Set(["node_modules", ".git", "dist", "build"]);
const PHASE = { "user-stories": "01-frame", "feature-specification": "01-frame", "user-journey-map": "01-frame", "solution-design": "02-design", architecture: "02-design", "design-system": "02-design", "screen-flow": "02-design", wireframe: "02-design", "interaction-state-diagram": "02-design", "story-test-plan": "03-test" };
// ux-builder's proposed HELIX UX types (docs/proposals/helix-ux-artifact-types), for drafts when HELIX has none.
const PROPOSED = fileURLToPath(new URL("./helix-types", import.meta.url));
// Where a type's instance goes when the installed HELIX has no meta.yml for it (HELIX v0.18.0's).
const LOCATION = { "solution-design": "docs/helix/02-design/solution-designs/SD-{id}-{name}.md", architecture: "docs/helix/02-design/architecture.md", "design-system": "docs/helix/02-design/DESIGN.md", "story-test-plan": "docs/helix/03-test/test-plans/STP-{id}-{name}.md" };
const INSTALLED = [".claude/skills/helix/references", ".agents/skills/helix/references", "skills/helix/references"];
const posix = (p) => p.split(sep).join("/");
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* ------------------------------------------------------------ Markdown */

/* Frontmatter fields propose needs: id, type, and the IDs it links to. */
export function frontmatter(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
  const get = (k) => new RegExp(`^\\s+${k}:\\s*["']?([^"'\\s]+)["']?\\s*$`, "m").exec(fm)?.[1] ?? null;
  return { id: get("id"), type: get("type"), links: [...fm.matchAll(/^\s+to:\s*["']?([^"'\s]+)["']?\s*$/gm)].map((m) => m[1]) };
}

/* Headings of a Markdown text, outside code fences: { index, level, title }. */
function headings(lines) {
  const out = [];
  let fence = false;
  lines.forEach((l, index) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    const h = !fence && /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
    if (h) out.push({ index, level: h[1].length, title: h[2] });
  });
  return out;
}

/* The heading match: case, punctuation and [placeholders] ignored (as the starter's heading merge). */
export const key = (s) => s.toLowerCase().replace(/\[[^\]]*\]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/* A section's own lines: from its heading to the next heading at its level or above. */
function sectionAt(lines, hs, k) {
  const h = hs[k];
  const next = hs.slice(k + 1).find((x) => x.level <= h.level);
  return { ...h, start: h.index + 1, end: next ? next.index : lines.length };
}
function find(lines, title) {
  const hs = headings(lines);
  const k = hs.findIndex((h) => key(h.title) === key(title));
  return k < 0 ? null : sectionAt(lines, hs, k);
}
const body = (lines, s) => lines.slice(s.start, s.end).join("\n").trim();
const norm = (t) => t.replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").trim();

/* Whether a section's text is still unwritten: empty, the template's own
   text, or only placeholders ([…], %% comments, empty diagrams, table
   scaffolding). */
export function unwritten(text, templateText) {
  const t = norm(text);
  // The template's text with its own ID filled in (WF-XXX drafted as WF-001) is still the template's.
  const ids = (x) => x.replace(/\b([A-Z]+)-(?:XXX|\d+)\b/g, "$1-N");
  if (!t || (templateText != null && ids(t) === ids(norm(templateText)))) return true;
  // A [placeholder] may run over several lines.
  const ls = text.replace(/<!--[\s\S]*?-->/g, "").replace(/\[(?!\*\])[^\]]*\]/g, (m) => `[${m.includes("\n") ? "…]\n[…" : "…"}]`).split("\n").map((l) => l.trim()).filter(Boolean);
  // (A statechart's [*] is a start or end, not a placeholder.)
  return ls.every((l, i) => /\[(?!\*\])[^\]]+\]/.test(l) || /^(```|~~~)/.test(l) || /^%%/.test(l) || /^(sequenceDiagram|graph|flowchart|erDiagram|stateDiagram-v2)\b/.test(l) || /^\|[\s:|-]+\|$/.test(l) || (/^\|.*\|$/.test(l) && /^\|[\s:|-]+\|$/.test(ls[i + 1] ?? "")));
}

/* ------------------------------------------------- the starter's draft */
/* Ported from @ux-builder/create-app's helix-docs.mjs (FEAT-010 HLA-03,
   ADR-027): a type's template with ddx: id, type, status and links set, its
   title replaced and named lines filled. Copied, not imported, so
   @ux-builder/ui does not depend on the starter. */
function parse(text) {
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const rest = fm ? text.slice(fm[0].length) : text;
  const sections = [];
  let head = "", cur = null;
  for (const line of rest.split("\n")) {
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { cur = { level: h[1].length, title: h[2].trim(), lines: [] }; sections.push(cur); continue; }
    if (cur) cur.lines.push(line); else head += line + "\n";
  }
  return { frontmatter: fm?.[1] ?? null, head, sections };
}
export function draft(template, { id, type, title, links = [], intro, fields = {}, refs = {} }) {
  const t = parse(template ?? "");
  for (const [name, value] of Object.entries(fields)) t.head = t.head.replace(new RegExp(`^\\*\\*${name}\\*\\*:.*$`, "m"), `**${name}**: ${value}`);
  const fieldLines = (ls) => ls.map((l) => { const m = /^\*\*([^*]+)\*\*:/.exec(l); return m && fields[m[1]] != null ? `**${m[1]}**: ${fields[m[1]]}` : l; });
  let fm = (t.frontmatter ?? "ddx:\n  id: X").split("\n").filter((l) => !/^\s{2}(type|status):/.test(l));
  fm = fm.map((l) => (/^\s{2}id:/.test(l) ? `  id: ${id}\n  type: ${type}\n  status: draft` : l));
  if (links.length && !fm.some((l) => /^\s{2}links:/.test(l))) {
    const at = fm.findIndex((l) => /status: draft/.test(l));
    fm.splice(at + 1, 0, "  links:", ...links.flatMap(([kind, to]) => [`    - kind: ${kind}`, `      to: ${to}`]));
  }
  const out = [];
  for (const [i, s] of t.sections.entries()) {
    out.push(`${"#".repeat(s.level)} ${i === 0 && title ? title : s.title}`);
    if (i === 0 && intro) out.push("", intro);
    // Named lines anywhere, not only under the title (a story test plan's Story Reference).
    out.push(...fieldLines(s.lines));
  }
  if (!t.sections.length && title) out.push(`# ${title}`, "", intro ?? "");
  const prefix = { "story-test-plan": "STP", "solution-design": "SD", "interaction-state-diagram": "ISD", wireframe: "WF", "screen-flow": "SF", "user-journey-map": "UJM" }[type] ?? "NONE";
  let text = `---\n${fm.join("\n")}\n---\n${t.head.trim() ? `\n${t.head.trim()}\n` : ""}\n${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`
    .replace(new RegExp(`\\b${prefix}-XXX`, "g"), id);
  // Other IDs the template names (depends_on: SF-XXX): the ones known, and the rest dropped from depends_on.
  for (const [from, to] of Object.entries(refs)) if (to) text = text.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  return text.replace(/^---\n[\s\S]*?\n---\n/, (f) => f.replace(/^[ \t]+-[ \t]+[A-Z]+-XXX\n/gm, "").replace(/^([ \t]+)depends_on:\n(?!\1[ \t])/m, ""));
}

/* ------------------------------------------------------------- HELIX */

/* The installed HELIX's references (templates), from the marker's directory. */
function installed(root) {
  for (const d of INSTALLED) if (existsSync(join(root, d, "activities"))) return join(root, d);
  return null;
}
function typeInfo(refs, type) {
  const base = refs && join(refs, "activities", PHASE[type], "artifacts", type);
  const read = (f) => (base && existsSync(join(base, f)) ? readFileSync(join(base, f), "utf8") : null);
  const meta = read("meta.yml") ?? "";
  const location = (/^\s*location:\s*"?([^"\n]+)"?/m.exec(meta)?.[1] ?? "").trim();
  return { template: read("template.md"), location: location || LOCATION[type] || null, base: `activities/${PHASE[type]}/artifacts/${type}`, proposed: refs === PROPOSED };
}

/* Every HELIX document of the flow: { path, rel, text, id, type, links }. */
function documents(flowRoot, root) {
  const docs = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => byName(a.name, b.name))) {
      if (SKIP.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) {
        const text = readFileSync(p, "utf8");
        const f = frontmatter(text);
        if (f.id || f.type) docs.push({ path: p, rel: posix(relative(root, p)), text, ...f });
      }
    }
  };
  walk(flowRoot);
  return docs;
}
const isType = (d, t) => d.type === t || (t === "user-stories" && /^user-stor/.test(d.type ?? ""));

/* ------------------------------------------------------------ propose */

const slugOf = (file) => file.split("/").pop().replace(/\.md$/, "").replace(/^[A-Z]+-\d+-?/, "");
const numberOf = (id) => /-(\d+)$/.exec(id ?? "")?.[1] ?? null;

/* The proposals for a blueprint: { marker, proposals, disagreements,
   current, problems }, or { marker: null } when no .helix.yml is found
   above blueprintFile. Writes nothing. */
export function propose(bp, { blueprintFile = "app.blueprint.json" } = {}) {
  const marker = findMarker(dirname(resolve(blueprintFile)));
  if (!marker) return { marker: null };
  const root = dirname(marker);
  const flow = readMarker(marker);
  const flowRoot = flow?.root ?? join(root, "docs/helix");
  const refs = installed(root);
  const version = (() => { try { return JSON.parse(readFileSync(join(refs, "..", "HELIX-VERSION.json"), "utf8")).version ?? null; } catch { return null; } })();
  const docs = documents(flowRoot, root);
  const screens = screensOf(bp);
  const journeys = (Array.isArray(bp.journeys) ? bp.journeys : []).filter((j) => j && typeof j === "object" && typeof j.id === "string");
  const result = { marker: posix(relative(process.cwd(), marker)) || ".helix.yml", flow: flow?.id ?? null, helix: refs ? posix(relative(root, refs)) : null, proposals: [], disagreements: [], current: [], problems: [], drafts: [], uxTypes: { installed: [], missing: [] } };
  if (!refs) result.problems.push(`No installed HELIX templates (${INSTALLED.join(", ")}) under ${posix(relative(process.cwd(), root)) || "."}: new documents and sections are drafted without them.`);

  // Documents changed in memory, by path, so two sections of one document compose.
  const texts = new Map();
  const locate = (type, location, vars) => {
    const rel = location.replace(/^docs\/helix\//, "").replace(/\{id\}/g, vars.number ?? "").replace(/\{(name|screen)\}/g, vars.slug ?? "");
    return join(flowRoot, rel);
  };

  /* Sections of one document: draft them, leave them, or report them. One
     proposal per document; a type HELIX does not define (info.proposed) is
     held as a draft instead of a patch. */
  const apply = ({ id, kind, doc, create, type, parts, info = typeInfo(refs, type), intro }) => {
    let path, before, isNew = false;
    if (doc) { path = doc.path; before = texts.get(path) ?? doc.text; }
    else {
      if (!info.location) { result.problems.push(`HELIX has no output location for the ${type} type; ${kind} not proposed.`); return; }
      path = locate(type, info.location, create);
      isNew = !texts.has(path);
      if (!info.template) result.problems.push(`HELIX has no template for the ${type} type (${info.base}/template.md): ${posix(relative(root, path))} is drafted from the blueprint alone.`);
      before = texts.get(path) ?? draft(info.template, { ...create, type, intro: intro ?? `> Drafted by \`ux-builder-blueprint propose\` from the blueprint${info.proposed ? ` and ux-builder's proposed ${type} template (docs/proposals/helix-ux-artifact-types)` : version ? ` and HELIX ${version}'s template` : ""}. A person reviews and applies it.` });
    }
    const rel = posix(relative(root, path));
    const lines = before.replace(/\n$/, "").split("\n");
    const tmpl = info.template ? info.template.split("\n") : null;
    const changed = [];
    for (const { heading, level = 2, anchor, inside = false, text } of parts) {
      const tsec = tmpl && find(tmpl, heading);
      const templateBody = tsec ? body(tmpl, tsec) : null;
      const found = find(lines, heading);
      const block = text.trim();
      if (found) {
        const have = body(lines, found);
        if (norm(have) === norm(block)) { result.current.push({ id, kind, path: rel, section: heading }); continue; }
        if (!unwritten(have, templateBody)) { result.disagreements.push({ id, kind, path: rel, section: heading, helix: have, blueprint: block }); continue; }
        lines.splice(found.start, found.end - found.start, "", block, "");
      } else {
        // Heading merge: under (or after) the anchor the template places it by; else at the end, and say so.
        const a = anchor && find(lines, anchor);
        const at = a ? a.end : lines.length;
        const lvl = a ? (inside ? a.level + 1 : a.level) : level;
        if (anchor && !a && !(tmpl && find(tmpl, anchor))) result.problems.push(`HELIX's ${type} template has no "${anchor}" section: "${heading}" is drafted at the end of ${rel}.`);
        lines.splice(at, 0, ...(at > 0 && lines[at - 1].trim() ? [""] : []), `${"#".repeat(lvl)} ${heading}`, "", block, "");
      }
      changed.push(heading);
    }
    if (!changed.length) return;
    const after = lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
    texts.set(path, after);
    if (info.proposed) { result.drafts.push({ id, kind, type, path: rel, sections: changed, text: after }); return; }
    const original = doc ? doc.text : null;
    result.proposals.push({ id, kind, path: rel, section: changed.join(", "), target: doc ? { kind: "existing", id: doc.id, type: doc.type } : { kind: "new", id: create.id, type }, isNew, original, after });
  };
  /* One section of one document. */
  const section = ({ heading, level, anchor, inside, text, ...rest }) => apply({ ...rest, parts: [{ heading, level, anchor, inside, text }] });

  const stories = new Map(docs.filter((d) => isType(d, "user-stories") && /^US-\d+$/.test(d.id ?? "")).map((d) => [d.id, d]));
  const journeysOf = (story) => journeys.filter((j) => j.story === story);
  const storyIds = [...new Set(journeys.map((j) => j.story).filter((s) => typeof s === "string"))];

  // 1. Each story's Walkthrough, from its first journey (US-089-AC1).
  for (const sid of storyIds) {
    const story = stories.get(sid);
    if (!story) { result.problems.push(`${sid}, the story of ${journeysOf(sid).map((j) => j.id).join(", ")}, is not a HELIX story: no walkthrough or scenarios proposed for it.`); continue; }
    section({ id: `${sid}-walkthrough`, kind: "walkthrough", doc: story, heading: "Walkthrough", anchor: "Context", text: walkthrough(journeysOf(sid)[0], screens), type: "user-stories" });
  }

  // 2. The flowchart, in the solution design of the stories' feature (US-089-AC2).
  const features = [...new Set(storyIds.flatMap((sid) => {
    const s = stories.get(sid);
    if (!s) return [];
    const line = /^\*\*Feature\*\*:\s*\[{0,2}(FEAT-\d+)/m.exec(s.text)?.[1];
    return [...s.links.filter((l) => /^FEAT-\d+$/.test(l)), ...(line ? [line] : [])];
  }))];
  const governs = (d, f) => d.links.includes(f) || new RegExp(`^\\*\\*Feature\\*\\*:.*\\b${f}\\b`, "m").test(d.text);
  const governing = () => features.find((f) => docs.some((d) => isType(d, "solution-design") && governs(d, f))) ?? features[0] ?? null;
  const hasActions = [...screens.values()].some(({ s, modals }) => Array.isArray(s.actions) || [...modals.values()].some((m) => Array.isArray(m.actions)));
  if (hasActions) {
    const sds = docs.filter((d) => isType(d, "solution-design"));
    const feature = governing();
    const sd = feature ? sds.find((d) => governs(d, feature)) : sds.length === 1 ? sds[0] : null;
    const featDoc = feature && docs.find((d) => d.id === feature);
    if (sd || feature) {
      const n = numberOf(feature);
      section({ id: `${sd?.id ?? `SD-${n}`}-screen-flow`, kind: "flowchart", doc: sd, heading: "Screen Flow", anchor: "System Decomposition", text: flowchartBlock(bp), type: "solution-design",
        create: { id: `SD-${n}`, number: n, slug: featDoc ? slugOf(featDoc.rel) : "screen-flow", links: [["informed_by", feature]], title: `Solution Design: SD-${n}${featDoc ? ` — ${/^#\s+(?:.*?—\s*)?(.*)$/m.exec(featDoc.text)?.[1] ?? feature}` : ""}`, fields: { Feature: `[[${feature}]]` } } });
    } else result.problems.push("No governing feature: the blueprint's journeys name no HELIX story with a FEAT link, and there is not exactly one solution design; no flowchart proposed.");

    // 3. The primary (first) journey's sequence diagram, as architecture's Data Flow (US-089-AC2).
    if (journeys.length) {
      const arch = docs.find((d) => isType(d, "architecture") || d.id === "architecture");
      section({ id: "architecture-data-flow", kind: "sequence", doc: arch, heading: "Data Flow", anchor: "Deployment", text: sequence(journeys[0], screens), type: "architecture", create: { id: "architecture", links: [["informed_by", "prd"]] } });
    }
  }

  // 4. DESIGN.md's navigation table (US-089-AC3).
  if (bp.kind !== "view" && Array.isArray(bp.destinations) && bp.destinations.length) {
    const design = docs.find((d) => isType(d, "design-system") || d.id === "design-system");
    section({ id: "design-system-navigation", kind: "navigation", doc: design, heading: "Destinations by Size Class", anchor: "Navigation and Active State", inside: true, text: navTable(bp), type: "design-system",
      create: { id: "design-system", links: [["informed_by", "prd"]], title: `DESIGN.md — ${bp.name ?? "App"}` } });
  }

  // 5. Each story's test plan scenarios, from its journeys (US-089-AC4).
  for (const sid of storyIds) {
    const story = stories.get(sid);
    if (!story) continue;
    const n = numberOf(sid);
    const stp = docs.find((d) => isType(d, "story-test-plan") && (d.links.includes(sid) || new RegExp(`\\[\\[${sid}[-\\]]`).test(d.text)))
      ?? docs.find((d) => isType(d, "story-test-plan") && d.id === `STP-${n}`);
    const slug = slugOf(story.rel);
    const sd = result.proposals.concat(result.current, result.disagreements).find((p) => p.kind === "flowchart");
    const sdRef = sd ? sd.path.split("/").pop().replace(/\.md$/, "") : null;
    section({ id: `${stp?.id ?? `STP-${n}`}-journey-scenarios`, kind: "scenarios", doc: stp, heading: "Journey Scenarios", anchor: "Acceptance Criteria Test Mapping", text: journeysOf(sid).map((j) => scenarioRows(j, screens)).join("\n\n"), type: "story-test-plan",
      create: { id: `STP-${n}`, number: n, slug, links: [["informed_by", sid]], title: `Story Test Plan: STP-${n}-${slug}`,
        fields: { "User Story": `[[${story.rel.split("/").pop().replace(/\.md$/, "")}]]`, ...(sdRef ? { "Related Solution Design": `[[${sdRef}]]` } : {}) } } });
  }

  // 6. HELIX's UX types (US-104-AC3): patches where HELIX defines the type, drafts where it does not.
  uxTypes({ bp, docs, refs, screens, journeys, stories, feature: governing(), result, apply });

  // The patches, each from the document as HELIX has it (or nothing) to the document with this section.
  // Two sections of one document: the second patch is against the first's result, and both are listed.
  const seen = new Map();
  for (const p of result.proposals) {
    const from = seen.has(p.path) ? seen.get(p.path) : p.original;
    p.patch = unifiedDiff(p.path, from, p.after);
    p.file = `${p.id}.patch`;
    if (seen.has(p.path)) p.after_patch = result.proposals.find((q) => q.path === p.path && q !== p)?.file;
    seen.set(p.path, p.after);
    delete p.original; delete p.after; delete p.isNew;
  }
  return result;
}

/* --------------------------------------------------- HELIX's UX types */

const pad = (n) => String(n).padStart(3, "0");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";

/* The UX documents (US-104-AC3): an interaction-state-diagram and a
   wireframe per screen (one number for both), a screen-flow for the
   governing feature and a user-journey-map per journey. A document HELIX
   already has for the screen, feature or journey is updated; a new one takes
   the next free number. */
function uxTypes({ bp, docs, refs, screens, journeys, stories, feature, result, apply }) {
  const info = {};
  for (const type of Object.keys(UX_TYPES)) {
    const own = typeInfo(refs, type);
    if (own.template) { info[type] = own; result.uxTypes.installed.push(type); }
    else { info[type] = typeInfo(PROPOSED, type); result.uxTypes.missing.push(type); }
  }
  const missing = result.uxTypes.missing;
  if (missing.length) result.problems.push(`The installed HELIX${refs ? "" : " (none found)"} does not define ${missing.join(", ")}: those documents are drafts in the output's drafts/ (at the path HELIX would give them), from ux-builder's proposed templates (docs/proposals/helix-ux-artifact-types), not patches.`);

  const ofType = (type) => (info[type].proposed ? [] : docs.filter((d) => d.type === type));
  const used = (types) => new Set(types.flatMap((t) => ofType(t)).map((d) => Number(numberOf(d.id))).filter((n) => n > 0));
  const next = (taken) => { let n = 1; while (taken.has(n)) n++; taken.add(n); return n; };
  const storyTitle = (sid) => { const d = stories.get(sid); return d ? /^#\s+(?:US-\d+:\s*)?(.*)$/m.exec(d.text)?.[1] ?? sid : sid; };

  // The screen flow: one per feature, numbered as the feature.
  const featNo = numberOf(feature);
  const sfDoc = ofType("screen-flow").find((d) => (featNo && d.id === `SF-${featNo}`) || (feature && (d.links.includes(feature) || d.text.includes(`[[${feature}]]`))));
  const sfId = sfDoc?.id ?? `SF-${featNo ?? pad(next(used(["screen-flow"])))}`;
  const featDoc = feature && docs.find((d) => d.id === feature);
  const sd = feature && docs.find((d) => isType(d, "solution-design") && d.links.includes(feature));

  // One number per screen for its wireframe and its state diagram.
  const models = new Map(stateModels(bp).map((m) => [m.screen, m]));
  const taken = used(["wireframe", "interaction-state-diagram"]);
  const subject = (type, id) => ofType(type).find((d) => new RegExp(`^\\*\\*(Subject|Screen flow node)\\*\\*:.*\`${escRe(id)}\``, "m").test(d.text));
  const numbers = new Map();
  for (const id of screens.keys()) {
    const have = subject("interaction-state-diagram", id) ?? subject("wireframe", id);
    numbers.set(id, have ? numberOf(have.id) : null);
  }
  for (const id of screens.keys()) if (!numbers.get(id)) numbers.set(id, pad(next(taken)));

  const allStories = [...new Set([...screens.values()].flatMap(({ s }) => (Array.isArray(s.stories) ? s.stories : [])).concat(journeys.map((j) => j.story)).filter((x) => typeof x === "string"))];
  for (const [id, screen] of screens) {
    const n = numbers.get(id), m = models.get(id);
    const isd = `ISD-${n}`, wf = `WF-${n}`;
    const own = Array.isArray(screen.s.stories) ? screen.s.stories.filter((x) => typeof x === "string") : [];
    const storiesLine = own.length ? own.map((x) => `[[${x}]]`).join(", ") : "none";
    const isdDoc = subject("interaction-state-diagram", id);
    apply({ id: `${isdDoc?.id ?? isd}-states`, kind: "state-diagram", type: "interaction-state-diagram", doc: isdDoc, info: info["interaction-state-diagram"],
      create: { id: isd, number: n, slug: slug(id), title: `${isd}: ${m.title} States`, refs: { "SF-XXX": sfId, "WF-XXX": wf, "US-XXX": own[0] },
        fields: { Subject: `\`${id}\` in [[${sfId}]] | **Wireframe**: [[${wf}]] | **Stories**: ${storiesLine}` } },
      parts: chain(stateDiagramSections(m, { screen, wf, sf: sfId })) });
    const wfDoc = subject("wireframe", id);
    apply({ id: `${wfDoc?.id ?? wf}-wireframe`, kind: "wireframe", type: "wireframe", doc: wfDoc, info: info.wireframe,
      create: { id: wf, number: n, slug: slug(id), title: `${wf}: ${m.title}`, refs: { "SF-XXX": sfId, "ISD-XXX": isd, "US-XXX": own[0] },
        fields: { "Screen flow node": `[[${sfId}]] \`${id}\` | **Stories**: ${storiesLine} | **State diagram**: [[${isd}]]` } },
      parts: chain(wireframeSections(m, { bp, screen, id: wf, isd })) });
  }

  const ujmTaken = used(["user-journey-map"]);
  const ujms = journeys.map((j) => {
    const have = ofType("user-journey-map").find((d) => new RegExp(`journey ${escRe(j.id)}\\b`).test(d.text));
    return { j, doc: have, id: have?.id ?? null };
  });
  for (const u of ujms) if (!u.id) u.id = `UJM-${pad(next(ujmTaken))}`;

  if (featNo || screens.size) {
    apply({ id: `${sfId}-screen-flow`, kind: "screen-flow", type: "screen-flow", doc: sfDoc, info: info["screen-flow"],
      create: { id: sfId, number: sfId.slice(3), slug: featDoc ? slugOf(featDoc.rel) : slug(bp.name), title: `${sfId}: ${featDoc ? /^#\s+(?:.*?—\s*)?(.*)$/m.exec(featDoc.text)?.[1] ?? feature : bp.name ?? "App"} Screen Flow`,
        refs: { "FEAT-XXX": feature, "US-XXX": allStories[0] },
        fields: { Feature: `${feature ? `[[${feature}]]` : "none"} | **Solution design**: ${sd ? `[[${sd.id}]]` : "none"} | **Journey maps**: ${ujms.length ? ujms.map((u) => `[[${u.id}]]`).join(", ") : "none"}` } },
      parts: chain(screenFlowSections(bp, { stories: allStories })) });
  }

  for (const { j, doc, id } of ujms) {
    const sid = typeof j.story === "string" ? j.story : null;
    apply({ id: `${id}-journey-map`, kind: "journey-map", type: "user-journey-map", doc, info: info["user-journey-map"],
      create: { id, number: id.slice(4), slug: slug(sid && stories.get(sid) ? storyTitle(sid) : j.id), title: `${id}: ${sid ? storyTitle(sid) : j.id}`, refs: { "FEAT-XXX": feature, "US-XXX": sid, "SF-XXX": sfId },
        fields: { Feature: `${feature ? `[[${feature}]]` : "none"} | **Map kind**: future-state | **Evidence**: assumption-based (from blueprint journey ${j.id})` } },
      parts: chain(journeyMapSections(bp, j)) });
  }
}
/* Each section placed after the one before it, where a document lacks it. */
const chain = (sections) => sections.map((x, i) => ({ ...x, anchor: i ? sections[i - 1].heading : undefined }));

/* The report: what was proposed, where HELIX and the blueprint disagree
   (both texts), and the problems met. Deterministic. */
export function report(r) {
  const out = ["# Blueprint proposals", "", "Drafted by `ux-builder-blueprint propose`. HELIX governs: nothing here is applied. Review each patch, then apply the ones you accept (`git apply <patch>`) from the repository root.", ""];
  out.push("## Patches", "");
  if (!r.proposals.length) out.push("None.", "");
  for (const p of r.proposals) out.push(`- \`${p.file}\` — ${p.path}, *${p.section}*${p.target.kind === "new" ? " (a new document, from the template)" : ""}${p.after_patch ? `; apply after \`${p.after_patch}\`` : ""}`);
  if (r.proposals.length) out.push("");
  out.push("## Disagreements", "");
  if (!r.disagreements.length) out.push("None.", "");
  for (const d of r.disagreements) out.push(`### ${d.path} — ${d.section}`, "", "No patch: the section already says something else. HELIX governs; change the blueprint, or the document, so they agree.", "", "HELIX says:", "", "````markdown", d.helix, "````", "", "The blueprint gives:", "", "````markdown", d.blueprint, "````", "");
  if (r.current.length) { out.push("## Already current", ""); for (const c of r.current) out.push(`- ${c.path}, *${c.section}*`); out.push(""); }
  if (r.uxTypes) {
    out.push("## HELIX UX types", "");
    out.push(`- Defined by the installed HELIX (patches above): ${r.uxTypes.installed.length ? r.uxTypes.installed.join(", ") : "none"}`);
    out.push(`- Missing from it (drafts below, not patches): ${r.uxTypes.missing.length ? r.uxTypes.missing.join(", ") : "none"}`, "");
    if (r.drafts?.length) {
      out.push("### Drafts", "", "Shaped after ux-builder's proposed templates (docs/proposals/helix-ux-artifact-types). Once HELIX defines the type, run propose again to get patches; until then, copy a draft to its path if the team keeps it.", "");
      for (const d of r.drafts) out.push(`- \`drafts/${d.path}\` — ${d.type}`);
      out.push("");
    }
  }
  out.push("## Problems", "");
  if (!r.problems.length) out.push("None.", "");
  for (const p of r.problems) out.push(`- ${p}`);
  return out.join("\n").replace(/\n*$/, "\n");
}

/* Write the patches, the report and proposals.json into dir, replacing the
   ones an earlier run wrote. Returns the files written. */
export function writeProposals(r, dir) {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (f.endsWith(".patch")) rmSync(join(dir, f));
  rmSync(join(dir, "drafts"), { recursive: true, force: true });
  const files = [];
  for (const p of r.proposals) { writeFileSync(join(dir, p.file), p.patch); files.push(p.file); }
  for (const d of r.drafts ?? []) {
    const to = join(dir, "drafts", ...d.path.split("/"));
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, d.text);
    files.push(`drafts/${d.path}`);
  }
  writeFileSync(join(dir, "report.md"), report(r));
  const { marker, ...rest } = r;
  writeFileSync(join(dir, "proposals.json"), JSON.stringify({ ...rest, proposals: r.proposals.map(({ patch, ...p }) => p), drafts: (r.drafts ?? []).map(({ text, ...d }) => ({ ...d, file: `drafts/${d.path}` })) }, null, 2) + "\n");
  return [...files, "report.md", "proposals.json"];
}
