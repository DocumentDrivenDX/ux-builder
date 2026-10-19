import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { brands as MANIFEST_BRANDS, themes as MANIFEST_THEMES } from "@ux-builder/tokens/manifest.json";
import { ThemeContext } from "../ThemeProvider.jsx";

/* The active theme's logo (FEAT-004 SDK-15, US-010-AC8 to AC10).

     <Logo />                 the brand's logo, at the brand's height
     <Logo variant="mark" />  the brand's mark, where space is tight
     <Logo size="sm" />       the brand's compact height

   It draws the brand's artwork from the theme's brand tokens
   (--piq-brand-logo-image, or --piq-brand-logo-mask painted in
   --piq-brand-logo-paint), so it changes with the theme and the
   appearance and the app names no file. A brand without artwork gets its
   title as a wordmark (the mark: its initial) in --piq-brand-logo-paint, so
   a theme switch always shows. Either way it is one image named by the
   brand's title, or by label.

   Brand tokens belong to the top-level app (CONTRACT-001, ADR-011): inside
   a ThemeProvider given tokens, an embedded view, it draws nothing. */

const THEMES = new Map(MANIFEST_THEMES.map((t) => [t.name, t]));
const BRANDS = new Map(MANIFEST_BRANDS.map((b) => [b.name, b]));
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

let dev = true;
try { dev = process.env.NODE_ENV !== "production"; } catch { /* no bundler */ }
const warn = (msg) => { if (dev) console.warn(`@ux-builder/ui Logo: ${msg}`); };

const isSet = (v) => Boolean(v) && v !== "none" && v !== "initial";

/* The brand title for a theme, from the themes this package was built with. */
export function brandTitleFor(theme) {
  const t = THEMES.get(theme);
  return t ? BRANDS.get(t.brand)?.title ?? t.title : null;
}

/* The active theme's logo, or its mark (variant="mark"), drawn from the brand's artwork; a brand without artwork gets its title as a wordmark in the logo colour. */
export function Logo({ variant = "logo", size = "md", label, className = "", ...rest }) {
  const context = useContext(ThemeContext);
  const ref = useRef(null);
  const [pageTheme, setPageTheme] = useState(null);
  const [artwork, setArtwork] = useState(true);
  const embedded = Boolean(context) && context.theme === null;
  const kind = variant === "mark" ? "mark" : "logo";

  // Before paint: does the brand have artwork here, and which theme is on?
  useBeforePaint(() => {
    if (embedded || !ref.current) return;
    const css = getComputedStyle(ref.current);
    setArtwork(isSet(css.getPropertyValue(`--piq-brand-${kind}-image`).trim()) || isSet(css.getPropertyValue(`--piq-brand-${kind}-mask`).trim()));
    if (!context?.theme) setPageTheme(ref.current.closest?.("[data-theme]")?.getAttribute("data-theme") ?? null);
  });

  const theme = context?.theme ?? pageTheme;
  const name = label ?? brandTitleFor(theme) ?? "";
  useEffect(() => {
    if (embedded) warn("an embedded view must not draw the brand (CONTRACT-001); nothing drawn");
    else if (!name && theme) warn(`no brand title for theme "${theme}"; pass label`);
  }, [embedded, name, theme]);
  if (embedded) return null;

  const classes = ["piq-logo", `piq-logo--${kind}`, size === "sm" && "piq-logo--sm", !artwork && "piq-logo--text", className].filter(Boolean).join(" ");
  const text = !artwork && name ? (kind === "mark" ? name.trim()[0] : name) : null;
  return (
    <span ref={ref} role="img" aria-label={name || undefined} className={classes} data-logo={artwork ? "artwork" : "text"} {...rest}>
      {text && <span className="piq-logo__text" aria-hidden="true">{text}</span>}
    </span>
  );
}
