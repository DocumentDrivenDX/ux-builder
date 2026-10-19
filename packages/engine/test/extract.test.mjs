/* Brand colours in a logo (US-006, SD-001 Extraction), with golden output for
   every reference logo in tests/fixtures/logos/.

     npm test --workspace @ux-builder/engine
     UPDATE_GOLDEN=1 npm test --workspace @ux-builder/engine   # a reviewed change */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { analyse, analyseFile, EngineError, hexToOklch, inflate, isIdentity, parseHex } from "../node.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const LOGOS = join(ROOT, "tests/fixtures/logos");
const GOLDEN = join(LOGOS, "golden");
const logos = readdirSync(LOGOS).filter((f) => /\.(svg|png)$/.test(f)).sort();
const read = (f) => new Uint8Array(readFileSync(join(LOGOS, f)));
const top = async (f) => (await analyseFile(join(LOGOS, f))).candidates[0]?.hex;

describe("golden analyses", () => {
  test("there are at least 10 reference logos", () => assert.ok(logos.length >= 10, `${logos.length}`));
  for (const f of logos) {
    test(f, async () => {
      const got = JSON.stringify(await analyseFile(join(LOGOS, f)), null, 2) + "\n";
      const path = join(GOLDEN, f.replace(/\.(svg|png)$/, ".json"));
      if (process.env.UPDATE_GOLDEN || !existsSync(path)) writeFileSync(path, got);
      assert.equal(got, readFileSync(path, "utf8"), `${f}: output changed; review it, then UPDATE_GOLDEN=1`);
    });
  }
});

describe("US-006", () => {
  // @covers US-006-AC1
  test("AC1: SVG colours come from fills, strokes and gradient stops; nothing runs or is fetched", async () => {
    const realFetch = globalThis.fetch;
    let fetched = false;
    globalThis.fetch = () => { fetched = true; throw new Error("fetched"); };
    try {
      const r = await analyse(read("hostile.svg"), { inflate });
      assert.equal(globalThis.__pwned, undefined);
      assert.equal(fetched, false);
      assert.deepEqual(r.candidates.map((c) => c.hex), ["#7A3FF2"]);
    } finally { globalThis.fetch = realFetch; }
    assert.ok(["#0A84FF", "#0A7AF5", "#0B6FE8"].includes(await top("gradient.svg")), "stop-color is read");
  });

  // @covers US-006-AC2
  test("AC2: a transparent PNG is weighted by visible area only", async () => {
    const r = await analyse(read("antialiased.png"), { inflate });
    assert.equal(r.candidates.length, 1);
    assert.equal(r.candidates[0].share, 1);
    assert.equal(r.candidates[0].hex, "#C81E2D");
  });

  // @covers US-006-AC3
  test("AC3: black, white, greys and tinted near-neutrals are never candidates", async () => {
    for (const hex of ["#000000", "#FFFFFF", "#808080", "#0B1F44", "#1B3139", "#F9F7F4", "#A1B8CA"]) assert.equal(isIdentity(parseHex(hex)), false, hex);
    assert.deepEqual((await analyse(read("navy-wordmark.svg"), { inflate })).candidates.map((c) => c.hex), ["#00B3A4"]);
    assert.deepEqual((await analyse(read("white-background.png"), { inflate })).candidates.map((c) => c.hex), ["#008080"]);
  });

  // @covers US-006-AC4
  test("AC4: near-identical shades fold into one candidate with their share summed", async () => {
    const r = await analyse(read("gradient.svg"), { inflate });
    assert.equal(r.candidates.length, 1);
    assert.equal(r.candidates[0].share, 1);
  });

  // @covers US-006-AC5
  test("AC5: candidates carry hex and share, highest share first, shares summing to 1", async () => {
    const r = await analyse(read("two-colour.svg"), { inflate });
    assert.deepEqual(r.candidates.map((c) => c.hex), ["#1F5FBF", "#F28C28"]);
    assert.equal(r.candidates[0].share, 0.75);
    for (const f of logos) {
      const { candidates } = await analyseFile(join(LOGOS, f));
      for (let i = 1; i < candidates.length; i++) assert.ok(candidates[i - 1].share >= candidates[i].share, f);
      if (candidates.length) assert.ok(Math.abs(candidates.reduce((a, c) => a + c.share, 0) - 1) < 0.001, f);
    }
  });

  // @covers US-006-AC6
  test("AC6: red-mark.svg's top candidate matches tools/theme_accent.py", async () => {
    let expected = "#FE2E2C"; // recorded from theme_accent.py; re-checked below when Python is available
    try {
      const out = execFileSync("python3", [join(ROOT, "tools/theme_accent.py"), join(LOGOS, "red-mark.svg")], { encoding: "utf8" });
      expected = /chosen: (#[0-9A-F]{6})/.exec(out)[1];
    } catch { /* no Python: use the recorded value */ }
    assert.equal(await top("red-mark.svg"), expected);
  });

  test("monochrome logos say so", async () => {
    for (const f of ["black-only.svg", "synaptiq.svg"]) {
      const r = await analyseFile(join(LOGOS, f));
      assert.equal(r.monochrome, true, f);
      assert.match(r.warnings[0], /monochrome/);
    }
  });

  test("an unsupported file fails with a clear error and no partial result", async () => {
    await assert.rejects(analyse(new TextEncoder().encode("GIF89a…"), { inflate }), (e) => e instanceof EngineError && /expected an SVG or PNG/.test(e.message));
    await assert.rejects(analyse(read("praxis-mark.png").subarray(0, 40), { inflate }), EngineError);
  });

  test("the identity thresholds keep real brand colours", () => {
    for (const hex of ["#FE2E2C", "#1F5FBF", "#F28C28", "#F7E15A", "#1DB954", "#00B3A4", "#7A3FF2", "#FF3621"]) assert.ok(isIdentity(parseHex(hex)), `${hex} ${JSON.stringify(hexToOklch(hex))}`);
  });
});

describe("analysePixels (area, for a browser-drawn SVG)", async () => {
  const { analysePixels } = await import("../src/index.js");
  test("colours are weighted by drawn area, transparent pixels ignored", () => {
    const px = [];
    const put = (n, rgba) => { for (let i = 0; i < n; i++) px.push(...rgba); };
    put(640, [0x1F, 0x3A, 0x5F, 255]); put(90, [0xB4, 0x44, 0x2C, 255]); put(40, [0xE8, 0xA3, 0x3D, 255]);
    put(230, [255, 255, 255, 255]); put(500, [0, 0, 0, 0]);
    const r = analysePixels(new Uint8ClampedArray(px));
    assert.deepEqual(r.candidates.map((c) => c.hex), ["#1F3A5F", "#B4442C", "#E8A33D"]);
    assert.equal(r.candidates[0].share, 0.8312);
  });
});
