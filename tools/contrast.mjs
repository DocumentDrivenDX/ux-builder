/* The contrast rule, shared by the gate (check-contrast.mjs) and the gallery
   (gen-gallery.mjs), so the page can never show a different verdict from the
   one CI enforced.

   A pairing of tokens is only as good as the widget that uses it. A
   background that is transparent or a tint is measured on what shows
   through it (grounds()). These are
   the pairings ui.css draws today; a literal colour in a widget rule (such as
   the selected segment's #fff) is invisible here and is the widget package's
   to catch. */

export const FLOOR = 4.5;

export const PAIRS = [
  ["piq-color-text-strong", "piq-color-ground", "headings"],
  ["piq-color-text", "piq-color-ground", "body text"],
  ["piq-color-text", "piq-color-surface", "body text on a card"],
  ["piq-color-text-muted", "piq-color-ground", "muted text"],
  ["piq-color-text-subtle", "piq-color-ground", "subtle text"],
  ["piq-color-accent", "piq-color-ground", "kicker (accent as text)"],
  ["piq-color-accent", "piq-color-surface", "kicker on a card"],
  ["piq-color-surface", "piq-color-structure", "primary button label"],
  ["piq-badge-fg", "piq-badge-bg", "badge count"],
  ["piq-state-live", "piq-pill-bg", "pill: live"],
  ["piq-state-limited", "piq-pill-bg", "pill: limited"],
  ["piq-state-purchasing", "piq-pill-bg", "pill: purchasing"],
  ["piq-state-evaluation", "piq-pill-bg", "pill: evaluation"],
  ["piq-state-closed", "piq-pill-bg", "pill: closed"],
  // Widget pairings (@ux-builder/ui). A theme that does not set these tokens
  // uses the fallbacks in ui.css, which are pairings above (the selected
  // segment falls back to the primary button's), so it is skipped here.
  ["piq-choice-picker-option-selected-fg", "piq-choice-picker-option-selected-bg", "selected segment"],
  ["piq-choice-picker-option-fg", "piq-color-ground", "segment label"],
  ["piq-field-label-fg", "piq-color-ground", "field label"],
  ["piq-color-text-strong", "piq-field-bg", "text in a field"],
  ["piq-toast-fg", "piq-toast-bg", "toast message"],
  ["piq-toast-action-fg", "piq-toast-bg", "toast action"],
  ["piq-table-header-fg", "piq-table-header-bg", "table header"],
  ["piq-menu-item-selected-fg", "piq-menu-item-selected-bg", "selected list item"],
  ["piq-color-text", "piq-menu-bg", "list item"],
];

export const hex = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v ?? "");

/* A token's value as one opaque colour, or null: a hex, or a color-mix() of
   two hexes in sRGB, which is how the widget tokens tint a ground. Anything
   else (transparent, a gradient) has no single colour to measure. */
export function solid(v) {
  if (hex(v)) return v;
  const m = /^color-mix\(in srgb, (#[0-9a-f]{6}) (\d+(?:\.\d+)?)%, (#[0-9a-f]{6})\)$/i.exec(v ?? "");
  if (!m) return null;
  const p = Number(m[2]) / 100;
  const ch = (h, i) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(ch(m[1], i) * p + ch(m[3], i) * (1 - p)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function luminance(h) {
  let s = h.slice(1);
  if (s.length === 3) s = [...s].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// The id a failure is recorded under in contrast-baseline.json.
/* The opaque colours a background token can put behind text. A solid value
   is itself. A transparent one shows the page: the ground or a card. A tint
   of the text's own colour (plain's pills: color-mix(in srgb, currentColor
   13%, transparent)) is that tint over the ground, a card or the sunken
   panel. Anything else has nothing to measure. */
export function grounds(tokens, bg, fg) {
  const v = tokens[bg];
  const one = solid(v);
  if (one) return [one];
  const page = (keys) => keys.map((k) => solid(tokens[k])).filter(Boolean);
  if (v === "transparent") return page(["piq-color-ground", "piq-color-surface"]);
  const tint = /^color-mix\(in srgb, currentColor (\d+(?:\.\d+)?)%, transparent\)$/i.exec(v ?? "");
  if (tint && fg) return page(["piq-color-ground", "piq-color-surface", "piq-color-surface-sunken"]).map((g) => solid(`color-mix(in srgb, ${fg} ${tint[1]}%, ${g})`));
  return [];
}

/* A pairing's contrast in one theme: the worst over every ground the
   background can put behind the text, and that ground; null if either side
   has no colour to measure. */
export function measure(tokens, fg, bg) {
  const a = solid(tokens[fg]);
  if (!a) return null;
  let worst = null;
  for (const g of grounds(tokens, bg, a)) { const r = ratio(a, g); if (!worst || r < worst.ratio) worst = { fg: a, bg: g, ratio: r }; }
  return worst;
}

export const pairId = (theme, appearance, fg, bg) => `${theme}.${appearance}: --${fg} on --${bg}`;
