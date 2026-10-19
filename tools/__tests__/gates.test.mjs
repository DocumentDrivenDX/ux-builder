/* The gates fail when they should (US-003-AC4, US-001-AC6): the contrast gate
   on a brand below 4.5:1, the schema check on missing artwork. Each runs the
   real script against a broken copy.

     npm test */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "gates-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const run = (script, ...args) => spawnSync(process.execPath, [join(ROOT, "tools", script), ...args], { encoding: "utf8" });

// @covers US-003-AC4
test("US-003-AC4: the contrast gate fails on a pairing below 4.5:1, naming brand, design system, appearance and pairing", () => {
  const resolved = join(tmp, "resolved");
  mkdirSync(resolved);
  // A preview pair as the build writes it: grey text on a grey ground (about 1.3:1).
  writeFileSync(join(resolved, "lowbrand.carbon.light.json"), JSON.stringify({
    theme: "lowbrand.carbon", preview: true, brand: "lowbrand", designSystem: "carbon", appearance: "light",
    tokens: { "piq-color-text": "#888888", "piq-color-ground": "#777777", "piq-color-surface": "#FFFFFF", "piq-color-text-strong": "#000000" },
  }));
  const baseline = join(tmp, "baseline.json");
  writeFileSync(baseline, JSON.stringify({ floor: 4.5, known: [] }));
  const r = run("check-contrast.mjs", "--resolved", resolved, "--baseline", baseline);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /NEW\s+1\.\d\d:1\s+lowbrand\.carbon\.light: --piq-color-text on --piq-color-ground\s+\(body text\)/);
});

test("the contrast gate passes the same check on a readable brand", () => {
  const resolved = join(tmp, "ok");
  mkdirSync(resolved);
  writeFileSync(join(resolved, "fine.carbon.light.json"), JSON.stringify({ theme: "fine.carbon", appearance: "light", tokens: { "piq-color-text": "#111111", "piq-color-ground": "#FFFFFF" } }));
  const baseline = join(tmp, "baseline-ok.json");
  writeFileSync(baseline, JSON.stringify({ floor: 4.5, known: [] }));
  assert.equal(run("check-contrast.mjs", "--resolved", resolved, "--baseline", baseline).status, 0);
});

// @covers US-003-AC4
test("US-003-AC4: a pill is measured on what shows through its background: the page under a transparent one, its own tint under a tinted one", () => {
  const resolved = join(tmp, "pills");
  mkdirSync(resolved);
  // #777268 clears 4.5:1 on the sunken panel (#FFFFFF) but not on the ground (#F0EEE6, 4.12:1),
  // nor on a 13% tint of itself over white.
  const base = { "piq-state-evaluation": "#777268", "piq-color-ground": "#F0EEE6", "piq-color-surface": "#FFFFFF", "piq-color-surface-sunken": "#FFFFFF" };
  writeFileSync(join(resolved, "clear.light.json"), JSON.stringify({ theme: "clear", appearance: "light", tokens: { ...base, "piq-pill-bg": "transparent" } }));
  writeFileSync(join(resolved, "tinted.light.json"), JSON.stringify({ theme: "tinted", appearance: "light", tokens: { ...base, "piq-color-ground": "#FFFFFF", "piq-pill-bg": "color-mix(in srgb, currentColor 13%, transparent)" } }));
  writeFileSync(join(resolved, "filled.light.json"), JSON.stringify({ theme: "filled", appearance: "light", tokens: { ...base, "piq-pill-bg": "#FFFFFF" } }));
  const baseline = join(tmp, "baseline-pills.json");
  writeFileSync(baseline, JSON.stringify({ floor: 4.5, known: [] }));
  const r = run("check-contrast.mjs", "--resolved", resolved, "--baseline", baseline);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /NEW\s+4\.12:1\s+clear\.light: --piq-state-evaluation on --piq-pill-bg/);
  assert.match(r.stdout, /NEW\s+\d\.\d\d:1\s+tinted\.light: --piq-state-evaluation on --piq-pill-bg/);
  assert.doesNotMatch(r.stdout, /filled\.light/);
});

// @covers US-001-AC6
test("US-001-AC6: the schema check fails on a brand whose artwork file is missing, naming the path", () => {
  const copy = join(tmp, "repo");
  cpSync(join(ROOT, "tokens"), join(copy, "tokens"), { recursive: true });
  cpSync(join(ROOT, "brand"), join(copy, "brand"), { recursive: true });
  const p = join(copy, "tokens/brands/praxis.brand.json");
  const brand = JSON.parse(readFileSync(p, "utf8"));
  brand.appearances.dark.brand["logo-image"].$value = "../../brand/praxis/no-such-logo.png";
  writeFileSync(p, JSON.stringify(brand));
  const r = run("validate-schemas.mjs", "--root", copy);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout + r.stderr, /tokens\/brands\/praxis\.brand\.json: dark brand\.logo-image points to a missing file \.\.\/\.\.\/brand\/praxis\/no-such-logo\.png/);
  assert.equal(run("validate-schemas.mjs").status, 0, "the real files still pass");
});
