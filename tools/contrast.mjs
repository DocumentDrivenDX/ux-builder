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

/* ------------------------------------------------- diagrams and charts */

/* The roles diagrams and charts draw with (FEAT-016), held to WCAG 2.x:
   text at 4.5:1 (1.4.3), graphics, which series marks and edges are, at
   3:1 (1.4.11). A status colour is checked as text on the ground and a
   card, since a metric prints its change in it; on its own subtle fill it
   is a mark (an icon, a dot), and the chip's label is color.text. Edges and series are also checked across the deepest
   region tint, which they cross inside a group. Unlike PAIRS, a pairing
   here that cannot be measured is a failure: every diagram colour is a hex
   or a two-hex mix. */
export const GRAPHIC = 3;
const c = (n) => `piq-color-${n}`;
const STATUS = ["positive", "caution", "negative", "info"];
export const SERIES = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => c(`series-${i}`));
export const REGIONS = [1, 2, 3].map((i) => c(`diagram-region-${i}`));
const ON = [[c("ground"), "the ground"], [c("surface"), "a card"], [c("diagram-region-3"), "the deepest region"]];
export const DIAGRAM_PAIRS = [
  ...STATUS.flatMap((s) => [
    [c(`status-${s}`), c("ground"), `${s} as text`, FLOOR],
    [c(`status-${s}`), c("surface"), `${s} as text on a card`, FLOOR],
    [c(`status-${s}`), c(`status-${s}-subtle`), `${s} mark on its fill`, GRAPHIC],
    [c("text"), c(`status-${s}-subtle`), `text on the ${s} fill`, FLOOR],
  ]),
  ...REGIONS.map((r, i) => [c("text"), r, `text in region ${i + 1}`, FLOOR]),
  ...["placeholder", "decided", "unknown"].map((s) => [c("text"), c(`lifecycle-${s}`), `text on ${s === "unknown" ? "an" : "a"} ${s} part`, FLOOR]),
  ...SERIES.flatMap((s, i) => ON.map(([bg, where]) => [s, bg, `series ${i + 1} on ${where}`, GRAPHIC])),
  ...["edge", "edge-strong", "edge-muted"].flatMap((e) => ON.map(([bg, where]) => [c(`diagram-${e}`), bg, `${e.replace("-", " ")} on ${where}`, GRAPHIC])),
];

/* Colour-vision separation (FEAT-016 GATE-04): Euclidean distance in OKLab
   ×100 between neighbouring series, under protanopia and deuteranopia as
   Machado, Oliveira and Fernandes (2009) simulate them at severity 1.0 in
   linear RGB, and with normal vision. The model is part of the threshold:
   these are the numbers the reference palette was validated with. */
export const CVD_FLOOR = 8, NORMAL_FLOOR = 15;
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
const linear = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
function oklab([r, g, b]) {
  const [l, m, s] = [
    0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b,
    0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
    0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
  ].map(Math.cbrt);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const simulate = (rgb, kind) => (kind ? MACHADO[kind].map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))) : rgb);
/** OKLab ΔE ×100 between two hexes, as a reader with `kind` (protan, deutan) or normal vision sees them. */
export function deltaE(a, b, kind) {
  const [x, y] = [a, b].map((h) => oklab(simulate(linear(h.length === 4 ? `#${[...h.slice(1)].map((d) => d + d).join("")}` : h), kind)));
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/* Every FEAT-016 failure in one theme's resolved tokens: { fg, bg, label, ratio, floor, unit? }.
   A separation failure carries its ΔE as ratio, with unit "ΔE"; bg names
   the neighbour and the vision it was measured under. */
export function diagramFailures(tokens) {
  const out = [];
  for (const [fg, bg, label, floor] of DIAGRAM_PAIRS) {
    const m = measure(tokens, fg, bg);
    if (!m || m.ratio < floor) out.push({ fg, bg, label, ratio: m ? m.ratio : null, floor });
  }
  const series = SERIES.map((s) => solid(tokens[s]));
  for (let i = 0; i + 1 < series.length; i++) {
    if (!series[i] || !series[i + 1]) continue;   // unmeasurable: already failed above
    for (const [kind, floor] of [["protan", CVD_FLOOR], ["deutan", CVD_FLOOR], [null, NORMAL_FLOOR]]) {
      const d = deltaE(series[i], series[i + 1], kind);
      if (d < floor) out.push({ fg: SERIES[i], bg: `${SERIES[i + 1]} (${kind ?? "normal vision"})`, label: `series ${i + 1} next to ${i + 2}`, ratio: d, floor, unit: "ΔE" });
    }
  }
  // GATE-05: each region differs from the ground, and deepens from 1 to 3.
  const ground = solid(tokens[c("ground")]);
  let last = 1;
  REGIONS.forEach((r, i) => {
    const v = solid(tokens[r]);
    const d = v && ground ? ratio(v, ground) : null;
    if (d === null || d <= 1 || d < last) out.push({ fg: r, bg: c("ground"), label: `region ${i + 1} ${d !== null && d <= 1 ? "is the ground" : "is shallower than the one before"}`, ratio: d, floor: last });
    if (d !== null) last = Math.max(last, d);
  });
  return out;
}
