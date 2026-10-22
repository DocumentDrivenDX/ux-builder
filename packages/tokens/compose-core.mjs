/* Composition without I/O (ADR-013, ADR-018): the pure half of compose.mjs.

   No file system, no schema validator, so it also runs in the browser (the
   palette engine composes generated brands with each shared design system to
   fit them, SD-001 D3). compose.mjs adds loading and validation and re-exports
   everything here. */

// The SDK's diagram colours (FEAT-017), for a brand load() did not attach its own copy to.
import DATAVIZ from "../../tokens/dataviz.json" with { type: "json" };

export const REF = /\{([a-z0-9.-]+)\}/g;
const FONT_ROLES = ["display", "heading", "body", "mono"];
export const APPEARANCES = ["dark", "light"];

export class ComposeError extends Error {}
export const fail = (msg) => { throw new ComposeError(msg); };

export const cssName = (names, path) => {
  if (!names[path]) fail(`unknown token ${path}`);
  return `piq-${path.replace(/\./g, "-")}`;
};

/** The 0.x name a token keeps as an alias through 1.x, or null. */
export const aliasName = (names, path) => names[path]?.css0 ?? null;

// A family name is quoted unless it is a plain CSS identifier (Georgia,
// system-ui, -apple-system); "Segoe UI" and ".SFNSText-Regular" are quoted.
const family = (f) => (/^-?[A-Za-z_][A-Za-z0-9_-]*$/.test(f) ? f : `"${f}"`);
export const fontStack = (font) => [font.family, ...font.fallback].map(family).join(", ");

/* --------------------------------------------------------------- themes */

/** A theme's anatomy: its shared design system, or its own. */
export function anatomyOf(src, theme) {
  return theme.designSystem ? src.designSystems.get(theme.designSystem) : theme.anatomy;
}

/** The appearances a theme has (its brand's), and the one it uses when the app sets none. */
export const themeAppearances = (src, theme) => APPEARANCES.filter((ap) => src.brands.get(theme.brand).appearances[ap]);
export function defaultAppearance(src, theme) {
  const aps = themeAppearances(src, theme);
  return theme.default ?? (aps.includes("dark") ? "dark" : aps[0]);
}

/* --------------------------------------------------------------- compose */

// One token: value with {path} references, optional description.
const entry = (t, value = t.$value) => ({ value, description: t.$description });

function groupsToMap(groups, into = new Map()) {
  for (const [g, ts] of Object.entries(groups ?? {})) for (const [k, t] of Object.entries(ts)) into.set(`${g}.${k}`, entry(t));
  return into;
}

/** An anatomy's tokens for one block: base, or one appearance's overrides.
    The base starts from the layer load() gives every anatomy (layout measures,
    its chosen pattern variants and the size-class boundaries, CONTRACT-002
    step 0), then its own tokens, then its fonts. */
export function anatomyTokens(anatomy, appearance) {
  if (appearance) return groupsToMap(anatomy.appearances?.[appearance]);
  const m = groupsToMap(anatomy.tokens, groupsToMap(anatomy.baseTokens));
  for (const r of FONT_ROLES) m.set(`font.${r}`, { value: fontStack(anatomy.fonts[r]) });
  return m;
}

/** A brand's tokens for one appearance: the diagram colours, then color, state, brand, plus derived roles.
    The diagram colours (CONTRACT-002 Composition step 4) come first so a brand's own status or series
    colour replaces the SDK's; load() attaches the dataviz file it read, else the one beside this package. */
export function brandTokens(brand, appearance, viz = brand.dataviz ?? DATAVIZ) {
  const a = brand.appearances[appearance];
  const m = groupsToMap(viz.derived, groupsToMap(viz.appearances[appearance]));
  for (const g of ["color", "state", "brand"]) {
    for (const [k, t] of Object.entries(a[g])) m.set(`${g}.${k}`, entry(t, t.$asset ? `url("../brand/${t.$asset}")` : t.$value));
  }
  // CONTRACT-002 Composition step 5.
  if (!m.has("color.ground-recessed")) m.set("color.ground-recessed", { value: "{color.ground}", description: "Derived: equals color.ground when a brand sets no recessed ground." });
  return m;
}

