/* sRGB <-> OKLab <-> OKLCH (SD-001 D1). Björn Ottosson's matrices.

   Every colour the engine emits is an uppercase 8-bit hex; values are only
   compared after rounding to hex (SD-001 D6). */

export class EngineError extends Error {}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHex(s) {
  const m = HEX.exec(String(s).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export const toHex = (rgb) =>
  "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();

const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklab([r8, g8, b8]) {
  const r = lin(r8), g = lin(g8), b = lin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/* Linear sRGB, unclamped, so a caller can tell whether it is in gamut. */
function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function rgbToOklch(rgb) {
  const [L, a, b] = rgbToOklab(rgb);
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 1e-4 ? 0 : H };
}

const inGamut = (lin3) => lin3.every((v) => v >= -1e-6 && v <= 1 + 1e-6);

/* OKLCH to sRGB, reducing chroma (never hue or lightness) until it fits
   (SD-001 D2). Bisection, fixed 24 steps: deterministic. */
export function oklchToRgb({ l, c, h }) {
  const L = Math.max(0, Math.min(1, l));
  const at = (C) => { const r = (h * Math.PI) / 180; return oklabToLinear([L, C * Math.cos(r), C * Math.sin(r)]); };
  let lin3 = at(c);
  if (!inGamut(lin3)) {
    let lo = 0, hi = c;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inGamut(at(mid))) lo = mid; else hi = mid; }
    lin3 = at(lo);
  }
  return lin3.map((v) => gam(Math.max(0, Math.min(1, v))));
}

export const oklchToHex = (lch) => toHex(oklchToRgb(lch));
export const hexToOklch = (hex) => rgbToOklch(parseHex(hex));

/* Euclidean distance in OKLab: ΔE_OK. */
export function deltaE(rgb1, rgb2) {
  const [a1, b1, c1] = rgbToOklab(rgb1), [a2, b2, c2] = rgbToOklab(rgb2);
  return Math.hypot(a1 - a2, b1 - b2, c1 - c2);
}
