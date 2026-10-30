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
     Navigation and Active State), and its Modalities, Size Classes and App
     Frame (before Navigation and Active State; ADR-041, ADR-042);
   - the story test plan's Journey Scenarios (after Acceptance Criteria Test
     Mapping).
   - HELIX's UX types (HELIX v0.20.0; ADR-042 decision 2; FEAT-015 RPT-09;
     US-104), from ux-docs.mjs: a user-flow per feature the journeys' stories
     belong to (UF-<FEAT number>, in flows/UF-<n>-<feature>/), a wireframe
     per screen of it (UF-<n>-<nn>-<view>, beside the flow, with the screen's
     state diagram in its States and Events), and a user-journey-map per
     journey. An installed HELIX without one of these types' templates gets
     the document drafted from the blueprint alone, at v0.20.0's location,
     and the problem says so.
   A section that is missing, empty or still the template's placeholder is
   drafted; one that already says the same is left; one that says something
   else is reported as a disagreement with both texts, and gets no patch. A
   document that does not exist yet is drafted from its template, at the
   type's output location, as a new file. The output is a function of the
   blueprint and the documents only, so two runs give the same patches. */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { findMarker, readMarker } from "./helix.mjs";
import { unifiedDiff } from "./diff.mjs";
import { flowchartBlock, navTable, scenarioRows, screensOf, sequence, walkthrough } from "./project.mjs";
import { stateModels } from "./states.mjs";
import { checkBlueprint } from "./index.mjs";
import { journeyMapSections, modalitySection, userFlowSections, wireframeSections } from "./ux-docs.mjs";

