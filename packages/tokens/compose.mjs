/* Compose themes from brands and anatomies (ADR-013, ADR-018).

   Pure functions over the files in tokens/: brands, shared design systems and
   themes (CONTRACT-002), the name map (tokens/names.json, CONTRACT-001), and
   the layer every anatomy starts from: tokens/layout.json (size-class
   boundaries and default layout measures, ADR-021) and the screen-pattern
   variants a design system chooses, tokens/variants/*.variants.json (ADR-022).
   build.mjs writes the package from them; tools and tests import them directly.

   A theme is what an app selects (data-theme, CONTRACT-003): one brand plus an
   anatomy, which is either a shared design system (material, fluent, carbon, databricks)
   or the theme's own. Brand × shared design system pairs are also composed,
   for previews (the brand builder, the gallery); they are a tooling surface,
   not what apps select.

   Token paths are CONTRACT-001 paths (color.ground, button.radius). A token's
   CSS name is --piq-<path>; its 0.x name, where it has one, is emitted beside
   it as an alias, --<0.x>: var(--piq-<path>), until 2.0.0 (ADR-015). */

import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { REF, fail } from "./compose-core.mjs";

export * from "./compose-core.mjs";

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
// Licences a font may carry to ship inside an SDK package (ADR-017).
const BUNDLED_LICENCES = new Set(["OFL-1.1", "Apache-2.0"]);

/* ADR-017, checked before the schema so the message names the rule: every
   font declares where it comes from; a bundled font carries a licence that
   allows shipping it; a client-hosted font names the stylesheet it loads. */
function checkFonts(fonts, where) {
  for (const [role, f] of Object.entries(fonts ?? {})) {
    const at = `${where}: font ${role} (${f?.family ?? "unnamed"})`;
    if (!f?.source) fail(`${at} declares no source; use bundled, google, client-hosted or system (ADR-017)`);
    if (f.source === "bundled" && !BUNDLED_LICENCES.has(f.license)) {
      fail(`${at} is bundled with licence ${f.license ?? "none"}; only ${[...BUNDLED_LICENCES].join(" or ")} may ship in an SDK package (ADR-017)`);
    }
    if (f.source === "client-hosted" && !f.url) fail(`${at} is client-hosted but names no stylesheet url (ADR-017)`);
  }
}

/* ------------------------------------------------------------------ load */

