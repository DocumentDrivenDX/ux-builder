#!/usr/bin/env node
/* Prove every theme resolves to exactly the values it did on the platform.

     npm run verify

   The reference is the platform's original theme files in
   tools/fixtures/source-css/, copied from the original harness prototype
   assets/themes/ and loaded in the order its web/main.jsx imports them.

   The comparison is by outcome, not by file, because the files no longer line
   up: Praxis used to be two themes (claude-like as the parent, praxis on top)
   and is now one. So for each theme and appearance, this sets the attributes
   the app sets on <html>, runs the CSS cascade over the custom properties —
   selector specificity first, then source order, as a browser does — and
   compares the final value of every property, old against new.

   Values are compared after var() references are resolved, so two files that
   reach the same value by different references (the composer refers to roles
   where the platform wrote literals) compare equal.

   Same final value for every property, for every theme and appearance, means
   nothing a user sees can differ, except the contrast fixes listed in
   DEPARTURES, which must land exactly as listed. Comments are ignored; they
   live in the token files now.

   This check matters while consumers still hold the originals. Once they load
   the package, the fixtures stop being the reference and this script retires
   with them. */

// @covers US-005-AC4
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OLD = ["plain.css", "claude-like.css", "praxis.css"].map((f) => join(ROOT, "tools/fixtures/source-css", f));
const NEW = ["plain.css", "praxis.css"].map((f) => join(ROOT, "packages/tokens/dist/themes", f));

// The attributes the platform sets on <html> for each theme and appearance
// (web/App.jsx): Praxis carried data-family="conversational" to pick up its
// parent; the collapsed theme no longer needs it, but setting it proves the
// new CSS is not relying on it either way.
const CONTEXTS = [
  { label: "plain light",   attrs: { "data-theme": "plain", "data-appearance": "light" } },
  { label: "praxis dark",   attrs: { "data-theme": "praxis", "data-family": "conversational", "data-appearance": "dark" } },
  { label: "praxis light",  attrs: { "data-theme": "praxis", "data-family": "conversational", "data-appearance": "light" } },
];

// Where this package departs from the platform on purpose: the contrast
// failures fixed here before the platform takes them (step 4). Each is the
// value the package must now set; any other difference still fails. When the
// platform's files carry the same values, refresh the fixtures and empty this.
// Praxis's v2 artwork replaced the platform's (operator, 2026-10-07).
const PRAXIS_V2 = (ap, aspect) => ({
  "--logo-image": `url("../brand/praxis/logo-v2-on-${ap}.svg")`, "--logo-aspect": aspect,
  "--mark-image": 'url("../brand/praxis/mark-v2.svg")', "--favicon": 'url("../brand/praxis/mark-v2.svg")',
});
const DEPARTURES = {
  "praxis dark":   { "--muted-2": "#8E8A81", ...PRAXIS_V2("dark", "3.045") },
  "praxis light":  { "--muted-2": "#706C62", "--state-limited": "#986A24", "--state-evaluation": "#777268", ...PRAXIS_V2("light", "3.029") },
  "plain light":   { "--muted-2": "#6B7484", "--state-live": "#047152", "--state-limited": "#A24A08", "--state-evaluation": "#5E6471" },
};

// Tokens the package adds on purpose, which the platform never set: 1.x role
// names (--piq-*, e.g. color.on-accent) and --rail, which CONTRACT-002 derives
// from the ground for brands that set no recessed ground. Additive: nothing
// the platform's CSS reads can change.
const isAddition = (name) => name.startsWith("--piq-") || name === "--rail";

