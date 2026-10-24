#!/usr/bin/env node
/* npm create @ux-builder/app <dir> -- --modality <list> --theme <name>  (FEAT-004 SDK-08, SDK-09; US-012; FEAT-014)

   Scaffolds a React + Vite app already on the AI-UI SDK: the theme's CSS and
   fonts, @ux-builder/ui's widgets and ThemeProvider with a theme and appearance
   switcher, the empty shell for the app's modalities (FEAT-014: an AppShell
   with a Home screen, a Conversation, or both) built from SDK components and
   role tokens only, with no sample domain, the ux-builder/no-hard-coded-values
   lint rule in `npm run lint`, and the agent guidance (CLAUDE.md, the Claude
   Code skill). @ux-builder/tokens and @ux-builder/ui are pinned to the exact
   versions this package was released with.

     --modality <list>  the app's modalities, comma-separated: responsive-web, chat,
                        hybrid-chat (FEAT-014). In a terminal without it, the starter
                        asks; without a terminal it is required, and none is assumed
     --theme <name>     the theme to start on (default: the first listed)
     --name <name>      the package name (default: the directory's name)
     --blueprint <file> start from this plan of the app's screens instead of the
                        starter's (FEAT-008 ADP-01); refused, with each error, if
                        ux-builder-blueprint check finds one
     --sdk-from <dir>   install @ux-builder/* from .tgz files in <dir> (testing)
     --helix-version <tag>  start on this HELIX release instead of the latest (FEAT-010)
     --helix-offline    use the HELIX bundled with this starter; no network
                        (not with --helix-version)
     --no-helix         no HELIX marker, documents, skill or ux-assessment.yml;
                        e2e/starter.spec.js has no @covers lines
     --agent <name>     the agent creating the app, for its episode trace (default:
                        UX_BUILDER_AGENT, else claude-code inside Claude Code, else none)
     --model <id>       the agent's model, for its episode trace (default: UX_BUILDER_MODEL)
     --mcp              also write .mcp.json for the ux-builder MCP server (optional:
                        the guide and the skills work without it; ADR-036)

   Every app gets the guided design loop (FEAT-018, ADR-036): @ux-builder/design,
   its skill in .claude/skills/ux-builder-design/ and an empty design state
   (.ux-builder/design-state.json, starting at Define). CLAUDE.md, AGENTS.md and
   the Home screen point to /ux-builder-design.

   By default the app also starts on the latest HELIX release: its skill and
   catalogue in .claude/skills/helix/, the .helix.yml marker and the starter
   set of HELIX documents (FEAT-010, ADR-027).

   The app keeps an episode trace from its first commit (FEAT-016,
   CONTRACT-007): creating it is the first episode, E-<date>-create, in
   .ux-builder/trace/, with its start (trigger create, the agent and model
   when known, the SDK and HELIX versions), created (modalities, theme,
   options, files written, the blueprint's hash), the guidance it gave
   (AGENTS.md), the blueprint check, and its change, outcome and end. The
   episode is closed before the app is a git repository, so its change counts
   the files written and names no commit. The app's .gitignore ignores only
   .ux-builder/trace/current; .claude/settings.json attaches each Claude Code
   session's transcript (npx ux-builder-trace attach-transcript); npm run
   lint records each run (ux-builder-trace lint); AGENTS.md asks the agent to
   open an episode for each change, record its decisions, add the
   UX-Episode trailer to its commits and end it. */

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { checkBlueprint } from "@ux-builder/ui/blueprint";
import { DEFAULT_MODALITIES, FUTURE_MODALITIES, MODALITIES, modalityProblems } from "@ux-builder/ui/blueprint/modalities";
import { CURRENT } from "@ux-builder/ui/blueprint/paths";
import * as trace from "@ux-builder/trace";
import { init as initDesign } from "@ux-builder/design";
import { getHelix, install as installHelix } from "./helix.mjs";
import { blueprintFor, modalityGuide, normalize, shellFiles, starterSpec } from "./shell.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const die = (m) => { console.error(`create-app: ${m}`); process.exit(1); };

/* The SDK versions to pin: the ones this package was released with. */
export function sdkVersions() {
  const v = (p) => JSON.parse(readFileSync(require.resolve(`${p}/package.json`), "utf8")).version;
  return { "@ux-builder/tokens": v("@ux-builder/tokens"), "@ux-builder/ui": v("@ux-builder/ui"), "@ux-builder/audit": v("@ux-builder/audit"), "@ux-builder/trace": v("@ux-builder/trace"), "@ux-builder/design": v("@ux-builder/design") };
}
export function themes() {
  return JSON.parse(readFileSync(require.resolve("@ux-builder/tokens/manifest.json"), "utf8")).themes.map((t) => t.name);
}

