/* The project site's Reference and Proof data that only Node can read
   (SD-002; HELIX product-microsite-ia: reference is exact lookup generated
   from what ships). The site imports it as the virtual module
   "virtual:microsite-data" (micrositeData in vite.shared.mjs), so it is
   computed from the repository each time the site is built or served:

     cli        npm create @ux-builder/app's and ux-builder-audit's options,
                from each command's own header and parseArgs definitions; the
                audit's checks (RULES); the assess subcommands, from their
                header and --help; ux-builder-blueprint's and
                ux-builder-design's commands, from their --help; every MCP
                tool, from the server's own listTools
     packages   every public package's entry points, from its package.json
                exports (with a one-line note each, NOTES below)
     rules      the interaction rules, from @ux-builder/ui's catalogue
     sources    every distinct source the rules cite, with its licence
     cards      CONTRACT-004's Adaptive Cards element mapping and high-impact
                marker, and the elements the renderer draws
     coverage   tools/check-coverage.mjs's counts, story by story, and the
                alignment reviews
     notices    ADR-025's counsel waiver and the guidance's disclaimer

   tools/__tests__/built/microsite-data.test.mjs fails when an option,
   command, tool, export or licence is missing from it. */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const read = (p) => readFileSync(join(REPO, p), "utf8");
const json = (p) => JSON.parse(read(p));
const GITHUB = "https://github.com/DocumentDrivenDX/ux-builder";
const blob = (p) => `${GITHUB}/blob/main/${p}`;

/* ---- Command lines ---- */