export function brandFontTokens(brand) {
  return new Map(Object.entries(brand.fonts ?? {}).map(([r, f]) => [`font.${r}`, { value: fontStack(f) }]));
}

/** Every token of a brand on an anatomy in one appearance, in CONTRACT-002 order. */
export function composeOn(brand, anatomy, appearance) {
  if (!brand.appearances[appearance]) fail(`brand ${brand.name} has no ${appearance} appearance`);
  const m = new Map();
  const put = (from) => { for (const [k, v] of from) m.set(k, v); };
  put(anatomyTokens(anatomy));
  put(anatomyTokens(anatomy, appearance));
  put(brandFontTokens(brand));
  put(brandTokens(brand, appearance));
  return m;
}

/** Every token of a theme in one appearance. */
export function compose(src, themeName, appearance) {
  const theme = src.themes.get(themeName);
  if (!theme) fail(`no theme "${themeName}"`);
  return composeOn(src.brands.get(theme.brand), anatomyOf(src, theme), appearance);
}

/** A brand on a shared design system, for previews. */
export function composePair(src, brandName, dsName, appearance) {
  return composeOn(src.brands.get(brandName), src.designSystems.get(dsName), appearance);
}

/** Resolve every {reference} to a final value. */
export function resolveAll(tokens, label) {
  const out = new Map();
  const visit = (path, stack = []) => {
    if (out.has(path)) return out.get(path);
    if (stack.includes(path)) fail(`${label}: reference cycle ${[...stack, path].join(" → ")}`);
    const t = tokens.get(path);
    if (!t) fail(`${label}: {${path}} is referenced but not set`);
    const v = String(t.value).replace(REF, (_, r) => visit(r, [...stack, path]));
    out.set(path, v);
    return v;
  };
  for (const p of tokens.keys()) visit(p);
  return out;
}

/* ------------------------------------------------------------------- css */

function cssBlock(names, selectors, tokens) {
  if (!tokens.size) return "";
  const lines = [];
  for (const [path, t] of tokens) {
    if (t.description) {
      const d = String(t.description).trim().split("\n");
      lines.push(d.length === 1 ? `  /** ${d[0]} */` : `  /**\n${d.map((l) => `   * ${l}`.trimEnd()).join("\n")}\n   */`);
    }
    const value = String(t.value).replace(REF, (_, r) => `var(--${cssName(names, r)})`);
    lines.push(`  --${cssName(names, path)}: ${value};`);
    // Declared in the same block as the role, not once at :root, so the alias
    // follows the role wherever a theme is set (var() resolves where declared).
    const alias = aliasName(names, path);
    if (alias) lines.push(`  --${alias}: var(--${cssName(names, path)});`);
  }
  return `${selectors.join(",\n")} {\n${lines.join("\n")}\n}\n`;
}

/* Every token this theme does not set, reset to its initial value under the
   theme's selector. Custom properties inherit, so without this a theme set
   inside another (the starter's provider under <html data-theme>, a nested
   provider) would show the outer theme's widget tokens and artwork wherever
   it sets none of its own; reset, the widget's ui.css fallback applies
   instead (US-022, found by @ux-builder/audit). */
function unsetCss(names, sel, set) {
  const lines = [];
  for (const path of Object.keys(names)) {
    if (set.has(path)) continue;
    lines.push(`  --${cssName(names, path)}: initial;`);
    const alias = aliasName(names, path);
    // The alias keeps pointing at the role (CONTRACT-001), which is now unset.
    if (alias) lines.push(`  --${alias}: var(--${cssName(names, path)});`);
  }
  return lines.length ? `${sel} {\n  /** Not set by this theme: reset, so an outer theme's value does not show through. */\n${lines.join("\n")}\n}\n` : "";
}

