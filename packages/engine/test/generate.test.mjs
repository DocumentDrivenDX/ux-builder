/* Palette options (US-007, US-008, US-009; SD-001), with golden output for
   every reference logo in tests/fixtures/palettes/.

     npm test --workspace @ux-builder/engine
     UPDATE_GOLDEN=1 npm test --workspace @ux-builder/engine   # a reviewed change */

import Ajv2020 from "ajv/dist/2020.js";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { FLOOR, PAIRS } from "../../../tools/contrast.mjs";
import {
  EngineError, MIN_OPTIONS, REVIEW_THRESHOLD, STRATEGIES, analyse, checkAll, designSystems, fitAppearance,
  generate, generateFromFile, hexToOklch, inflate, normalise, settingsSchema,
} from "../node.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const LOGOS = join(ROOT, "tests/fixtures/logos");
const GOLDEN = join(ROOT, "tests/fixtures/palettes");
const logos = readdirSync(LOGOS).filter((f) => /\.(svg|png)$/.test(f)).sort();
const DS = designSystems();
const results = new Map();
const run = async (f, settings) => {
  const key = f + JSON.stringify(settings ?? {});
  if (!results.has(key)) results.set(key, await generateFromFile(join(LOGOS, f), settings));
  return results.get(key);
};
const flat = (groups) => Object.fromEntries(Object.entries(groups).flatMap(([g, ts]) => Object.entries(ts).map(([k, t]) => [`${g}.${k}`, t.$value])));
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

describe("golden options", () => {
  for (const f of logos) {
    test(f, async () => {
      const r = await run(f);
      const compact = {
        options: r.options.map((o) => ({ label: o.label, strategy: o.strategy, light: flat(o.brand.appearances.light), dark: flat(o.brand.appearances.dark), moves: o.moves })),
        warnings: r.warnings,
      };
      const got = JSON.stringify(compact, null, 1) + "\n";
      const path = join(GOLDEN, f.replace(/\.(svg|png)$/, ".json"));
      if (process.env.UPDATE_GOLDEN || !existsSync(path)) writeFileSync(path, got);
      assert.equal(got, readFileSync(path, "utf8"), `${f}: options changed; review them, then UPDATE_GOLDEN=1`);
    });
  }
});

describe("US-007 generation", () => {
  // @covers US-007-AC1
  test("AC1: at least four options per logo, each with a distinct label", async () => {
    for (const f of logos) {
      const { options } = await run(f);
      assert.ok(options.length >= MIN_OPTIONS, `${f}: ${options.length}`);
      assert.equal(new Set(options.map((o) => o.label)).size, options.length, f);
      for (const o of options) assert.ok(STRATEGIES.includes(o.strategy), o.strategy);
    }
  });

  // @covers US-007-AC2
  test("AC2: every option is a schema-valid brand file, light and dark", async () => {
    const ajv = new Ajv2020({ strict: true, allowUnionTypes: true });
    for (const s of ["font", "brand"]) ajv.addSchema(JSON.parse(readFileSync(join(ROOT, `tokens/schema/${s}.schema.json`), "utf8")), `${s}.schema.json`);
    const validate = ajv.getSchema("brand.schema.json");
    for (const f of logos) for (const o of (await run(f)).options) {
      const doc = { name: "generated", title: "Generated", ...o.brand };
      assert.ok(validate(doc), `${f} ${o.label}: ${JSON.stringify(validate.errors)}`);
      assert.deepEqual(Object.keys(o.brand.appearances).sort(), ["dark", "light"]);
    }
  });

  // @covers US-007-AC3
  test("AC3: neutrals lean toward the brand hue, within the strategy's chroma bound", async () => {
    const { options, analysis } = await run("red-mark.svg");
    const brandHue = analysis.candidates[0].oklch.h;
    for (const o of options) for (const ap of ["light", "dark"]) {
      const g = hexToOklch(o.brand.appearances[ap].color.ground.$value);
      assert.ok(g.c <= 0.035, `${o.label} ${ap} ground chroma ${g.c}`);
      if (g.c > 0.004) assert.ok(hueDist(g.h, brandHue) < 25, `${o.label} ${ap} ground hue ${g.h} vs ${brandHue}`);
    }
  });

  // @covers US-007-AC4
  test("AC4: status colours keep their meaning", async () => {
    const bands = { live: [115, 190], limited: [45, 105], purchasing: [215, 280], closed: [0, 50] };
    for (const f of logos) for (const o of (await run(f)).options) for (const ap of ["light", "dark"]) {
      for (const [k, [lo, hi]] of Object.entries(bands)) {
        const h = hexToOklch(o.brand.appearances[ap].state[k].$value).h;
        assert.ok(h >= lo - 1 && h <= hi + 1, `${f} ${o.label} ${ap} ${k} hue ${h.toFixed(1)}`);
      }
      assert.equal(o.brand.appearances[ap].state.evaluation.$value === undefined, false);
    }
  });

  test("AC4 edge: a green brand's live colour stays clear of its accent", async () => {
    for (const o of (await run("green-brand.svg")).options) {
      const live = hexToOklch(o.brand.appearances.light.state.live.$value).h;
      const accent = hexToOklch(o.brand.appearances.light.color.accent.$value).h;
      assert.ok(hueDist(live, accent) >= 24, `${o.label}: live ${live.toFixed(1)} accent ${accent.toFixed(1)}`);
    }
  });

  // @covers US-007-AC5
  test("AC5: options differ: structure, accent or ground at least 0.03 apart", async () => {
    const { deltaE, parseHex } = await import("../src/oklch.js");
    for (const f of logos) {
      const os = (await run(f)).options.map((o) => o.brand.appearances.light.color);
      for (let i = 0; i < os.length; i++) for (let j = i + 1; j < os.length; j++) {
        const d = Math.max(...["structure", "accent", "ground"].map((r) => deltaE(parseHex(os[i][r].$value), parseHex(os[j][r].$value))));
        assert.ok(d >= 0.03, `${f}: options ${i} and ${j} differ by ${d.toFixed(3)}`);
      }
    }
  });

  // @covers US-007-AC6
  test("AC6: a monochrome logo gets options on a suggested colour, and says so", async () => {
    const r = await run("black-only.svg");
    assert.ok(r.options.length >= MIN_OPTIONS);
    assert.ok(r.warnings.some((w) => /suggested colour/.test(w)));
    assert.ok(Math.abs(hexToOklch(r.options[0].brand.appearances.dark.color.accent.$value).h - 250) < 10);
  });

  test("two-colour runs only when a second colour is at least 30° away", async () => {
    assert.ok((await run("two-colour.svg")).options.some((o) => o.strategy === "two-colour"));
    assert.ok((await run("red-mark.svg")).warnings.some((w) => /two-colour: .*skipped/.test(w)));
  });
});

