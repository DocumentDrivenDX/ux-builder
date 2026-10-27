/* Design first, the app last (FEAT-018 GDL-81, US-150; CONTRACT-008 Design
   first).

   `npm create @ux-builder/app <dir>` without --modality or --blueprint
   writes a design folder and asks nothing: the guide (@ux-builder/design,
   its skill, an empty design state started from `design`), a starting
   blueprint, HELIX's skill and marker, and no app code. The name is the
   folder's; the modality is asked during the design (GDL-80); the theme
   when the app is built.

   `npm create @ux-builder/app <design folder> -- --theme <name>` builds the
   app in place, from the recorded modality and the designed blueprint,
   keeping every design document. It writes nothing unless everything it
   needs is there and no file is in its way. */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBlueprint } from "@ux-builder/ui/blueprint";
import { CURRENT } from "@ux-builder/ui/blueprint/paths";
import { init as initDesign, modalityStatus, readState, STATE_FILE, writeState } from "@ux-builder/design";
import { getHelix, install as installHelix, installed } from "./helix.mjs";
import { generateJourneyApp, withoutHome } from "./journey-app.mjs";
import { agentOf, marker, scaffold, sdkVersions, themes, traceCreate, uncite } from "./index.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const OWN = JSON.parse(readFileSync(join(HERE, "package.json"), "utf8"));

/* The files a design folder writes that the app's own replace at the build. */
export const DESIGN_FILES = ["package.json", "README.md", "AGENTS.md", "CLAUDE.md", ".gitignore", "scripts/install-skill.mjs"];

/* Where a theme comes from when no released one carries the person's brand. */
export const THEME_BUILDER = "No theme carries your brand? Make one in the theme builder: in a clone of https://github.com/DocumentDrivenDX/ux-builder run `npm install && npm run builder`, make the theme from your logo and save it (saving opens a pull request). Once it is merged and released in @ux-builder/tokens, build on it by its name. Or build on `plain` now.";
export const themeList = () => themes().map((t) => `  ${t}`).join("\n");

/* A folder made by startDesign whose app is not built yet. */
export function isDesignFolder(dir) {
  const file = join(resolve(dir), STATE_FILE);
  if (!existsSync(file)) return false;
  try { const s = JSON.parse(readFileSync(file, "utf8")); return s.startedFrom === "design" && !s.app; } catch { return false; }
}

/* The build a design folder records once its app is built, else null. */
export function builtFrom(dir) {
  try { const s = JSON.parse(readFileSync(join(resolve(dir), STATE_FILE), "utf8")); return s.startedFrom === "design" && s.app ? s.app : null; } catch { return null; }
}

const fail = (m) => { throw new Error(m); };

/* Write the design folder. Returns { dir, name, versions, files, helix?, helixUnavailable?, design }. */
export async function startDesign(dir, { name, sdkFrom, helix: h = {}, mcp = false, log = () => {} } = {}) {
  const target = resolve(dir);
  if (existsSync(target) && readdirSync(target).length) fail(`${dir} exists and is not empty`);
  name ??= basename(target).toLowerCase().replace(/[^a-z0-9-._~]+/g, "-");
  if (!NAME.test(name)) fail(`"${name}" is not a valid package name; use --name`);
  let helix = h.skip ? null : await getHelix({ tag: h.tag, offline: h.offline, log });
  const unavailable = helix?.unavailable ?? null;
  if (unavailable) helix = null;

  const versions = sdkVersions();
  const dep = depFor(target, versions, sdkFrom);
  mkdirSync(target, { recursive: true });
  cpSync(join(HERE, "design-folder"), target, { recursive: true });
  // npm drops dotfiles named .gitignore from published packages; it ships without the dot.
  renameSync(join(target, "gitignore"), join(target, ".gitignore"));
  mkdirSync(join(target, "scripts"), { recursive: true });
  cpSync(join(HERE, "template/scripts/install-skill.mjs"), join(target, "scripts/install-skill.mjs"));
  for (const f of DESIGN_FILES) {
    const p = join(target, f);
    writeFileSync(p, readFileSync(p, "utf8").replaceAll("__APP_NAME__", name).replaceAll("__DESIGN__", dep("@ux-builder/design")).replaceAll("__UI__", dep("@ux-builder/ui")));
  }
  const r = { dir: target, name, versions };
  if (helix) {
    const installed = installHelix(helix, target);
    writeFileSync(join(target, ".helix.yml"), marker(helix.manifest.version));
    r.helix = { ...helix.provenance, skillFiles: installed.files, documents: [] };
  } else if (unavailable) r.helixUnavailable = unavailable;
  // The guide: its skill, the design state (startedFrom design, at Define) and a starting blueprint.
  r.design = initDesign(target, { mcp, startedFrom: "design" });
  const bpPath = join(target, CURRENT.blueprint);
  const bp = JSON.parse(readFileSync(bpPath, "utf8"));
  writeFileSync(bpPath, JSON.stringify({ ...bp, name }, null, 2) + "\n");
  r.files = listFiles(target);
  return r;
}

