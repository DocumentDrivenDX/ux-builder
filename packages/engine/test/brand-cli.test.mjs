/* npm run brand (tools/brand.mjs) and regeneration (US-009-AC3, AC5; FR-12).

     npm test --workspace @ux-builder/engine */

import Ajv2020 from "ajv/dist/2020.js";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { load } from "../../tokens/compose.mjs";
import { regenerateFile } from "../node.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const LOGO = join(ROOT, "tests/fixtures/logos/red-mark.svg");
const tmp = mkdtempSync(join(tmpdir(), "brand-cli-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const brand = (...args) => spawnSync(process.execPath, [join(ROOT, "tools/brand.mjs"), ...args], { encoding: "utf8", cwd: ROOT });
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

describe("npm run brand", () => {
  test("prints the extracted colours and four or more options", () => {
    const r = brand(LOGO);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /extracted: #FE2E2C \(100%\)/);
    for (const label of ["faithful", "muted", "vibrant", "neutral-accent"]) assert.match(r.stdout, new RegExp(`^${label}\\s`, "m"));
  });

  test("--out writes a schema-valid brand file with its generation block", () => {
    const out = join(tmp, "b.json");
    const r = brand(LOGO, "--out", out, "--name", "acme", "--title", "Acme");
    assert.equal(r.status, 0, r.stderr);
    const doc = readJson(out);
    const ajv = new Ajv2020({ strict: true, allowUnionTypes: true });
    for (const s of ["font", "brand"]) ajv.addSchema(readJson(join(ROOT, `tokens/schema/${s}.schema.json`)), `${s}.schema.json`);
    const validate = ajv.getSchema("brand.schema.json");
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.name, "acme");
    assert.equal(doc.generation.strategy, "faithful");
    assert.match(doc.generation.logo.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(doc.generation.extracted, ["#FE2E2C"]);
  });

  test("--strategy picks an option by label; an unknown label is a usage error", () => {
    const out = join(tmp, "muted.json");
    assert.equal(brand(LOGO, "--out", out, "--strategy", "muted", "--name", "acme").status, 0);
    assert.equal(readJson(out).generation.strategy, "muted");
    const bad = brand(LOGO, "--out", out, "--strategy", "pastel");
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /no such option; choose one of faithful, muted/);
  });

  // @covers US-009-AC3
  test("an out-of-range setting is clamped with a warning; an unknown one is refused", () => {
    const r = brand(LOGO, "--set", "chromaScale=5");
    assert.equal(r.status, 0);
    assert.match(r.stderr, /warning: chromaScale 5 is outside 0\.5–1\.5; used 1\.5/);
    const u = brand(LOGO, "--set", "warmth=3");
    assert.equal(u.status, 2);
    assert.match(u.stderr, /unknown setting warmth/);
  });

  test("--settings reads a JSON file and --set overrides it", () => {
    const s = join(tmp, "s.json");
    writeFileSync(s, JSON.stringify({ hueShift: 10, strategies: "muted" }));
    const out = join(tmp, "s-out.json");
    assert.equal(brand(LOGO, "--settings", s, "--set", "hueShift=-12", "--out", out, "--name", "acme").status, 0);
    const g = readJson(out).generation;
    assert.equal(g.settings.hueShift, -12);
    assert.equal(g.settings.strategies, "muted");
  });

  const repo = (n) => {
    const d = join(tmp, n);
    cpSync(join(ROOT, "tokens"), join(d, "tokens"), { recursive: true });
    cpSync(join(ROOT, "brand"), join(d, "brand"), { recursive: true });
    return d;
  };

  test("without --design-system only the brand is written, for previewing", () => {
    const d = repo("brand-only"), out = join(d, "tokens/brands/acme.brand.json");
    const r = brand(LOGO, "--out", out);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /no theme yet/);
    const src = load(join(d, "tokens"), join(d, "brand"));
    assert.ok(src.brands.has("acme"));
    assert.ok(!src.themes.has("acme"));
  });

  test("--design-system also writes the theme an app selects, and it composes", async () => {
    const d = repo("theme"), out = join(d, "tokens/brands/acme.brand.json");
    const r = brand(LOGO, "--out", out, "--title", "Acme", "--design-system", "databricks", "--default", "light");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /data-theme="acme"/);
    const theme = readJson(join(d, "tokens/themes/acme.theme.json"));
    assert.deepEqual({ name: theme.name, title: theme.title, brand: theme.brand, designSystem: theme.designSystem, default: theme.default },
      { name: "acme", title: "Acme", brand: "acme", designSystem: "databricks", default: "light" });
    assert.equal(theme.$schema, "../schema/theme.schema.json");
    const src = load(join(d, "tokens"), join(d, "brand"));
    const { themeCss } = await import("../../tokens/compose.mjs");
    assert.match(themeCss(src, "acme"), /^\[data-theme="acme"\] \{/);
  });

  test("an unknown design system, or --default without one, is a usage error", () => {
    const out = join(tmp, "x.json");
    const bad = brand(LOGO, "--out", out, "--design-system", "bootstrap");
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /not a shared design system; choose one of carbon, databricks, fluent, material/);
    assert.equal(brand(LOGO, "--out", out, "--default", "dark").status, 2);
  });

  test("existing brand and theme files are kept unless --force", () => {
    const d = repo("force"), out = join(d, "tokens/brands/acme.brand.json");
    assert.equal(brand(LOGO, "--out", out, "--design-system", "carbon").status, 0);
    const again = brand(LOGO, "--out", out, "--design-system", "fluent");
    assert.equal(again.status, 2);
    assert.match(again.stderr, /exists; use --force/);
    assert.equal(readJson(join(d, "tokens/themes/acme.theme.json")).designSystem, "carbon");
    assert.equal(brand(LOGO, "--out", out, "--design-system", "fluent", "--force").status, 0);
    assert.equal(readJson(join(d, "tokens/themes/acme.theme.json")).designSystem, "fluent");
  });
});

