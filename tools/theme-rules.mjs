/* The theme checks: the parts of the theme and colour rules in
   guidelines/rules.json that a theme's own tokens settle, measured on its
   resolved tokens in each appearance. A rule names one as
   { kind: "theme", id }; check-theme-rules.mjs runs them on every theme.

   What a rule asks of the screens that use a theme (where red is used,
   whether a heading wears the accent) stays with its review and audit
   checks; these measure only what the theme decides.

   Thresholds the rules give are used as written. Where a rule says only
   "visibly different" or "clearly different", the number used is named
   beside the check. */

import { NORMAL_FLOOR, deltaE, linear, oklab, ratio, solid } from "./contrast.mjs";

/* check id → the rule it serves */
export const CHECKS = {
  "theme-red-reserved": "color.red-reserved",
  "theme-focus-ring": "theme.focus-ring",
  "theme-small-text": "theme.small-text-floor",
  "theme-contrast-margin": "theme.contrast-margin",
  "theme-text-tiers": "theme.text-tiers",
  "theme-structure-accent": "theme.structure-accent-distinct",
  "theme-surface-separation": "theme.surface-separation",
  "theme-dark-appearance": "theme.dark-appearance",
  "theme-weights": "theme.weights",
  "theme-families": "theme.families-limited",
};

export const MARGIN = 4.7;          // theme.contrast-margin: "about 4.7:1 or more"
export const RING_CONTRAST = 3;     // theme.focus-ring
export const TIER_STEP = 1.1;       // theme.text-tiers: neighbouring tiers at least 1.1:1 apart
export const SURFACE_STEP = 1.25;   // theme.surface-separation
export const DARK_SHADOW_ALPHA = 0.3; // theme.surface-separation: dark shadows "around 0.4 to 0.5"; 0.3 is the least that counts

const px = (v) => {
  const m = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(String(v ?? "").trim());
  if (!m) return null;
  return Number(m[1]) * (m[2] === "rem" || m[2] === "em" ? 16 : 1);
};
const c = (n) => `piq-color-${n}`;

/* OKLCH lightness, chroma and hue (degrees) of a hex. */
export function oklch(h) {
  const [L, a, b] = oklab(linear(h.length === 4 ? `#${[...h.slice(1)].map((d) => d + d).join("")}` : h));
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}
/* Red, and hues close to it: OKLCH hue below 45° or above 340° (red, scarlet, coral, crimson), with chroma enough to read as a colour. */
export const isRed = (hex) => { const { C, h } = oklch(hex); return C >= 0.1 && (h < 45 || h > 340); };

/* The colours a value can show on the page: a hex or sRGB mix is itself; a
   mix with transparent is that colour over each ground. */
