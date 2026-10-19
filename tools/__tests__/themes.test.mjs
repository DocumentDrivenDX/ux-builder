/* Themes are what apps select (ADR-018, CONTRACT-002 and CONTRACT-003 as
   amended): one brand plus a shared design system or the theme's own anatomy.

     npm test */

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ComposeError, anatomyOf, defaultAppearance, load, resolvedJson, themeAppearances, themeCss } from "../../packages/tokens/compose.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const src = load(join(ROOT, "tokens"), join(ROOT, "brand"));

// A copy of tokens/ and brand/ with one file written or edited, then loaded.
function loadWith(file, make) {
  const d = mkdtempSync(join(tmpdir(), "themes-"));
  try {
    cpSync(join(ROOT, "tokens"), join(d, "tokens"), { recursive: true });
    cpSync(join(ROOT, "brand"), join(d, "brand"), { recursive: true });
    const p = join(d, "tokens", file);
    let current = null;
    try { current = JSON.parse(readFileSync(p, "utf8")); } catch { /* a new file */ }
    writeFileSync(p, JSON.stringify(make(current)));
    return load(join(d, "tokens"), join(d, "brand"));
  } finally { rmSync(d, { recursive: true, force: true }); }
}

describe("the model", () => {
  test("the shared design systems are material, fluent, carbon and databricks; praxis and plain are not", () => {
    assert.deepEqual([...src.designSystems.keys()].sort(), ["carbon", "databricks", "fluent", "material"]);
    for (const t of ["praxis", "plain"]) assert.ok(!src.designSystems.has(t), `${t} is a theme, not a design system`);
  });

  test("the six 0.x names are themes; praxis and plain carry their own anatomy", () => {
    for (const t of ["praxis", "plain"]) assert.ok(src.themes.get(t).anatomy, `${t} has its own anatomy`);
    for (const [t, ds] of [["praxis-material", "material"], ["praxis-fluentui", "fluent"], ["praxis-carbon", "carbon"]]) {
      assert.equal(src.themes.get(t).designSystem, ds);
      assert.equal(anatomyOf(src, src.themes.get(t)), src.designSystems.get(ds));
    }
  });

  test("a theme's default appearance is its own, else dark where its brand has dark", () => {
    assert.equal(defaultAppearance(src, src.themes.get("praxis")), "dark");
    assert.equal(defaultAppearance(src, src.themes.get("plain")), "light");
    assert.equal(defaultAppearance(src, src.themes.get("synaptiq")), "light");
    assert.deepEqual(themeAppearances(src, src.themes.get("synaptiq")), ["dark", "light"]);
  });
});

describe("theme CSS", () => {
  // @covers US-005-AC5
  test("the default appearance needs only data-theme; the other appearance restores what the default's anatomy overrides", () => {
    const s = loadWith("themes/synaptiq.theme.json", (t) => ({ ...t, default: "dark" }));
    const css = themeCss(s, "synaptiq");
    const light = css.slice(css.indexOf('[data-theme="synaptiq"][data-appearance="light"]'));
    assert.match(css, /^\[data-theme="synaptiq"\] \{/);
    assert.match(light, /--piq-shadow-card: 0 1px 2px rgba\(49, 42, 41, 0\.06\)/, "light restores the base card shadow that dark overrode");
    assert.match(light, /--piq-color-accent: #C4463F;/);
  });

  test("synaptiq: light by default, with its own anatomy and the brand's colours", () => {
    const css = themeCss(src, "synaptiq");
    assert.match(css, /^\[data-theme="synaptiq"\] \{[\s\S]*--piq-color-accent: #C4463F;/);
    assert.match(css, /\[data-theme="synaptiq"\]\[data-appearance="dark"\] \{[\s\S]*--piq-color-accent: #F7CFA5;/);
    assert.match(css, /--piq-font-heading: "Zilla Slab", Georgia, serif;/);
    assert.match(css, /--piq-button-radius: 3px;/);
  });
});

describe("adding a theme", () => {
  test("a new theme file composes with no code change", () => {
    const s = loadWith("themes/praxis-plain.theme.json", () => ({ name: "praxis-plain", title: "Praxis Plain", brand: "praxis", anatomy: src.themes.get("plain").anatomy }));
    const tokens = resolvedJson(s, "praxis-plain", "dark");
    for (const [k, v] of Object.entries(tokens)) assert.doesNotMatch(String(v), /[{}]|var\(/, `--${k} = ${v}`);
    assert.equal(tokens["piq-color-accent"], "#FF6642", "the brand's accent");
  });

  test("a theme naming a missing brand fails the build", () => {
    assert.throws(() => loadWith("themes/nope.theme.json", () => ({ name: "nope", title: "Nope", brand: "nope", designSystem: "carbon" })),
      (e) => e instanceof ComposeError && /no brand "nope"/.test(e.message));
  });

  test("a default appearance the brand lacks fails the build", () => {
    assert.throws(() => loadWith("themes/plain.theme.json", (t) => ({ ...t, default: "dark" })),
      (e) => e instanceof ComposeError && /has no dark appearance/.test(e.message));
  });
});
