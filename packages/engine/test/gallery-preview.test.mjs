/* npm run gallery -- --brand: a brand on every shared design system (FEAT-002).

   Needs the built packages (npm run build); skipped without them, since
   npm run check builds before it previews. */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const built = existsSync(join(ROOT, "packages/ui/dist/index.js")) && existsSync(join(ROOT, "packages/tokens/dist/manifest.json"));
const gallery = (...a) => spawnSync(process.execPath, [join(ROOT, "tools/gen-gallery.mjs"), ...a], { encoding: "utf8", cwd: ROOT });

test("a brand file previews on all four design systems, light and dark", { skip: !built && "run npm run build first" }, () => {
  const r = gallery("--brand", "tests/fixtures/brands/sample.brand.json");
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(join(ROOT, "build/gallery-sample.html"), "utf8");
  assert.equal((html.match(/class="s-panel /g) ?? []).length, 8);
  for (const ds of ["Carbon", "Databricks", "Fluent", "Material"]) assert.match(html, new RegExp(`Sample on ${ds}`));
  assert.doesNotMatch(html, /data-theme="sample/, "a preview is not a theme");
});

test("a brand in tokens/brands/ can be named instead of a path", { skip: !built && "run npm run build first" }, () => {
  assert.equal(gallery("--brand", "synaptiq").status, 0);
  assert.ok(existsSync(join(ROOT, "build/gallery-synaptiq.html")));
});

test("an unknown or invalid brand is refused", { skip: !built && "run npm run build first" }, () => {
  const r = gallery("--brand", "nope");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no brand file nope/);
  const bad = gallery("--brand", "tests/fixtures/logos/golden/red-mark.json");
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /not a valid brand file/);
});
