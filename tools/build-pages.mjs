#!/usr/bin/env node
/* Assemble the GitHub Pages site (.github/workflows/pages.yml): the home
   page, a page for each theme (the theme builder's own theme pages, built
   static), the gallery and Storybook.

     npm run build && npm run gallery && npm run build-storybook --workspace @ux-builder/ui
     node tools/build-pages.mjs _site

   The theme pages are the builder's front end built with VITE_STATIC: each
   theme's data is what the builder's local API would answer (GET /api/theme),
   written to themes/data/ at build time, and their Storybook links go to the
   Storybook published beside them. The builder's own steps need the local
   server (ADR-019) and are not part of the site.

   The theme list links only public themes ("public": true in the theme
   file); every theme's page is built, so an unlisted one opens by its name.

   The home page (apps/theme-builder/home.html, src/home/) is built from the
   same app with the SDK's widgets and AI Components, in ux-builder-databricks.
   Its intro video plays on the brand's logo paint, read here from the brand
   file, since the intro shows before the page's CSS arrives. */

import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { context } from "../apps/theme-builder/api/context.mjs";
import { theme } from "../apps/theme-builder/api/theme.mjs";
import { APP, viteOptions } from "../apps/theme-builder/vite.shared.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// Absolute: Vite resolves a relative outDir against the app's folder, not the working directory.
const out = resolve(process.argv[2] ?? "_site");
const need = {
  gallery: join(ROOT, "build/gallery.html"),
  storybook: join(ROOT, "packages/ui/storybook-static/index.html"),
};
for (const [what, path] of Object.entries(need)) {
  if (!existsSync(path)) { console.error(`build-pages: no ${what} at ${path}; build it first (see the header of this file)`); process.exit(1); }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(need.gallery, join(out, "gallery.html"));
cpSync(join(ROOT, "packages/ui/storybook-static"), join(out, "storybook"), { recursive: true });
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
// The list names only public themes; every theme's page is built, so an unlisted one opens by its name.
writeFileSync(join(data, "context.json"), JSON.stringify({ themes: ctx.themes.filter((t) => t.public) }));
process.env.STORYBOOK_URL = "../storybook";   // from themes/, the Storybook beside it
for (const t of ctx.themes) writeFileSync(join(data, "themes", `${t.name}.json`), JSON.stringify(theme({ root: ROOT, name: t.name })));
if (!existsSync(join(themesOut, "index.html"))) { console.error(`build-pages: the theme pages did not build into ${themesOut}`); process.exit(1); }

// The home page, into the site's root beside themes/ (its own assets/; the public/ folder brings favicon.svg).
const brand = JSON.parse(readFileSync(join(ROOT, "tokens/brands/ux-builder.brand.json"), "utf8"));
process.env.VITE_INTRO_PAINT = brand.appearances.light.brand["logo-paint"].$value;
await build({ ...viteOptions(), base: "./", build: { outDir: out, emptyOutDir: false, rolldownOptions: { input: join(APP, "home.html") } } });
renameSync(join(out, "home.html"), join(out, "index.html"));
console.log(`build-pages: ${out}/ (index.html, themes/ with ${ctx.themes.length} themes, ${ctx.themes.filter((t) => t.public).length} listed, gallery.html, storybook/)`);
