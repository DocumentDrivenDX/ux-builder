/* The composer (packages/tokens/compose.mjs): a new brand needs no code
   (FEAT-001 THEME-07), composition follows CONTRACT-002, selectors follow
   CONTRACT-003, and bad sources fail the build.

     npm test */

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ComposeError, brandCss, combinations, composePair, designSystemCss, load, resolvedPairJson, themeCss } from "../../packages/tokens/compose.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
let dir, src;

// Brand files refer to artwork relative to themselves, so copy brand/ too.
function copySources(to) {
  cpSync(join(ROOT, "tokens"), join(to, "tokens"), { recursive: true });
  cpSync(join(ROOT, "brand"), join(to, "brand"), { recursive: true });
}

// A copy of tokens/ with the Acme example brand added, and nothing else changed.
before(() => {
  dir = mkdtempSync(join(tmpdir(), "compose-"));
  copySources(dir);
  cpSync(join(ROOT, "tokens/schema/examples/acme.brand.json"), join(dir, "tokens/brands/acme.brand.json"));
  src = load(join(dir, "tokens"), join(dir, "brand"));
});
after(() => rmSync(dir, { recursive: true, force: true }));

describe("a new brand", () => {
  // @covers US-003-AC1
  test("is previewed on every shared design system, for each appearance it defines", () => {
    const acme = combinations(src).filter((c) => c.brand === "acme");
    assert.deepEqual(acme.map((c) => c.designSystem).sort(), [...src.designSystems.keys()].sort());
    assert.ok(acme.every((c) => c.appearance === "light"), "acme defines only light");
  });

  // @covers US-001-AC1 @covers US-003-AC2
  test("resolves every token to a final value on every shared design system", () => {
    for (const ds of src.designSystems.keys()) {
      const tokens = resolvedPairJson(src, "acme", ds, "light");
      for (const [k, v] of Object.entries(tokens)) assert.doesNotMatch(String(v), /[{}]|var\(/, `${ds}: --${k} = ${v}`);
      assert.equal(tokens["piq-color-accent"], "#B4442C", `${ds}: the brand's accent wins`);
    }
  });

  // @covers US-001-AC4
  test("overrides only the fonts it declares", () => {
    const m = composePair(src, "acme", "carbon", "light");
    assert.match(m.get("font.body").value, /^Inter, system-ui, sans-serif$/);
    assert.match(m.get("font.mono").value, /^"IBM Plex Mono"/, "mono stays Carbon's");
  });

  test("derives color.ground-recessed from color.ground when it sets none", () => {
    assert.equal(resolvedPairJson(src, "acme", "material", "light")["piq-color-ground-recessed"], "#F6F7F9");
  });
});

describe("CSS selectors (CONTRACT-003)", () => {
  test("preview surface: a brand's blocks are per appearance, with its fonts behind data-design-system", () => {
    const css = brandCss(src, "acme");
    assert.match(css, /^\[data-brand="acme"\]\[data-appearance="light"\] \{/m);
    assert.match(css, /^\[data-brand="acme"\]\[data-design-system\] \{\n {2}--piq-font-body: Inter, system-ui, sans-serif;\n {2}--font-body: var\(--piq-font-body\);/m);
    assert.doesNotMatch(css, /data-appearance="dark"/);
  });

  test("a theme's default appearance is [data-theme] alone; its other appearance adds data-appearance (ADR-018)", () => {
    assert.match(themeCss(src, "praxis-carbon"), /^\[data-theme="praxis-carbon"\] \{/);
    assert.match(themeCss(src, "praxis-carbon"), /^\[data-theme="praxis-carbon"\]\[data-appearance="light"\] \{/m);
    assert.doesNotMatch(themeCss(src, "plain"), /data-appearance/, "a light-only theme has one block");
    assert.doesNotMatch(brandCss(src, "praxis"), /data-theme/, "preview blocks are not selected by data-theme");
  });

  test("references become var() of the role's CSS name", () => {
    assert.match(designSystemCss(src, "carbon"), /--piq-badge-fg: var\(--piq-color-on-accent\);/);
    assert.match(designSystemCss(src, "carbon"), /--piq-focus-ring: 2px solid var\(--piq-color-accent\);/);
  });
});

describe("bad sources fail the build", () => {
  const broken = (file, edit) => {
    const d = mkdtempSync(join(tmpdir(), "compose-bad-"));
    copySources(d);
    const p = join(d, "tokens", file);
    writeFileSync(p, JSON.stringify(edit(JSON.parse(readFileSync(p, "utf8")))));
    return () => { try { return load(join(d, "tokens"), join(d, "brand")); } finally { rmSync(d, { recursive: true, force: true }); } };
  };

  // @covers US-002-AC3
  test("a reference to a token that does not exist", () => {
    const run = broken("design-systems/carbon.design-system.json", (ds) => { ds.tokens.button.radius.$value = "{color.nonexistent}"; return ds; });
    assert.throws(run, ComposeError);
  });

  test("a theme naming a missing shared design system", () => {
    const run = broken("themes/praxis-carbon.theme.json", (t) => { t.designSystem = "nope"; return t; });
    assert.throws(run, ComposeError);
  });

  test("a brand file that fails its schema", () => {
    const run = broken("brands/praxis.brand.json", (b) => { delete b.appearances.dark.color.accent; return b; });
    assert.throws(run, ComposeError);
  });
});
