import { ThemeProvider } from "@ux-builder/ui";
import { Specimen } from "./preview/Preview.jsx";

/* "Your themes" (US-020): every theme in the repository, each a link to its
   own page (themepage/ThemePage.jsx, ?theme=<name>). ThemePreview is that
   page's brand section: for each appearance its logo on its own ground,
   its mark and favicon, its palette, and the SDK's widgets in its anatomy.
   The theme is composed on the server from tokens/ (GET /api/theme), so a
   theme saved since the builder started has a page too. */

export function Themes({ themes }) {
  return (
    <div className="tb-panel tb-themes">
      <div className="tb-themes__list">
        <b>Themes in this repository</b>
        <ul className="tb-files" aria-label="Themes">
          {themes.map((t) => (
            <li key={t.name}>
              <a className="tb-link tb-themes__pick" href={`?theme=${encodeURIComponent(t.name)}`}><code>{t.name}</code></a>
              <span className="tb-hint">{t.designSystem ?? "own anatomy"}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="tb-hint">Each page is linked by its name: <code>?theme=praxis-carbon</code>, say. Its widgets and patterns render from the SDK's Storybook stories, each with a link to that story in Storybook.</p>
    </div>
  );
}

export function ThemePreview({ theme }) {
  const aps = ["light", "dark"].filter((ap) => theme.appearances[ap]);
  return (
    <section className="tb-themes__theme" aria-label={`Preview of ${theme.name}`}>
      <div>
        <h2 className="tb-themes__title">{theme.title}</h2>
        <p className="tb-hint">
          <code>{theme.name}</code> · brand <b>{theme.brand.title}</b>{theme.brand.generated ? " (made in the theme builder)" : ""} · {theme.designSystem ? <>design system <b>{theme.designSystem.title}</b></> : "its own anatomy"} · {theme.iconSet} icons{theme.default ? ` · ${theme.default} by default` : ""}
        </p>
      </div>
      <div className={`tb-pair${aps.length === 1 ? " tb-pair--single" : ""}`}>
        {aps.map((ap) => <Appearance key={ap} theme={theme} ap={ap} />)}
      </div>
    </section>
  );
}

export function Appearance({ theme, ap }) {
  const a = theme.appearances[ap];
  return (
    <ThemeProvider tokens={a.tokens} appearance={ap} className="tb-preview" data-theme-preview={`${theme.name}:${ap}`}>
      <div className="tb-preview__head"><b>{theme.brand.title}</b><span>{ap}</span></div>

      <span className="tb-eyebrow">Logo</span>
      <div className="tb-themes__logo">
        {a.logo
          ? <img src={a.logo} alt={`${theme.brand.title} logo, ${ap}`} />
          : <span className="tb-themes__wordmark" style={{ color: a.logoPaint ?? undefined }} title="No logo artwork: apps show the brand's title">{theme.brand.title}</span>}
      </div>

      <div className="tb-row">
        <div className="tb-themes__art">
          <span className="tb-eyebrow">Mark</span>
          {a.mark ? <img className="tb-themes__mark" src={a.mark} alt={`${theme.brand.title} mark, ${ap}`} /> : <span className="tb-hint">None</span>}
        </div>
        <div className="tb-themes__art">
          <span className="tb-eyebrow">Favicon</span>
          {a.favicon
            ? <span className="tb-themes__tab"><img src={a.favicon} alt={`${theme.brand.title} favicon, ${ap}`} width="16" height="16" /><span>{theme.title}</span></span>
            : <span className="tb-hint">None: the app's own</span>}
        </div>
      </div>

      <span className="tb-eyebrow">Palette</span>
      <ul className="tb-themes__palette" aria-label={`${theme.name} ${ap} palette`}>
        {a.palette.map((c) => (
          <li key={`${c.group}.${c.role}`} title={`${c.group}.${c.role} ${c.hex}`}>
            <span className="tb-swatch" style={{ background: c.hex }} />
            <span className="tb-themes__role">{c.role}</span>
            <code>{c.hex}</code>
          </li>
        ))}
      </ul>

      <span className="tb-eyebrow">On {theme.designSystem?.title ?? "its own anatomy"}</span>
      <Specimen set={theme.iconSet} />
    </ThemeProvider>
  );
}