/* ---------------------------------------------------------- modalities */
const NAMES = Object.keys(MODALITIES);
const FUTURE = `Native apps (${FUTURE_MODALITIES.join(", ")}) are future modalities.`;
export const modalityList = () => NAMES.map((m) => `  ${m.padEnd(15)} ${MODALITIES[m].label}`).join("\n");

/* A --modality value as a list, or an Error saying which are available now (MOD-03). */
export function parseModalities(value) {
  const names = String(value ?? "").split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
  const problems = modalityProblems(names);
  if (problems.length) throw new Error(`--modality ${value ?? ""}: ${problems.join(" ")} ${FUTURE}`.replace(/ +/g, " "));
  return normalize(names);
}

/* The modalities: --modality, checked against --blueprint's (FEAT-014 edge
   case), or the blueprint's own, or null when the starter must ask. A
   blueprint that names none is read as responsive-web. */
export function resolveModalities({ modality, blueprint } = {}) {
  const flag = modality != null ? parseModalities(modality) : null;
  if (!blueprint) return flag;
  let bp;
  try { bp = JSON.parse(readFileSync(blueprint, "utf8")); } catch { return flag; } // readBlueprint names the problem
  const declared = Array.isArray(bp?.supports?.modalities) ? bp.supports.modalities : DEFAULT_MODALITIES;
  const own = normalize(declared);
  if (flag && (flag.length !== own.length || flag.some((m) => !own.includes(m)))) {
    throw new Error(`--modality ${flag.join(",")} disagrees with --blueprint ${blueprint}, whose supports.modalities is ${declared.join(",")}${Array.isArray(bp?.supports?.modalities) ? "" : " (it names none, so it is read as responsive-web)"}; give the same modalities, or leave out --modality. No app was created.`);
  }
  return flag ?? own;
}

/* The multi-select, in a terminal (MOD-01): the modalities numbered; answer
   with numbers or names, comma-separated. Asks again on an answer it cannot
   use; rejects when the input ends. */
export function askModalities({ input = process.stdin, output = process.stdout } = {}) {
  const rl = createInterface({ input, output, terminal: false });
  output.write(`Which modalities does the app have? Choose one or more, e.g. 1,3:\n${NAMES.map((m, i) => `  ${i + 1}. ${m.padEnd(15)} ${MODALITIES[m].label}`).join("\n")}\n`);
  return new Promise((resolveAnswer, reject) => {
    let done = false;
    const ask = () => output.write("Modalities: ");
    rl.on("line", (line) => {
      const picked = line.split(/[\s,]+/).filter(Boolean).map((x) => (/^\d+$/.test(x) ? NAMES[Number(x) - 1] ?? x : x));
      try {
        const ms = parseModalities(picked.join(","));
        done = true; rl.close(); resolveAnswer(ms);
      } catch (e) { output.write(`${e.message.replace(/^--modality [^:]*: /, "")}\n`); ask(); }
    });
    rl.on("close", () => { if (!done) reject(new Error(`no modalities were chosen; no app was created. Choose with --modality <list>:\n${modalityList()}`)); });
    ask();
  });
}

/* Write the app. Returns the files written, relative to dir. */
/* A blueprint given with --blueprint: its text, or an exit naming each error
   before anything is written. */
export function readBlueprint(file) {
  let text, bp;
  try { text = readFileSync(file, "utf8"); bp = JSON.parse(text); } catch (e) { die(`--blueprint ${file}: ${e.message}`); }
  if (bp?.kind === "view") die(`--blueprint ${file} is a view's blueprint; the starter makes apps`);
  const errors = checkBlueprint(bp).filter((f) => f.severity === "error");
  if (errors.length) die(`--blueprint ${file} has ${errors.length} error${errors.length === 1 ? "" : "s"}; no app was created:\n${errors.map((f) => `  ${f.rule}  ${f.path || "/"}: ${f.message} Fix: ${f.fix}`).join("\n")}`);
  return text.endsWith("\n") ? text : text + "\n";
}

