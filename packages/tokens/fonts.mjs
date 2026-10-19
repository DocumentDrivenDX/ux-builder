/* Fonts by declared source (ADR-017, FEAT-004 SDK-02, US-010).

   For every theme, each font role is loaded the way its declaration says:

     bundled        @font-face rules for the woff2 files the package ships,
                    copied from the face's @fontsource package (latin and
                    latin-ext subsets, the weights declared), with its
                    licence beside them
     google         an @import of the Google Fonts stylesheet
     client-hosted  an @import of the client's own stylesheet (font.url)
     system         nothing: the face is on the user's machine

   Writes dist/fonts/<theme>.css (one theme's faces), dist/fonts.css (every
   bundled face of every theme) and dist/fonts/*.woff2 + *.LICENSE. Every
   @font-face uses font-display: swap. */

import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { anatomyOf, ComposeError } from "./compose-core.mjs";

const require = createRequire(import.meta.url);
const SUBSETS = ["latin-ext", "latin"];
const DEFAULT_WEIGHTS = [400];

export const fontsourceId = (family) => family.toLowerCase().replace(/\s+/g, "-");

function fontsourceDir(family) {
  try { return dirname(require.resolve(`@fontsource/${fontsourceId(family)}/package.json`)); }
  catch { throw new ComposeError(`font ${family} is bundled, but @fontsource/${fontsourceId(family)} is not installed (npm install -D -w @ux-builder/tokens @fontsource/${fontsourceId(family)})`); }
}

/* The fonts a theme uses, one entry per family, with the weights all roles ask for. */
export function themeFonts(src, theme) {
  const anatomy = anatomyOf(src, theme);
  const fonts = { ...anatomy.fonts, ...(src.brands.get(theme.brand).fonts ?? {}) };
  const byFamily = new Map();
  for (const f of Object.values(fonts)) {
    const e = byFamily.get(f.family) ?? { ...f, weights: new Set() };
    for (const w of f.weights ?? DEFAULT_WEIGHTS) e.weights.add(w);
    byFamily.set(f.family, e);
  }
  return [...byFamily.values()].map((f) => ({ ...f, weights: [...f.weights].sort((a, b) => a - b) }));
}

/* @font-face blocks for one bundled family, from its @fontsource CSS, and the files they need. */
export function bundledFaces(font) {
  const dir = fontsourceDir(font.family);
  const faces = [], files = [];
  for (const w of font.weights) {
    const cssFile = join(dir, `${w}.css`);
    if (!existsSync(cssFile)) throw new ComposeError(`font ${font.family}: @fontsource has no weight ${w}`);
    const css = readFileSync(cssFile, "utf8");
    for (const subset of SUBSETS) {
      const block = new RegExp(`/\\* ${fontsourceId(font.family)}-${subset}-${w}-normal \\*/\\s*(@font-face \\{[\\s\\S]*?\\})`).exec(css)?.[1];
      if (!block) continue;
      const file = `${fontsourceId(font.family)}-${subset}-${w}-normal.woff2`;
      files.push({ from: join(dir, "files", file), file });
      faces.push(block.replace(/src: [^;]+;/, `src: url("./${file}") format("woff2");`).replace(/font-display: \w+;/, "font-display: swap;"));
    }
  }
  const license = `${fontsourceId(font.family)}.LICENSE`;
  return { faces, files, license: { from: join(dir, "LICENSE"), file: license } };
}

const googleUrl = (fonts) => "https://fonts.googleapis.com/css2?" +
  fonts.map((f) => `family=${encodeURIComponent(f.family).replace(/%20/g, "+")}:wght@${f.weights.join(";")}`).join("&") + "&display=swap";

/* One theme's font CSS, written for dist/fonts/<theme>.css, and the files to copy. */
export function themeFontCss(src, theme) {
  const fonts = themeFonts(src, theme);
  const imports = [], faces = [], copies = [];
  const google = fonts.filter((f) => f.source === "google");
  if (google.length) imports.push(`@import url("${googleUrl(google)}");`);
  for (const f of fonts.filter((x) => x.source === "client-hosted")) imports.push(`@import url("${f.url}");`);
  for (const f of fonts.filter((x) => x.source === "bundled")) {
    const b = bundledFaces(f);
    faces.push(`/* ${f.family} ${f.weights.join(", ")}: ${f.license}, licence in ${b.license.file} */`, ...b.faces);
    copies.push(...b.files, b.license);
  }
  const system = fonts.filter((f) => f.source === "system").map((f) => f.family);
  const head = `/* Fonts for the ${theme.name} theme (ADR-017).${system.length ? ` System faces, not loaded: ${system.join(", ")}.` : ""} */`;
  return { css: [head, ...imports, ...faces].join("\n") + "\n", copies };
}

/* Copy files into dist/fonts/, once each. */
export function copyFonts(copies, dir) {
  const done = new Set();
  for (const c of copies) {
    if (done.has(c.file)) continue;
    if (!existsSync(c.from)) throw new ComposeError(`font file missing: ${c.from}`);
    copyFileSync(c.from, join(dir, c.file));
    done.add(c.file);
  }
}
