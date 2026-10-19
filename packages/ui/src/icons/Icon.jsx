import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { themes as MANIFEST_THEMES } from "@ux-builder/tokens/manifest.json";
import { ThemeContext } from "../ThemeProvider.jsx";
import { GLYPHS, SETS } from "./glyphs.generated.js";

/* One icon component for every theme (FEAT-004 SDK-03, US-010).

     <Icon name="warning" />            decorative: hidden from assistive tech
     <Icon name="search" label="Search" />   meaningful: role="img" with a name

   The glyph comes from the active theme's design system: Material Symbols
   on Material, Fluent System Icons on Fluent, Carbon icons on Carbon, and
   Lucide on every theme without a set of its own. The set is, in order:
   the set prop; the page's --piq-icon-set, which each shared design system
   sets (so a theme newer than this package still gets its icons); the
   nearest ThemeProvider's theme or the closest data-theme, looked up in the
   themes this package was built with; else Lucide. A name a set lacks is
   drawn from Lucide. The icon takes the text colour and is 1em
   unless size says otherwise.

   Beyond the shared names, @ux-builder/ui/icons has every Lucide icon by its
   Lucide name, each with the matching Material, Fluent and Carbon glyph
   where there is one (US-010-AC13). Import the ones an app uses, so its
   bundle carries only those, and pass one, or register them once:

     import { iconPin, iconPlay } from "@ux-builder/ui/icons";
     <Icon icon={iconPin} label="Pin" />
     registerIcons(iconPin, iconPlay);   // then <Icon name="pin" /> anywhere

   registerIcons also takes an app's own icon, { name, glyphs: { lucide:
   { viewBox, body } } } (or per set), drawn the same way (US-010-AC14). */

const THEMES = new Map(MANIFEST_THEMES.map((t) => [t.name, t]));
const OWN_SETS = new Set(["material", "fluent", "carbon"]);
/* The shared names Icon accepts. */
export const ICON_NAMES = Object.keys(GLYPHS.lucide).sort();

let dev = true;
try { dev = process.env.NODE_ENV !== "production"; } catch { /* no bundler */ }

/* The icon set a theme draws with. */
export function iconSetFor(theme) {
  const ds = THEMES.get(theme)?.designSystem;
  return OWN_SETS.has(ds) ? ds : "lucide";
}

/* The glyph for a name in a set, falling back to Lucide: [glyph, set used]. */
export function pickGlyph(name, set, glyphs = GLYPHS) {
  if (glyphs[set]?.[name]) return [glyphs[set][name], set];
  if (glyphs.lucide?.[name]) return [glyphs.lucide[name], "lucide"];
  return [null, null];
}

/* Icons registered by name: from @ux-builder/ui/icons, or an app's own. */
const REGISTRY = new Map();
const UNSAFE = /<script|\son\w+\s*=|\shref\s*=|<foreignObject/i;
const fromDef = (def, set) => {
  const g = def.glyphs;
  if (g[set]) return [g[set], set];
  if (g.lucide) return [g.lucide, "lucide"];
  const first = Object.keys(SETS).find((k) => g[k]);
  return first ? [g[first], first] : [null, null];
};

/* Makes icons usable by name (<Icon name="pin" />): icons from @ux-builder/ui/icons, or an app's own { name, glyphs }. Returns the names registered. */
export function registerIcons(...icons) {
  const names = [];
  for (const def of icons.flat()) {
    const known = def && typeof def.name === "string" && def.glyphs && Object.keys(def.glyphs).length > 0 && Object.keys(def.glyphs).every((k) => SETS[k]);
    if (!known) throw new Error(`@ux-builder/ui registerIcons: an icon is { name, glyphs: { ${Object.keys(SETS).join(" | ")}: { viewBox, body } } }`);
    for (const [set, g] of Object.entries(def.glyphs)) {
      if (typeof g?.viewBox !== "string" || typeof g?.body !== "string" || UNSAFE.test(g.body)) throw new Error(`@ux-builder/ui registerIcons: ${def.name} (${set}) needs a viewBox and markup without scripts, handlers or links`);
    }
    REGISTRY.set(def.name, def);
    names.push(def.name);
  }
  return names;
}

const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const SVG_PROPS = Object.fromEntries(Object.entries(SETS).map(([k, s]) => [k, Object.fromEntries(Object.entries(s.svg).map(([a, v]) => [camel(a), v]))]));
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* An icon by shared name (ICON_NAMES) or registered name, or an icon from @ux-builder/ui/icons passed as icon, drawn in the theme's icon set, the text colour and 1em; decorative unless label names it. */
export function Icon({ name, icon, set, size = "1em", label, className = "", ...rest }) {
  const context = useContext(ThemeContext);
  const ref = useRef(null);
  const [pageTheme, setPageTheme] = useState(null);
  const [tokenSet, setTokenSet] = useState(null);

  // Before paint: the theme's own --piq-icon-set, and the closest data-theme.
  useBeforePaint(() => {
    if (set || !ref.current) return;
    const fromToken = getComputedStyle(ref.current).getPropertyValue("--piq-icon-set").trim().replace(/^["']|["']$/g, "");
    setTokenSet(GLYPHS[fromToken] ? fromToken : null);
    if (!context?.theme) setPageTheme(ref.current.closest?.("[data-theme]")?.getAttribute("data-theme") ?? null);
  });

  const active = set ?? tokenSet ?? iconSetFor(context?.theme ?? pageTheme);
  const def = icon ?? (GLYPHS.lucide[name] ? null : REGISTRY.get(name));
  const [glyph, used] = def ? fromDef(def, active) : pickGlyph(name, active);
  if (!glyph) {
    if (dev) console.warn(`@ux-builder/ui Icon: no icon "${name}". Shared names: ${ICON_NAMES.join(", ")}. Every Lucide icon is in @ux-builder/ui/icons: import it (e.g. import { iconPin } from "@ux-builder/ui/icons") and pass icon={iconPin}, or registerIcons(iconPin) once.`);
    return null;
  }
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": "true", focusable: "false" };
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={glyph.viewBox}
      width={size}
      height={size}
      className={`piq-icon${className ? ` ${className}` : ""}`}
      data-icon={def?.name ?? name}
      data-icon-set={used}
      {...SVG_PROPS[used]}
      {...a11y}
      {...rest}
      // Glyphs are extracted at build time from the pinned icon packages and
      // checked for scripts, handlers and links (scripts/gen-icons.mjs); an
      // app's own are checked the same way when registered.
      dangerouslySetInnerHTML={{ __html: glyph.body }}
    />
  );
}
