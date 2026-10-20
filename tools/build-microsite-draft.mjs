#!/usr/bin/env node
/* Build the draft microsite (apps/theme-builder/microsite.html, src/microsite/)
   into <site>/v2/, beside a site that tools/build-pages.mjs has built, for
   review on this computer only. pages.yml does not run this, so nothing here
   is published.

     node tools/build-pages.mjs _site && node tools/build-microsite-draft.mjs _site */

import { existsSync, readFileSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { APP, viteOptions } from "../apps/theme-builder/vite.shared.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const site = resolve(process.argv[2] ?? "_site");
if (!existsSync(join(site, "themes/index.html"))) { console.error(`build-microsite-draft: build the site into ${site} first (node tools/build-pages.mjs ${process.argv[2] ?? "_site"})`); process.exit(1); }

const brand = JSON.parse(readFileSync(join(ROOT, "tokens/brands/ux-builder.brand.json"), "utf8"));
process.env.VITE_INTRO_PAINT = brand.appearances.light.brand["logo-paint"].$value;
process.env.VITE_SITE_URL = (process.env.SITE_URL ?? "https://documentdrivendx.github.io/ux-builder/v2/").replace(/\/?$/, "/");
const out = join(site, "v2");
await build({ ...viteOptions(), base: "./", publicDir: false, build: { outDir: out, emptyOutDir: true, rolldownOptions: { input: join(APP, "microsite.html") } } });
renameSync(join(out, "microsite.html"), join(out, "index.html"));
console.log(`build-microsite-draft: ${out}/ (local review only; not published)`);
