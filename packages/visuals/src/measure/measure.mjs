/* Text measurement from the font tables (ADR-042 decision 3): the theme's first shipped family,
   or the stand-in, at the nearest shipped weight, with the visuals PRD's 4% padding. */

import metrics from "../../metrics/fonts.json" with { type: "json" };

const PADDING = 1.04;
const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "-apple-system", "blinkmacsystemfont"]);

/** The families of a CSS font stack, unquoted. */
export function families(stack) {
  return String(stack).split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

export function createMeasure(stack) {
  const named = families(stack);
  const family = named.find((f) => metrics.families[f]) ?? metrics.standIn;
  const standIn = !named.some((f) => metrics.families[f]);
  // The family a reader's browser draws with when it is not shipped: the first one that is not a generic keyword.
  const intended = named.find((f) => !GENERIC.has(f.toLowerCase())) ?? named[0];
  const weights = metrics.families[family];
  const table = (weight) => {
    const available = Object.keys(weights).map(Number);
    const best = available.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) || (Math.abs(b - weight) === Math.abs(a - weight) && b > a) ? b : a));
    return weights[best];
  };
  const cache = new Map();
  /** Width in px of one line of text. */
  const width = (text, size, weight = 400) => {
    const key = `${weight}|${size}|${text}`;
    if (cache.has(key)) return cache.get(key);
    const t = table(weight);
    const chars = [...String(text)];
    let units = 0;
    for (let i = 0; i < chars.length; i++) {
      units += t.advances[chars[i].codePointAt(0).toString(16)] ?? t.average;
      if (i > 0) units += t.kern[chars[i - 1] + chars[i]] ?? 0;
    }
    const px = (units / t.em) * size * PADDING;
    cache.set(key, px);
    return px;
  };
  /** Greedy word wrap to at most maxWidth px; a word longer than the line is kept whole. */
  const wrap = (text, size, weight, maxWidth) => {
    const lines = [];
    let line = "";
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && width(next, size, weight) > maxWidth) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  return { family, standIn, intended, width, wrap, lineHeight: (size) => Math.round(size * 1.3) };
}