/* Build the app in the design folder. Returns create()'s result. */
export async function buildInPlace(dir, { theme, modalities: given, blueprint, name, sdkFrom, helix: h = {}, agent, mcp = false, log = () => {} } = {}) {
  const target = resolve(dir);
  if (!isDesignFolder(target)) fail(`${dir} is not a design folder waiting for its app (made by npm create @ux-builder/app without --modality)`);
  if (blueprint) fail("--blueprint is refused in a design folder: the app is built from the designed blueprint, docs/ux-builder/blueprint/app.blueprint.json. Nothing was written.");
  const m = modalityStatus(target);
  if (!m.confirmed) fail(`the app's modalities are not recorded yet: ask the person which modalities and screen sizes the app is for, and record their answer with ux-builder-design modality --answer "<their words>" --modality <list> --size-classes <list>. Nothing was written.`);
  const modalities = m.modalities;
  if (given && (given.length !== modalities.length || given.some((x) => !modalities.includes(x)))) fail(`--modality ${given.join(",")} differs from the modalities recorded in the design, ${modalities.join(",")}; leave out --modality, or record the new answer with ux-builder-design modality. Nothing was written.`);
  if (!theme) fail(`which theme? Choose one with --theme <name>:\n${themeList()}\n${THEME_BUILDER}`);
  if (!themes().includes(theme)) fail(`unknown theme "${theme}"; choose one of ${themes().join(", ")}. ${THEME_BUILDER}`);
  const plan = readFileSync(join(target, CURRENT.blueprint), "utf8");
  const errors = checkBlueprint(JSON.parse(plan)).filter((f) => f.severity === "error");
  if (errors.length) fail(`the designed blueprint has ${errors.length} error${errors.length === 1 ? "" : "s"}; fix ${errors.length === 1 ? "it" : "them"} first (npm run check:blueprint). Nothing was written:\n${errors.map((f) => `  ${f.rule}  ${f.path || "/"}: ${f.message}`).join("\n")}`);
  const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  name ??= pkg.name;

  // The app, made apart, then moved in: nothing is written until every file has a place.
  const tmp = mkdtempSync(join(tmpdir(), "ux-builder-build-"));
  let r;
  try {
    const made = scaffold(join(tmp, "app"), { theme, name, sdkFrom, modalities, base: target });
    const keep = new Set([CURRENT.blueprint, ...DESIGN_FILES]);
    const clash = made.files.filter((f) => !keep.has(f) && existsSync(join(target, f)));
    if (clash.length) fail(`${clash.length === 1 ? "a file is" : "files are"} in the way of the app: ${clash.join(", ")}; move or remove ${clash.length === 1 ? "it" : "them"} first. Nothing was written.`);
    for (const f of made.files) {
      if (f === CURRENT.blueprint) continue;
      const to = join(target, f);
      mkdirSync(dirname(to), { recursive: true });
      if (f === "package.json") writeFileSync(to, JSON.stringify(mergePackage(pkg, JSON.parse(readFileSync(join(made.dir, f), "utf8"))), null, 2) + "\n");
      else cpSync(join(made.dir, f), to);
    }
    r = { ...made, dir: target };
  } finally { rmSync(tmp, { recursive: true, force: true }); }

  // The journey skeleton (US-159): the designed screens and journeys, in place of the empty Home.
  r.prototype = generateJourneyApp(target, { modalities });
  if (r.prototype.generated) {
    const spec = join(target, "e2e/starter.spec.js");
    if (existsSync(spec)) writeFileSync(spec, withoutHome(readFileSync(spec, "utf8")));
    rmSync(join(target, "src/Home.jsx"), { force: true });
    r.files = [...new Set([...r.files.filter((f) => f !== "src/Home.jsx"), ...r.prototype.written])].sort();
    const pkgFile = join(target, "package.json");
    const own = JSON.parse(readFileSync(pkgFile, "utf8"));
    own.scripts = { ...own.scripts, prototype: `npx @ux-builder/create-app@${OWN.version} --prototype .` };
    writeFileSync(pkgFile, JSON.stringify(own, null, 2) + "\n");
  }

  // HELIX: its starter documents where the design has none (by ID or role, US-156-AC3), and the toolchain wired to it.
  const helix = existsSync(join(target, ".helix.yml")) && !h.skip ? installed(target) : null;
  if (helix) {
    const docs = await import("./helix-docs.mjs");
    const skipped = [];
    const written = docs.writeStarterSet(helix, r, { log, keep: true, skipped });
    r.helixSkipped = skipped;
    docs.wire(helix, r);
    r.helix = { ...helix.provenance, skillFiles: 0, documents: written, skipped };
  }
  // The starter's test cites US-001's criteria only when US-001 is the starter's.
  if (!r.helix || r.helixSkipped?.some((s) => s.id === "US-001")) {
    const spec = join(target, "e2e/starter.spec.js");
    if (existsSync(spec)) writeFileSync(spec, uncite(readFileSync(spec, "utf8")));
  }
  const state = readState(target);
  state.app = { builtAt: new Date().toISOString(), theme, modalities, by: "@ux-builder/create-app" };
  writeState(target, state);
  r.design = { app: target, startedFrom: "design", mcp, written: [], notes: [] };
  r.built = true;
  r.episode = traceCreate(r, { agent: agentOf(agent), options: { name, mcp: !!mcp, blueprint: "designed", inPlace: true, helix: r.helix ? "starter documents" : "none", sdkFrom: !!sdkFrom } });
  return r;
}

