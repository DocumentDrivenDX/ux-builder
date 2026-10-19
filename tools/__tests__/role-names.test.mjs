/* The SDK's own CSS refers to role names only (US-004-AC4): the widgets
   (packages/ui/src/ui.css), the gallery (tools/gen-gallery.mjs) and
   Storybook (packages/ui/.storybook/preview.css). Every var(--…) is a
   CONTRACT-001 name (--piq-…) or a private variable the same file defines
   (--_tone); a 0.x name such as --navy fails.

     npm test */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const names = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, "tokens/names.json"), "utf8")).tokens).map((p) => `piq-${p.replace(/\./g, "-")}`));

/* var(--x) names a file reads that are neither role names nor defined in it. */
export function strays(css) {
  const defined = new Set([...css.matchAll(/(?:^|[;{\s])--([a-z0-9_-]+)\s*:/gi)].map((m) => m[1]));
  const used = [...css.matchAll(/var\(\s*--([a-z0-9_-]+)/gi)].map((m) => m[1]);
  return [...new Set(used.filter((n) => !names.has(n) && !defined.has(n)))];
}

// @covers US-004-AC4
test("US-004-AC4: the widgets, the gallery and Storybook read role names only", () => {
  for (const f of ["packages/ui/src/ui.css", "tools/gen-gallery.mjs", "packages/ui/.storybook/preview.css"]) {
    const css = readFileSync(join(ROOT, f), "utf8");
    assert.ok(/var\(--piq-/.test(css), `${f} reads tokens`);
    assert.deepEqual(strays(css), [], `${f} reads names that are not CONTRACT-001 roles`);
  }
});

test("a 0.x name is caught", () => {
  assert.deepEqual(strays(".a { color: var(--navy); background: var(--piq-color-ground); }"), ["navy"]);
  assert.deepEqual(strays(".a { --_tone: red; color: var(--_tone); }"), []);
});
