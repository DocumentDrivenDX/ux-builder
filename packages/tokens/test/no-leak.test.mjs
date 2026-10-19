/* A theme inside another shows none of the outer theme's tokens (US-022-AC9):
   each theme's base block sets or resets (initial) every token, because
   custom properties inherit. Found by @ux-builder/audit on the starter, where
   <html data-theme="databricks"> showed Databricks's white cards inside a
   Praxis dark provider.

     npm run build --workspace @ux-builder/tokens && npm test --workspace @ux-builder/tokens */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../dist/themes.css", import.meta.url), "utf8");
const names = Object.keys(JSON.parse(readFileSync(new URL("../../../tokens/names.json", import.meta.url), "utf8")).tokens).map((p) => `--piq-${p.replace(/\./g, "-")}`);
const { themes } = JSON.parse(readFileSync(new URL("../dist/manifest.json", import.meta.url), "utf8"));

// @covers US-022-AC9
test("AC9: every theme's base selector sets or resets every token", () => {
  for (const { name } of themes) {
    const declared = new Set();
    for (const [, body] of css.matchAll(new RegExp(`\\[data-theme="${name}"\\] \\{([^}]*)\\}`, "g"))) for (const [, n] of body.matchAll(/(--piq-[a-z0-9-]+):/g)) declared.add(n);
    const missing = names.filter((n) => !declared.has(n));
    assert.deepEqual(missing, [], `${name} leaves ${missing.length} tokens to an outer theme`);
  }
});

test("a reset is initial, so the widget's ui.css fallback applies", () => {
  assert.match(css, /\[data-theme="praxis"\] \{\n  \/\*\* Not set by this theme[^}]*--piq-card-bg: initial;/);
});