/* The design folder's package.json, become the app's: its name and own fields
   kept, the app's scripts and dependencies added; a package in both the
   app's dependencies and the folder's devDependencies is a dependency. */
export function mergePackage(folder, app) {
  const dependencies = { ...folder.dependencies, ...app.dependencies };
  const devDependencies = { ...folder.devDependencies, ...app.devDependencies };
  for (const d of Object.keys(dependencies)) delete devDependencies[d];
  return { ...app, ...folder, name: folder.name, scripts: { ...folder.scripts, ...app.scripts }, dependencies, devDependencies };
}

function depFor(target, versions, sdkFrom) {
  return (p) => {
    if (!sdkFrom) return versions[p];
    const tgz = readdirSync(resolve(sdkFrom)).find((f) => f.startsWith(p.slice(1).replace("/", "-") + "-") && f.endsWith(".tgz"));
    if (!tgz) fail(`no ${p} tarball in ${sdkFrom}`);
    return `file:${relative(target, join(resolve(sdkFrom), tgz))}`;
  };
}

function listFiles(dir) {
  const out = [];
  const walk = (d, rel = "") => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === "node_modules") continue; if (e.isDirectory()) walk(join(d, e.name), `${rel}${e.name}/`); else out.push(`${rel}${e.name}`); } };
  walk(dir);
  return out.sort();
}
