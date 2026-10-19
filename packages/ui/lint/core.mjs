/* ux-builder/no-hard-coded-values (FEAT-004 SDK-10, SDK-11; US-013): the checks
   shared by the stylelint plugin and the ESLint rule.

   A literal colour, font family or border radius in app code looks right
   under one theme and wrong under every other. This finds them in a CSS
   declaration (property + value), names the role token to use where the
   app's theme has one with that exact value, and honours a reviewed
   allow-list: each entry needs a reason.

   Not reported: var(--…) (including literals in a var() fallback, which
   only apply when a token is missing), transparent, currentColor, the
   CSS-wide keywords, none, 0, generic font families on their own, and
   fully round radii (50%, 100%, 999px or more), which are geometry rather
   than a theme's choice. */

import { createRequire } from "node:module";
import { join } from "node:path";

export const RULE = "ux-builder/no-hard-coded-values";

const NAMED = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen").split(" "));
const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "inherit", "initial", "unset", "revert", "revert-layer"]);
const COLOUR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const RADIUS = /^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$/;
const COLOUR_PROPS = /^(?:--.*|color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|(?:box|text)-shadow|caret-color|accent-color|text-decoration(?:-color)?|text-emphasis(?:-color)?|column-rule(?:-color)?|scrollbar-color|stop-color|flood-color|lighting-color)$/i;

/* Remove var(…) (with its fallback) and url(…), keeping positions roughly
   stable by blanking them, so what is left is the literal part. */
