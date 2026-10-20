import { AppearanceSwitch, Icon, ThemeProvider } from "@ux-builder/ui";
import { useEffect, useState } from "react";
import { getContext } from "../api.js";
import brandmark from "../assets/logo.svg?raw";
import { THEME } from "../theme.js";
import { Themes } from "../Themes.jsx";

/* The theme pages' index in the static build for GitHub Pages: every theme,
   each a link to its own page (?theme=<name>), in place of the builder,
   which needs the local server (ADR-019). It wears the builder's theme. */

const PREF = "theme-builder-appearance";
const APPEARANCES = ["system", "light", "dark"];
const saved = () => { try { const v = localStorage.getItem(PREF); return APPEARANCES.includes(v) ? v : "system"; } catch { return "system"; } };

export function ThemeIndex() {
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(null);
  const [appearance, setAppearance] = useState(saved);
  useEffect(() => { getContext().then(setCtx, (e) => setError(e.message)); }, []);
  useEffect(() => { document.title = "Themes · UX Builder"; }, []);
  const choose = (v) => { setAppearance(v); try { localStorage.setItem(PREF, v); } catch { /* not remembered */ } };
  return (
    <ThemeProvider theme={THEME} appearance={appearance} className="tb">
      <header className="tb-hdr"><div className="tb-wrap tb-row tb-spread">
        <a className="tb-brandmark" href="../" aria-label="UX Builder home" dangerouslySetInnerHTML={{ __html: brandmark }} />
        <div className="tb-row tb-hdr__tools">
          <AppearanceSwitch value={appearance} onChange={choose} />
          <nav aria-label="More" className="tb-row">
            <a className="tb-link" href="../gallery.html">Gallery</a>
            <a className="tb-link" href="../storybook/" target="_blank" rel="noreferrer">Storybook<Icon name="external-link" /></a>
          </nav>
        </div>
      </div></header>
      <main className="tb-wrap tb-main">
        <section className="tb-col tb-gap" aria-labelledby="themes-h">
          <div className="tb-col"><h1 id="themes-h">Themes</h1><p className="tb-lede">Every theme in the SDK. Open one for its own page: its logos and palette, its CSS in light, dark and auto, and every widget, AI component and screen pattern in it.</p></div>
          {error ? <p role="alert">{error}</p> : ctx ? <Themes themes={ctx.themes} /> : <p>Loading…</p>}
        </section>
      </main>
    </ThemeProvider>
  );
}
