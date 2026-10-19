#!/usr/bin/env node
/* Check the brand, design system and theme file formats (CONTRACT-002).

     npm run schemas

   1. The schemas in tokens/schema/ are valid JSON Schema 2020-12.
   2. Every brand (tokens/brands/), shared design system
      (tokens/design-systems/), theme (tokens/themes/) and example
      (tokens/schema/examples/) validates against its schema.
   3. What a schema cannot say: a brand's artwork paths exist; every
      {reference} in a design system or a theme's own anatomy names a role a
      brand supplies (color.*, state.*), a font role, or one of the anatomy's
      own tokens; every theme names a brand and, if it has one, a shared
      design system that exist (ADR-018).
   4. The schemas reject what CONTRACT-002 forbids: each rule below is tried
      against a broken copy of a real file, which must fail.
   5. tokens/names.json and CONTRACT-001's table name the same tokens with the
      same 0.x names, so the document and the data cannot drift.
   6. tokens/layout.json and every tokens/variants/*.variants.json validate
      (ADR-021, ADR-022); the composer's own rules for them are tested in
      tools/__tests__/variants.test.mjs.

   Exits 1 if any check fails. */

import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// --root checks another checkout's tokens/ (the tests break a copy); the
// contract cross-check (5) always reads this repository's documents.
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = parseArgs({ options: { root: { type: "string" } } }).values.root ?? REPO;
const SCHEMAS = join(ROOT, "tokens/schema");
const EXAMPLES = join(SCHEMAS, "examples");
const DIRS = [join(ROOT, "tokens/brands"), join(ROOT, "tokens/design-systems"), join(ROOT, "tokens/themes"), EXAMPLES];
const read = (f) => JSON.parse(readFileSync(f, "utf8"));

// Strict, except that a token's $value may be a string or a number.
const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true });
for (const f of ["font.schema.json", "brand.schema.json", "design-system.schema.json", "theme.schema.json", "layout.schema.json", "variants.schema.json"]) {
  const schema = read(join(SCHEMAS, f));
  if (!ajv.validateSchema(schema)) fail(`${f} is not valid JSON Schema 2020-12`, ajv.errors);
  ajv.addSchema(schema, f);
}
const validate = {
  brand: ajv.getSchema("brand.schema.json"),
  "design-system": ajv.getSchema("design-system.schema.json"),
  theme: ajv.getSchema("theme.schema.json"),
  layout: ajv.getSchema("layout.schema.json"),
  variants: ajv.getSchema("variants.schema.json"),
};

let failures = 0;
function fail(what, errors) {
  failures++;
  console.log(`FAIL  ${what}`);
  for (const e of errors ?? []) console.log(`      ${e.instancePath || "/"} ${e.message}`);
}
const kindOf = (f) => (f.endsWith(".brand.json") ? "brand" : f.endsWith(".design-system.json") ? "design-system" : f.endsWith(".theme.json") ? "theme" : null);

// ---- 2 and 3: brands, design systems and examples
const examples = DIRS.flatMap((d) => readdirSync(d).filter(kindOf).sort().map((f) => join(d, f)));
const brands = [];
for (const file of examples) {
  const f = file.slice(ROOT.length + 1);
  const doc = read(file);
  const kind = kindOf(f);
  if (!validate[kind](doc)) { fail(`${f} does not match ${kind}.schema.json`, validate[kind].errors); continue; }
  if (kind === "brand") {
    brands.push(doc);
    for (const [ap, a] of Object.entries(doc.appearances)) {
      for (const [k, t] of Object.entries(a.brand)) {
        if (/\.(svg|png|webp)$/.test(t.$value) && !existsSync(resolve(dirname(file), t.$value))) fail(`${f}: ${ap} brand.${k} points to a missing file ${t.$value}`);
      }
    }
  }
  console.log(`ok    ${f}`);
}

const roleRefs = new Set(["font.display", "font.heading", "font.body", "font.mono"]);
for (const b of brands) for (const a of Object.values(b.appearances)) {
  for (const k of Object.keys(a.color)) roleRefs.add(`color.${k}`);
  for (const k of Object.keys(a.state)) roleRefs.add(`state.${k}`);
}
const brandNames = new Set(brands.map((b) => b.name));
const shared = new Set(examples.filter((x) => kindOf(x) === "design-system").map((x) => read(x).name));
for (const file of examples.filter((x) => kindOf(x) === "theme")) {
  const f = file.slice(ROOT.length + 1), t = read(file);
  if (!brandNames.has(t.brand)) fail(`${f}: names brand "${t.brand}", which does not exist`);
  else if (t.designSystem && !shared.has(t.designSystem)) fail(`${f}: names shared design system "${t.designSystem}", which does not exist`);
  else console.log(`ok    ${f}: brand ${t.brand} on ${t.designSystem ?? "its own anatomy"}`);
}
const anatomies = [
  ...examples.filter((x) => kindOf(x) === "design-system").map((x) => [x, read(x)]),
  ...examples.filter((x) => kindOf(x) === "theme").map((x) => [x, read(x).anatomy]).filter(([, a]) => a),
];
for (const [file, ds] of anatomies) {
  const f = file.slice(ROOT.length + 1);
  const own = new Set(Object.entries(ds.tokens).flatMap(([g, ts]) => Object.keys(ts).map((k) => `${g}.${k}`)));
  const groups = [ds.tokens, ...Object.values(ds.appearances ?? {})];
  const unknown = new Set();
  for (const g of groups) for (const ts of Object.values(g)) for (const t of Object.values(ts)) {
    for (const [, r] of String(t.$value).matchAll(/\{([a-z0-9.-]+)\}/g)) if (!roleRefs.has(r) && !own.has(r)) unknown.add(r);
  }
  if (unknown.size) fail(`${f}: references nothing a brand or the anatomy defines: ${[...unknown].join(", ")}`);
  else console.log(`ok    ${f}: every reference resolves`);
}