export function scaffold(dir, { theme, name, sdkFrom, blueprint, modalities } = {}) {
  // Never assumed (MOD-01): the CLI asks, or takes --modality.
  if (!Array.isArray(modalities) || !modalities.length) throw new Error(`the app's modalities are required (--modality <list>):\n${modalityList()}`);
  const problems = modalityProblems(modalities);
  if (problems.length) throw new Error(`${problems.join(" ")} ${FUTURE}`);
  modalities = normalize(modalities);
  const target = resolve(dir);
  if (existsSync(target) && readdirSync(target).length) die(`${dir} exists and is not empty`);
  const plan = blueprint ? readBlueprint(blueprint) : null;
  const known = themes();
  theme ??= known.includes("plain") ? "plain" : known[0];
  if (!known.includes(theme)) die(`unknown theme "${theme}"; choose one of ${known.join(", ")}`);
  name ??= basename(target).toLowerCase().replace(/[^a-z0-9-._~]+/g, "-");
  if (!NAME.test(name)) die(`"${name}" is not a valid package name; use --name`);

  const versions = sdkVersions();
  const dep = (p) => {
    if (!sdkFrom) return versions[p];
    const tgz = readdirSync(resolve(sdkFrom)).find((f) => f.startsWith(p.slice(1).replace("/", "-") + "-") && f.endsWith(".tgz"));
    if (!tgz) die(`no ${p} tarball in ${sdkFrom}`);
    return `file:${relative(target, join(resolve(sdkFrom), tgz))}`;
  };

  mkdirSync(target, { recursive: true });
  cpSync(join(HERE, "template"), target, { recursive: true });
  // npm drops dotfiles named .gitignore from published packages; it (and .github, .claude) ships without the dot.
  for (const f of ["gitignore", "github", "claude"]) if (existsSync(join(target, f))) renameSync(join(target, f), join(target, `.${f}`));
  // The shell for the modalities (FEAT-014 MOD-04), its test and its plan.
  for (const [to, from] of Object.entries(shellFiles(modalities))) cpSync(join(HERE, "shells", from), join(target, to));
  mkdirSync(join(target, "e2e"), { recursive: true });
  writeFileSync(join(target, "e2e/starter.spec.js"), starterSpec(modalities));
  // The blueprint lives with the rest of the design work, under docs/ux-builder/ (FEAT-018 GDL-80).
  mkdirSync(join(target, "docs/ux-builder/blueprint"), { recursive: true });
  writeFileSync(join(target, CURRENT.blueprint), JSON.stringify(blueprintFor("__APP_NAME__", modalities), null, 2) + "\n");
  const guide = modalityGuide(modalities);
  // The audit visits every screen of the shell, so each modality's screen is checked (FEAT-014 MOD-08).
  const auditUrls = [...new Set(blueprintFor(name, modalities).screens.map((sc) => sc.path ?? "/"))].map((p) => `http://127.0.0.1:4173${p}`).join(" ");
  const fill = (s) => s.replaceAll("__MODALITY_GUIDE__", guide).replaceAll("__MODALITIES__", modalities.join(", ")).replaceAll("__AUDIT_URLS__", auditUrls).replaceAll("__APP_NAME__", name).replaceAll("__THEME__", theme)
    .replaceAll("__TOKENS__", dep("@ux-builder/tokens")).replaceAll("__UI__", dep("@ux-builder/ui")).replaceAll("__AUDIT__", dep("@ux-builder/audit")).replaceAll("__TRACE__", dep("@ux-builder/trace")).replaceAll("__DESIGN__", dep("@ux-builder/design"))
    .replaceAll("__EPISODE_GUIDE__", trace.AGENT_GUIDE.trimEnd()).replaceAll("__TRACE_IGNORE__", trace.GITIGNORE_LINES.join("\n"));
  const written = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      writeFileSync(p, fill(readFileSync(p, "utf8")));
      written.push(relative(target, p));
    }
  };
  walk(target);
  if (plan) writeFileSync(join(target, CURRENT.blueprint), plan);
  return { dir: target, theme, name, modalities, versions, files: written.sort() };
}

/* The .helix.yml marker: the app's one flow and the HELIX it started on (HLA-01, HLI-02). */
export const marker = (version) => `# HELIX marker: the flows active in this app and where their documents live.
# Started on HELIX ${version} (see .claude/skills/helix/HELIX-VERSION.json).
flows:
  - id: helix
    root: docs/helix/
    version: "${version}"
`;

/* Without HELIX there is no US-001: the starter's test keeps its tests but
   cites no criteria (FEAT-010 HLF-04). */