describe("US-008 fitting", () => {
  // @covers US-008-AC1
  test("AC1: every option passes every gate pairing on every shared design system", async () => {
    let checked = 0;
    for (const f of logos) for (const o of (await run(f)).options) for (const ap of ["light", "dark"]) {
      const s = checkAll(flat(o.brand.appearances[ap]), DS, ap, FLOOR);
      const failing = s.filter((x) => !x.pass);
      assert.deepEqual(failing.map((x) => `${x.ds} ${x.label} ${x.ratio.toFixed(2)}`), [], `${f} ${o.label} ${ap}`);
      checked += s.length;
    }
    assert.ok(checked > logos.length * MIN_OPTIONS * 2 * DS.length * (PAIRS.length - 10));
  });

  // @covers US-008-AC2
  test("AC2: a fitted colour keeps its hue", async () => {
    let n = 0;
    for (const f of logos) for (const o of (await run(f)).options) for (const m of o.moves) {
      const a = hexToOklch(m.from), b = hexToOklch(m.to);
      if (a.c < 0.03 || b.c < 0.03) continue; // hue is not meaningful for near-greys
      assert.ok(hueDist(a.h, b.h) < 4, `${f} ${o.label} ${m.role}: ${m.from} -> ${m.to}`);
      n++;
    }
    assert.ok(n > 20);
  });

  // @covers US-008-AC3
  test("AC3: each move is reported and written on the token", async () => {
    const { options } = await run("pale-yellow.svg");
    const o = options.find((x) => x.strategy === "faithful");
    const m = o.moves.find((x) => x.role === "color.accent" && x.appearance === "light");
    assert.ok(m && m.deltaL < 0, "the pale yellow accent darkens on light");
    const [g, k] = m.role.split(".");
    assert.match(o.brand.appearances.light[g][k].$description, new RegExp(`${m.from} moved −\\d\\.\\d{3} L \\(OKLCH, hue kept\\)`));
  });

  // @covers US-008-AC4
  test("AC4: moves above the review threshold are flagged, and only those", async () => {
    for (const f of logos) for (const o of (await run(f)).options) for (const m of o.moves) assert.equal(m.flagged, Math.abs(m.deltaL) > REVIEW_THRESHOLD);
    assert.ok((await run("pale-yellow.svg")).options.some((o) => o.moves.some((m) => m.flagged)));
  });

  // @covers US-008-AC5
  test("AC5: a colour that cannot pass at any lightness withholds the option with a reason", () => {
    const roles = { "color.ground": { lch: { l: 0.6, c: 0, h: 0 } }, "color.surface": { lch: { l: 0.6, c: 0, h: 0 } } };
    const anatomy = { name: "probe", tokens: {}, fonts: { display: { family: "x", fallback: [] }, heading: { family: "x", fallback: [] }, body: { family: "x", fallback: [] }, mono: { family: "x", fallback: [] } } };
    const r = fitAppearance(
      { ...roles, ...Object.fromEntries(["surface-sunken", "text-strong", "text", "text-muted", "text-subtle", "structure", "accent", "on-accent", "border"].map((k) => [`color.${k}`, { lch: { l: 0.6, c: 0, h: 0 } }])),
        ...Object.fromEntries(["live", "limited", "purchasing", "evaluation", "closed"].map((k) => [`state.${k}`, { lch: { l: 0.6, c: 0, h: 0 } }])),
        "brand.logo-paint": { lch: { l: 0.5, c: 0.1, h: 20 } } },
      [anatomy], "light", 21);
    assert.ok(r.failures.length);
    assert.match(r.failures[0], /cannot clear 21:1/);
  });
});

