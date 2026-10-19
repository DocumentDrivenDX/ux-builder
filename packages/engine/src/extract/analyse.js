/* Brand colours in a logo (US-006, SD-001 Extraction).

   1. Collect colours: SVG by occurrence, PNG by visible area (alpha >= 128).
   2. Keep identity colours only: OKLCH C >= 0.06 and 0.30 <= L <= 0.92, which
      drops ink, paper, greys and their tinted near-neighbours.
   3. Fold near-identical colours into the most-covered one: OKLab distance
      with lightness counted at a quarter, < 0.05, so the shading and
      anti-aliasing of one colour fold together but different colours do not.
   4. Keep colours covering >= 5% of what is left, else the largest three;
      rank by share, ties by chroma, then hex. */

import { EngineError, parseHex, rgbToOklab, rgbToOklch, toHex } from "../oklch.js";
import { isPng, pngPixels } from "./png.js";
import { svgColours } from "./svg.js";

export const IDENTITY = { minChroma: 0.06, minL: 0.3, maxL: 0.92 };
export const FOLD = 0.05;
export const FOLD_L_WEIGHT = 0.25;

export function foldDistance(rgb1, rgb2) {
  const [l1, a1, b1] = rgbToOklab(rgb1), [l2, a2, b2] = rgbToOklab(rgb2);
  return Math.hypot(FOLD_L_WEIGHT * (l1 - l2), a1 - a2, b1 - b2);
}
export const SHARE = 0.05;
// A drawn SVG is measured by true area, where a logo's accent marks are small
// (the sample's terracotta bar and gold dot cover about 3% each) but are
// still brand colours. Markup counts and PNGs keep 5%.
export const SHARE_BY_AREA = 0.02;
export const KEEP = 3;

const identityLab = ([l, a, b]) => { const c = Math.hypot(a, b); return c >= IDENTITY.minChroma && l >= IDENTITY.minL && l <= IDENTITY.maxL; };
export const isIdentity = (rgb) => identityLab(rgbToOklab(rgb));

// Colours are counted under an integer key, 0xRRGGBB.
export const keyOf = (r, g, b) => (r << 16) | (g << 8) | b;
const rgbOf = (k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255];

const round = (x, n = 4) => Math.round(x * 10 ** n) / 10 ** n;

async function pngCounts(bytes, inflate, into) {
  for (const [r, g, b, a] of await pngPixels(bytes, inflate)) {
    if (a < 128) continue;
    const key = keyOf(r, g, b);
    into.set(key, (into.get(key) ?? 0) + 1);
  }
}

function looksLikeSvg(bytes) {
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 4096));
  return /<svg[\s>]/i.test(head) || /^\s*(<\?xml|<!DOCTYPE svg)/i.test(head);
}

export async function analyse(bytes, { inflate } = {}) {
  if (!(bytes instanceof Uint8Array)) throw new EngineError("analyse() takes the logo's bytes as a Uint8Array");
  const warnings = [];
  let counts, format;
  if (isPng(bytes)) {
    if (!inflate) throw new EngineError("a PNG needs an inflate function (use @ux-builder/engine/node or /browser)");
    format = "png"; counts = new Map();
    await pngCounts(bytes, inflate, counts);
  } else if (looksLikeSvg(bytes)) {
    format = "svg";
    const found = svgColours(new TextDecoder().decode(bytes));
    counts = found.counts;
    if (found.pngs.length) {
      if (!inflate) warnings.push("embedded PNG ignored: no inflate function");
      else {
        // An embedded raster counts as much as the markup's named colours together.
        const px = new Map();
        for (const p of found.pngs) await pngCounts(p, inflate, px);
        const named = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
        const total = [...px.values()].reduce((a, b) => a + b, 0) || 1;
        for (const [k, n] of px) counts.set(k, (counts.get(k) ?? 0) + (n / total) * named);
      }
    }
  } else {
    throw new EngineError("unsupported file: expected an SVG or PNG logo");
  }
  return rank(counts, format, warnings);
}

/* Colours by visible area from already-decoded RGBA pixels: for a browser
   that has drawn an SVG to a canvas (as an <img>, so nothing in it runs).
   Area is a better measure of an SVG's brand colour than how often the
   markup names it. */
export function analysePixels(rgba, { format = "svg" } = {}) {
  if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray)) throw new EngineError("analysePixels() takes RGBA bytes");
  const counts = new Map();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const key = keyOf(rgba[i], rgba[i + 1], rgba[i + 2]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return rank(counts, format, [], SHARE_BY_AREA);
}

/* One candidate as analyse() reports it; regeneration rebuilds the same from a recorded hex. */
export function candidateOf(rgb, share = 0) {
  const lch = rgbToOklch(rgb);
  return { hex: toHex(rgb), share, oklch: { l: round(lch.l), c: round(lch.c), h: round(lch.h, 2) } };
}

function rank(counts, format, warnings, minShare = SHARE) {

  // Identity only, most covered first; ties broken by hex so order is fixed.
  const pool = [];
  for (const [k, n] of counts) {
    const rgb = rgbOf(k), lab = rgbToOklab(rgb);
    if (identityLab(lab)) pool.push({ k, rgb, n, v: [FOLD_L_WEIGHT * lab[0], lab[1], lab[2]] });
  }
  pool.sort((a, b) => b.n - a.n || a.k - b.k);

  // Each colour joins the earliest cluster within FOLD. Clusters are indexed
  // on a grid of FOLD-sized cells in the fold space, so only neighbouring
  // cells are searched: the same result as a linear scan, without its cost
  // on noisy images with hundreds of thousands of colours.
  const clusters = [], grid = new Map();
  const cell = (v) => v.map((x) => Math.floor(x / FOLD));
  for (const p of pool) {
    const v = p.v, [cx, cy, cz] = cell(v);
    let home = null;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      for (const c of grid.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
        if ((!home || c.order < home.order) && Math.hypot(c.v[0] - v[0], c.v[1] - v[1], c.v[2] - v[2]) < FOLD) home = c;
      }
    }
    if (home) { home.n += p.n; continue; }
    const c = { rgb: p.rgb, n: p.n, v, order: clusters.length };
    clusters.push(c);
    const key = `${cx},${cy},${cz}`;
    grid.set(key, [...(grid.get(key) ?? []), c]);
  }
  const total = clusters.reduce((a, c) => a + c.n, 0);
  let kept = clusters.filter((c) => c.n / total >= minShare);
  if (!kept.length) kept = [...clusters].sort((a, b) => b.n - a.n).slice(0, KEEP);
  const keptTotal = kept.reduce((a, c) => a + c.n, 0);

  const candidates = kept
    .map((c) => candidateOf(c.rgb, round(c.n / keptTotal)))
    .sort((a, b) => b.share - a.share || b.oklch.c - a.oklch.c || (a.hex < b.hex ? -1 : 1));

  const monochrome = candidates.length === 0;
  if (monochrome) warnings.push("no brand colour in the artwork: the logo is monochrome (black, white, greys or near-neutral tints only)");
  return { format, candidates, monochrome, warnings };
}

export { parseHex };
