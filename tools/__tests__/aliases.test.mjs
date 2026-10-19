/* Every 0.x token name still works through 1.x, with its 0.3.0 value
   (ADR-015, CONTRACT-001 Precedence and Compatibility).

     npm test */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { aliasName, brandCss, cssName, designSystemCss, load, resolvedJson, themeCss } from "../../packages/tokens/compose.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const FIXTURES = join(ROOT, "tools/fixtures/resolved-0.3.0");
const src = load(join(ROOT, "tokens"), join(ROOT, "brand"));
const fixtures = readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(FIXTURES, f), "utf8")));
const oldNames = [...new Set(fixtures.flatMap((f) => Object.keys(f.tokens)))].sort();

describe("0.x names", () => {
  // @covers US-004-AC2
  test("every 0.x name has a 1.x role it aliases", () => {
    const aliased = new Set(Object.keys(src.names).map((p) => aliasName(src.names, p)).filter(Boolean));
    assert.deepEqual(oldNames.filter((n) => !aliased.has(n)), []);
    assert.equal(oldNames.length, 178);
  });

  for (const f of fixtures) {
    test(`${f.theme} (${f.appearance}): every 0.x name resolves to its 0.3.0 value`, () => {
      assert.ok(src.themes.has(f.theme), `${f.theme} is a theme (ADR-018)`);
      const now = resolvedJson(src, f.theme, f.appearance);
      for (const [name, value] of Object.entries(f.tokens)) assert.equal(now[name], value, `--${name}`);
    });
  }
});

describe("aliases in CSS", () => {
  const blocks = [...src.themes.keys()].map((t) => themeCss(src, t))
    .concat([...src.brands.keys()].map((b) => brandCss(src, b)), [...src.designSystems.keys()].map((s) => designSystemCss(src, s)))
    .join("\n").split(/\n(?=\[)/);

  // @covers US-004-AC3
  test("each alias is declared in the same block as its role, as var() of it", () => {
    let count = 0;
    for (const block of blocks) {
      const declared = new Set([...block.matchAll(/^ {2}(--[\w-]+):/gm)].map((m) => m[1]));
      for (const [, alias, target] of block.matchAll(/^ {2}(--[\w-]+): var\((--piq-[\w-]+)\);$/gm)) {
        if (alias.startsWith("--piq-")) continue;  // a role referring to a role, not an alias
        assert.ok(declared.has(target), `${alias} refers to ${target}, which this block does not set`);
        count++;
      }
    }
    assert.ok(count >= 178, `found ${count} alias declarations`);
  });

  test("no 0.x name is ever declared with a value of its own", () => {
    const old = new Set(oldNames.map((n) => `--${n}`));
    for (const block of blocks) for (const [, name, value] of block.matchAll(/^ {2}(--[\w-]+): (.+);$/gm)) {
      if (old.has(name)) assert.match(value, /^var\(--piq-[\w-]+\)$/, `${name}: ${value}`);
    }
  });

  // @covers US-004-AC1
  test("role names follow CONTRACT-001: --piq- and the path", () => {
    assert.equal(cssName(src.names, "color.ground"), "piq-color-ground");
    assert.equal(cssName(src.names, "choice-picker.option-selected-bg"), "piq-choice-picker-option-selected-bg");
  });
});
