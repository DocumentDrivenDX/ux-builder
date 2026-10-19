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
     --sdk-from <dir>   install @ux-builder/* from .tgz files in <dir> (testing) */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

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
export function scaffold(dir, { theme, name, sdkFrom } = {}) {
  const target = resolve(dir);
  if (existsSync(target) && readdirSync(target).length) die(`${dir} exists and is not empty`);
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
  return { dir: target, theme, name, versions, files: written.sort() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { theme: { type: "string" }, name: { type: "string" }, "sdk-from": { type: "string" }, help: { type: "boolean", short: "h" } } });
  if (values.help || !positionals[0]) {
    console.log(`npm create @ux-builder/app <dir> -- [--theme <name>] [--name <package>]\n\nThemes: ${themes().join(", ")}`);
    process.exit(values.help ? 0 : 1);
  }
  const r = scaffold(positionals[0], { theme: values.theme, name: values.name, sdkFrom: values["sdk-from"] });
  console.log(`Created ${r.name} on the ${r.theme} theme (@ux-builder/tokens ${r.versions["@ux-builder/tokens"]}, @ux-builder/ui ${r.versions["@ux-builder/ui"]}).

  cd ${relative(process.cwd(), r.dir).startsWith("..") ? r.dir : relative(process.cwd(), r.dir) || "."}
  npm install
  npm run dev      # http://localhost:5173
  npm run lint     # no hard-coded colours, fonts or radii`);
}
