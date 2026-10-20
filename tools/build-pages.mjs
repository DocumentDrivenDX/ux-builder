#!/usr/bin/env node
/* Assemble the GitHub Pages site (.github/workflows/pages.yml): a page for
   each theme (the theme builder's own theme pages, built static), the
   gallery, Storybook, and a landing page that links them.

     npm run build && npm run gallery && npm run build-storybook --workspace @ux-builder/ui
     node tools/build-pages.mjs _site

   The theme pages are the builder's front end built with VITE_STATIC: each
   theme's data is what the builder's local API would answer (GET /api/theme),
   written to themes/data/ at build time, and their Storybook links go to the
   Storybook published beside them. The builder's own steps need the local
   server (ADR-019) and are not part of the site.

   The landing page wears the plain theme through its role tokens, like any
   app on the SDK, so it holds no colours or fonts of its own. */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { context } from "../apps/theme-builder/api/context.mjs";
import { theme } from "../apps/theme-builder/api/theme.mjs";
import { viteOptions } from "../apps/theme-builder/vite.shared.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const out = process.argv[2] ?? "_site";
const need = {
  gallery: join(ROOT, "build/gallery.html"),
  storybook: join(ROOT, "packages/ui/storybook-static/index.html"),
  theme: join(ROOT, "packages/tokens/dist/themes/plain.css"),
};
for (const [what, path] of Object.entries(need)) {
  if (!existsSync(path)) { console.error(`build-pages: no ${what} at ${path}; build it first (see the header of this file)`); process.exit(1); }
}

const version = (pkg) => JSON.parse(readFileSync(join(ROOT, "packages", pkg, "package.json"), "utf8")).version;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(need.gallery, join(out, "gallery.html"));
cpSync(join(ROOT, "packages/ui/storybook-static"), join(out, "storybook"), { recursive: true });
cpSync(need.theme, join(out, "plain.css"));
cpSync(join(ROOT, "apps/theme-builder/public/favicon.svg"), join(out, "favicon.svg"));
writeFileSync(join(out, ".nojekyll"), "");   // serve Storybook's _-prefixed files as they are

// The theme pages: the app, then the data it reads in place of the local API.
const themesOut = join(out, "themes");
await build({ ...viteOptions(), base: "./", define: { "import.meta.env.VITE_STATIC": JSON.stringify("1") }, build: {
  outDir: themesOut, emptyOutDir: true,
  // The page matches stories to widgets by the components' names (themepage/stories.js), so minifying keeps them.
  rolldownOptions: { output: { keepNames: true } },
} });
const ctx = context({ root: ROOT, model: { available: false, reason: "The static theme pages have no model." } });
const data = join(themesOut, "data");
mkdirSync(join(data, "themes"), { recursive: true });
writeFileSync(join(data, "context.json"), JSON.stringify({ themes: ctx.themes }));
process.env.STORYBOOK_URL = "../storybook";   // from themes/, the Storybook beside it
for (const t of ctx.themes) writeFileSync(join(data, "themes", `${t.name}.json`), JSON.stringify(theme({ root: ROOT, name: t.name })));

writeFileSync(join(out, "index.html"), `<!doctype html>
<html lang="en" data-theme="plain">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UX Builder</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="stylesheet" href="plain.css">
<style>
  body { margin: 0; background: var(--piq-color-ground); color: var(--piq-color-text); font-family: var(--piq-font-body); font-size: var(--piq-font-size-body); }
  main { max-width: 44rem; margin: 0 auto; padding: var(--piq-space-8) var(--piq-space-5); display: flex; flex-direction: column; gap: var(--piq-space-5); }
  h1 { margin: 0; font-family: var(--piq-font-heading); font-size: var(--piq-font-size-display); color: var(--piq-color-text-strong); }
  p { margin: 0; }
  .lead { font-size: var(--piq-font-size-lead); color: var(--piq-color-text-muted); }
  .cards { display: grid; gap: var(--piq-space-4); grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
  .card { display: flex; flex-direction: column; gap: var(--piq-space-2); padding: var(--piq-space-5); background: var(--piq-color-surface); border: var(--piq-border-default); border-radius: var(--piq-radius-card); color: inherit; text-decoration: none; }
  .card:hover, .card:focus-visible { border-color: var(--piq-color-accent); }
  .card b { font-family: var(--piq-font-heading); font-size: var(--piq-font-size-heading); color: var(--piq-color-accent); }
  code { font-family: var(--piq-font-mono); }
  .small { font-size: var(--piq-font-size-small); color: var(--piq-color-text-muted); }
</style>
</head>
<body>
<main>
  <h1>UX Builder</h1>
  <p class="lead">An open-source UI SDK for AI-era apps: themes made from a brand, widgets that follow them, and guardrails so apps can't drift.</p>
  <div class="cards">
    <a class="card" href="themes/"><b>Themes</b><span>A page for each theme: its logos, palette and CSS, and every widget, AI component and screen pattern in it.</span></a>
    <a class="card" href="gallery.html"><b>Theme gallery</b><span>Every theme and token, in light and dark, on one page.</span></a>
    <a class="card" href="storybook/"><b>Storybook</b><span>Every widget and pattern, switchable through every theme.</span></a>
  </div>
  <p>Install from npm: <code>npm install @ux-builder/tokens @ux-builder/ui</code>, or start a new app with <code>npm create @ux-builder/app my-app</code>.</p>
  <p class="small">@ux-builder/tokens ${version("tokens")} · @ux-builder/ui ${version("ui")} · <a href="https://github.com/DocumentDrivenDX/ux-builder">Source on GitHub</a></p>
</main>
</body>
</html>
`);
console.log(`build-pages: ${out}/ (index.html, themes/ with ${ctx.themes.length} themes, gallery.html, storybook/)`);