/** CONTRACT-003 blocks for one theme: [data-theme] carries its default appearance;
    [data-theme][data-appearance] carries each other appearance. */
export function themeCss(src, themeName) {
  const theme = src.themes.get(themeName);
  const brand = src.brands.get(theme.brand), anatomy = anatomyOf(src, theme);
  const def = defaultAppearance(src, theme);
  const sel = `[data-theme="${themeName}"]`;
  const base = new Map([...anatomyTokens(anatomy), ...anatomyTokens(anatomy, def), ...brandFontTokens(brand), ...brandTokens(brand, def)]);
  const blocks = [cssBlock(src.names, [sel], base) + unsetCss(src.names, sel, base)];
  const baseOnly = anatomyTokens(anatomy);
  for (const ap of themeAppearances(src, theme)) {
    if (ap === def) continue;
    // The default appearance's anatomy overrides live in the base block, so the
    // other appearance restores the base value of each before applying its own.
    const restore = new Map();
    for (const k of anatomyTokens(anatomy, def).keys()) {
      if (!baseOnly.has(k)) fail(`theme ${themeName}: ${def} overrides ${k}, which the anatomy's base does not set, so ${ap} cannot restore it`);
      restore.set(k, baseOnly.get(k));
    }
    blocks.push(cssBlock(src.names, [`${sel}[data-appearance="${ap}"]`],
      new Map([...restore, ...anatomyTokens(anatomy, ap), ...brandTokens(brand, ap)])));
  }
  return blocks.join("\n");
}

/** Preview surface: one shared design system's blocks, selected by data-design-system. */
export function designSystemCss(src, dsName) {
  const ds = src.designSystems.get(dsName);
  const blocks = [cssBlock(src.names, [`[data-design-system="${dsName}"]`], anatomyTokens(ds))];
  for (const ap of APPEARANCES) {
    if (ds.appearances?.[ap]) blocks.push(cssBlock(src.names, [`[data-design-system="${dsName}"][data-appearance="${ap}"]`], anatomyTokens(ds, ap)));
  }
  return blocks.join("\n");
}

/** Preview surface: one brand's blocks, selected by data-brand and data-appearance. */
export function brandCss(src, brandName) {
  const brand = src.brands.get(brandName);
  const blocks = APPEARANCES.filter((ap) => brand.appearances[ap])
    .map((ap) => cssBlock(src.names, [`[data-brand="${brandName}"][data-appearance="${ap}"]`], brandTokens(brand, ap)));
  const fonts = brandFontTokens(brand);
  if (fonts.size) blocks.push(cssBlock(src.names, [`[data-brand="${brandName}"][data-design-system]`], fonts));
  return blocks.join("\n");
}

/* -------------------------------------------------------------- resolved */

/** Every preview pair: brand × shared design system × the brand's appearances. */
export function combinations(src) {
  const out = [];
  for (const [b, brand] of src.brands) for (const s of src.designSystems.keys()) {
    for (const ap of APPEARANCES) if (brand.appearances[ap]) out.push({ brand: b, designSystem: s, appearance: ap });
  }
  return out;
}

// Keyed by CSS name without the dashes: every role name, then every 0.x alias.
function keyed(src, values) {
  const out = Object.fromEntries([...values].map(([p, v]) => [cssName(src.names, p), v]));
  for (const [p, v] of values) { const a = aliasName(src.names, p); if (a) out[a] = v; }
  return out;
}

/** Resolved values for one theme and appearance, as resolved/<theme>.<appearance>.json carries them. */
export function resolvedJson(src, themeName, appearance) {
  return keyed(src, resolveAll(compose(src, themeName, appearance), `${themeName} (${appearance})`));
}

/** Resolved values for one preview pair. */
export function resolvedPairJson(src, brand, ds, appearance) {
  return keyed(src, resolveAll(composePair(src, brand, ds, appearance), `${brand} × ${ds} (${appearance})`));
}
