/* The microsite's flow diagram and wireframes (Concepts / Flows and
   journeys) are what `ux-builder-blueprint draw` and `wireframes` give for
   the sample blueprint today: a fresh run matches the checked-in files.
   Needs the built @ux-builder/ui (npm run build), hence built/. */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { DIR, SHOWN, stale } from "../../gen-site-diagrams.mjs";

test("the site's flow SVG, its Mermaid and the shown wireframes match a fresh draw of the sample blueprint", async () => {
  assert.deepEqual(await stale(), [], "run: node tools/gen-site-diagrams.mjs");
  for (const f of SHOWN) assert.ok(existsSync(join(DIR, f.replace(/\.html$/, ".png"))), `${f}'s PNG is checked in`);
});
