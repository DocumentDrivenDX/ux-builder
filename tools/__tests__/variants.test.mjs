/* Screen-pattern variants and the layout base (ADR-021, ADR-022; CONTRACT-002
   Variants and Composition step 0): what every theme starts from, what a
   design system may choose, and what the build refuses.

     npm test */

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ComposeError, defaultAppearance, load, resolvedJson, themeCss } from "../../packages/tokens/compose.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const src = load(join(ROOT, "tokens"), join(ROOT, "brand"));
const resolved = (s, theme) => resolvedJson(s, theme, defaultAppearance(s, s.themes.get(theme)));

// A copy of tokens/ and brand/ with files edited, then loaded.
function loadWith(edits) {
  const d = mkdtempSync(join(tmpdir(), "variants-"));
  try {
    cpSync(join(ROOT, "tokens"), join(d, "tokens"), { recursive: true });
    cpSync(join(ROOT, "brand"), join(d, "brand"), { recursive: true });
    for (const [file, make] of Object.entries(edits)) {
      const p = join(d, "tokens", file);
      let current = null;
      try { current = JSON.parse(readFileSync(p, "utf8")); } catch { /* a new file */ }
      writeFileSync(p, JSON.stringify(make(current)));
    }
    return load(join(d, "tokens"), join(d, "brand"));
  } finally { rmSync(d, { recursive: true, force: true }); }
}
const refuses = (edits, pattern) => assert.throws(() => loadWith(edits), (e) => e instanceof ComposeError && pattern.test(e.message), `expected ${pattern}`);

const POINTS = { navigation: "nav", tabs: "tabs", "page-header": "page-header", table: "table" };
const BOUNDARIES = { "breakpoint-medium": "600px", "breakpoint-expanded": "840px", "breakpoint-large": "1200px", "breakpoint-extra-large": "1600px" };

describe("the layout base", () => {
  test("every theme carries the same size-class boundaries", () => {
    for (const t of src.themes.keys()) {
      const r = resolved(src, t);
      for (const [k, v] of Object.entries(BOUNDARIES)) assert.equal(r[`piq-size-${k}`], v, `${t}: size.${k}`);
    }
  });

  test("a design system may override a layout measure, which then wins over the default", () => {
    const s = loadWith({ "design-systems/carbon.design-system.json": (d) => ({ ...d, tokens: { ...d.tokens, space: { ...d.tokens.space, "gutter-compact": { $value: "{space.3}" } } } }) });
    assert.equal(resolved(s, "praxis-carbon")["piq-space-gutter-compact"], resolved(s, "praxis-carbon")["piq-space-3"]);
    assert.equal(resolved(s, "praxis-material")["piq-space-gutter-compact"], resolved(s, "praxis-material")["piq-space-4"], "others keep the default");
  });

  test("a design system that sets a size-class boundary fails the build", () => {
    refuses({ "design-systems/carbon.design-system.json": (d) => ({ ...d, tokens: { ...d.tokens, size: { ...d.tokens.size, "breakpoint-medium": { $value: "672px" } } } }) }, /carbon: sets size\.breakpoint-medium; size-class boundaries are SDK constants/);
  });

  test("a minimum target below 24 CSS px fails the build (WCAG 2.5.8)", () => {
    refuses({ "design-systems/carbon.design-system.json": (d) => ({ ...d, tokens: { ...d.tokens, size: { ...d.tokens.size, "target-minimum": { $value: "1.25rem" } } } }) }, /carbon: size\.target-minimum is 1\.25rem, below 24 CSS px/);
  });

  test("a theme's own anatomy that sets one fails too", () => {
    refuses({ "themes/praxis.theme.json": (t) => ({ ...t, anatomy: { ...t.anatomy, appearances: { ...t.anatomy.appearances, dark: { ...t.anatomy.appearances?.dark, size: { "breakpoint-large": { $value: "1100px" } } } } } }) }, /theme praxis: sets size\.breakpoint-large/);
  });
});

