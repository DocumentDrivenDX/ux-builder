/* <Visual doc={…} />: a umf.visual document drawn inside a React app (FEAT-019 WGT-01, WGT-02;
   US-168). It is the sanctioned way for an app to draw a diagram or chart: the lint's
   no-inline-svg rule has nothing to report (the app writes no <svg>), and the audit trusts the
   drawing as the SDK's.

   The theme is the page's: the widget reads the --piq-* values around it, so it needs no theme
   name and works under any ThemeProvider. It draws once per document with appearance "both", so
   every colour is a var(--piq-…) and follows a later switch of theme or appearance without being
   drawn again. Screen readers get one image named by the title and described by the takeaway,
   and the text equivalent sits in a disclosure under it. Written without JSX, so the package
   needs no build. */

import { createElement as h, useEffect, useRef, useState } from "react";
import manifest from "@ux-builder/tokens/manifest.json" with { type: "json" };
import { render } from "../index.mjs";

const NAMES = manifest.tokens.filter((n) => n.startsWith("piq-"));

/** The --piq-* values in force at an element, as a resolved theme for render(). */
export function themeAt(el) {
  const cs = getComputedStyle(el), tokens = {};
  for (const n of NAMES) { const v = cs.getPropertyValue(`--${n}`).trim(); if (v) tokens[n] = v; }
  const holder = el.closest("[data-theme]");
  return { theme: holder?.getAttribute("data-theme") ?? "page", appearance: el.closest("[data-appearance]")?.getAttribute("data-appearance") ?? "light", tokens };
}

/**
 * @param {{ doc: object, textLabel?: string, onRender?: (result: object) => void, className?: string }} props
 */
export function Visual({ doc, textLabel = "Text version", onRender, className }) {
  const ref = useRef(null);
  const [out, setOut] = useState({ svg: "", text: "", error: null });
  useEffect(() => {
    let live = true;
    const el = ref.current;
    const theme = themeAt(el);
    render(doc, { theme: { light: theme, dark: theme }, appearance: "both", width: el.clientWidth || undefined })
      .then((r) => { if (!live) return; setOut({ svg: r.content, text: r.text, error: null }); onRender?.(r); })
      .catch((e) => live && setOut({ svg: "", text: "", error: `${e.code ?? "VISUAL_ERROR"}: ${e.message}` }));
    return () => { live = false; };
    // Drawn once per document: a theme or appearance switch restyles it through its CSS variables.
  }, [doc]);
  const cls = ["piq-visual", className].filter(Boolean).join(" ");
  // A visual wider than its column scrolls inside its own frame, never the page (visuals PRD §8).
  return h("figure", { ref, className: cls, style: { margin: 0, overflowX: "auto" }, "data-visual": doc?.extensions?.["umf.visual"]?.id },
    out.error
      ? h("p", { className: "piq-visual__error", role: "alert" }, `This visual cannot be drawn. ${out.error}`)
      : h("div", { className: "piq-visual__drawing", dangerouslySetInnerHTML: { __html: out.svg } }),
    out.text ? h("details", { className: "piq-visual__text" }, h("summary", { className: "piq-visual__summary" }, textLabel), h("pre", { className: "piq-visual__table" }, out.text)) : null);
}