export function uncite(spec) {
  return spec
    .replace(/^\/\/ The starter screen \(docs\/helix\/[^\n]*\n(?:\/\/[^\n]*\n)*?(?=import )/, "// The starter screen. Replace these tests with your own as the screen changes.\n")
    .replace(/^\/\/ @covers [^\n]*\n/gm, "");
}

/* The agent creating the app, when known: --agent and --model, else
   UX_BUILDER_AGENT and UX_BUILDER_MODEL, else claude-code inside Claude Code. */
export function agentOf({ agent, model } = {}, env = process.env) {
  return { name: agent || env.UX_BUILDER_AGENT || (env.CLAUDECODE === "1" ? "claude-code" : null), model: model || env.UX_BUILDER_MODEL || null };
}

/* The files the starter wrote: everything in the app but its trace. */
function countFiles(dir) {
  let n = 0;
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === ".ux-builder" || e.name === "node_modules") continue; if (e.isDirectory()) walk(join(d, e.name)); else n++; } };
  walk(dir);
  return n;
}

const OWN = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const sha256 = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

/* The create episode (US-105-AC1; FEAT-016 TRC-01, TRC-03): start, created,
   the guidance written to AGENTS.md, the starter blueprint's check, then
   change, outcome and end. A trace that cannot be written never stops the
   app being created. Returns the episode's ID, or null. */
export function traceCreate(r, { agent, options = {} } = {}) {
  const by = `${OWN.name}@${OWN.version}`;
  let id;
  try {
    id = trace.openEpisode(r.dir, {
      trigger: "create", slug: "create", by,
      goal: { text: `Create ${r.name}, a ${r.modalities.join(" and ")} app on the ${r.theme} theme`, stories: r.helix ? ["US-001"] : [], screens: [], journeys: [] },
      agent: agent ?? agentOf(),
      sdk: { ...r.versions, [OWN.name]: OWN.version },
    });
  } catch (e) { process.stderr.write(`create-app: no episode trace was started (${e.message})\n`); return null; }
  const blueprintText = readFileSync(join(r.dir, CURRENT.blueprint), "utf8");
  const files = countFiles(r.dir);
  trace.appendEvent(r.dir, "created", { modalities: r.modalities, theme: r.theme, options, files, blueprint: sha256(blueprintText) }, { by });
  // What the app tells its agent: AGENTS.md (CLAUDE.md is the same), with the patterns its blueprint starts from.
  const agents = readFileSync(join(r.dir, "AGENTS.md"), "utf8");
  let bp = {};
  try { bp = JSON.parse(blueprintText); } catch { /* checked below */ }
  const patterns = [...new Set((bp.screens ?? []).map((s) => s.pattern).filter(Boolean))].sort();
  trace.appendEvent(r.dir, "guidance", { tool: "create-app", input: { modalities: r.modalities, theme: r.theme }, answer: { ruleIds: [], components: patterns, recipes: [], guidanceHash: sha256(agents), bytes: Buffer.byteLength(agents) } }, { by });
  // The starter's blueprint, checked as ux-builder-blueprint check does.
  trace.recordCheck(r.dir, "blueprint", { findings: trace.countFindings(checkBlueprint(bp)) }, { by });
  try { trace.closeEpisode(r.dir, { status: "done", files, by }); } catch (e) { process.stderr.write(`create-app: the create episode was not closed (${e.message})\n`); }
  return id;
}

/* Create the app: HELIX first, so a pinned HELIX that cannot be had, or the
   refused combination, writes nothing (HLF-04); then the app; then HELIX
   into it. If no HELIX can be had, the app is made without it (HLS-02).
   Last, its first episode (traceCreate). */
