/* OKLCH conversions (SD-001 D1, D2).

     npm test --workspace @ux-builder/engine */

import assert from "node:assert/strict";
import { test } from "node:test";
import { ratio } from "../../../tools/contrast.mjs";
import { hexToOklch, oklchToHex, oklchToRgb, rgbToOklch, toHex } from "../src/index.js";

test("sRGB -> OKLCH -> sRGB round-trips every 8-bit colour on a 17-step grid", () => {
  for (let r = 0; r <= 255; r += 15) for (let g = 0; g <= 255; g += 15) for (let b = 0; b <= 255; b += 15) {
    const hex = toHex([r, g, b]);
    assert.equal(oklchToHex(hexToOklch(hex)), hex);
  }
});

test("known values match the CSS Color 4 reference", () => {
  const w = hexToOklch("#FFFFFF"), k = hexToOklch("#000000"), red = hexToOklch("#FF0000");
  assert.ok(Math.abs(w.l - 1) < 1e-4 && w.c < 1e-4);
  assert.ok(k.l < 1e-6);
  assert.ok(Math.abs(red.l - 0.628) < 1e-3 && Math.abs(red.c - 0.2577) < 1e-3 && Math.abs(red.h - 29.23) < 0.05);
});

test("an out-of-gamut colour keeps its lightness and hue; only chroma is reduced", () => {
  const want = { l: 0.7, c: 0.4, h: 140 };
  const got = rgbToOklch(oklchToRgb(want));
  assert.ok(Math.abs(got.l - want.l) < 0.005, `L ${got.l}`);
  assert.ok(Math.abs(got.h - want.h) < 1, `H ${got.h}`);
  assert.ok(got.c < want.c);
});

test("contrast is measured by the build gate's own function", () => {
  assert.equal(Math.round(ratio("#767676", "#FFFFFF") * 100) / 100, 4.54);
});
