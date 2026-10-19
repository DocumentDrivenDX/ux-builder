/* A design system's tokens follow whichever brand it is composed with
   (US-002-AC4).

     npm test */

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { load, resolvedPairJson } from "../../packages/tokens/compose.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "ds-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

// @covers US-002-AC4
test("US-002-AC4: Carbon's focus ring takes each brand's accent", () => {
  cpSync(join(ROOT, "tokens"), join(tmp, "tokens"), { recursive: true });
  cpSync(join(ROOT, "brand"), join(tmp, "brand"), { recursive: true });
  cpSync(join(ROOT, "tokens/schema/examples/acme.brand.json"), join(tmp, "tokens/brands/acme.brand.json"));
  const src = load(join(tmp, "tokens"), join(tmp, "brand"));
  assert.match(src.designSystems.get("carbon").tokens.focus.ring.$value, /\{color\.accent\}/, "the ring refers to the accent role");
  const praxis = resolvedPairJson(src, "praxis", "carbon", "dark");
  const acme = resolvedPairJson(src, "acme", "carbon", "light");
  assert.ok(praxis["piq-focus-ring"].includes(praxis["piq-color-accent"]), praxis["piq-focus-ring"]);
  assert.ok(acme["piq-focus-ring"].includes(acme["piq-color-accent"]), acme["piq-focus-ring"]);
  assert.equal(praxis["piq-color-accent"], "#FF6642");
  assert.equal(acme["piq-color-accent"], "#B4442C");
});

// @covers US-002-AC5
test("US-002-AC5: a design system's light-only overrides apply in light only", async () => {
  const { load: loadSrc, resolvedPairJson: pair } = await import("../../packages/tokens/compose.mjs");
  const src = loadSrc(join(ROOT, "tokens"), join(ROOT, "brand"));
  const carbon = src.designSystems.get("carbon");
  const light = carbon.appearances?.light?.shadow?.overlay?.$value, base = carbon.tokens.shadow.overlay.$value;
  assert.ok(light && light !== base, "Carbon softens its overlay shadow in light");
  assert.equal(carbon.appearances?.dark?.shadow?.overlay, undefined, "and does not override it in dark");
  assert.equal(pair(src, "praxis", "carbon", "light")["piq-shadow-overlay"], light);
  assert.equal(pair(src, "praxis", "carbon", "dark")["piq-shadow-overlay"], base);
});