export async function create(dir, { helix: h = {}, log = () => {}, agent, ...opts } = {}) {
  let helix = h.skip ? null : await getHelix({ tag: h.tag, offline: h.offline, log });
  const unavailable = helix?.unavailable ?? null;
  if (unavailable) helix = null;
  const r = scaffold(dir, opts);
  if (helix) {
    const installed = installHelix(helix, r.dir);
    writeFileSync(join(r.dir, ".helix.yml"), marker(helix.manifest.version));
    const docs = await import("./helix-docs.mjs");
    const written = docs.writeStarterSet(helix, r, { log });
    docs.wire(helix, r);
    r.helix = { ...helix.provenance, skillFiles: installed.files, documents: written };
  } else {
    const spec = join(r.dir, "e2e/starter.spec.js");
    if (existsSync(spec)) writeFileSync(spec, uncite(readFileSync(spec, "utf8")));
    if (unavailable) r.helixUnavailable = unavailable;
  }
  // The guided design loop (FEAT-018 GDL-72): the skill and an empty design state, starting at Define.
  r.design = initDesign(r.dir, { mcp: !!opts.mcp, startedFrom: "new" });
  const options = { name: r.name, mcp: !!opts.mcp, blueprint: opts.blueprint ? "given" : "starter", helix: h.skip ? "none" : h.offline ? "offline" : h.tag ? `pinned ${h.tag}` : r.helix ? "latest" : "unavailable", ...(r.helix ? { helixTag: r.helix.tag } : {}), sdkFrom: !!opts.sdkFrom };
  r.episode = traceCreate(r, { agent: agentOf(agent), options });
  return r;
}

// npm create runs the bin through a symlink in node_modules/.bin, so compare real paths.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { mcp: { type: "boolean" }, modality: { type: "string" }, theme: { type: "string" }, name: { type: "string" }, blueprint: { type: "string" }, "sdk-from": { type: "string" }, "helix-version": { type: "string" }, "helix-offline": { type: "boolean" }, "no-helix": { type: "boolean" }, agent: { type: "string" }, model: { type: "string" }, help: { type: "boolean", short: "h" } } });
  if (values.help || !positionals[0]) {
    console.log(`npm create @ux-builder/app <dir> -- [--modality <list>] [--theme <name>] [--name <package>] [--blueprint <file>] [--helix-version <tag> | --helix-offline | --no-helix] [--agent <name>] [--model <id>] [--mcp]\n\nModalities (--modality, comma-separated; asked for in a terminal, required without one):\n${modalityList()}\n${FUTURE}\n\nThemes: ${themes().join(", ")}`);
    process.exit(values.help ? 0 : 1);
  }
  // The modalities, before anything is written (MOD-01, MOD-03; US-096).
  let modalities;
  try { modalities = resolveModalities({ modality: values.modality, blueprint: values.blueprint }); } catch (e) { die(e.message); }
  if (!modalities) {
    if (!(process.stdin.isTTY && process.stdout.isTTY)) die(`which modalities does the app have? Without a terminal the starter cannot ask, and it assumes none: pass --modality <list>, one or more of:\n${modalityList()}\nNo app was created.`);
    try { modalities = await askModalities(); } catch (e) { die(e.message); }
  }
  let r;
  try {
    r = await create(positionals[0], { modalities, theme: values.theme, name: values.name, sdkFrom: values["sdk-from"], blueprint: values.blueprint, helix: { tag: values["helix-version"], offline: values["helix-offline"], skip: values["no-helix"] }, agent: { agent: values.agent, model: values.model }, mcp: values.mcp, log: (m) => console.error(m) });
  } catch (e) { die(e.message); }
  console.log(`Created ${r.name}, a ${r.modalities.join(" and ")} app, on the ${r.theme} theme (@ux-builder/tokens ${r.versions["@ux-builder/tokens"]}, @ux-builder/ui ${r.versions["@ux-builder/ui"]}).

  cd ${relative(process.cwd(), r.dir).startsWith("..") ? r.dir : relative(process.cwd(), r.dir) || "."}
  npm install
  npm run dev      # http://localhost:5173
  npm run check:blueprint  # the plan of the screens, docs/ux-builder/blueprint/app.blueprint.json
  npm run lint     # no hard-coded colours, fonts or radii

Design with your agent: in Claude Code, type /ux-builder-design (the guide's skill is in .claude/skills/ux-builder-design/).${r.design?.mcp ? " .mcp.json configures the ux-builder MCP server." : ""}`);
  if (r.episode) console.log(`
Episode trace: ${r.episode} in .ux-builder/trace/ records the creation. Open an episode for each change (npx ux-builder-trace start, or the MCP tool start_episode); AGENTS.md says how.`);
  if (r.helix) console.log(`
HELIX ${r.helix.tag}${r.helix.bundled ? ` (bundled with this starter: ${r.helix.reason})` : " (latest release, verified)"}: the helix skill in .claude/skills/helix/, the marker and ${r.helix.documents.length} documents in docs/helix/.`);
  if (r.helixUnavailable) console.log(`
HELIX: not installed: ${r.helixUnavailable}. The app was created without HELIX (as with --no-helix): no marker, documents or skill, and no HELIX-VERSION.json was written.`);
}
