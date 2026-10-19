/* Every artwork URL in the built CSS points at a file the package ships
   (FEAT-004 SDK-15). themes.css sits one folder above themes/*.css, so a
   path copied between them unchanged would load nothing.

     npm run build && npm test --workspace @ux-builder/tokens */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const css = ["themes.css", ...readdirSync(join(DIST, "themes")).map((f) => `themes/${f}`), ...readdirSync(join(DIST, "brands")).map((f) => `brands/${f}`)];

test("every url() in the built theme and brand CSS resolves to a shipped file", () => {
  let checked = 0;
  for (const file of css) {
    for (const [, url] of readFileSync(join(DIST, file), "utf8").matchAll(/url\("([^"]+)"\)/g)) {
      if (/^(https?:|data:)/.test(url)) continue;
      assert.ok(existsSync(join(dirname(join(DIST, file)), url)), `${file}: ${url}`);
      checked++;
    }
  }
  assert.ok(checked > 0, "some artwork is referenced");
});
