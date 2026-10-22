#!/usr/bin/env node
/* Check the interaction rules and recipes (FEAT-008 PRV-01 to PRV-03,
   RUL-05; ADR-025; CONTRACT-005).

     node tools/check-rules.mjs   (npm run check runs it)

   1. guidelines/rules.json and recipes.json validate against their schemas,
      and the blueprint schema is valid JSON Schema 2020-12.
   2. Rule and recipe IDs are unique.
   3. Provenance: every rule cites a source; a quotation comes only from an
      openly licensed source (CC-BY-2.5, CC-BY-4.0, W3C, own), carries its
      words, and is at most 25 words, and @ux-builder/ui's
      THIRD-PARTY-NOTICES.md credits it by its title or URL. Apple's,
      Google's and Microsoft's guidelines, Google PAIR (CC BY-NC-SA) and
      Cheng et al. (CC BY-NC-ND) are paraphrased. Microsoft Learn's preview
      agent pages never stand as a rule's only source (FEAT-011 AIP-03).
   4. Every check a rule names exists: blueprint checks in
      @ux-builder/ui/blueprint, audit checks in @ux-builder/audit, lint rules
      in the catalogue, card checks in @ux-builder/ui/adaptive-cards (CHECKS
      of its check module, the one checkCard runs).
   5. Every pattern a rule or recipe names is a catalogue pattern, and every
      rule a recipe names exists.

   Exits 1, naming the rule and the problem, if any check fails. */

import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
export const OPEN = new Set(["CC-BY-2.5", "CC-BY-4.0", "W3C", "own"]);
/* Supporting only: preview, AI-generated pages (FEAT-011 AIP-03). */
export const SUPPORTING_ONLY = ["https://learn.microsoft.com/en-us/agents/"];
export const MAX_QUOTE_WORDS = 25;

export async function known() {
  const { CHECKS } = await import("../packages/ui/blueprint/index.mjs");
  const { RULES } = await import("../packages/audit/audit.mjs");
  const { CHECKS: CARD_CHECKS } = await import("../packages/ui/adaptive-cards/check.mjs");
  const cat = read("packages/ui/catalogue.json");
  return {
    blueprint: new Set(CHECKS),
    audit: new Set(Object.keys(RULES)),
    lint: new Set(cat.lint.rules),
    card: new Set(CARD_CHECKS),
    patterns: new Set(cat.patterns.filter((p) => p.type === "component").map((p) => p.name)),
  };
}

/* The notices that must credit a quoted source (FEAT-008 PRV-02). */
export const NOTICES = "packages/ui/THIRD-PARTY-NOTICES.md";

/* Problems with the rules and recipes, as "rule <id>: <problem>" lines.
   `notices` is the text of the shipped third-party notices. */
export function checkRules({ rules, recipes, notices = "" }, k) {
  const problems = [];
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  for (const [name, data] of [["rules", rules], ["recipes", recipes]]) {
    const v = ajv.compile(read(`guidelines/schema/${name}.schema.json`));
    if (!v(data)) for (const e of v.errors) problems.push(`${name}.json${e.instancePath}: ${e.message}`);
  }
  const bpSchema = read("guidelines/schema/blueprint.schema.json");
  if (!ajv.validateSchema(bpSchema)) problems.push("blueprint.schema.json is not valid JSON Schema 2020-12");
  const ids = new Set();
  for (const r of rules.rules ?? []) {
    const at = `rule ${r.id}`;
    if (ids.has(r.id)) problems.push(`${at}: the ID is used twice`);
    ids.add(r.id);
    if (!r.sources?.length) problems.push(`${at}: cites no source`);
    else if (r.sources.every((s) => SUPPORTING_ONLY.some((u) => s.url?.startsWith(u)))) problems.push(`${at}: cites only Microsoft Learn's preview agent pages; add a primary source`);
    for (const s of r.sources ?? []) {
      if (s.wording === "quoted") {
        if (!OPEN.has(s.licence)) problems.push(`${at}: quotes "${s.title}", whose licence (${s.licence}) does not allow it; paraphrase it`);
        if (!s.quote) problems.push(`${at}: marks "${s.title}" quoted but gives no quote`);
        else if (s.quote.trim().split(/\s+/).length > MAX_QUOTE_WORDS) problems.push(`${at}: quotes ${s.quote.trim().split(/\s+/).length} words of "${s.title}"; at most ${MAX_QUOTE_WORDS}`);
        if (!(s.title && notices.includes(s.title)) && !(s.url && notices.includes(s.url))) problems.push(`${at}: quotes "${s.title}", which ${NOTICES} does not credit; add it to the notices`);
      } else if (s.quote) problems.push(`${at}: gives a quote from "${s.title}" but marks it paraphrased`);
    }
    for (const c of r.checks ?? []) {
      if (c.kind !== "review" && !k[c.kind]?.has(c.id)) problems.push(`${at}: names the ${c.kind} check "${c.id}", which does not exist`);
    }
    for (const p of r.appliesTo?.patterns ?? []) if (!k.patterns.has(p)) problems.push(`${at}: names the pattern "${p}", which is not in the catalogue`);
  }
  // Every audit check is a catalogue rule's (FEAT-015 RPT-02, US-101-AC3):
  // a finding is reported under the rule that names its check.
  const named = new Set((rules.rules ?? []).flatMap((r) => (r.checks ?? []).filter((c) => c.kind === "audit").map((c) => c.id)));
  for (const c of k.audit ?? []) if (!named.has(c)) problems.push(`audit check ${c}: no rule names it (checks: [{ kind: "audit", id: "${c}" }]); its findings would have no rule ID, statement or sources`);
  const rids = new Set();
  for (const r of recipes.recipes ?? []) {
    const at = `recipe ${r.id}`;
    if (rids.has(r.id)) problems.push(`${at}: the ID is used twice`);
    rids.add(r.id);
    for (const s of r.screens ?? []) if (!k.patterns.has(s.pattern)) problems.push(`${at}: names the pattern "${s.pattern}", which is not in the catalogue`);
    for (const id of r.rules ?? []) if (!ids.has(id)) problems.push(`${at}: names the rule "${id}", which does not exist`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkRules({ rules: read("guidelines/rules.json"), recipes: read("guidelines/recipes.json"), notices: readFileSync(join(ROOT, NOTICES), "utf8") }, await known());
  if (problems.length) { for (const p of problems) console.error(`✗ ${p}`); process.exit(1); }
  console.log(`interaction rules and recipes: ok (${read("guidelines/rules.json").rules.length} rules, ${read("guidelines/recipes.json").recipes.length} recipes)`);
}