const SKIP = new Set(["node_modules", ".git", "dist", "build"]);
const PHASE = { "user-stories": "01-frame", "feature-specification": "01-frame", "user-journey-map": "01-frame", "solution-design": "02-design", architecture: "02-design", "design-system": "02-design", "user-flow": "02-design", wireframe: "02-design", "story-test-plan": "03-test" };
// Where a type's instance goes when the installed HELIX has no meta.yml for it (HELIX v0.18.0's; the UX types v0.20.0's).
const LOCATION = { "solution-design": "docs/helix/02-design/solution-designs/SD-{id}-{name}.md", architecture: "docs/helix/02-design/architecture.md", "design-system": "docs/helix/02-design/DESIGN.md", "story-test-plan": "docs/helix/03-test/test-plans/STP-{id}-{name}.md",
  "user-flow": "docs/helix/02-design/flows/UF-{n}-{feature}/UF-{n}.md", wireframe: "docs/helix/02-design/flows/UF-{n}-{feature}/UF-{n}-{nn}-{view}.md", "user-journey-map": "docs/helix/01-frame/journey-maps/UJM-{n}-{name}.md" };
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
function sectionAt(lines, hs, k, top = false) {
  const h = hs[k];
  // top: only the text above the section's first subsection.
  const next = hs.slice(k + 1).find((x) => top || x.level <= h.level);
  return { ...h, start: h.index + 1, end: next ? next.index : lines.length };
}
function find(lines, title, top = false) {
  const hs = headings(lines);
  const k = hs.findIndex((h) => key(h.title) === key(title));
  return k < 0 ? null : sectionAt(lines, hs, k, top);
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
  // HELIX's validator needs every document's authoring home.
  if (!fm.some((l) => /^\s{2}authoring:/.test(l))) fm.splice(fm.findIndex((l) => /status: draft/.test(l)) + 1, 0, "  authoring:", "    home: repo");
  const out = [];
  for (const [i, s] of t.sections.entries()) {
    out.push(`${"#".repeat(s.level)} ${i === 0 && title ? title : s.title}`);
    if (i === 0 && intro) out.push("", intro);
    // Named lines anywhere, not only under the title (a story test plan's Story Reference).
    out.push(...fieldLines(s.lines));
  }
  if (!t.sections.length && title) out.push(`# ${title}`, "", intro ?? "");
  const prefix = { "story-test-plan": "STP", "solution-design": "SD", "user-flow": "UF", "user-journey-map": "UJM" }[type] ?? "NONE";
  let text = `---\n${fm.join("\n")}\n---\n${t.head.trim() ? `\n${t.head.trim()}\n` : ""}\n${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`
    .replace(new RegExp(`\\b${prefix}-XXX`, "g"), id);
  // Other IDs the template names (depends_on: UF-XXX): the ones known, and the rest dropped from depends_on.
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
  return { template: read("template.md"), location: location || LOCATION[type] || null, base: `activities/${PHASE[type]}/artifacts/${type}` };
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
  const result = { marker: posix(relative(process.cwd(), marker)) || ".helix.yml", flow: flow?.id ?? null, helix: refs ? posix(relative(root, refs)) : null, proposals: [], disagreements: [], current: [], problems: [],
    // Always empty since HELIX v0.20.0 defines the UX types; kept until packages/design/graph.mjs stops reading it.
    drafts: [] };
  if (!refs) result.problems.push(`No installed HELIX templates (${INSTALLED.join(", ")}) under ${posix(relative(process.cwd(), root)) || "."}: new documents and sections are drafted without them.`);

  // Documents changed in memory, by path, so two sections of one document compose.
  const texts = new Map();
  const locate = (type, location, vars) => {
    const rel = location.replace(/^docs\/helix\//, "").replace(/\{(id|n)\}/g, vars.number ?? "").replace(/\{(name|screen|feature)\}/g, vars.slug ?? "").replace(/\{nn\}/g, vars.nn ?? "").replace(/\{view\}/g, vars.view ?? "");
    return join(flowRoot, rel);
  };

  /* Sections of one document: draft them, leave them, or report them. One
     proposal per document. */
  const apply = ({ id, kind, doc, create, type, parts, info = typeInfo(refs, type), intro }) => {
    let path, before, isNew = false;
    if (doc) { path = doc.path; before = texts.get(path) ?? doc.text; }
    else {
      if (!info.location) { result.problems.push(`HELIX has no output location for the ${type} type; ${kind} not proposed.`); return; }
      path = locate(type, info.location, create);
      isNew = !texts.has(path);
      if (!info.template) result.problems.push(`HELIX has no template for the ${type} type (${info.base}/template.md): ${posix(relative(root, path))} is drafted from the blueprint alone.`);
      before = texts.get(path) ?? draft(info.template, { ...create, type, intro: intro ?? `> Drafted by \`ux-builder-blueprint propose\` from the blueprint${info.template && version ? ` and HELIX ${version}'s template` : ""}. A person reviews and applies it.` });
    }
    const rel = posix(relative(root, path));
    const lines = before.replace(/\n$/, "").split("\n");
    const tmpl = info.template ? info.template.split("\n") : null;
    const changed = [];
    for (const { heading, level = 2, anchor, before: ahead, inside = false, top = false, text } of parts) {
      const tsec = tmpl && find(tmpl, heading, top);
      const templateBody = tsec ? body(tmpl, tsec) : null;
      const found = find(lines, heading, top);
      const block = text.trim();
      if (found) {
        const have = body(lines, found);
        if (norm(have) === norm(block)) { result.current.push({ id, kind, path: rel, section: heading }); continue; }
        if (!unwritten(have, templateBody)) { result.disagreements.push({ id, kind, path: rel, section: heading, helix: have, blueprint: block }); continue; }
        lines.splice(found.start, found.end - found.start, "", block, "");
      } else {
        // Heading merge: before the section, or under (or after) the anchor, the template places it by; else at the end, and say so.
        const b = ahead && find(lines, ahead);
        const a = !b && anchor && find(lines, anchor);
        const at = b ? b.index : a ? a.end : lines.length;
        const lvl = b ? b.level : a ? (inside ? a.level + 1 : a.level) : level;
        for (const x of [ahead, anchor]) if (x && !b && !a && !(tmpl && find(tmpl, x))) { result.problems.push(`HELIX's ${type} template has no "${x}" section: "${heading}" is drafted at the end of ${rel}.`); break; }
        lines.splice(at, 0, ...(at > 0 && lines[at - 1].trim() ? [""] : []), `${"#".repeat(lvl)} ${heading}`, "", block, "");
      }
      changed.push(heading);
    }
    if (!changed.length) return;
    const after = lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
    texts.set(path, after);
    const original = doc ? doc.text : null;
    result.proposals.push({ id, kind, path: rel, section: changed.join(", "), target: doc ? { kind: "existing", id: doc.id, type: doc.type } : { kind: "new", id: create.id, type }, isNew, original, after });
  };
  /* One section of one document. */
  const section = ({ heading, level, anchor, before, inside, text, ...rest }) => apply({ ...rest, parts: [{ heading, level, anchor, before, inside, text }] });

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
  const featuresOf = (sid) => {
    const s = stories.get(sid);
    if (!s) return [];
    const line = /^\*\*Feature\*\*:\s*\[{0,2}(FEAT-\d+)/m.exec(s.text)?.[1];
    return [...s.links.filter((l) => /^FEAT-\d+$/.test(l)), ...(line ? [line] : [])];
  };
  const features = [...new Set(storyIds.flatMap(featuresOf))];
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

  // 4. DESIGN.md's navigation table (US-089-AC3), and its modalities, size classes and app frame (ADR-041, ADR-042).
  const design = docs.find((d) => isType(d, "design-system") || d.id === "design-system");
  const designCreate = { id: "design-system", links: [["informed_by", "prd"]], title: `DESIGN.md — ${bp.name ?? "App"}` };
  if (bp.kind !== "view" && Array.isArray(bp.destinations) && bp.destinations.length) {
    section({ id: "design-system-navigation", kind: "navigation", doc: design, heading: "Destinations by Size Class", anchor: "Navigation and Active State", inside: true, text: navTable(bp), type: "design-system", create: designCreate });
  }
  if (design || result.proposals.some((p) => p.kind === "navigation")) {
    section({ id: "design-system-modalities", kind: "modalities", doc: design, heading: "Modalities, Size Classes and App Frame", before: "Navigation and Active State", text: modalitySection(bp), type: "design-system", create: designCreate });
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

  // 6. HELIX's UX types (US-104-AC3): user flows, their wireframes and the journey maps.
  uxTypes({ bp, docs, refs, screens, journeys, stories, features, featuresOf, feature: governing(), result, apply });

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

const pad = (n, w = 3) => String(n).padStart(w, "0");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
const FLOW_RULES = new Set(["flow.reachable", "flow.no-dead-end", "flow.target-exists"]);

/* The UX documents (US-104-AC3; ADR-042 decision 2): a user-flow per
   feature (UF-<FEAT number>), a wireframe per screen of its flow
   (UF-<n>-<nn>-<view>, the view number the next free one in the flow's
   folder, kept once given) and a user-journey-map per journey. A screen
   belongs to the first feature of the stories it serves or its journeys
   visit, else to the governing feature. A document HELIX already has for
   the feature, screen or journey is updated; a new one is drafted. */
function uxTypes({ bp, docs, refs, screens, journeys, stories, features, featuresOf, feature, result, apply }) {
  const info = Object.fromEntries(["user-flow", "wireframe", "user-journey-map"].map((t) => [t, typeInfo(refs, t)]));
  const isFlow = (d) => d.type === "user-flow" || (!d.type && /^UF-\d+$/.test(d.id ?? ""));
  const isWireframe = (d) => d.type === "wireframe" || (!d.type && /^UF-\d+-\d{2}-/.test(d.id ?? ""));
  const storyTitle = (sid) => { const d = stories.get(sid); return d ? /^#\s+(?:US-\d+:\s*)?(.*)$/m.exec(d.text)?.[1] ?? sid : sid; };
  const featTitle = (f) => { const d = f && docs.find((x) => x.id === f); return d ? /^#\s+(?:.*?—\s*)?(.*)$/m.exec(d.text)?.[1] ?? f : null; };
  const strs = (x) => (Array.isArray(x) ? x.filter((y) => typeof y === "string") : []);

  // Each screen's feature: its own stories', then the stories of the journeys that visit it.
  const visits = new Map();
  for (const j of journeys) for (const st of Array.isArray(j.steps) ? j.steps : []) if (typeof st?.screen === "string" && screens.has(st.screen)) visits.set(st.screen, [...(visits.get(st.screen) ?? []), j.story]);
  const groups = new Map();
  for (const [id, { s }] of screens) {
    const f = [...strs(s.stories), ...strs(visits.get(id))].flatMap(featuresOf).find((x) => features.includes(x)) ?? feature;
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f).push(id);
  }
  const order = [...features, null].filter((f) => groups.has(f)).concat([...groups.keys()].filter((f) => f && !features.includes(f)));
  const models = new Map(stateModels(bp).map((m) => [m.screen, m]));
  const findings = checkBlueprint(bp).filter((f) => FLOW_RULES.has(f.rule));
  const screenAt = (path) => { const i = /^\/screens\/(\d+)/.exec(path ?? "")?.[1]; return i == null ? null : bp.screens?.[Number(i)]?.id ?? null; };
  const flowNumbers = new Set(docs.filter(isFlow).map((d) => Number(numberOf(d.id))).filter((n) => n > 0));
  const next = (taken) => { let n = 1; while (taken.has(n)) n++; taken.add(n); return n; };
  const ujmIds = new Map();

  for (const f of order) {
    const ids = groups.get(f);
    const own = new Set(ids);
    const featNo = numberOf(f);
    const ufDoc = docs.filter(isFlow).find((d) => (featNo && d.id === `UF-${featNo}`) || (f && (d.links.includes(f) || d.text.includes(`[[${f}]]`))));
    if (!f && !ufDoc) result.problems.push(`No feature for ${ids.map((x) => `\`${x}\``).join(", ")}: the journeys name no HELIX story with a FEAT link, so their user flow takes the next free UF number.`);
    const ufId = ufDoc?.id ?? `UF-${featNo ?? pad(next(flowNumbers))}`;
    const n = ufId.slice(3);
    const featDoc = f && docs.find((d) => d.id === f);
    const folder = ufDoc ? ufDoc.rel.split("/").slice(-2, -1)[0].replace(/^UF-\d+-?/, "") : featDoc ? slugOf(featDoc.rel) : slug(bp.name);
    const sd = f && docs.find((d) => isType(d, "solution-design") && d.links.includes(f));

    // The flow's own blueprint: all of it for one flow, else its screens, destinations and journeys.
    const sub = order.length === 1 ? bp : { ...bp, screens: (bp.screens ?? []).filter((x) => own.has(x?.id)), destinations: (bp.destinations ?? []).filter((d) => own.has(d?.screen)), journeys: journeys.filter((j) => strs((j.steps ?? []).map((st) => st?.screen)).some((x) => own.has(x))) };
    const flowJourneys = order.length === 1 ? journeys : sub.journeys;
    const flowStories = [...new Set([...ids.flatMap((id) => strs(screens.get(id).s.stories)), ...strs(flowJourneys.map((j) => j.story))])];

    // The wireframes: one per screen, numbered in the flow's folder.
    const wfDocs = docs.filter((d) => isWireframe(d) && (d.id ?? "").startsWith(`${ufId}-`));
    const taken = new Set(wfDocs.map((d) => Number(/^UF-\d+-(\d{2})-/.exec(d.id)?.[1])).filter((x) => x > 0));
    const subject = (id) => wfDocs.find((d) => new RegExp(`^\\*\\*User flow\\*\\*:.*view \`${escRe(id)}\``, "m").test(d.text) || d.id.endsWith(`-${slug(id)}`));
    const wf = new Map();
    for (const id of ids) { const have = subject(id); wf.set(id, { doc: have, id: have?.id ?? null }); }
    for (const id of ids) if (!wf.get(id).id) wf.get(id).id = `${ufId}-${pad(next(taken), 2)}-${slug(id)}`;

    // Its journeys' maps, by number.
    const ujmTaken = new Set(docs.filter((d) => d.type === "user-journey-map" || /^UJM-\d+$/.test(d.id ?? "")).map((d) => Number(numberOf(d.id))).filter((x) => x > 0));
    for (const j of flowJourneys) if (!ujmIds.has(j.id)) {
      const have = docs.find((d) => (d.type === "user-journey-map" || /^UJM-\d+$/.test(d.id ?? "")) && new RegExp(`journey ${escRe(j.id)}\\b`).test(d.text));
      ujmIds.set(j.id, { j, doc: have, id: have?.id ?? `UJM-${pad(next(ujmTaken))}`, f });
    }
    const maps = [...ujmIds.values()].filter((u) => u.f === f).map((u) => u.id);

    const deadEnds = findings.filter((x) => { const sc = screenAt(x.path); return sc ? own.has(sc) : order.length === 1; }).map((x) => x.message);
    apply({ id: `${ufId}-user-flow`, kind: "user-flow", type: "user-flow", doc: ufDoc, info: info["user-flow"],
      create: { id: ufId, number: n, slug: folder, title: `${ufId}: ${featTitle(f) ?? bp.name ?? "App"} User Flow`, refs: { "FEAT-XXX": f, "US-XXX": flowStories[0], "SD-XXX": sd?.id, "UJM-XXX": maps[0] },
        fields: { Feature: `${f ? `[[${f}]]` : "none"} | **Solution design**: ${sd ? `[[${sd.id}]]` : "none"} | **Journey maps**: ${maps.length ? maps.map((x) => `[[${x}]]`).join(", ") : "none"}` } },
      parts: chain(userFlowSections(sub, { stories: flowStories, wireframes: new Map([...wf].map(([k, v]) => [k, v.id])), deadEnds })) });

    for (const id of ids) {
      const { doc, id: wfId } = wf.get(id);
      const screen = screens.get(id), m = models.get(id);
      const mine = strs(screen.s.stories);
      apply({ id: `${wfId}-wireframe`, kind: "wireframe", type: "wireframe", doc, info: info.wireframe,
        create: { id: wfId, number: n, slug: folder, nn: wfId.slice(ufId.length + 1, ufId.length + 3), view: slug(id), title: `${wfId}: ${m.title}`, refs: { "UF-XXX-NN-view-name": wfId, "UF-XXX": ufId, "US-XXX": mine[0] },
          fields: { "User flow": `[[${ufId}]] view \`${id}\` | **Stories**: ${mine.length ? mine.map((x) => `[[${x}]]`).join(", ") : "none"}` } },
        parts: chain(wireframeSections(m, { bp, screen, id: wfId })) });
    }
  }

  for (const { j, doc, id, f } of ujmIds.values()) {
    const sid = typeof j.story === "string" ? j.story : null;
    apply({ id: `${id}-journey-map`, kind: "journey-map", type: "user-journey-map", doc, info: info["user-journey-map"],
      create: { id, number: id.slice(4), slug: slug(sid && stories.get(sid) ? storyTitle(sid) : j.id), title: `${id}: ${sid ? storyTitle(sid) : j.id}`, refs: { "FEAT-XXX": f, "US-XXX": sid },
        fields: { Feature: `${f ? `[[${f}]]` : "none"} | **Map kind**: future-state | **Evidence**: assumption-based (from blueprint journey ${j.id})` } },
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
  // An earlier ux-builder's drafts/ (before HELIX v0.20.0 defined the UX types) goes too.
  rmSync(join(dir, "drafts"), { recursive: true, force: true });
  const files = [];
  for (const p of r.proposals) { writeFileSync(join(dir, p.file), p.patch); files.push(p.file); }
  writeFileSync(join(dir, "report.md"), report(r));
  const { marker, ...rest } = r;
  writeFileSync(join(dir, "proposals.json"), JSON.stringify({ ...rest, proposals: r.proposals.map(({ patch, ...p }) => p) }, null, 2) + "\n");
  return [...files, "report.md", "proposals.json"];
}
