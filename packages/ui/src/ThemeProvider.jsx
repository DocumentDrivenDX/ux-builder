import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { themes as MANIFEST_THEMES, tokens as TOKEN_NAMES } from "@ux-builder/tokens/manifest.json";
import { applyFavicon, removeFavicon } from "./brand/favicon.js";

/* The theme an app selects (ADR-018, CONTRACT-003), set on one element for
   its subtree (US-011).

     <ThemeProvider theme="databricks" appearance="system">…</ThemeProvider>

   The provider's element carries data-theme and data-appearance, so the
   theme CSS (@ux-builder/tokens/themes/<theme>.css) applies to everything
   inside it. appearance may be "light", "dark" or "system"; "system" is
   resolved from the user's preference before any component sees it, and
   followed when the preference changes. useTheme() reads the active theme
   and switches it at run time; the nearest provider wins.

   For an embedded view (ADR-011), pass tokens (a theme's resolved values,
   as in @ux-builder/tokens/resolved/<theme>.<appearance>.json) instead: they
   are set as custom properties on the element and no stylesheet is needed.

   The top-level provider also keeps the page's icon on the theme's favicon
   (--piq-brand-favicon), as it changes with theme and appearance; a theme
   without one leaves the app's own icon. favicon={false} turns this off. An
   embedded view, or a provider inside another, never touches it.

   The top-level provider also answers a "piq:set-theme" window event
   ({ detail: { theme, appearance } }), so a tool such as @ux-builder/audit can
   switch the app through every theme as a user would. */

// Exported for the package's own components (Icon); apps use useTheme().
export const ThemeContext = createContext(null);
const THEMES = new Map(MANIFEST_THEMES.map((t) => [t.name, t]));
const QUERY = "(prefers-color-scheme: dark)";
/* The window event that asks the top-level provider to switch theme or appearance. */
const SET_THEME = "piq:set-theme";
// Written so bundlers replace process.env.NODE_ENV; without one, warnings stay on.
let dev = true;
try { dev = process.env.NODE_ENV !== "production"; } catch { /* no bundler */ }
const warn = (msg) => { if (dev) console.warn(`@ux-builder/ui ThemeProvider: ${msg}`); };

function systemAppearance() {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia(QUERY).matches ? "dark" : "light";
}

/* The appearance a theme will actually show: the one asked for if the theme
   has it, else the theme's own default. */
export function resolveAppearance(theme, preference, system = systemAppearance()) {
  const wanted = preference === "system" ? system : preference;
  const known = THEMES.get(theme);
  if (!known) return wanted ?? null;
  if (wanted && known.appearances.includes(wanted)) return wanted;
  return known.default;
}

// useLayoutEffect warns during server rendering; there it does nothing anyway.
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* An embedded view's own values, and every other token any theme sets reset
   to initial, so nothing the page's theme sets (a component's background,
   say, computed there in the page's appearance) reaches the view; the
   widgets fall back to the view's own role tokens. */
const asVariables = (tokens) => ({
  ...Object.fromEntries(TOKEN_NAMES.map((k) => [`--${k}`, "initial"])),
  ...Object.fromEntries(Object.entries(tokens).filter(([, v]) => !String(v).startsWith("url(")).map(([k, v]) => [`--${k}`, v])),
});

/* Sets the theme and appearance (light, dark or system) for its subtree, and the page's favicon from the theme; pass tokens instead of theme for an embedded view. */
export function ThemeProvider({ theme: themeProp, appearance: appearanceProp = "system", tokens, favicon = true, onChange, as: Tag = "div", style, children, ...rest }) {
  const parent = useContext(ThemeContext);
  const ref = useRef(null);
  const [theme, setThemeState] = useState(themeProp);
  const [preference, setPreference] = useState(appearanceProp);
  const [system, setSystem] = useState(systemAppearance);

  // Props are the starting point and stay in charge: a new prop value wins.
  useEffect(() => setThemeState(themeProp), [themeProp]);
  useEffect(() => setPreference(appearanceProp), [appearanceProp]);

  // Follow the user's preference while it is the one asked for.
  useBeforePaint(() => {
    if (preference !== "system" || typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(QUERY);
    const update = () => setSystem(mq.matches ? "dark" : "light");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [preference]);

  const appearance = tokens ? (preference === "system" ? system ?? "light" : preference) : resolveAppearance(theme, preference, system);

  useEffect(() => {
    if (tokens) return;
    if (theme && !THEMES.has(theme)) warn(`unknown theme "${theme}"; known: ${[...THEMES.keys()].join(", ")}`);
    else if (theme && preference !== "system" && appearance !== preference) warn(`theme "${theme}" has no ${preference} appearance; using ${appearance}`);
  }, [theme, preference, appearance, tokens]);

  // The page's icon: only the top-level provider of an app (not an embedded view) sets it.
  const ownsFavicon = favicon && !tokens && !parent;
  useBeforePaint(() => { if (ownsFavicon) applyFavicon(ref.current); }, [ownsFavicon, theme, appearance]);
  useEffect(() => (ownsFavicon ? removeFavicon : undefined), [ownsFavicon]);

  const setTheme = useCallback((t) => { setThemeState(t); onChange?.({ theme: t, appearance: preference }); }, [onChange, preference]);
  const setAppearance = useCallback((a) => { setPreference(a); onChange?.({ theme, appearance: a }); }, [onChange, theme]);

  // A tool outside the app (@ux-builder/audit, a test) asks the top-level
  // provider to switch, as a user would: window.dispatchEvent(new
  // CustomEvent("piq:set-theme", { detail: { theme, appearance } })).
  const ownsPage = !tokens && !parent;
  useEffect(() => {
    if (!ownsPage || typeof window === "undefined") return undefined;
    const onRequest = (e) => {
      const { theme: t, appearance: a } = e.detail ?? {};
      if (t) setThemeState(t);
      if (a) setPreference(a);
      if (t || a) onChange?.({ theme: t ?? theme, appearance: a ?? preference });
    };
    window.addEventListener(SET_THEME, onRequest);
    return () => window.removeEventListener(SET_THEME, onRequest);
  }, [ownsPage, onChange, theme, preference]);

  const value = useMemo(() => ({
    theme: tokens ? null : theme,
    appearance,
    preference,
    themes: MANIFEST_THEMES,
    setTheme,
    setAppearance,
  }), [theme, appearance, preference, tokens, setTheme, setAppearance]);

  const attrs = tokens
    ? { style: { ...asVariables(tokens), colorScheme: appearance ?? undefined, ...style } }
    : { "data-theme": theme, ...(appearance && { "data-appearance": appearance }), style: { colorScheme: appearance ?? undefined, ...style } };

  return (
    <ThemeContext.Provider value={value}>
      <Tag ref={ref} {...rest} {...attrs}>{children}</Tag>
    </ThemeContext.Provider>
  );
}

/* The nearest provider's theme: { theme, appearance, preference, themes,
   setTheme, setAppearance }. appearance is always "light" or "dark". */
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme() needs a <ThemeProvider> above it");
  return value;
}
