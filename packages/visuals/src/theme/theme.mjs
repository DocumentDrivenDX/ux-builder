/* A resolved theme as the renderer uses it: every colour, stroke and radius by its CONTRACT-001
   token name, written either as the theme's value (a standalone file) or as a CSS variable with
   that value as fallback (appearance "both": an inline SVG follows the page). */

import { parse, toHex } from "./color.mjs";

const tokensOf = (resolved) => resolved?.tokens ?? resolved;

/* A token's value, following var(--piq-…) references inside the resolved set. */
function lookup(tokens, name, seen = new Set()) {
  const raw = tokens[name];
  if (raw === undefined) throw Object.assign(new Error(`The theme has no token ${name}`), { code: "VISUAL_THEME" });
  return String(raw).replace(/var\(--([\w-]+)(?:,[^)]*)?\)/g, (_, ref) => {
    if (seen.has(ref)) throw Object.assign(new Error(`Token cycle at ${ref}`), { code: "VISUAL_THEME" });
    return lookup(tokens, ref, new Set([...seen, name]));
  });
}

/**
 * @param {object} input a resolved theme ({ theme, appearance, tokens }) or, for "both", { light, dark }
 * @param {"light"|"dark"|"both"} appearance
 */
export function createTheme(input, appearance = "light") {
  if (appearance !== "light" && appearance !== "dark" && appearance !== "both") throw Object.assign(new Error(`Unknown appearance ${appearance}`), { code: "VISUAL_THEME" });
  const sets = input?.light && input?.dark ? { light: input.light, dark: input.dark } : { [input?.appearance ?? "light"]: input };
  const primary = appearance === "both" ? sets.light ?? sets.dark : sets[appearance] ?? Object.values(sets)[0];
  if (appearance === "both" && !(sets.light && sets.dark)) throw Object.assign(new Error('appearance "both" needs the light and the dark theme'), { code: "VISUAL_THEME" });
  const tokens = tokensOf(primary);
  const cache = new Map();
  const hexIn = (name, set = primary) => {
    const key = `${set === primary ? "" : "alt"}|${name}`;
    if (!cache.has(key)) {
      const rgba = parse(lookup(tokensOf(set), name));
      if (!rgba) throw Object.assign(new Error(`Token ${name} is not a colour`), { code: "VISUAL_THEME" });
      cache.set(key, toHex(rgba));
    }
    return cache.get(key);
  };
  const raw = (name) => lookup(tokens, name);
  // A colour is a token name, or { mix: [a, percent, b] }: a percent of a into b, derived from the theme.
  const mixHex = (c, which) => {
    const [a, pct, b] = c.mix;
    const set = which && appearance === "both" ? sets[which] : primary;
    return toHex(parse(`color-mix(in srgb, ${hexIn(a, set)} ${pct}%, ${hexIn(b, set)})`));
  };
  return {
    name: primary.theme ?? "theme",
    appearance,
    appearances: appearance === "both" ? { light: sets.light, dark: sets.dark } : { [appearance]: primary },
    /** The colour as written in the SVG. */
    color: (name) => (typeof name === "object"
      ? (appearance === "both" ? `color-mix(in srgb, var(--${name.mix[0]}, ${hexIn(name.mix[0])}) ${name.mix[1]}%, var(--${name.mix[2]}, ${hexIn(name.mix[2])}))` : mixHex(name))
      : (appearance === "both" ? `var(--${name}, ${hexIn(name)})` : hexIn(name))),
    /** The resolved colour, in this appearance (light for "both") or a named one. */
    hex: (name, which) => (typeof name === "object" ? mixHex(name, which) : which && appearance === "both" ? hexIn(name, sets[which]) : hexIn(name)),
    /** A font stack token as written in the SVG. */
    fontOf: (name) => (appearance === "both" ? `var(--${name}, ${raw(name)})` : raw(name)),
    /** A length token in pixels. */
    px: (name) => parseFloat(raw(name)),
    /** A length as written in the SVG: a number, or a var() in "both". */
    length: (name) => (appearance === "both" ? `var(--${name}, ${raw(name)})` : raw(name)),
    font: raw("piq-font-body"),
    fontAttr: () => (appearance === "both" ? `var(--piq-font-body, ${raw("piq-font-body")})` : raw("piq-font-body")),
    raw,
  };
}
