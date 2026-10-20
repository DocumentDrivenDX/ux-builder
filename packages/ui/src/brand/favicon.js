import { useEffect } from "react";

/* The active theme's favicon (FEAT-004 SDK-16, US-010-AC11, AC12).

   A browser takes its icon from <link rel="icon"> in the head, never from
   CSS, so the theme's --piq-brand-favicon has to be copied there. The SDK
   keeps one link of its own (data-piq-favicon), last in the head so it wins
   over the app's: its href is the favicon of the theme on the element it
   reads. A theme without a favicon removes that link, and the app's own icon
   shows again. The token is registered as a URL (@ux-builder/tokens), so the
   value read here is already absolute, or a data: URI where the app's
   bundler inlined a small mark: quoted, and holding quotes and brackets of
   its own, so it is read to its closing quote.

   The top-level ThemeProvider does this itself. <Favicon /> does it for a
   page that selects its theme with data-theme on <html> instead. */

const ATTR = "data-piq-favicon";
const TYPES = { svg: "image/svg+xml", png: "image/png", webp: "image/webp", ico: "image/x-icon" };
// url("…"), url('…') or url(…), with CSS escapes inside the quotes.
const URL_TOKEN = /url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\s"'()]+))\s*\)/;

/* The favicon URL the theme on an element sets, or null. */
export function faviconOf(element) {
  if (typeof window === "undefined" || !element) return null;
  const value = getComputedStyle(element).getPropertyValue("--piq-brand-favicon").trim();
  const m = URL_TOKEN.exec(value);
  return m ? (m[1] ?? m[2] ?? m[3]).replace(/\\(.)/g, "$1") : null;
}

/* Sets the page's icon to the favicon of the theme on element (default: <html>); removes the SDK's icon when that theme has none. Returns the URL used, or null. */
export function applyFavicon(element = typeof document === "undefined" ? null : document.documentElement) {
  if (typeof document === "undefined" || !element) return null;
  const href = faviconOf(element);
  let link = document.head.querySelector(`link[${ATTR}]`);
  if (!href) { link?.remove(); return null; }
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.setAttribute(ATTR, "");
  }
  const type = /^data:([^;,]+)/.exec(href)?.[1] ?? TYPES[/\.(\w+)(?:[?#].*)?$/.exec(href)?.[1]?.toLowerCase()];
  if (type) link.type = type; else link.removeAttribute("type");
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  document.head.appendChild(link); // last, so it is the icon browsers use
  return href;
}

/* Removes the SDK's icon, leaving the app's own. */
export function removeFavicon() {
  if (typeof document !== "undefined") document.head.querySelector(`link[${ATTR}]`)?.remove();
}

/* Keeps the page's icon on the theme's favicon, for a page that sets data-theme and data-appearance on <html> without a ThemeProvider; renders nothing. */
export function Favicon() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => applyFavicon(root);
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-appearance"] });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener("change", update);
    return () => { observer.disconnect(); mq?.removeEventListener("change", update); removeFavicon(); };
  }, []);
  return null;
}
