/* Colours named in SVG markup, by occurrence (SD-001 D5), keyed 0xRRGGBB.

   The file is read as text: no DOM is built, nothing is rendered, no script
   runs and no href is followed. Colours come from fill, stroke, stop-color
   and color, as attributes or inside style text; an embedded data: PNG is
   returned for the PNG reader. */

import { parseHex } from "../oklch.js";

const NAMED = {
  red: "#FF0000", green: "#008000", blue: "#0000FF", orange: "#FFA500", purple: "#800080",
  teal: "#008080", navy: "#000080", maroon: "#800000", olive: "#808000", gold: "#FFD700",
  coral: "#FF7F50", crimson: "#DC143C", black: "#000000", white: "#FFFFFF", gray: "#808080", grey: "#808080",
};

const PROP = /(?<![\w-])(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?\s*([^"';\s)>]+\)?)/gi;
const RGB_FN = /^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)/i;
const DATA_PNG = /data:image\/png;base64,([A-Za-z0-9+/=\s]+)/gi;

export function toRgb(token) {
  const t = token.trim().toLowerCase();
  if (NAMED[t]) return parseHex(NAMED[t]);
  if (t.startsWith("#")) return parseHex(t.slice(0, t.length >= 7 ? 7 : 4));
  const m = RGB_FN.exec(t);
  if (m) return m.slice(1, 4).map((v) => Math.min(255, v.endsWith("%") ? (parseFloat(v) * 255) / 100 : parseFloat(v)));
  return null; // none, currentColor, url(#…), inherit
}

export function svgColours(text) {
  const counts = new Map();
  for (const [, token] of text.matchAll(PROP)) {
    const rgb = toRgb(token);
    if (!rgb) continue;
    const [r, g, b] = rgb.map(Math.round);
    const key = (r << 16) | (g << 8) | b;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const pngs = [...text.matchAll(DATA_PNG)].map(([, b64]) => base64Bytes(b64.replace(/\s+/g, "")));
  return { counts, pngs };
}

function base64Bytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