describe("US-009 steering", () => {
  // @covers US-009-AC1
  test("AC1: the same logo and settings give byte-identical output", async () => {
    const a = await generateFromFile(join(LOGOS, "two-colour.svg"), { hueShift: 7 });
    const b = await generateFromFile(join(LOGOS, "two-colour.svg"), { hueShift: 7 });
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  // @covers US-009-AC2
  test("AC2: every setting has a type, range or allowed values, and a default", () => {
    for (const [k, s] of Object.entries(settingsSchema.properties)) {
      assert.ok(s.type && s.description && s.default !== undefined, k);
      assert.ok(s.minimum !== undefined || s.enum || s.pattern, `${k} has no range`);
    }
  });

  // @covers US-009-AC3
  test("AC3: out-of-range settings are clamped and reported; unknown ones are rejected", async () => {
    const r = await run("red-mark.svg", { chromaScale: 5, hueShift: -90 });
    assert.deepEqual(r.clamped, [{ name: "chromaScale", given: 5, used: 1.5 }, { name: "hueShift", given: -90, used: -30 }]);
    assert.equal(r.options[0].settings.chromaScale, 1.5);
    assert.throws(() => normalise({ warmth: 3 }), (e) => e instanceof EngineError && /unknown setting warmth/.test(e.message));
    assert.throws(() => normalise({ strategies: "faithful,pastel" }), /unknown pastel/);
    assert.throws(() => normalise({ minContrast: "high" }), /not a number/);
  });

  // @covers US-009-AC4
  test("AC4: every option carries the complete settings that produced it", async () => {
    const keys = Object.keys(settingsSchema.properties).sort();
    for (const o of (await run("red-mark.svg")).options) {
      assert.deepEqual(Object.keys(o.settings).sort(), keys);
      assert.deepEqual(o.brand.generation.settings, o.settings);
      assert.equal(o.brand.generation.strategy, o.strategy);
    }
  });

  // @covers US-009-AC6
  test("AC6: a hue shift moves the brand colour in that direction, and the gate still passes", async () => {
    const base = (await run("two-colour.svg")).options.find((o) => o.strategy === "muted");
    const shifted = (await run("two-colour.svg", { hueShift: 20 })).options.find((o) => o.strategy === "muted");
    const d = hexToOklch(shifted.brand.appearances.light.color.accent.$value).h - hexToOklch(base.brand.appearances.light.color.accent.$value).h;
    assert.ok(d > 15 && d < 25, `shifted ${d.toFixed(1)}°`);
    for (const ap of ["light", "dark"]) assert.equal(checkAll(flat(shifted.brand.appearances[ap]), DS, ap).filter((x) => !x.pass).length, 0);
  });

  test("narrowing strategies narrows the options", async () => {
    const r = await run("red-mark.svg", { strategies: "muted,neutral-accent" });
    assert.ok(r.options.every((o) => ["muted", "neutral-accent"].includes(o.strategy)));
  });

  test("one appearance only", async () => {
    const r = await run("red-mark.svg", { appearances: "light" });
    for (const o of r.options) assert.deepEqual(Object.keys(o.brand.appearances), ["light"]);
  });
});

test("performance: four options for a 1 MB PNG in under 2 s", async () => {
  // A 600 x 600 noisy PNG with a large brand-coloured block: about 1 MB.
  const w = 600, raw = Buffer.alloc((w * 3 + 1) * w);
  let seed = 7;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) & 0xff; };
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const i = y * (w * 3 + 1) + 1 + x * 3;
    const brand = x > 100 && x < 500 && y > 100 && y < 500;
    raw[i] = brand ? 30 + (rnd() & 7) : rnd(); raw[i + 1] = brand ? 90 + (rnd() & 7) : rnd(); raw[i + 2] = brand ? 200 + (rnd() & 7) : rnd();
  }
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length); b.write(t, 4, "ascii"); d.copy(b, 8); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(w, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 1 })), chunk("IEND", Buffer.alloc(0))]);
  assert.ok(png.length > 800_000, `${png.length} bytes`);   // about 1 MB; zlib versions differ a little
  const t0 = performance.now();
  const r = generate(await analyse(new Uint8Array(png), { inflate }), {}, { designSystems: DS });
  const ms = performance.now() - t0;
  assert.ok(r.options.length >= MIN_OPTIONS);
  assert.ok(ms < 2000, `${ms.toFixed(0)} ms`);
});
