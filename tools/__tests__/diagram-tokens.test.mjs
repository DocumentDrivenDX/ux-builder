/* Diagram and data-visualization tokens (FEAT-017, US-112): every theme and
   preview pair carries them, slot n is the same hue everywhere, a brand may
   replace a status or series colour in one appearance, each design system
   has its own shape, and the gate fails a brand that breaks them.

     npm test */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { combinations, composeOn, load, resolveAll, resolvedJson, resolvedPairJson, themeAppearances, themeCss } from "../../packages/tokens/compose.mjs";
import { diagramFailures, solid } from "../contrast.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const src = load(join(ROOT, "tokens"), join(ROOT, "brand"));
const tmp = mkdtempSync(join(tmpdir(), "diagram-tokens-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const NAMES = Object.entries(JSON.parse(readFileSync(join(ROOT, "tokens/names.json"), "utf8")).tokens)
  .filter(([p]) => /^color\.(status|series|diagram|lifecycle)-|^size\.diagram-|^radius\.diagram-/.test(p)).map(([p]) => `piq-${p.replace(/\./g, "-")}`);

// Every theme in every appearance, and every brand × design-system preview pair.
const everything = () => [
  ...[...src.themes.values()].flatMap((t) => themeAppearances(src, t).map((ap) => [`${t.name} ${ap}`, resolvedJson(src, t.name, ap)])),
  ...combinations(src).map((c) => [`${c.brand} × ${c.designSystem} ${c.appearance}`, resolvedPairJson(src, c.brand, c.designSystem, c.appearance)]),
];

// OKLCH hue in degrees, for "the same hue family".
const hue = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const [l, m, s] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b].map(Math.cbrt);
  return (Math.atan2(0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s) * 180 / Math.PI + 360) % 360;
};
const apart = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe("US-112 diagram tokens", () => {
  test("names.json has the 28 roles of CONTRACT-001", () => assert.equal(NAMES.length, 28));

  // @covers US-112-AC1
  test("AC1: every theme and preview pair sets all 28 in every appearance, and every theme's CSS declares them", () => {
    const all = everything();
    assert.equal(all.length, 61);
    for (const [where, tokens] of all) for (const n of NAMES) assert.ok(tokens[n], `${where}: --${n} is not set`);
    for (const t of src.themes.keys()) {
      const css = themeCss(src, t);
      for (const n of NAMES) assert.match(css, new RegExp(`--${n}: (?!initial)`), `${t}.css does not set --${n}`);
    }
  });

  // @covers US-112-AC2
  test("AC2: series slot n is the same hue family in every theme and appearance", () => {
    for (let i = 1; i <= 8; i++) {
      const ref = hue(src.dataviz.appearances.light.color[`series-${i}`].$value);
      for (const [where, tokens] of everything()) {
        const h = hue(solid(tokens[`piq-color-series-${i}`]));
        assert.ok(apart(h, ref) <= 30, `${where}: series ${i} is ${h.toFixed(0)}°, ${apart(h, ref).toFixed(0)}° from the default's ${ref.toFixed(0)}°`);
      }
    }
  });

  // @covers US-112-AC3
  test("AC3: a brand's own series colour in light replaces the default there, and dark keeps the default", () => {
    const praxis = src.brands.get("praxis");
    const brand = { ...praxis, appearances: structuredClone(praxis.appearances) };
    brand.appearances.light.color["series-2"] = { $value: "#B5470F" };
    const carbon = src.designSystems.get("carbon");
    const at = (ap) => resolveAll(composeOn(brand, carbon, ap), `override ${ap}`);
    assert.equal(at("light").get("color.series-2"), "#B5470F");
    assert.equal(at("dark").get("color.series-2"), src.dataviz.appearances.dark.color["series-2"].$value);
    // The brand's other slots, and every brand that sets none, keep the defaults.
    assert.equal(at("light").get("color.series-1"), src.dataviz.appearances.light.color["series-1"].$value);
    assert.equal(resolvedJson(src, "praxis-carbon", "light")["piq-color-series-2"], src.dataviz.appearances.light.color["series-2"].$value);
  });

  test("the subtle fills, regions, edges and lifecycle tints follow the brand's own roles", () => {
    const r = resolvedJson(src, "praxis-carbon", "dark");
    assert.equal(r["piq-color-diagram-edge"], r["piq-color-text-muted"]);
    assert.equal(r["piq-color-diagram-region-1"], `color-mix(in srgb, ${r["piq-color-text"]} 3%, ${r["piq-color-ground"]})`);
    assert.equal(r["piq-color-status-info-subtle"], `color-mix(in srgb, ${r["piq-color-status-info"]} 12%, ${r["piq-color-surface"]})`);
  });

  test("every theme and preview pair passes the diagram checks", () => {
    for (const [where, tokens] of everything()) assert.deepEqual(diagramFailures(tokens), [], where);
  });

  // @covers US-112-AC6
  test("AC6: each design system has its own node radius and stroke; a theme with its own anatomy gets the defaults", () => {
    const shape = (t, ap) => { const r = resolvedJson(src, t, ap); return [r["piq-radius-diagram-node"], r["piq-size-diagram-stroke"], r["piq-size-diagram-stroke-strong"]]; };
    assert.deepEqual(shape("praxis-carbon", "light"), ["0", "1px", "2px"]);
    assert.deepEqual(shape("praxis-material", "light"), ["12px", "1.5px", "2px"]);
    assert.deepEqual(shape("praxis-fluentui", "light"), ["4px", "1px", "2px"]);
    assert.deepEqual(shape("databricks", "dark"), ["8px", "1.5px", "2px"]);
    const own = [...src.themes.values()].find((t) => !t.designSystem);
    assert.ok(own, "a theme with its own anatomy");
    const d = src.layout.defaults;
    assert.deepEqual(shape(own.name, themeAppearances(src, own)[0]), [d.radius["diagram-node"].$value, d.size["diagram-stroke"].$value, d.size["diagram-stroke-strong"].$value]);
  });

  // @covers US-112-AC5
  test("AC5: the gate fails a status colour below 4.5:1 and series that collide under deuteranopia, naming theme, appearance, pairing and value", () => {
    const resolved = join(tmp, "failing");
    mkdirSync(resolved);
    const tokens = resolvedJson(src, "praxis-carbon", "light");
    // A pale green on a pale ground, and series 4 a hair from series 3.
    tokens["piq-color-status-positive"] = "#5FBF5F";
    tokens["piq-color-series-4"] = "#0C9467";
    writeFileSync(join(resolved, "bad.carbon.light.json"), JSON.stringify({ theme: "bad.carbon", appearance: "light", tokens }));
    const baseline = join(tmp, "baseline.json");
    writeFileSync(baseline, JSON.stringify({ floor: 4.5, known: [] }));
    const r = spawnSync(process.execPath, [join(ROOT, "tools/check-contrast.mjs"), "--resolved", resolved, "--baseline", baseline], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /NEW\s+1\.\d\d:1\s+bad\.carbon\.light: --piq-color-status-positive on --piq-color-ground\s+\(positive as text, floor 4\.50\)/);
    assert.match(r.stdout, /NEW\s+ΔE \d\.\d\d\s+bad\.carbon\.light: --piq-color-series-3 on --piq-color-series-4 \(deutan\)\s+\(series 3 next to 4, floor 8\.00\)/);
  });
});