function shown(v, grounds) {
  const one = solid(v);
  if (one) return [one];
  const m = /^color-mix\(in srgb, (#[0-9a-f]{6}) (\d+(?:\.\d+)?)%, transparent\)$/i.exec(v ?? "");
  return m ? grounds.map((g) => solid(`color-mix(in srgb, ${m[1]} ${m[2]}%, ${g})`)) : [];
}
const colourIn = (v) => /(#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|color-mix\([^)]*\))/i.exec(v ?? "")?.[1] ?? null;
const alphas = (shadow) => [...String(shadow ?? "").matchAll(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/g)].map((m) => Number(m[1]));
const family = (stack) => {
  const first = String(stack ?? "").split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return /^(ui-sans-serif|system-ui|-apple-system|sans-serif|ui-serif|serif|ui-monospace|monospace)$/i.test(first) ? "system" : first;
};

/* A ring value ("2px solid #x") against the grounds: [[aspect, message]] for what is wrong with it. */
function ringProblems(label, v, offset, grounds, { needOffset = true } = {}) {
  const out = [];
  const m = /^(\d*\.?\d+)px\s+(\w+)\s+(.+)$/.exec(String(v ?? "").trim());
  if (!m) return [["form", `${label} is "${v}", not a ring of a width, a style and a colour`]];
  if (Number(m[1]) < 2) out.push(["width", `${label} is ${m[1]} px; at least 2 px`]);
  if (m[2] !== "solid") out.push(["style", `${label} is ${m[2]}; solid`]);
  if (/transparent/.test(m[3])) out.push(["halo", `${label} is a half-opacity halo (${m[3]}); a solid ring, with any halo on top of it`]);
  if (needOffset && (px(offset) ?? 0) < 2) out.push(["offset", `${label}'s offset is ${offset}; 2 px`]);
  const worst = shown(m[3], grounds).flatMap((col) => grounds.map((g) => [col, g, ratio(col, g)])).sort((x, y) => x[2] - y[2])[0];
  if (worst && worst[2] < RING_CONTRAST) out.push(["contrast", `${label} ${worst[0]} is ${worst[2].toFixed(2)}:1 on ${worst[1]}; at least ${RING_CONTRAST}:1`]);
  return out;
}

/* Findings for one appearance's tokens: [{ check, key, message }]. `key`
   names the finding stably for the baseline. */
export function checkAppearance(t) {
  const out = [];
  const add = (check, key, message) => out.push({ check, key, message });
  const ground = solid(t[c("ground")]), surface = solid(t[c("surface")]);
  const grounds = [ground, surface].filter(Boolean);

  // color.red-reserved: the colours of action, links, selection and focus are not red.
  const roles = [
    ["accent (links, selection, kickers)", t[c("accent")]],
    ["structure (primary buttons)", t[c("structure")]],
    ["focus ring", colourIn(t["piq-focus-ring"])],
    ["field focus outline", colourIn(t["piq-field-focus-outline"])],
    ["selected nav item", colourIn(t["piq-nav-item-selected-border"])],
  ];
  for (const [role, v] of roles) for (const col of new Set(shown(v, grounds))) {
    if (isRed(col)) add("theme-red-reserved", role, `the ${role} is red (${col}, hue ${oklch(col).h.toFixed(0)}°); red is kept for errors, critical warnings and destructive actions`);
  }

  // theme.focus-ring: a solid ring ≥ 2 px, offset 2 px, 3:1 on the control and the page; a field's focus is not a bottom bar alone.
  for (const [aspect, p] of ringProblems("the focus ring", t["piq-focus-ring"], t["piq-focus-offset"], grounds)) add("theme-focus-ring", `ring ${aspect}`, p);
  const fo = t["piq-field-focus-outline"], fs = t["piq-field-focus-shadow"];
  if (fo !== undefined) {
    const shadowRing = /^0 0 0 (\d*\.?\d+)px (.+)$/.exec(String(fs ?? "").trim());
    const outlineOk = fo !== "none" && ringProblems("x", fo, t["piq-field-focus-offset"] ?? "2px", grounds, { needOffset: false }).length === 0;
    const shadowOk = shadowRing && Number(shadowRing[1]) >= 2 && ringProblems("x", `${shadowRing[1]}px solid ${shadowRing[2]}`, "2px", grounds, { needOffset: false }).length === 0;
    if (!outlineOk && !shadowOk) {
      const bar = /^inset 0 -\d/.test(String(fs ?? "").trim());
      add("theme-focus-ring", "field focus", bar
        ? `a field's focus is a bottom bar alone (${fs}); a solid ring at least 2 px, 3:1`
        : `a field's focus (outline ${fo}, shadow ${fs ?? "none"}) is not a solid ring at least 2 px at 3:1`);
    }
  }

  // theme.small-text-floor: small ≥ 14 px, field labels at it or larger, nothing below 12 px.
  const small = px(t["piq-font-size-small"]);
  if (small !== null && small < 14) add("theme-small-text", "small size", `the small size is ${small} px; at least 14 px`);
  const label = px(t["piq-field-label-font-size"]);
  if (label !== null && label < Math.max(14, small ?? 14)) add("theme-small-text", "field label size", `field labels are ${label} px; the small size (at least 14 px) or larger`);
  for (const [k, v] of Object.entries(t)) {
    if (!/^piq-.*font-size/.test(k)) continue;
    const n = px(v);
    if (n !== null && n < 12) add("theme-small-text", k, `--${k} is ${n} px; nothing people read is set below 12 px`);
  }

  // theme.contrast-margin: accent, primary action, status and subtle text clear 4.7:1, not 4.5:1 exactly.
  const margin = [
    ["accent", c("accent"), [c("ground"), c("surface")]],
    ["muted text", c("text-muted"), [c("ground"), c("surface")]],
    ["subtle text", c("text-subtle"), [c("ground"), c("surface")]],
    ...["positive", "caution", "negative", "info"].map((s) => [`${s} status`, c(`status-${s}`), [c("ground"), c("surface")]]),
    ["primary button label", c("surface"), [c("structure")]],
  ];
  for (const [role, fg, bgs] of margin) {
    const a = solid(t[fg]);
    if (!a) continue;
    for (const bg of bgs) {
      const b = solid(t[bg]);
      if (!b) continue;
      const r = ratio(a, b);
      if (r < MARGIN) add("theme-contrast-margin", `--${fg} on --${bg}`, `${role} ${a} on --${bg} ${b} is ${r.toFixed(2)}:1; at least ${MARGIN}:1`);
    }
  }

  // theme.text-tiers: strong, default, muted and subtle are visibly different steps.
  const tiers = ["text-strong", "text", "text-muted", "text-subtle"].map((n) => [n, solid(t[c(n)])]).filter(([, v]) => v);
  for (let i = 1; i < tiers.length; i++) {
    const [[an, a], [bn, b]] = [tiers[i - 1], tiers[i]];
    const r = ratio(a, b);
    if (r < TIER_STEP) add("theme-text-tiers", `${an}/${bn}`, `--${c(an)} ${a} and --${c(bn)} ${b} are ${r.toFixed(2)}:1 apart; neighbouring tiers at least ${TIER_STEP}:1, or retire one`);
  }

  // theme.structure-accent-distinct: structure and accent are different tones.
  const s = solid(t[c("structure")]), acc = solid(t[c("accent")]);
  if (s && acc) {
    const d = deltaE(s, acc);
    if (d < NORMAL_FLOOR) add("theme-structure-accent", "structure/accent", `structure ${s} and accent ${acc} are ΔE ${d.toFixed(1)} apart; at least ${NORMAL_FLOOR}`);
  }

  // theme.surface-separation: a card stands off the ground by tone, a border or a shadow tuned for the appearance.
  if (ground && surface) {
    const tone = ratio(surface, ground);
    const border = solid(t[c("border")]);
    const edge = border ? Math.max(ratio(border, ground), ratio(border, surface)) : 0;
    const a = alphas(t["piq-shadow-card"]);
    const dark = luminanceOf(ground) < 0.2;
    const shadow = a.length > 0 && Math.max(...a) >= (dark ? DARK_SHADOW_ALPHA : 0.04);
    if (tone < SURFACE_STEP && edge < SURFACE_STEP && !shadow) {
      add("theme-surface-separation", "card", `a card (${surface}) on the ground (${ground}) is ${tone.toFixed(2)}:1, its border ${edge.toFixed(2)}:1, and its shadow ${a.length ? `at most ${Math.max(...a)} alpha` : "none"}; one of: tone ${SURFACE_STEP}:1, a border ${SURFACE_STEP}:1, or a shadow${dark ? ` of ${DARK_SHADOW_ALPHA} alpha or more in dark` : ""}`);
    }
  }

  // theme.families-limited: one text family, at most one more for headings and display.
  const fams = new Set(["piq-font-body", "piq-font-heading", "piq-font-display"].map((k) => t[k]).filter(Boolean).map(family));
  if (fams.size > 2) add("theme-families", "families", `the theme uses ${fams.size} families (${[...fams].join(", ")}); one for text and at most one more`);

  // theme.weights: strong text 600+, button labels 500+.
  const strong = Number(t["piq-font-weight-strong"]), btn = Number(t["piq-button-font-weight"]);
  if (strong && strong < 600) add("theme-weights", "strong", `strong text is weight ${strong}; 600 or more`);
  if (btn && btn < 500) add("theme-weights", "button", `button labels are weight ${btn}; 500 or more`);
  return out;
}

const luminanceOf = (h) => { const [r, g, b] = linear(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

/* The colour and shadow tokens dark must set for itself (theme.dark-appearance). */
export const DARK_OWN = ["ground", "surface", "text", "text-strong", "text-muted", "text-subtle", "border", "structure", "accent"].map(c).concat(["piq-shadow-card", "piq-shadow-overlay"]);

/* Findings that compare a theme's appearances: [{ appearance, check, key, message }]. */
export function checkTheme({ light, dark }) {
  const out = [];
  if (!dark) return [{ appearance: "dark", check: "theme-dark-appearance", key: "missing", message: "the theme has no dark appearance" }];
  if (!light) return out;
  for (const k of DARK_OWN) {
    if (light[k] === undefined || light[k] === "none") continue;
    if (light[k] === dark[k]) out.push({ appearance: "dark", check: "theme-dark-appearance", key: k, message: `--${k} is the light value (${String(light[k]).slice(0, 60)}); dark sets its own` });
  }
  for (const k of ["piq-font-weight-strong", "piq-button-font-weight", "piq-table-header-font-weight"]) {
    if (light[k] !== undefined && dark[k] !== undefined && String(light[k]) !== String(dark[k])) {
      out.push({ appearance: "dark", check: "theme-weights", key: `${k} light/dark`, message: `--${k} is ${light[k]} in light and ${dark[k]} in dark; the same weight in both (lower the tone, not the weight)` });
    }
  }
  return out;
}

export const findingId = (theme, appearance, f) => `${theme}.${appearance}: ${f.check}: ${f.key}`;