// A block's selector may be a list (CONTRACT-003 emits one alternative per
// data-theme alias). Each alternative is attribute selectors only; a bare
// [attr] tests presence.
function blocks(files) {
  let order = 0;
  return files.flatMap((file) => {
    // @property rules register types (the artwork URLs); they set no values.
    const bare = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/@property [\w-]+\s*\{[^{}]*\}/g, "");
    return [...bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => {
      const alternatives = sel.split(",").map((alt) => {
        const selector = alt.trim().replace(/\s+/g, " ");
        const conds = [...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].map(([, k, v]) => [k, v]);
        if (selector.replace(/\[[\w-]+(?:="[^"]*")?\]/g, "") !== "") throw new Error(`unsupported selector ${selector}`);
        return conds;
      });
      const props = [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, n, v]) => [n, v.trim().replace(/\s+/g, " ")]);
      return { alternatives, props, order: order++ };
    });
  });
}

const matches = (conds, attrs) => conds.every(([k, v]) => (v === undefined ? k in attrs : attrs[k] === v));

// Replace every var(--x) with x's own final value, so two files that reach the
// same value by different references compare equal.
function resolveVars(map) {
  const out = new Map();
  const visit = (name, stack = []) => {
    if (out.has(name)) return out.get(name);
    if (stack.includes(name)) throw new Error(`var() cycle: ${[...stack, name].join(" -> ")}`);
    const raw = map.get(name);
    if (raw === undefined) return undefined;
    const v = raw.replace(/var\((--[\w-]+)\)/g, (m, n) => visit(n, [...stack, name]) ?? m);
    out.set(name, v);
    return v;
  };
  for (const n of map.keys()) visit(n);
  // A property that is only a reference to an unset one is itself unset (an
  // alias of a role the theme reset): the same outcome as no declaration.
  for (const [n, v] of out) if (/^var\(--[\w-]+\)$/.test(v) && !map.has(v.slice(4, -1))) out.delete(n);
  return out;
}

function cascade(all, attrs) {
  const winners = new Map();               // name -> { value, specificity, order }
  for (const b of all) {
    const hit = b.alternatives.filter((conds) => matches(conds, attrs));
    if (!hit.length) continue;
    const specificity = Math.max(...hit.map((c) => c.length));  // attribute selectors only, so a count
    for (const [name, value] of b.props) {
      const cur = winners.get(name);
      if (!cur || specificity > cur.specificity || (specificity === cur.specificity && b.order > cur.order)) {
        winners.set(name, { value, specificity, order: b.order });
      }
    }
  }
  // "initial" is a reset to unset (a theme clearing what it does not set, so
  // an outer theme cannot show through): the same outcome as no declaration.
  return new Map([...winners].filter(([, w]) => w.value !== "initial").map(([n, w]) => [n, w.value]));
}

const oldBlocks = blocks(OLD), newBlocks = blocks(NEW);
let failures = 0;
for (const { label, attrs } of CONTEXTS) {
  const want = resolveVars(cascade(oldBlocks, attrs)), got = resolveVars(cascade(newBlocks, attrs));
  const departs = DEPARTURES[label] ?? {};
  for (const [n, v] of Object.entries(departs)) want.set(n, v);
  const diffs = [];
  for (const [n, v] of want) if (got.get(n) !== v) diffs.push(`${n}: want "${v}", got "${got.get(n) ?? "(unset)"}"`);
  const added = [...got.keys()].filter((n) => !want.has(n) && isAddition(n));
  for (const n of got.keys()) if (!want.has(n) && !isAddition(n)) diffs.push(`${n}: extra, "${got.get(n)}"`);
  const fixed = (Object.keys(departs).length ? `, ${Object.keys(departs).length} fixed here on purpose` : "") + (added.length ? `, ${added.length} added` : "");
  if (diffs.length) { failures += diffs.length; console.log(`FAIL ${label}`); diffs.forEach((d) => console.log(`     ${d}`)); }
  else console.log(`ok   ${label.padEnd(14)} ${want.size} properties resolve as on the platform${fixed}`);
}
if (failures) { console.log(`\n${failures} difference(s).`); process.exit(1); }
console.log("\nEvery theme and appearance resolves as it did on the platform, apart from the departures listed in DEPARTURES (contrast fixes, Praxis v2 artwork).");