describe("regeneration (FR-12)", () => {
  // @covers US-009-AC5
  test("AC5: every colour regenerates exactly from the recorded settings and logo", async () => {
    // muted-softer is a top-up variant: it appears when only muted is asked for.
    for (const [strategy, extra] of [["faithful", []], ["muted", []], ["vibrant", []], ["neutral-accent", []], ["muted-softer", ["--set", "strategies=muted"]]]) {
      const out = join(tmp, `re-${strategy}.json`);
      const w = brand(LOGO, "--out", out, "--strategy", strategy, "--set", "hueShift=-8", ...extra, "--name", "acme");
      assert.equal(w.status, 0, w.stderr);
      const r = await regenerateFile(out);
      assert.equal(r.identical, true, `${strategy}: ${JSON.stringify(r.differences)}`);
      const cli = brand("--regenerate", out);
      assert.equal(cli.status, 0);
      assert.match(cli.stdout, /identical/);
    }
  });

  test("a hand-edited colour is reported and exits 1", () => {
    const out = join(tmp, "edited.json");
    assert.equal(brand(LOGO, "--out", out, "--name", "acme").status, 0);
    const doc = readJson(out);
    doc.appearances.light.color.accent.$value = "#123456";
    writeFileSync(out, JSON.stringify(doc));
    const r = brand("--regenerate", out);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /light color\.accent: recorded #123456, regenerates #[0-9A-F]{6}/);
  });

  test("a changed logo is refused: that is a new brand, not a regeneration", () => {
    const logo = join(tmp, "logo.svg"), out = join(tmp, "changed.json");
    cpSync(LOGO, logo);
    assert.equal(brand(logo, "--out", out, "--name", "acme").status, 0);
    writeFileSync(logo, readFileSync(logo, "utf8").replace("#FE2E2C", "#1F5FBF"));
    const r = brand("--regenerate", out);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /has changed since the brand was generated/);
  });

  test("a hand-made brand file has nothing to regenerate from", () => {
    const r = brand("--regenerate", join(ROOT, "tokens/brands/synaptiq.brand.json"));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no generation/);
  });
});

test("artwork added to a generated brand (logo-image) does not count as a difference", async () => {
  const out = join(tmp, "artwork.json");
  assert.equal(brand(LOGO, "--out", out, "--name", "acme").status, 0);
  const doc = readJson(out);
  for (const a of Object.values(doc.appearances)) a.brand["logo-image"] = { $value: "../../brand/acme/logo.svg" };
  writeFileSync(out, JSON.stringify(doc));
  assert.equal((await regenerateFile(out)).identical, true);
});
