import { AppearanceSwitch, Button, Icon, TextField, ThemeProvider } from "@ux-builder/ui";
import { useEffect, useState } from "react";
import { getContext } from "../api.js";
import brandmark from "../assets/logo.svg?raw";
import { THEME } from "../theme.js";

/* The theme pages' index in the static build for GitHub Pages, in place of
   the builder, which needs the local server (ADR-019). It links only public
   themes ("public": true in the theme file); any other theme's page opens by
   its name, typed here or in the URL (?theme=<name>). It wears the builder's
   theme. */

const PREF = "theme-builder-appearance";
const APPEARANCES = ["system", "light", "dark"];
const saved = () => { try { const v = localStorage.getItem(PREF); return APPEARANCES.includes(v) ? v : "system"; } catch { return "system"; } };

export function ThemeIndex() {
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(null);
  const [appearance, setAppearance] = useState(saved);
  const [name, setName] = useState("");
  useEffect(() => { getContext().then(setCtx, (e) => setError(e.message)); }, []);
  useEffect(() => { document.title = "Themes · UX Builder"; }, []);
  const choose = (v) => { setAppearance(v); try { localStorage.setItem(PREF, v); } catch { /* not remembered */ } };
  const open = (e) => {
    e.preventDefault();
    const n = name.trim().toLowerCase();
    if (n) location.search = `?theme=${encodeURIComponent(n)}`;
  };
  return (
    <ThemeProvider theme={THEME} appearance={appearance} className="tb">
      <header className="tb-hdr"><div className="tb-wrap tb-row tb-spread">
        <a className="tb-brandmark" href="../" aria-label="UX Builder home" dangerouslySetInnerHTML={{ __html: brandmark }} />
        <div className="tb-row tb-hdr__tools">
          <AppearanceSwitch value={appearance} onChange={choose} />
          <nav aria-label="More" className="tb-row">
            <a className="tb-link" href="../">Home</a>
            <a className="tb-link" href="../storybook/" target="_blank" rel="noreferrer">Storybook<Icon name="external-link" /></a>
          </nav>
        </div>
      </div></header>
      <main className="tb-wrap tb-main">
        <div className="tb-col"><h1>Themes</h1><p className="tb-lede">Each theme has its own page: its logos and palette, its CSS in light, dark and auto, and every widget, AI component and screen pattern wearing it.</p></div>

        <section className="tb-col" aria-labelledby="public-h">
          <h2 id="public-h">Public themes</h2>
          {error ? <p role="alert">{error}</p> : !ctx ? <p>Loading…</p> : (
            <ul className="ti-list" aria-label="Public themes">
              {ctx.themes.map((t) => (
                <li key={t.name}>
                  <a className="tb-panel ti-card" href={`?theme=${encodeURIComponent(t.name)}`}>
                    <b>{t.title}</b>
                    <code>{t.name}</code>
                    <span className="tb-hint">{t.designSystem ? `On the ${t.designSystem} design system` : "Its own anatomy"}</span>
                    <span className="ti-card__go">Open its page<Icon name="arrow-right" /></span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tb-panel tb-col" aria-labelledby="open-h">
          <h2 id="open-h">Your theme</h2>
          <p className="tb-lede">Other themes aren't listed here. Enter your theme's name to open its page, or add it to the address: <code>themes/?theme=your-theme-name</code>.</p>
          <form className="ti-open" onSubmit={open}>
            <TextField label="Theme name" placeholder="your-theme-name" value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            <Button type="submit" disabled={!name.trim()}>Open theme</Button>
          </form>
        </section>
      </main>
    </ThemeProvider>
  );
}
