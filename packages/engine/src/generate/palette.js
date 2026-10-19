/* Role targets, strategies and status colours (SD-001 Generation, US-007).

   Produces a palette *spec*: for every role, the OKLCH colour it aims for
   and a note on where it came from. Fitting (fit.js) moves lightness only. */

import { ratio } from "../../../../tools/contrast.mjs";
import { deltaE, oklchToHex, parseHex } from "../oklch.js";

const wrap = (h) => ((h % 360) + 360) % 360;
const angle = (a, b) => { const d = wrap(b - a); return d > 180 ? d - 360 : d; }; // signed shortest a -> b

export const NEUTRAL_CHROMA = { faithful: 0.008, muted: 0.005, vibrant: 0.03, "neutral-accent": 0.004, "two-colour": 0.008 };

const STATES = {
  live: { hue: 150, band: [120, 185], light: 0.52, dark: 0.75, c: 0.13 },
  limited: { hue: 75, band: [55, 95], light: 0.55, dark: 0.82, c: 0.13 },
  purchasing: { hue: 250, band: [225, 270], light: 0.48, dark: 0.72, c: 0.13 },
  closed: { hue: 27, band: [10, 40], light: 0.52, dark: 0.7, c: 0.18 },
};

function stateHue({ hue, band }, brandHue, accentHue, harmony) {
  let h = hue + Math.max(-15, Math.min(15, harmony * angle(hue, brandHue)));
  h = Math.max(band[0], Math.min(band[1], h));
  // Keep clear of the accent so a status never reads as the brand (US-007 edge case).
  const d = angle(accentHue, h);
  if (Math.abs(d) < 25) {
    const away = h + Math.sign(d || 1) * (25 - Math.abs(d));
    const other = h - Math.sign(d || 1) * (25 + Math.abs(d));
    h = away >= band[0] && away <= band[1] ? away : other >= band[0] && other <= band[1] ? other : Math.max(band[0], Math.min(band[1], away));
  }
  return wrap(h);
}

const lch = (l, c, h) => ({ l: Math.max(0, Math.min(1, l)), c: Math.max(0, c), h: wrap(h) });

/* The two brand colours a strategy may use, after hueShift and chromaScale. */
export function brandColours(analysis, settings) {
  const cands = analysis.candidates;
  let primary, secondary = null, suggested = false;
  if (!cands.length) {
    primary = lch(0.55, 0.14, settings.suggestedHue);
    suggested = true;
  } else {
    primary = { ...cands[settings.primaryCandidate].oklch };
    const pick = settings.secondaryCandidate >= 0 && settings.secondaryCandidate < cands.length && settings.secondaryCandidate !== settings.primaryCandidate
      ? cands[settings.secondaryCandidate]
      : cands.find((c, i) => i !== settings.primaryCandidate && Math.abs(angle(primary.h, c.oklch.h)) >= 30);
    if (pick && Math.abs(angle(primary.h, pick.oklch.h)) >= 30) secondary = { ...pick.oklch };
  }
  const shift = (x) => x && lch(x.l, x.c, x.h + settings.hueShift);
  return { primary: shift(primary), secondary: shift(secondary), suggested, logoPaint: cands[0]?.hex ?? oklchToHex(primary) };
}

/* One option's spec for one appearance: { role: { lch, note } } plus fixed hexes. */
export function spec(strategy, colours, settings, appearance) {
  const { primary: B, secondary: S } = colours;
  const dark = appearance === "dark";
  const H0 = B.h;
  const Cn = NEUTRAL_CHROMA[strategy] * settings.neutralTint;
  const n = (l, k = 1) => lch(l, Cn * k, H0);
  const g = dark ? settings.groundDark : settings.groundLight;
  const roles = {};
  const put = (path, v, note) => { roles[path] = { lch: v, note }; };

  put("color.ground", n(g), "Page ground");
  put("color.ground-recessed", n(dark ? g - 0.03 : g - 0.025), "Recessed ground (sidebar)");
  put("color.surface", dark ? n(g + 0.05) : lch(1, 0, H0), "Cards, fields and menus");
  put("color.surface-sunken", n(dark ? g + 0.09 : g - 0.03), "Sunken panels and pills");
  put("color.border", n(dark ? g + 0.15 : 0.9, 1.5), "Borders");
  put("color.text-strong", n(dark ? 0.98 : 0.2, 2), "Headings");
  put("color.text", n(dark ? 0.94 : 0.26, 2), "Body text");
  put("color.text-muted", n(dark ? 0.8 : 0.42, 2), "Muted text");
  put("color.text-subtle", n(dark ? 0.7 : 0.5, 2), "Subtle text");

  const scaled = (x, k) => lch(x.l, x.c * k * settings.chromaScale, x.h);
  let structure, accent;
  switch (strategy) {
    case "faithful": structure = accent = scaled(B, 1); break;
    case "muted": structure = accent = lch(dark ? 0.75 : 0.38, B.c * 0.55 * settings.chromaScale, B.h); break;
    case "vibrant": structure = accent = lch(dark ? 0.72 : 0.48, B.c * 1.2 * settings.chromaScale, B.h); break;
    case "neutral-accent": structure = roles["color.text"].lch; accent = scaled(B, 1); break;
    case "two-colour": structure = scaled(B, 1); accent = scaled(S, 1); break;
    default: throw new Error(`no strategy ${strategy}`);
  }
  put("color.structure", structure, strategy === "neutral-accent" ? "Primary buttons: neutral ink" : "Primary buttons: brand colour");
  put("color.accent", accent, strategy === "two-colour" ? "Links, focus, kickers: second brand colour" : "Links, focus, kickers: brand colour");

  // on-accent: white or near-black, whichever reads better on both structure and accent.
  const ink = n(0.15, 2);
  const score = (c) => Math.min(...[structure, accent].map((x) => contrastLch(c, x)));
  put("color.on-accent", score(lch(1, 0, H0)) >= score(ink) ? lch(1, 0, H0) : ink, "Text and icons on the accent");

  for (const [k, s] of Object.entries(STATES)) {
    const h = stateHue(s, H0, accent.h, settings.stateHarmony);
    put(`state.${k}`, lch(dark ? s.dark : s.light, s.c, h), `Status: ${k}`);
  }
  put("state.evaluation", roles["color.text-muted"].lch, "Status: evaluation (muted)");
  return roles;
}

export const contrastLch = (a, b) => ratio(oklchToHex(a), oklchToHex(b));

/* Two options are distinct when structure, accent or ground differ by ΔE_OK >= 0.03. */
export const DISTINCT = 0.03;
export function distinct(a, b) {
  return ["color.structure", "color.accent", "color.ground"].some((r) => deltaE(parseHex(a[r]), parseHex(b[r])) >= DISTINCT);
}