/* The "--option <arg>   what it does" lines of a command's header comment, with their continuation lines. */
export function headerOptions(source) {
  const head = source.match(/\/\*([\s\S]*?)\*\//)?.[1] ?? "";
  const out = [];
  let cur = null;
  for (const line of head.split("\n")) {
    // An option with an argument may be one space from its text; one without needs two (so "--width 360 --width 720" continues).
    const m = line.match(/^\s*(--[a-z][\w-]*)(?:\s(<[^>]+>|"[^"]+")\s+|\s{2,})(\S.*)$/);
    if (m) { cur = { option: m[1], arg: m[2] ?? "", text: m[3].trim() }; out.push(cur); continue; }
    if (cur && /^\s{8,}\S/.test(line)) cur.text += ` ${line.trim()}`;
    else cur = null;
  }
  return out;
}

/* The option names a parseArgs call accepts (the first call after `from`), less help and version. */
export function parseArgsOptions(source, from = 0) {
  const at = source.indexOf("parseArgs({", from);
  if (at < 0) return [];
  const open = source.indexOf("options:", at);
  let depth = 0, end = open;
  for (let i = source.indexOf("{", open); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) { end = i; break; }
  }
  const body = source.slice(open, end);
  return [...body.matchAll(/"?([a-z][\w-]*)"?:\s*\{\s*type:/g)].map((m) => m[1]).filter((n) => n !== "help" && n !== "version");
}

const run = (file, args) => {
  try { return execFileSync(process.execPath, [join(REPO, file), ...args], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { return `${e.stdout ?? ""}${e.stderr ?? ""}`; }
};
const runErr = (file, args) => {
  try { execFileSync(process.execPath, [join(REPO, file), ...args], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); return ""; }
  catch (e) { return `${e.stderr ?? ""}`; }
};

export function createAppOptions() {
  const src = read("packages/create-app/index.mjs");
  const main = src.indexOf("realpathSync(process.argv[1])");
  return { options: headerOptions(src), parsed: parseArgsOptions(src, main), synopsis: src.match(/console\.log\(`(npm create @ux-builder\/app[^\\`]*)/)?.[1] ?? "" };
}

export async function auditOptions() {
  const src = read("packages/audit/cli.mjs");
  const { RULES } = await import(pathToFileURL(join(REPO, "packages/audit/audit.mjs")).href);
  return {
    // The main parseArgs, after the subcommands' own (reports, doctor).
    options: headerOptions(src), parsed: parseArgsOptions(src, src.indexOf('import { parseArgs } from "node:util"')),
    synopsis: run("packages/audit/cli.mjs", ["--help"]).split("\n")[0].trim(),
    checks: Object.entries(RULES).map(([id, text]) => ({ id, text })),
  };
}

/* The assess subcommands: what each does (the header) and how it is called (its --help). */
export function assessCommands() {
  const src = read("packages/audit/assess/cli.mjs");
  const head = src.match(/\/\*([\s\S]*?)\*\//)[1];
  const what = new Map([...head.matchAll(/^ {5}([a-z][\w-]*)\s{2,}(\S.*)$/gm)].map((m) => [m[1], m[2].trim()]));
  const usage = runErr("packages/audit/cli.mjs", ["assess", "--help"]);
  const synopsis = new Map();
  let cur = null;
  for (const line of usage.split("\n")) {
    const m = line.match(/^ {2}([a-z][\w-]*)(.*)$/);
    if (m) { cur = { name: m[1], call: `${m[1]}${m[2]}`.trim() }; synopsis.set(m[1], cur); continue; }
    if (cur && /^ {10}\S/.test(line)) cur.call += ` ${line.trim()}`;
    else if (!/^ {6}\S/.test(line)) cur = null;
  }
  const defined = [...src.slice(src.indexOf("const SUB = {")).matchAll(/^ {2}async "?([a-z][\w-]*)"?\(args\)/gm)].map((m) => m[1]);
  // In the header's order, then any it does not list.
  const order = [...what.keys(), ...defined.filter((n) => !what.has(n))].filter((n) => defined.includes(n));
  return { defined, listed: [...what.keys()], usage: [...synopsis.keys()], commands: order.map((name) => ({ name, text: what.get(name) ?? "", call: synopsis.get(name)?.call ?? "" })) };
}

/* ux-builder-blueprint's commands, from its --help; what each does is a note here (its header gives none per command). */
export const BLUEPRINT_NOTES = {
  check: "Check an app's or view's blueprint against the interaction and IA rules. Exit 0 with no error finding, 1 with one, 2 on bad usage.",
  init: "Write a starting blueprint for an app or an embedded view. Exit 1 if the file exists.",
  propose: "Draft HELIX content from the blueprint as patches, a report and proposals.json; applies nothing.",
  draw: "Draw the IA map, flows and journeys as Mermaid and SVG.",
  wireframes: "Draw each screen's pattern at each supported size class as HTML and PNG, in a neutral theme.",
  score: "Score each journey of a blueprint, labelled predicted: steps, screens, modals, required inputs, decisions, navigation hops, findings and patterns.",
  compare: "Compare two or more alternative blueprints for the same tasks on one page, the best per task and dimension marked.",
  alternative: "Make an alternative blueprint (new) or choose one, with its reason (choose), recorded in the design state.",
  prototype: "Write a disposable, clickable prototype of a blueprint under docs/ux-builder/prototypes/ (one page per screen, state and size class, actions linked), optionally in other design systems; or archive one.",
  simplify: "Propose ways to make the task model take less of its users: inputs to infer, decisions to default, steps to combine, hops to remove. Changes nothing.",
};
export function blueprintCommands() {
  const src = read("packages/ui/blueprint/cli.mjs");
  const usage = run("packages/ui/blueprint/cli.mjs", ["--help"]);
  const commands = [...usage.matchAll(/^ {2}ux-builder-blueprint ([a-z]+)(.*)$/gm)].map((m) => ({ name: m[1], call: `ux-builder-blueprint ${m[1]}${m[2]}`.trim(), text: BLUEPRINT_NOTES[m[1]] ?? "" }));
  const handled = [...new Set([...src.matchAll(/command === "([a-z]+)"/g)].map((m) => m[1]).concat(Object.keys(JSON.parse(src.match(/const OUT = (\{[^}]*\})/)[1].replace(/(\w+):/g, '"$1":')))))];
  return { commands, handled };
}

/* ux-builder-design's commands, from its --help: each "  <command> …" line
   and the indented lines under it, which say what it does. */
export function designCommands() {
  const src = read("packages/design/cli.mjs");
  const usage = run("packages/design/cli.mjs", ["--help"]);
  const body = usage.slice(usage.indexOf("\n\n") + 2, usage.indexOf("\nOptions:"));
  const commands = [];
  for (const line of body.split("\n")) {
    const call = line.match(/^ {2}([a-z][a-z-]*)(.*)$/);
    const more = line.match(/^ {4,}(\S.*)$/);
    if (call) commands.push({ name: call[1], call: `ux-builder-design ${call[1]}${call[2]}`.trim(), text: "" });
    else if (more && commands.length) {
      const c = commands.at(-1);
      // Continuation lines of a long call are its options; the rest say what it does.
      if (!c.text && /^[[<(-]|^--|^\(/.test(more[1])) c.call += ` ${more[1]}`;
      else c.text = `${c.text} ${more[1]}`.trim();
    }
  }
  const handled = [...new Set([...src.matchAll(/command === "([a-z-]+)"/g)].map((m) => m[1]))];
  return { commands, handled };
}

/* Every MCP tool, as the server lists it to a client. */
export async function mcpTools() {
  const { createServer } = await import(pathToFileURL(join(REPO, "packages/mcp/server.mjs")).href);
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
  const [a, b] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(a);
  const client = new Client({ name: "microsite", version: "1" });
  await client.connect(b);
  const { tools } = await client.listTools();
  const { resources } = await client.listResources();
  await client.close();
  await server.close();
  return {
    tools: tools.map((t) => ({ name: t.name, description: t.description ?? "", inputs: Object.keys(t.inputSchema?.properties ?? {}), required: t.inputSchema?.required ?? [] })).sort((x, y) => x.name.localeCompare(y.name)),
    resources: resources.map((r) => ({ uri: r.uri, description: r.description ?? r.name ?? "" })),
  };
}

/* ---- Packages and their entry points ---- */

/* One line per entry point; a test fails when a package exports one with no note, or a note names none. */
export const NOTES = {
  "@ux-builder/tokens ./themes.css": "Every theme's CSS in one file, each selected with data-theme",
  "@ux-builder/tokens ./themes/*.css": "One theme's CSS, selected with data-theme",
  "@ux-builder/tokens ./brands/*.css": "One brand's tokens alone, without a design system",
  "@ux-builder/tokens ./design-systems/*.css": "One design system's anatomy alone, without a brand",
  "@ux-builder/tokens ./bridges/*": "The theme for other libraries: the shadcn bridge AI Elements and assistant-ui wear",
  "@ux-builder/tokens ./resolved/*.json": "Every token's final value per theme and appearance, for code that cannot read CSS",
  "@ux-builder/tokens ./manifest.json": "The themes, brands and design systems in this version",
  "@ux-builder/tokens ./brand/*": "Each brand's logo, mark and favicon artwork",
  "@ux-builder/tokens ./fonts.css": "Every face the themes use",
  "@ux-builder/tokens ./fonts/*": "One theme's faces",
  "@ux-builder/tokens ./package.json": "The package's own metadata",
  "@ux-builder/ui .": "The React widgets, ThemeProvider and hooks",
  "@ux-builder/ui ./icons": "Every icon as an import, following the theme's design system",
  "@ux-builder/ui ./patterns": "The screen patterns and layout primitives",
  "@ux-builder/ui ./assistant": "Conversation, generative UI and agent components on the SDK's own widgets",
  "@ux-builder/ui ./assistant/ai-sdk": "The assistant adapter for the Vercel AI SDK's messages",
  "@ux-builder/ui ./assistant/assistant-ui": "The assistant adapter for assistant-ui's runtime",
  "@ux-builder/ui ./adaptive-cards": "AdaptiveCard: an Adaptive Card (schema 1.6) drawn with the SDK's components, and checkCard",
  "@ux-builder/ui ./adaptive-cards/check": "checkCard, cardSchema and CHECKS with no React, for Node tools",
  "@ux-builder/ui ./ui.css": "The widgets' framework-free CSS",
  "@ux-builder/ui ./patterns.css": "The patterns' and Adaptive Cards' framework-free CSS",
  "@ux-builder/ui ./stylelint": "The Stylelint plugin: no hard-coded colours, sizes or fonts in CSS",
  "@ux-builder/ui ./eslint": "The ESLint plugin: no hard-coded values in JSX, and the AI voice rules",
  "@ux-builder/ui ./blueprint": "checkBlueprint, the interaction rules and the blueprint schema",
  "@ux-builder/ui ./blueprint/modalities": "The app modalities: each one's size classes, inputs, AI roles, components, rule families and audit widths",
  "@ux-builder/ui ./blueprint/model": "A blueprint's screens, journey walks and state models, for tools that generate from it (screensOf, walkJourney, stateModels)",
  "@ux-builder/ui ./blueprint/paths": "Where an app's design work lives: the docs/ux-builder/ layout and the old one, layoutOf, alternativeFile and the write fence (FEAT-018)",
  "@ux-builder/ui ./blueprint/prototype": "Exploratory prototypes of a blueprint: writePrototype, prototypePages, archivePrototype and themeFor (FEAT-018)",
  "@ux-builder/ui ./blueprint/propose": "HELIX proposals drafted from a blueprint as patches: propose and writeProposals",
  "@ux-builder/ui ./catalogue.json": "The machine-readable catalogue: widgets, patterns, tokens, icons, rules and recipes",
  "@ux-builder/ui ./AGENTS.md": "Guidance for AI coding agents, generated from the catalogue",
  "@ux-builder/ui ./skill/*": "The Claude Code skill for building on the SDK",
  "@ux-builder/ui ./package.json": "The package's own metadata",
  "@ux-builder/audit .": "audit(): drive a running app through every theme and appearance and report what is off-theme",
  "@ux-builder/audit ./report": "Write the audit's HTML, Markdown and JSON reports",
  "@ux-builder/audit ./reports": "landingPage(): the one page beside the design that lists the UI audit and every assessment run",
  "@ux-builder/audit ./doctor": "doctor(): the installed @ux-builder versions, and any range another package or the app wants that they do not meet",
  "@ux-builder/audit ./schema/*": "The JSON Schemas of the audit report and the assessment's records",
  "@ux-builder/audit ./skill/*": "The ux-builder-assess skill: how an agent runs a UX assessment",
  "@ux-builder/audit ./assess/*": "The assessment's operations, as ux-builder-audit assess runs them",
  "@ux-builder/audit ./package.json": "The package's own metadata",
  "@ux-builder/mcp .": "The MCP server (ux-builder-mcp); createServer for an in-process client",
  "@ux-builder/trace .": "The episode trace an app keeps while it is built: openEpisode, appendEvent, closeEpisode, attachTranscript, exportBundle and validateTrace (ux-builder-trace)",
  "@ux-builder/trace ./schema/*": "The JSON Schemas of a trace event, the export bundle and .ux-builder/config.json",
  "@ux-builder/trace ./package.json": "The package's own metadata",
  "@ux-builder/design .": "The guided design loop's commands as functions, from init and the design state to brief, rubric, test-kit, report, insights and experiments (ux-builder-design)",
  "@ux-builder/design ./artifacts/*": "The design document types: each one's meta.yml, template, prompt and example, as validate reads them (docs/ux-builder/)",
  "@ux-builder/design ./schema/*": "The JSON Schema of the design state, .ux-builder/design-state.json",
  "@ux-builder/design ./package.json": "The package's own metadata",
  "@ux-builder/visuals .": "render(): a umf.visual document as SVG, Mermaid, a plate or a presentation in a theme; check() on its layout",
  "@ux-builder/visuals ./node": "render() and loadTheme() with themes by name from @ux-builder/tokens, for Node and the ux-builder-visuals command",
  "@ux-builder/visuals ./player": "The walkthrough player a presentation inlines: steps by buttons and arrow keys",
  "@ux-builder/visuals ./react": "<Visual doc>: draws a document inside a React app in the page's theme, with its text equivalent",
  "@ux-builder/visuals ./schema/*": "The pinned umf.visual schema and where it was pinned from",
  "@ux-builder/visuals ./package.json": "The package's own metadata",
};

/* What a wildcard export matches today, from the package's files. */
function expand(dir, target) {
  const path = target.replace(/^\.\//, "");
  const star = path.indexOf("*");
  if (star < 0) return null;
  const base = path.slice(0, path.lastIndexOf("/", star) + 1);
  const [pre, post] = [path.slice(base.length, star), path.slice(star + 1)];
  if (!existsSync(join(dir, base))) return [];
  return readdirSync(join(dir, base)).filter((n) => n.startsWith(pre) && n.endsWith(post) && n.length >= pre.length + post.length).map((n) => n.slice(pre.length, n.length - post.length || undefined)).sort();
}

export function packages() {
  return readdirSync(join(REPO, "packages")).sort().flatMap((d) => {
    const dir = join(REPO, "packages", d);
    if (!existsSync(join(dir, "package.json"))) return [];
    const p = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    if (p.private) return [];
    const exports = Object.entries(typeof p.exports === "string" ? { ".": p.exports } : p.exports ?? {}).map(([key, target]) => {
      const t = typeof target === "string" ? target : target.default ?? target.import ?? "";
      const matches = expand(dir, t);
      return { key, import: key === "." ? p.name : `${p.name}/${key.slice(2)}`, target: t, note: NOTES[`${p.name} ${key}`] ?? "", matches: matches && { count: matches.length, examples: matches.slice(0, 4) } };
    });
    return [{ name: p.name, version: p.version, description: p.description ?? "", bin: Object.keys(p.bin ?? {}), exports, url: `https://www.npmjs.com/package/${p.name}` }];
  });
}

/* ---- Rules and their sources ---- */

/* What each licence a rule's source carries lets the rules do (docs/legal/counsel-brief-interaction-rules.md; tools/check-rules.mjs). */
export const LICENCES = {
  own: { name: "ux-builder's own documents", meaning: "This project's HELIX documents (MIT OR Apache-2.0). Quoting is allowed.", quote: true },
  "apple-terms": { name: "Apple's terms of use", meaning: "Apple's website terms; no open content licence. Paraphrased and linked, never quoted.", quote: false },
  "google-terms": { name: "Google's terms of service", meaning: "Google's terms; no open content licence shown. Paraphrased and linked, never quoted.", quote: false },
  "microsoft-terms": { name: "Microsoft's terms of use", meaning: "Microsoft's terms; no open licence shown. Paraphrased and linked, never quoted.", quote: false },
  "nngroup-terms": { name: "Nielsen Norman Group's terms of use", meaning: "Nielsen Norman Group's articles are copyright; no open licence shown. Paraphrased and linked, never quoted.", quote: false },
  "CC-BY-2.5": { name: "Creative Commons Attribution 2.5", meaning: "Open: a short quotation is allowed with attribution, credited in the notices.", quote: true },
  "CC-BY-4.0": { name: "Creative Commons Attribution 4.0", meaning: "Open: a short quotation is allowed with attribution, credited in the notices.", quote: true },
  "CC-BY-NC-SA-4.0": { name: "Creative Commons Attribution-NonCommercial-ShareAlike 4.0", meaning: "Non-commercial and share-alike, so the rules paraphrase it and do not adapt it.", quote: false },
  "CC-BY-NC-ND-4.0": { name: "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0", meaning: "No derivatives, so the rules paraphrase it and never quote or adapt it.", quote: false },
  W3C: { name: "W3C Document License", meaning: "Open: a short quotation is allowed with attribution, credited in the notices.", quote: true },
};

export function rules() {
  return json("packages/ui/catalogue.json").interaction.rules.map((r) => ({
    id: r.id, family: r.id.split(".")[0], title: r.title, statement: r.statement, severity: r.severity,
    when: r.when ?? {}, appliesTo: r.appliesTo ?? null, checks: r.checks, sources: r.sources,
  }));
}

export function sources(rs = rules()) {
  const by = new Map();
  for (const r of rs) for (const s of r.sources) {
    const key = s.url;
    if (!by.has(key)) by.set(key, { title: s.title, url: s.url, licence: s.licence, wording: new Set(), rules: [] });
    const e = by.get(key);
    e.wording.add(s.wording);
    if (!e.rules.includes(r.id)) e.rules.push(r.id);
  }
  return [...by.values()].map((e) => ({ ...e, wording: [...e.wording].sort() })).sort((a, b) => b.rules.length - a.rules.length || a.title.localeCompare(b.title));
}

/* ---- Adaptive Cards ---- */

const section = (md, heading) => md.split(new RegExp(`^### ${heading}\\s*$`, "m"))[1]?.split(/^##+ /m)[0] ?? "";
const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export async function cards() {
  const path = "docs/helix/02-design/contracts/CONTRACT-004-app-integration.md";
  const md = read(path);
  const adaptive = md.split(/^## Adaptive Cards.*$/m)[1]?.split(/^## (?!#)/m)[0] ?? "";
  const mapping = section(adaptive, "Element mapping").split("\n").filter((l) => l.startsWith("|")).slice(2).map((l) => { const [element, component] = cells(l); return { element, component }; });
  const hi = section(adaptive, "High-impact actions");
  const example = hi.match(/```json\n([\s\S]*?)```/)?.[1].trim() ?? "";
  const after = hi.split("```").slice(2).join("").trim().split(/\n\n/)[0].replace(/\s+/g, " ");
  // What the renderer draws (AdaptiveCard.jsx's RENDER, INPUT_TYPES and ACTION_TYPES); Node cannot import JSX, so read from its source.
  const src = read("packages/ui/src/adaptive-cards/AdaptiveCard.jsx");
  const set = (name) => JSON.parse(src.match(new RegExp(`const ${name} = new Set\\((\\[[^\\]]*\\])\\)`))[1]);
  const render = src.match(/const RENDER = \{([\s\S]*?)\n\};/)[1];
  const keys = [...render.matchAll(/(?:^|[\s,])([A-Z]\w*)(?=\s*[,:]|\s*$)/gm)].map((m) => m[1]);
  const { CHECKS, SUPPORTED_VERSION } = await import(pathToFileURL(join(REPO, "packages/ui/adaptive-cards/check.mjs")).href);
  return { url: blob(path), mapping, example, approval: after, elements: [...new Set([...keys, ...set("INPUT_TYPES")])], actions: set("ACTION_TYPES"), checks: CHECKS, version: SUPPORTED_VERSION };
}

/* ---- Traceability ---- */

export async function coverage() {
  const { coverage: run } = await import(pathToFileURL(join(REPO, "tools/check-coverage.mjs")).href);
  const c = run();
  const dir = "docs/helix/01-frame/user-stories";
  const stories = Object.entries(c.byStory).map(([file, criteria]) => {
    const md = read(`${dir}/${file}`);
    const [, id, title] = md.match(/^# (US-\d+): (.+)$/m) ?? [];
    const feature = md.match(/^\*\*Feature\*\*:\s*(FEAT-\d+)/m)?.[1] ?? "";
    return { id, title, feature, url: blob(`${dir}/${file}`), criteria };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const featDir = "docs/helix/01-frame/features";
  const features = readdirSync(join(REPO, featDir)).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const t = read(`${featDir}/${f}`).match(/^# (?:Feature Specification:\s*)?(FEAT-\d+) — (.+)$/m) ?? [];
    return { id: t[1], title: t[2], url: blob(`${featDir}/${f}`) };
  }).filter((f) => f.id);
  const arDir = "docs/helix/06-iterate/alignment-reviews";
  const reviews = readdirSync(join(REPO, arDir)).filter((f) => f.endsWith(".md")).sort().reverse().map((f) => ({
    id: f.replace(/\.md$/, ""), date: f.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "",
    title: read(`${arDir}/${f}`).match(/^# (?:Alignment Review:\s*)?(.+)$/m)?.[1].trim() ?? f, url: blob(`${arDir}/${f}`),
  }));
  return { total: c.total, cited: c.cited, excepted: c.excepted, exceptions: c.exceptions, stories, features, reviews, exceptionsUrl: blob("tools/coverage-exceptions.json"), script: blob("tools/check-coverage.mjs") };
}

/* ---- Notices: the counsel waiver and the disclaimer, as the project states them ---- */

export function notices() {
  const adrPath = readdirSync(join(REPO, "docs/helix/02-design/adr")).find((f) => f.startsWith("ADR-025-"));
  const adr = read(`docs/helix/02-design/adr/${adrPath}`);
  const amendment = adr.split(/^## Amendment.*$/m)[1]?.split(/^## /m)[0] ?? "";
  const paragraphs = amendment.trim().split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const bead = amendment.match(/ux-builder-[0-9a-f]{8}/)?.[0] ?? "";
  const disclaimer = read("packages/ui/AGENTS.md").split("\n").find((l) => l.startsWith("The rules restate guidance")) ?? "";
  return { amendment: paragraphs, bead, adr: blob(`docs/helix/02-design/adr/${adrPath}`), brief: blob("docs/legal/counsel-brief-interaction-rules.md"), disclaimer };
}

/* ---- Everything, for the site ---- */

/* The guided design's steps and the terms it explains, from
   @ux-builder/design itself (FEAT-018 GDL-79), so the Design page shows
   what the guide says. */
export async function guide() {
  const p = await import(pathToFileURL(join(REPO, "packages/design/process.mjs")).href);
  const pick = (s) => ({ n: s.n, name: s.name, activity: s.activity, you: s.you, produces: s.produces, terms: s.terms ?? [] });
  return { steps: p.STEPS.map(pick), changeSteps: p.CHANGE_STEPS.map(pick), glossary: p.GLOSSARY.map(({ term, step, means, why }) => ({ term, step, means, why })), ids: p.IDS.map(({ id, kind, where }) => ({ id, kind, where })) };
}

/* A Markdown document as blocks the site renders (headings, paragraphs,
   lists, tables), its frontmatter and comments left out: enough for the
   guide's own example documents, nothing more. */
export function mdBlocks(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/<!--[\s\S]*?-->/g, "");
  const blocks = [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) { blocks.push({ kind: "h", level: h[1].length, text: h[2] }); continue; }
    if (l.trim().startsWith("|")) {
      const rows = [];
      for (; i < lines.length && lines[i].trim().startsWith("|"); i++) if (!/^\|[\s|:-]+\|$/.test(lines[i].trim())) rows.push(cells(lines[i]));
      i--;
      blocks.push({ kind: "table", head: rows[0], rows: rows.slice(1) });
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const items = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]); i++) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      i--;
      blocks.push({ kind: "list", items });
      continue;
    }
    const para = [l.trim()];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\||\s*([-*]|\d+\.)\s)/.test(lines[i + 1])) para.push(lines[++i].trim());
    blocks.push({ kind: "p", text: para.join(" ") });
  }
  return blocks;
}

/* The guide's example documents (one fictional app, River Path), for the
   worked example: each type's example.md as the guide writes it. */
export const EXAMPLE_TYPES = [
  ["experience-brief", "The experience brief", 1],
  ["users", "Target users", 2],
  ["jobs", "Jobs to be done", 2],
  ["ux-decision", "An interaction decision", 4],
  ["test-kit", "A usability test kit", 7],
  ["usability-evaluation-report", "The UX evaluation report", 7],
];
export function examples() {
  return EXAMPLE_TYPES.map(([type, title, step]) => ({ type, title, step, url: blob(`packages/design/artifacts/${type}/example.md`), blocks: mdBlocks(read(`packages/design/artifacts/${type}/example.md`)) }));
}

export async function micrositeData() {
  const rs = rules();
  return {
    cli: { createApp: createAppOptions(), audit: await auditOptions(), assess: assessCommands(), blueprint: blueprintCommands(), design: designCommands(), mcp: await mcpTools() },
    guide: await guide(), examples: examples(), packages: packages(), rules: rs, sources: sources(rs), licences: LICENCES, cards: await cards(), coverage: await coverage(), notices: notices(),
  };
}

/* The Vite plugin: import data from "virtual:microsite-data". */
export function micrositeDataPlugin() {
  const id = "virtual:microsite-data";
  return {
    name: "microsite-data",
    resolveId: (s) => (s === id ? `\0${id}` : null),
    async load(s) { if (s === `\0${id}`) return `export default ${JSON.stringify(await micrositeData())};`; return null; },
  };
}