/** Read and validate every source under tokensDir; artwork must live under assetRoot. */
export function load(tokensDir, assetRoot) {
  const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true });
  for (const f of ["font", "brand", "design-system", "theme", "layout", "variants", "dataviz"]) ajv.addSchema(readJson(join(tokensDir, "schema", `${f}.schema.json`)), `${f}.schema.json`);
  const names = readJson(join(tokensDir, "names.json")).tokens;

  const read = (dir, kind) => {
    const out = new Map();
    for (const f of readdirSync(join(tokensDir, dir)).filter((x) => x.endsWith(`.${kind}.json`)).sort()) {
      const file = join(tokensDir, dir, f);
      const doc = readJson(file);
      checkFonts(doc.fonts ?? doc.anatomy?.fonts, `${dir}/${f}`);
      // Checked before the schema so the message names the rule (ADR-022).
      if (kind === "brand" && "variants" in doc) fail(`${dir}/${f}: a brand cannot choose pattern variants; variants belong to the design system or a theme's own anatomy (ADR-022, CONTRACT-002)`);
      const validate = ajv.getSchema(`${kind}.schema.json`);
      if (!validate(doc)) fail(`${dir}/${f}: ${validate.errors.map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ")}`);
      if (out.has(doc.name)) fail(`two ${kind} files are named "${doc.name}"`);
      out.set(doc.name, { ...doc, file });
    }
    return out;
  };
  const validated = (file, kind) => {
    const doc = readJson(file), validate = ajv.getSchema(`${kind}.schema.json`);
    if (!validate(doc)) fail(`${relative(tokensDir, file)}: ${validate.errors.map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ")}`);
    return doc;
  };
  const layout = validated(join(tokensDir, "layout.json"), "layout");
  const dataviz = validated(join(tokensDir, "dataviz.json"), "dataviz");
  const variants = new Map();
  for (const f of readdirSync(join(tokensDir, "variants")).filter((x) => x.endsWith(".variants.json")).sort()) {
    const doc = validated(join(tokensDir, "variants", f), "variants");
    if (`${doc.point}.variants.json` !== f) fail(`variants/${f}: point "${doc.point}" must match the file name`);
    variants.set(doc.point, doc);
  }
  const brands = read("brands", "brand");
  // Not enumerable, like an anatomy's baseTokens: a loaded brand still serialises exactly as written.
  for (const b of brands.values()) Object.defineProperty(b, "dataviz", { value: dataviz, enumerable: false, configurable: true });
  const designSystems = read("design-systems", "design-system");
  const themes = read("themes", "theme");

  for (const b of brands.values()) {
    for (const [ap, a] of Object.entries(b.appearances)) {
      for (const [k, t] of Object.entries(a.brand)) {
        if (!/\.(svg|png|webp)$/.test(t.$value)) continue;
        const abs = resolve(dirname(b.file), t.$value);
        const rel = relative(assetRoot, abs);
        if (rel.startsWith("..")) fail(`${b.name}: ${ap} brand.${k} points outside ${assetRoot}`);
        t.$asset = rel.split("\\").join("/");
      }
    }
  }
  const checkGroups = (groups, where) => {
    for (const [g, ts] of Object.entries(groups ?? {})) for (const [k, t] of Object.entries(ts)) {
      const path = `${g}.${k}`;
      if (!names[path]) fail(`${where}: ${path} is not in tokens/names.json`);
      for (const [, r] of String(t.$value).matchAll(REF)) if (!names[r]) fail(`${where}: ${path} refers to {${r}}, which names nothing`);
    }
  };
  // Size-class boundaries are constants (ADR-021): only tokens/layout.json sets them.
  const noBoundaries = (groups, where) => {
    for (const k of Object.keys(groups?.size ?? {})) if (k.startsWith("breakpoint-")) fail(`${where}: sets size.${k}; size-class boundaries are SDK constants (ADR-021, CONTRACT-001)`);
  };
  for (const [ap, groups] of Object.entries(dataviz.appearances)) checkGroups(groups, `dataviz.json ${ap}`);
  checkGroups(dataviz.derived, "dataviz.json derived");
  checkGroups(layout.constants, "layout.json constants");
  checkGroups(layout.defaults, "layout.json defaults");
  noBoundaries(layout.defaults, "layout.json defaults");

  /* Each variant point (CONTRACT-002 Variants): its variants set the same
     component tokens, and no token belongs to two points. */
  const owner = new Map();
  const tokenSet = (groups) => Object.entries(groups).flatMap(([g, ts]) => Object.keys(ts).map((k) => `${g}.${k}`)).sort();
  for (const v of variants.values()) {
    const where = `variants/${v.point}.variants.json`;
    if (!v.variants[v.default]) fail(`${where}: default "${v.default}" is not one of its variants`);
    const [first, ...rest] = Object.entries(v.variants);
    const set = tokenSet(first[1].tokens).join(",");
    for (const [name, variant] of [first, ...rest]) {
      checkGroups(variant.tokens, `${where} ${name}`);
      if (tokenSet(variant.tokens).join(",") !== set) fail(`${where}: variant "${name}" sets different tokens from "${first[0]}"; every variant of a point sets the same tokens`);
    }
    for (const path of set.split(",")) {
      if (names[path].tier !== "component") fail(`${where}: ${path} is a ${names[path].tier} token; a variant sets component tokens only`);
      if (owner.has(path)) fail(`${where}: ${path} already belongs to the ${owner.get(path)} point`);
      owner.set(path, v.point);
    }
  }

  /* The layer an anatomy starts from: default layout measures, the variant it
     names at each point (else the default), then the boundaries. Its own
     tokens come after it (compose-core anatomyTokens). */
  const baseTokens = (a, where) => {
    for (const [point, name] of Object.entries(a.variants ?? {})) {
      if (!variants.has(point)) fail(`${where}: unknown variant point "${point}"; defined points: ${[...variants.keys()].join(", ")}`);
      if (!variants.get(point).variants[name]) fail(`${where}: variant point "${point}" has no variant "${name}"; it has ${Object.keys(variants.get(point).variants).join(", ")}`);
    }
    const out = {};
    const add = (groups) => { for (const [g, ts] of Object.entries(groups)) out[g] = { ...out[g], ...ts }; };
    add(layout.defaults);
    for (const v of variants.values()) add(v.variants[a.variants?.[v.point] ?? v.default].tokens);
    add(layout.constants);
    return out;
  };
  // WCAG 2.5.8: no pointer target below 24 CSS px (CONTRACT-001).
  const px = (v) => { const m = /^(\d*\.?\d+)(px|rem)$/.exec(String(v).trim()); return m ? Number(m[1]) * (m[2] === "rem" ? 16 : 1) : null; };
  const targetFloor = (groups, where) => {
    const v = groups?.size?.["target-minimum"]?.$value;
    if (v === undefined) return;
    const n = px(v);
    if (n === null) fail(`${where}: size.target-minimum must be a length in px or rem, not ${v}`);
    if (n < 24) fail(`${where}: size.target-minimum is ${v}, below 24 CSS px (WCAG 2.5.8)`);
  };
  targetFloor(layout.defaults, "layout.json defaults");
  const checkAnatomy = (a, where) => {
    for (const groups of [a.tokens, ...Object.values(a.appearances ?? {})]) { checkGroups(groups, where); noBoundaries(groups, where); targetFloor(groups, where); }
    // Not enumerable: a loaded file still serialises exactly as written (the
    // builder and tests write files from loaded ones); read it as a.baseTokens.
    Object.defineProperty(a, "baseTokens", { value: baseTokens(a, where), enumerable: false, configurable: true });
  };
  for (const s of designSystems.values()) checkAnatomy(s, s.name);
  for (const t of themes.values()) {
    const brand = brands.get(t.brand);
    if (!brand) fail(`theme ${t.name}: no brand "${t.brand}"`);
    if (t.designSystem && !designSystems.has(t.designSystem)) fail(`theme ${t.name}: no shared design system "${t.designSystem}"`);
    if (t.anatomy) checkAnatomy(t.anatomy, `theme ${t.name}`);
    if (t.default && !brand.appearances[t.default]) fail(`theme ${t.name}: default ${t.default}, but brand ${t.brand} has no ${t.default} appearance`);
  }
  return { names, brands, designSystems, themes, layout, variants, dataviz };
}

/* ----------------------------------------------------------------- names */