export function stripVars(value) {
  let out = "", i = 0;
  const s = String(value);
  while (i < s.length) {
    const m = /^(var|url|env)\(/i.exec(s.slice(i));
    if (m) {
      let depth = 0, j = i + m[1].length;
      for (; j < s.length; j++) { if (s[j] === "(") depth++; else if (s[j] === ")" && --depth === 0) break; }
      out += " ".repeat(j + 1 - i); i = j + 1; continue;
    }
    out += s[i++];
  }
  return out;
}

function balanced(s, start) {
  let depth = 0;
  for (let j = start; j < s.length; j++) { if (s[j] === "(") depth++; else if (s[j] === ")" && --depth === 0) return s.slice(start, j + 1); }
  return s.slice(start);
}

/* The literal colours, fonts and radii in one declaration: [{ kind, literal, index }]. */
export function literals(property, value) {
  const prop = String(property).toLowerCase();
  const raw = String(value);
  const bare = stripVars(raw);
  const out = [];
  if (COLOUR_PROPS.test(prop)) {
    const noStrings = bare.replace(/(["'])(?:\\.|(?!\1).)*\1/g, (m) => " ".repeat(m.length));
    for (const m of noStrings.matchAll(/#[0-9a-f]{3,8}\b/gi)) if ([4, 5, 7, 9].includes(m[0].length)) out.push({ kind: "colour", literal: m[0], index: m.index });
    for (const m of noStrings.matchAll(COLOUR_FN)) out.push({ kind: "colour", literal: balanced(noStrings, m.index + m[0].length - 1).replace(/^\(/, m[0].slice(0, -1) + "("), index: m.index });
    for (const m of noStrings.matchAll(/[a-z]+/gi)) if (NAMED.has(m[0].toLowerCase()) && !/[-\w]$/.test(noStrings.slice(0, m.index)) && !/^[-\w(]/.test(noStrings.slice(m.index + m[0].length))) out.push({ kind: "colour", literal: m[0], index: m.index });
  }
  if (prop === "font-family" || prop === "font") {
    // In the font shorthand the families follow the size (and optional /line-height).
    const families = prop === "font" ? (/(?:^|\s)(?:[\d.]+(?:px|rem|em|%|pt|vw|vh|ch)|xx?-small|small|medium|large|xx?-large|larger|smaller)(?:\/\S+)?\s+(.+)$/i.exec(bare.trim())?.[1] ?? "") : bare;
    for (const f of families.split(",").map((x) => x.trim()).filter(Boolean)) {
      const name = f.replace(/^["']|["']$/g, "");
      if (!GENERIC.has(name.toLowerCase())) { out.push({ kind: "font", literal: f, index: Math.max(0, raw.indexOf(f)) }); break; }
    }
  }
  if (RADIUS.test(prop)) {
    for (const m of bare.matchAll(/-?\d*\.?\d+(px|rem|em|%|vw|vh|ch)?/g)) {
      const n = parseFloat(m[0]), unit = m[1] ?? "";
      if (n === 0) continue;
      if ((unit === "%" && n >= 50) || (unit === "px" && n >= 999) || ((unit === "rem" || unit === "em") && n >= 99)) continue;
      out.push({ kind: "radius", literal: m[0], index: m.index });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

/* ---------------------------------------------------------- suggestions */

function hexOf(literal) {
  const s = literal.trim().toLowerCase();
  if (/^#[0-9a-f]{3,4}$/.test(s)) return "#" + [...s.slice(1, 4)].map((c) => c + c).join("").toUpperCase();
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(s)) return s.slice(0, 7).toUpperCase();
  const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(s);
  if (m) return "#" + m.slice(1, 4).map((v) => Math.min(255, +v).toString(16).padStart(2, "0")).join("").toUpperCase();
  return null;
}
const firstFamily = (stack) => String(stack).split(",")[0].trim().replace(/^["']|["']$/g, "").toLowerCase();
const PREFER = [/^piq-color-text$/, /^piq-color-/, /^piq-state-/, /^piq-font-body$/, /^piq-font-/, /^piq-radius-/, /-radius$/];
const rank = (k) => { const i = PREFER.findIndex((r) => r.test(k)); return i < 0 ? PREFER.length : i; };

/* Role tokens whose value in the app's theme equals this literal, best first. */
export function suggest(finding, tokens) {
  if (!tokens) return [];
  const entries = Object.entries(tokens).filter(([k]) => k.startsWith("piq-"));
  let hits = [];
  if (finding.kind === "colour") {
    const hex = hexOf(finding.literal);
    if (hex) hits = entries.filter(([k, v]) => /^piq-(color|state)-/.test(k) && String(v).toUpperCase() === hex);
  } else if (finding.kind === "font") {
    const f = firstFamily(finding.literal);
    hits = entries.filter(([k, v]) => /^piq-font-(body|heading|display|mono)$/.test(k) && firstFamily(v) === f);
  } else if (finding.kind === "radius") {
    hits = entries.filter(([k, v]) => /radius/.test(k) && String(v).trim() === finding.literal.trim());
  }
  return hits.map(([k]) => k).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

const KIND = { colour: "colour", font: "font family", radius: "radius" };
export function message(finding, suggestions) {
  const head = `Hard-coded ${KIND[finding.kind]} ${finding.literal}`;
  if (!suggestions.length) return `${head}: use a --piq-* role token (${RULE})`;
  const [best, ...rest] = suggestions;
  return `${head}: use var(--${best})${rest.length ? ` (same value: ${rest.slice(0, 2).map((r) => `--${r}`).join(", ")})` : ""} (${RULE})`;
}

/* ------------------------------------------------------------ options */

/* The resolved tokens of the app's theme, from the @ux-builder/tokens the app has
   installed (else this package's own), for suggestions. */
export function loadTokens(theme, appearance = "light", from = process.cwd()) {
  if (!theme) return null;
  for (const base of [join(from, "noop.js"), import.meta.url]) {
    try { return createRequire(base)(`@ux-builder/tokens/resolved/${theme}.${appearance}.json`).tokens; } catch { /* try the next */ }
  }
  return null;
}

/* Allow-list entries: { value?, property?, file?, reason }. Returns errors for
   entries without a reason or without anything to match. */
export function checkAllow(allow = []) {
  const errors = [];
  if (!Array.isArray(allow)) return ["allow must be a list of { value?, property?, file?, reason }"];
  allow.forEach((e, i) => {
    if (!e || typeof e !== "object") errors.push(`allow[${i}] is not an object`);
    else if (!String(e.reason ?? "").trim()) errors.push(`allow[${i}] has no reason: every exception is reviewed, so say why`);
    else if (!e.value && !e.property && !e.file) errors.push(`allow[${i}] matches nothing: give value, property or file`);
  });
  return errors;
}

const globRe = (g) => new RegExp("(^|/)" + g.split("**").map((p) => p.split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")).join(".*") + "$");
export function allowed(finding, property, file, allow = []) {
  return allow.some((e) => e?.reason
    && (!e.value || String(e.value).toLowerCase().replace(/\s+/g, "") === finding.literal.toLowerCase().replace(/\s+/g, ""))
    && (!e.property || String(e.property).toLowerCase() === String(property).toLowerCase())
    && (!e.file || globRe(e.file).test(String(file ?? "").split("\\").join("/"))));
}

/* Everything to report for one declaration. */
export function check(property, value, { tokens, allow = [], file } = {}) {
  return literals(property, value)
    .filter((f) => !allowed(f, property, file, allow))
    .map((f) => ({ ...f, message: message(f, suggest(f, tokens)) }));
}
