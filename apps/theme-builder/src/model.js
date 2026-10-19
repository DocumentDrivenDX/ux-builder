/* Words the builder shows (the prototype's copy), derived from real data. */

import { hexToOklch } from "@ux-builder/engine/browser";

const NAMES = { faithful: "Faithful", muted: "Muted", vibrant: "Vibrant", "neutral-accent": "Neutral + accent", "two-colour": "Two colours" };
const NOTES = {
  faithful: "The logo colours as they are.",
  muted: "Lower saturation and deeper buttons: quieter and more formal.",
  vibrant: "Richer buttons on brand-tinted backgrounds.",
  "neutral-accent": "Greys carry the interface; the brand colour is the only accent.",
  "two-colour": "Two logo colours: one for buttons, the other for accents.",
};
const VARIANT = { softer: "softer", stronger: "stronger" };

export function optionName(o) {
  const v = o.label.slice(o.strategy.length + 1);
  return `${NAMES[o.strategy] ?? o.label}${v ? `, ${VARIANT[v] ?? v}` : ""}`;
}

/* The prototype's one-line note: what the option is, and the largest colour
   the engine moved for contrast. */
export function optionNote(o) {
  const main = o.moves.filter((m) => m.appearance === "light" && /color\.(structure|accent)/.test(m.role)).sort((a, b) => Math.abs(b.deltaL) - Math.abs(a.deltaL))[0];
  const moved = main ? ` ${main.role === "color.accent" ? "Accent" : "Buttons"} ${main.deltaL < 0 ? "darkened" : "lightened"} ${Math.round(Math.abs(main.deltaL) * 100)}% for contrast.` : "";
  return NOTES[o.strategy] + moved;
}

/* A colour's everyday name, for the extracted chips ("Navy", "Terracotta"). */
export function colourName(hex) {
  const { l, c, h } = hexToOklch(hex);
  if (c < 0.04) return l < 0.25 ? "Black" : l > 0.92 ? "White" : l < 0.5 ? "Charcoal" : "Grey";
  const dark = l < 0.42;
  if (h < 15 || h >= 350) return dark ? "Maroon" : "Crimson";
  if (h < 45) return dark ? "Brick" : c < 0.19 && l < 0.66 ? "Terracotta" : "Red";
  if (h < 70) return dark ? "Brown" : "Orange";
  if (h < 100) return dark ? "Olive" : "Gold";
  if (h < 135) return dark ? "Olive" : "Lime";
  if (h < 175) return dark ? "Forest" : "Green";
  if (h < 215) return dark ? "Deep teal" : "Teal";
  if (h < 270) return dark ? "Navy" : "Blue";
  if (h < 305) return dark ? "Indigo" : "Violet";
  return dark ? "Plum" : "Pink";
}

export const SYSTEM_INFO = {
  material: { icons: "Material Symbols", blurb: "Pill buttons, filled fields, tonal states." },
  fluent: { icons: "Fluent System Icons", blurb: "4px corners, compact 32px controls." },
  carbon: { icons: "Carbon Icons", blurb: "Square, 48px buttons, layered surfaces." },
  databricks: { icons: "Lucide", blurb: "AppKit UI: 36px controls, 8px radius, segmented tabs." },
};
export const iconsOf = (ds) => SYSTEM_INFO[ds.name]?.icons ?? "Lucide";
export const iconSetOf = (ds) => (["material", "fluent", "carbon"].includes(ds.name) ? ds.name : "lucide");
export const fontsOf = (ds) => [...new Set(Object.values(ds.fonts).filter((f) => f.source !== "system" || ds.name === "fluent").map((f) => f.family))].slice(0, 2).join(", ") || "System fonts";
export const titleOf = (name) => name.split(/[-_ ]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
export const brandNameFor = (theme, ds) => (theme.endsWith(`-${ds}`) && theme.length > ds.length + 1 ? theme.slice(0, -ds.length - 1) : theme);
/* "acme-legal-logo.svg" -> "acme-legal" */
export const brandFromFile = (filename) => filename.replace(/\.(svg|png)$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-?(logo|mark|light|dark)(-|$)/g, "-").replace(/^-+|-+$/g, "").replace(/^(\d)/, "brand-$1") || "brand";
