/* The layout tokens in the built package (US-023-AC1; CONTRACT-001, screen
   patterns): every theme, in every appearance, sets the size-class
   boundaries, the page gutter per size class, the content widths and the
   target sizes, in its resolved values and in its own CSS block.

     npm run build && npm test --workspace @ux-builder/tokens */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const manifest = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));
const LAYOUT = [
  "size-breakpoint-medium", "size-breakpoint-expanded", "size-breakpoint-large", "size-breakpoint-extra-large",
  "space-gutter-compact", "space-gutter-medium", "space-gutter-expanded", "space-gutter-large", "space-gutter-extra-large",
  "size-measure", "size-content-form", "size-content-page", "size-target-minimum", "size-target-touch",
];

// @covers US-023-AC1
test("every theme and appearance sets every layout token, with the same boundaries", () => {
  assert.ok(manifest.themes.length >= 7);
  for (const t of manifest.themes) {
    const css = readFileSync(join(DIST, "themes", `${t.name}.css`), "utf8");
    const own = css.slice(css.indexOf(`[data-theme="${t.name}"] {`));
    for (const ap of t.appearances) {
      const r = JSON.parse(readFileSync(join(DIST, "resolved", `${t.name}.${ap}.json`), "utf8")).tokens;
      for (const k of LAYOUT) assert.ok(r[`piq-${k}`] && r[`piq-${k}`] !== "initial", `${t.name} ${ap}: --piq-${k}`);
      assert.deepEqual([r["piq-size-breakpoint-medium"], r["piq-size-breakpoint-expanded"], r["piq-size-breakpoint-large"], r["piq-size-breakpoint-extra-large"]], ["600px", "840px", "1200px", "1600px"], t.name);
      assert.ok(parseFloat(r["piq-size-target-minimum"]) * 16 >= 24, `${t.name}: target-minimum is at least 24px (WCAG 2.5.8)`);
    }
    for (const k of LAYOUT) assert.match(own, new RegExp(`--piq-${k}: (?!initial)`), `${t.name}.css sets --piq-${k} in its own block`);
  }
});
