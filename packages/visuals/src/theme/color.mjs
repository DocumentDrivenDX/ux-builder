/* CSS colours as the resolved tokens write them (hex, rgb() and color-mix(in srgb, …)), parsed
   to sRGB and back to hex, and WCAG 2 contrast between them (ADR-042 decision 4). */

const clamp = (v) => Math.min(255, Math.max(0, v));

/* Split a function's arguments at top-level commas. */
function args(text) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth--;
    else if (text[i] === "," && depth === 0) { out.push(text.slice(start, i).trim()); start = i + 1; }
  }
  out.push(text.slice(start).trim());
  return out;
}

/** [r, g, b, a] with r, g, b in 0..255 and a in 0..1, or null when the value is not a colour we read. */
export function parse(value) {
  const v = String(value).trim();
  if (/^transparent$/i.test(v)) return [0, 0, 0, 0];
  let m = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = /^rgba?\((.*)\)$/i.exec(v);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map((p) => (p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p)));
    return [parts[0], parts[1], parts[2], parts[3] === undefined ? 1 : parts[3] > 1 ? parts[3] / 255 : parts[3]];
  }
  m = /^color-mix\(\s*in\s+srgb\s*,(.*)\)$/i.exec(v);
  if (m) {
    // CSS Color 5 color-mix(): a percentage before or after each colour; missing ones complete each
    // other; a sum under 100% scales the result's alpha; channels mix premultiplied by alpha.
    const parts = args(m[1]).map((part) => {
      const pm = /^(?:([\d.]+)%\s+)?(.*?)(?:\s+([\d.]+)%)?$/.exec(part);
      const pct = pm[1] ?? pm[3];
      return { color: parse(pm[2]), pct: pct === undefined ? null : parseFloat(pct) / 100 };
    });
    if (parts.length !== 2 || !parts[0].color || !parts[1].color) return null;
    const [a, b] = parts;
    let p1 = a.pct, p2 = b.pct;
    if (p1 === null && p2 === null) p1 = p2 = 0.5;
    else if (p1 === null) p1 = 1 - p2;
    else if (p2 === null) p2 = 1 - p1;
    const sum = p1 + p2;
    if (sum <= 0) return null;
    const w = p1 / sum, scale = Math.min(1, sum);
    const alpha = a.color[3] * w + b.color[3] * (1 - w);
    const channel = (i) => (alpha === 0 ? 0 : (a.color[i] * a.color[3] * w + b.color[i] * b.color[3] * (1 - w)) / alpha);
    return [channel(0), channel(1), channel(2), alpha * scale];
  }
  return null;
}

export function toHex(rgba) {
  const h = (n) => Math.round(clamp(n)).toString(16).padStart(2, "0").toUpperCase();
  return `#${h(rgba[0])}${h(rgba[1])}${h(rgba[2])}${rgba[3] < 1 ? h(rgba[3] * 255) : ""}`;
}

/* Composite a translucent colour over an opaque background. */
export function over(fg, bg) {
  const a = fg[3] ?? 1;
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1);
}

function luminance([r, g, b]) {
  const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2 contrast ratio of two colours; a translucent foreground is composited over the background first. */
export function contrast(fg, bg) {
  const a = luminance(over(fg, bg)), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