// ---- 4: the rules reject what they should
const praxis = read(join(ROOT, "tokens/brands/praxis.brand.json"));
const carbon = read(join(ROOT, "tokens/design-systems/carbon.design-system.json"));
const synaptiq = read(join(ROOT, "tokens/themes/synaptiq.theme.json"));
const tabsPoint = read(join(ROOT, "tokens/variants/tabs.variants.json"));
const layout = read(join(ROOT, "tokens/layout.json"));
const clone = (o) => structuredClone(o);
const mustFail = [
  // @covers US-002-AC1
  ["design-system", "a literal colour in a design system", () => { const d = clone(carbon); d.tokens.button.radius.$value = "#FF0000"; return d; }],
  // @covers US-002-AC2
  ["design-system", "a color group in a design system", () => { const d = clone(carbon); d.tokens.color = { accent: { $value: "{color.accent}" } }; return d; }],
  ["brand", "a bundled font without a licence", () => { const d = clone(praxis); d.fonts = { body: { family: "Acme Sans", fallback: ["sans-serif"], source: "bundled" } }; return d; }],
  // @covers US-001-AC2
  ["brand", "a shape token in a brand", () => { const d = clone(praxis); d.appearances.dark.radius = { control: { $value: "4px" } }; return d; }],
  // @covers US-001-AC3
  ["brand", "a brand without color.on-accent", () => { const d = clone(praxis); delete d.appearances.dark.color["on-accent"]; return d; }],
  ["theme", "a theme with both a shared design system and its own anatomy", () => { const d = clone(synaptiq); d.designSystem = "carbon"; return d; }],
  ["theme", "a theme with neither a shared design system nor its own anatomy", () => { const d = clone(synaptiq); delete d.anatomy; return d; }],
  ["theme", "a literal colour in a theme's own anatomy", () => { const d = clone(synaptiq); d.anatomy.tokens.button.radius.$value = "#FF0000"; return d; }],
  ["variants", "a variant point with one variant", () => { const d = clone(tabsPoint); delete d.variants.enclosed; return d; }],
  ["variants", "a variant point with four variants", () => { const d = clone(tabsPoint); d.variants.a = d.variants.b = d.variants.underlined; return d; }],
  ["variants", "a literal colour in a variant", () => { const d = clone(tabsPoint); d.variants.enclosed.tokens.tabs["tab-bg-selected"].$value = "#FFFFFF"; return d; }],
  ["layout", "a layout file without the size-class boundaries", () => { const d = clone(layout); delete d.constants.size["breakpoint-large"]; return d; }],
];
for (const [kind, what, make] of mustFail) {
  if (validate[kind](make())) fail(`rule not enforced: ${what} was accepted`);
  else console.log(`ok    rejects ${what}`);
}

// ---- 6: the layout base and the variant points
for (const file of [join(ROOT, "tokens/layout.json"), ...readdirSync(join(ROOT, "tokens/variants")).filter((f) => f.endsWith(".variants.json")).sort().map((f) => join(ROOT, "tokens/variants", f))]) {
  const f = file.slice(ROOT.length + 1), kind = f.endsWith("layout.json") ? "layout" : "variants";
  if (!validate[kind](read(file))) fail(`${f} does not match ${kind}.schema.json`, validate[kind].errors);
  else console.log(`ok    ${f}`);
}

// @covers US-004-AC5
// ---- 5: names.json matches CONTRACT-001
const contract = readFileSync(join(REPO, "docs/helix/02-design/contracts/CONTRACT-001-token-names.md"), "utf8");
const rows = new Map([...contract.matchAll(/^\| (?:`--([a-z0-9-]+)`|—) \| `([a-z0-9.-]+)` \|/gm)].map(([, old, path]) => [path, old ?? null]));
const names = read(join(ROOT, "tokens/names.json")).tokens;
const drift = [...new Set([...rows.keys(), ...Object.keys(names)])].filter((p) => !names[p] || !rows.has(p) || names[p].css0 !== rows.get(p));
if (drift.length) fail(`tokens/names.json and CONTRACT-001 disagree on: ${drift.join(", ")}`);
else console.log(`ok    tokens/names.json matches CONTRACT-001 (${rows.size} tokens)`);

console.log(failures ? `\n${failures} check(s) failed.` : "\nSchemas, brands, design systems, themes and rules all check out.");
process.exit(failures ? 1 : 0);