describe("variants", () => {
  test("each design system resolves the variant it names; Material's navigation is the rail", () => {
    assert.equal(resolved(src, "praxis-material")["piq-nav-item-direction"], "column");
    assert.equal(resolved(src, "praxis-material")["piq-nav-width"], "5rem");
    for (const t of ["praxis-carbon", "praxis-fluentui"]) assert.equal(resolved(src, t)["piq-nav-item-direction"], "row", t);
  });

  // @covers US-030-AC2
  test("a point an anatomy does not name takes the point's default, for every theme", () => {
    for (const t of src.themes.keys()) {
      const theme = src.themes.get(t);
      const anatomy = theme.designSystem ? src.designSystems.get(theme.designSystem) : theme.anatomy;
      const r = resolved(src, t);
      for (const [point, group] of Object.entries(POINTS)) {
        const v = src.variants.get(point);
        const chosen = anatomy.variants?.[point] ?? v.default;
        for (const k of Object.keys(v.variants[chosen].tokens[group])) assert.ok(r[`piq-${group}-${k}`] !== undefined, `${t}: ${group}.${k} from ${point}/${chosen}`);
      }
    }
    // The table's default variant draws exactly the rule every table had before variants.
    for (const t of src.themes.keys()) assert.equal(resolved(src, t)["piq-table-row-border"], resolved(src, t)["piq-border-default"], t);
  });

  test("a design system can fine-tune one token of its variant", () => {
    const s = loadWith({ "design-systems/material.design-system.json": (d) => ({ ...d, tokens: { ...d.tokens, nav: { width: { $value: "6rem" } } } }) });
    const r = resolved(s, "praxis-material");
    assert.equal(r["piq-nav-width"], "6rem");
    assert.equal(r["piq-nav-item-direction"], "column", "the rest of the rail stays");
  });

  test("variants are emitted in each theme's own block, so a nested theme shows its own", () => {
    for (const t of ["praxis-material", "praxis-carbon"]) assert.match(themeCss(src, t), new RegExp(`\\[data-theme="${t}"\\] \\{[^}]*--piq-nav-item-direction: ${t === "praxis-material" ? "column" : "row"};`));
  });

  test("an unknown variant point fails the build, naming the defined points", () => {
    refuses({ "design-systems/fluent.design-system.json": (d) => ({ ...d, variants: { sidebar: "rail" } }) }, /fluent: unknown variant point "sidebar"; defined points: navigation, page-header, table, tabs/);
  });

  test("an unknown variant fails the build, naming the point's variants", () => {
    refuses({ "design-systems/fluent.design-system.json": (d) => ({ ...d, variants: { tabs: "pills" } }) }, /variant point "tabs" has no variant "pills"; it has underlined, enclosed/);
  });

  // @covers US-030-AC3
  test("a brand that names a variant fails the build, saying variants belong to the design system", () => {
    refuses({ "brands/praxis.brand.json": (b) => ({ ...b, variants: { navigation: "rail" } }) }, /a brand cannot choose pattern variants; variants belong to the design system/);
  });

  test("variants of one point that set different tokens fail the build", () => {
    refuses({ "variants/tabs.variants.json": (v) => { delete v.variants.enclosed.tokens.tabs["tab-radius"]; return v; } }, /variant "enclosed" sets different tokens from "underlined"/);
  });

  test("a token in two points fails the build", () => {
    refuses({ "variants/page-header.variants.json": (v) => { for (const x of Object.values(v.variants)) x.tokens.tabs = { "tab-radius": { $value: "0" } }; return v; } }, /tabs\.tab-radius already belongs to the page-header point|page-header\.variants\.json: tabs\.tab-radius already belongs/);
  });

  test("a role token in a variant fails the build", () => {
    refuses({ "variants/table.variants.json": (v) => { for (const x of Object.values(v.variants)) x.tokens.space = { "gutter-compact": { $value: "0" } }; return v; } }, /space\.gutter-compact is a role token; a variant sets component tokens only/);
  });

  test("a default that is not one of the variants fails the build", () => {
    refuses({ "variants/table.variants.json": (v) => ({ ...v, default: "striped" }) }, /default "striped" is not one of its variants/);
  });

  test("a point named differently from its file fails the build", () => {
    refuses({ "variants/table.variants.json": (v) => ({ ...v, point: "rows" }) }, /point "rows" must match the file name/);
  });
});
