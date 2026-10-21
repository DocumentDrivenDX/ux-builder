#!/usr/bin/env node
/* npm create @ux-builder/app <dir> -- --theme <name>  (FEAT-004 SDK-08, SDK-09; US-012)

   Scaffolds a React + Vite app already on the AI-UI SDK: the theme's CSS and
   fonts, @ux-builder/ui's widgets and ThemeProvider with a theme and appearance
   switcher, a page built from SDK widgets and role tokens only, the
   ux-builder/no-hard-coded-values lint rule in `npm run lint`, and the agent
   guidance (CLAUDE.md, the Claude Code skill). @ux-builder/tokens and
   @ux-builder/ui are pinned to the exact versions this package was released
   with.

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

   By default the app also starts on the latest HELIX release: its skill and
   catalogue in .claude/skills/helix/, the .helix.yml marker and the starter
   set of HELIX documents (FEAT-010, ADR-027). */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkBlueprint } from "@ux-builder/ui/blueprint";
import { getHelix, install as installHelix } from "./helix.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
const NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const die = (m) => { console.error(`create-app: ${m}`); process.exit(1); };

/* The SDK versions to pin: the ones this package was released with. */
export function sdkVersions() {
  const v = (p) => JSON.parse(readFileSync(require.resolve(`${p}/package.json`), "utf8")).version;
  return { "@ux-builder/tokens": v("@ux-builder/tokens"), "@ux-builder/ui": v("@ux-builder/ui"), "@ux-builder/audit": v("@ux-builder/audit") };
}
export function themes() {
  return JSON.parse(readFileSync(require.resolve("@ux-builder/tokens/manifest.json"), "utf8")).themes.map((t) => t.name);
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

export function scaffold(dir, { theme, name, sdkFrom, blueprint } = {}) {
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
  // npm drops dotfiles named .gitignore from published packages; it (and .github) ships without the dot.
  for (const f of ["gitignore", "github"]) if (existsSync(join(target, f))) renameSync(join(target, f), join(target, `.${f}`));
  const fill = (s) => s.replaceAll("__APP_NAME__", name).replaceAll("__THEME__", theme)
    .replaceAll("__TOKENS__", dep("@ux-builder/tokens")).replaceAll("__UI__", dep("@ux-builder/ui")).replaceAll("__AUDIT__", dep("@ux-builder/audit"));
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
  if (plan) writeFileSync(join(target, "app.blueprint.json"), plan);
  return { dir: target, theme, name, versions, files: written.sort() };
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

/* Create the app: HELIX first, so a pinned HELIX that cannot be had, or the
   refused combination, writes nothing (HLF-04); then the app; then HELIX
   into it. If no HELIX can be had, the app is made without it (HLS-02). */
export async function create(dir, { helix: h = {}, log = () => {}, ...opts } = {}) {
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
  return r;
}

// npm create runs the bin through a symlink in node_modules/.bin, so compare real paths.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { theme: { type: "string" }, name: { type: "string" }, blueprint: { type: "string" }, "sdk-from": { type: "string" }, "helix-version": { type: "string" }, "helix-offline": { type: "boolean" }, "no-helix": { type: "boolean" }, help: { type: "boolean", short: "h" } } });
  if (values.help || !positionals[0]) {
    console.log(`npm create @ux-builder/app <dir> -- [--theme <name>] [--name <package>] [--blueprint <file>] [--helix-version <tag> | --helix-offline | --no-helix]\n\nThemes: ${themes().join(", ")}`);
    process.exit(values.help ? 0 : 1);
  }
  let r;
  try {
    r = await create(positionals[0], { theme: values.theme, name: values.name, sdkFrom: values["sdk-from"], blueprint: values.blueprint, helix: { tag: values["helix-version"], offline: values["helix-offline"], skip: values["no-helix"] }, log: (m) => console.error(m) });
  } catch (e) { die(e.message); }
  console.log(`Created ${r.name} on the ${r.theme} theme (@ux-builder/tokens ${r.versions["@ux-builder/tokens"]}, @ux-builder/ui ${r.versions["@ux-builder/ui"]}).

  cd ${relative(process.cwd(), r.dir).startsWith("..") ? r.dir : relative(process.cwd(), r.dir) || "."}
  npm install
  npm run dev      # http://localhost:5173
  npm run check:blueprint  # the plan of the screens, app.blueprint.json
  npm run lint     # no hard-coded colours, fonts or radii`);
  if (r.helix) console.log(`
HELIX ${r.helix.tag}${r.helix.bundled ? ` (bundled with this starter: ${r.helix.reason})` : " (latest release, verified)"}: the helix skill in .claude/skills/helix/, the marker and ${r.helix.documents.length} documents in docs/helix/.`);
  if (r.helixUnavailable) console.log(`
HELIX: not installed: ${r.helixUnavailable}. The app was created without HELIX (as with --no-helix): no marker, documents or skill, and no HELIX-VERSION.json was written.`);
}
