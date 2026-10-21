import { AppearanceSwitch, Button, Icon, ThemeProvider } from "@ux-builder/ui";
import catalogue from "@ux-builder/ui/catalogue.json";
import { Component, createElement, useEffect, useMemo, useRef, useState } from "react";
import { SURFACES } from "../../../../packages/tokens/bridges.mjs";
import aiComponents from "../../../../packages/ui/ai/vendor/components.json";
import { getTheme } from "../api.js";
import { ThemePreview } from "../Themes.jsx";
import { indexStories, storybookUrl } from "./stories.js";

/* A theme's own page (?theme=<name>): the page wears the theme, in light,
   dark or the system's setting, and shows its brand (logos, mark, favicon,
   palette), its CSS for each appearance and for auto, and every widget and
   screen pattern in the SDK, each rendered from its own Storybook story
   with a link to that story in Storybook, in this theme. A menu on the left
   reaches every part; on a phone it sits above the content. */

// The SDK's stories, as Storybook has them: the samples and their ids.
const MODULES = import.meta.glob("../../../../packages/ui/src/**/*.stories.jsx", { eager: true });
const SOURCES = import.meta.glob("../../../../packages/ui/src/**/*.stories.jsx", { eager: true, query: "?raw", import: "default" });
const INDEX = indexStories(Object.keys(MODULES).map((path) => ({ path, source: SOURCES[path], module: MODULES[path] })));
// The AI Components (ADR-023): AI Elements and assistant-ui, copied in for previews, each in its own story.
const AI_MODULES = import.meta.glob(["../../../../packages/ui/ai/stories/*.stories.jsx", "!**/All.stories.jsx"], { eager: true });
const AI_SOURCES = import.meta.glob(["../../../../packages/ui/ai/stories/*.stories.jsx", "!**/All.stories.jsx"], { eager: true, query: "?raw", import: "default" });
const AI_INDEX = indexStories(Object.keys(AI_MODULES).map((path) => ({ path, source: AI_SOURCES[path], module: AI_MODULES[path] })));
const AI = aiComponents.components.map((c) => ({ ...c, story: AI_INDEX.stories.find((s) => s.title === `AI Components/${c.library}/${c.name}`) }));

const byName = (a, b) => a.name.localeCompare(b.name);
const WIDGETS = catalogue.widgets.filter((w) => w.type === "component").sort(byName);
const PATTERNS = catalogue.patterns.filter((p) => p.type === "component").sort(byName);
// The SDK's own assistant (ADR-023 rule 4; FEAT-007 BLD-01): the conversation first, then its parts.
const first = (name) => (a, b) => Number(b.name === name) - Number(a.name === name) || byName(a, b);
const ASSISTANT = (catalogue.assistant ?? []).filter((p) => p.type === "component").sort(first("Conversation"));
const PREF = "theme-page-appearance";
const slug = (kind, name) => `${kind}-${name}`;

function systemDark() { return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches; }
function useSystemDark() {
  const [dark, setDark] = useState(systemDark);
  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const m = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setDark(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return dark;
}

export function ThemePage({ name }) {
  const [theme, setTheme] = useState(null);
  const [error, setError] = useState(null);
  const [pref, setPref] = useState(() => { try { return localStorage.getItem(PREF) ?? "system"; } catch { return "system"; } });
  const dark = useSystemDark();
  useEffect(() => { getTheme(name).then(setTheme, (e) => setError(e.message)); }, [name]);

  const aps = theme ? ["light", "dark"].filter((ap) => theme.appearances[ap]) : [];
  const wanted = pref === "system" ? (dark ? "dark" : "light") : pref;
  const appearance = aps.includes(wanted) ? wanted : theme?.default ?? aps[0];
  const a = theme?.appearances[appearance];
  const choose = (v) => { setPref(v); try { localStorage.setItem(PREF, v); } catch { /* not remembered */ } };

  useEffect(() => { document.title = theme ? `${theme.title} · Theme` : "Theme"; }, [theme]);
  // The tab wears the theme's favicon, as an app in it would.
  useEffect(() => {
    if (!a?.favicon) return undefined;
    const link = Object.assign(document.createElement("link"), { rel: "icon", href: a.favicon });
    link.dataset.themePage = "";
    document.head.appendChild(link);
    return () => link.remove();
  }, [a?.favicon]);
  // Once the page has its sections, go to the one the URL names.
  useEffect(() => { if (theme && location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); }, [theme]);

  if (error) return <main className="tp-missing"><h1>No theme here</h1><p role="alert">{error}</p><a href="./">Back to the UX Builder</a></main>;
  if (!theme) return <main className="tp-missing"><p>Loading {name}…</p></main>;

  // The artwork is sent apart from the tokens (data: URLs), so the page's own Logo widgets get it here.
  const art = { ...(a.logo && { "--piq-brand-logo-image": `url("${a.logo}")` }), ...(a.mark && { "--piq-brand-mark-image": `url("${a.mark}")` }) };
  const link = (id) => storybookUrl(theme.storybook, id, theme.name, appearance);
  return (
    <ThemeProvider tokens={a.tokens} appearance={appearance} className="tp" style={art} data-theme-page={theme.name}>
      <header className="tp-top">
        <a className="tp-back" href="./?view=themes"><Icon name="arrow-left" />All themes</a>
        <div className="tp-top__title"><h1>{theme.title}</h1><code>{theme.name}</code></div>
        <AppearanceSwitch label="Theme appearance" value={pref} onChange={choose} available={aps} />
        <a className="tp-ext" href={storybookUrl(theme.storybook, INDEX.stories[0]?.id ?? "", theme.name, appearance)} target="_blank" rel="noreferrer">Storybook<Icon name="external-link" /></a>
      </header>
      <div className="tp-body">
        <Nav />
        <main className="tp-main" id="content">
          <section id="brand" data-nav className="tp-section" aria-labelledby="brand-h">
            <h2 id="brand-h">Brand</h2>
            <ThemePreview theme={theme} />
          </section>
          <CssSection theme={theme} aps={aps} />
          <Catalogue id="widgets" title="UI Components" items={WIDGETS} from="@ux-builder/ui" link={link} />
          <AiCatalogue theme={theme} tokens={a.tokens} appearance={appearance} link={link} />
          <Catalogue id="patterns" title="Screen patterns" items={PATTERNS} from="@ux-builder/ui/patterns" link={link} />
          <Catalogue id="assistant" title="Assistant" items={ASSISTANT} from="@ux-builder/ui/assistant" link={link} />
        </main>
      </div>
    </ThemeProvider>
  );
}

/* The menu: every part of the page, the one at the top of the screen marked. */
function Nav() {
  const [current, setCurrent] = useState("brand");
  const ref = useRef(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = (document.querySelector(".tp-top")?.getBoundingClientRect().bottom ?? 0) + 8;
      let at = "brand";
      for (const el of document.querySelectorAll(".tp-main [data-nav]")) { if (el.getBoundingClientRect().top <= top) at = el.id; else break; }
      setCurrent(at);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => { ref.current?.querySelector('[aria-current="location"]')?.scrollIntoView({ block: "nearest" }); }, [current]);
  const item = (id, label) => <li key={id}><a href={`#${id}`} aria-current={current === id ? "location" : undefined}>{label}</a></li>;
  return (
    <nav className="tp-nav" aria-label="Theme contents" ref={ref}>
      <p className="tp-nav__group">Brand</p>
      <ul>{item("brand", "Logos and palette")}</ul>
      <p className="tp-nav__group">CSS</p>
      <ul>{item("css-light", "Light")}{item("css-dark", "Dark")}{item("css-auto", "Auto")}{item("css-bridges", "Generative UI bridges")}</ul>
      <p className="tp-nav__group">UI Components</p>
      <ul>{WIDGETS.map((w) => item(slug("widget", w.name), w.name))}</ul>
      <div className="tp-nav__ai">
        <p className="tp-nav__group">AI Components</p>
        <ul>{item("ai", "About these")}{AI.map((c) => item(slug("ai", c.name), <>{c.name}<span className="tp-nav__lib"><span className="piq-visually-hidden">, </span>{c.library}</span></>))}</ul>
      </div>
      <p className="tp-nav__group">Screen patterns</p>
      <ul>{PATTERNS.map((p) => item(slug("pattern", p.name), p.name))}</ul>
      <p className="tp-nav__group">Assistant</p>
      <ul>{ASSISTANT.map((p) => item(slug("assistant", p.name), p.name))}</ul>
    </nav>
  );
}

function Code({ label, text }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="tp-code">
      <div className="tp-code__head"><span>{label}</span><Button size="sm" variant="text" onClick={async () => { await navigator.clipboard?.writeText(text); setCopied(true); }}><Icon name="copy" />{copied ? "Copied" : "Copy"}</Button></div>
      <pre tabIndex={0}><code>{text}</code></pre>
    </div>
  );
}

/* The theme's CSS: for each appearance its attributes and its custom
   properties, and for auto how to follow the system's setting. */
function CssSection({ theme, aps }) {
  const t = theme.name;
  const imports = `@import "@ux-builder/tokens/themes/${t}.css";\n@import "@ux-builder/tokens/fonts/${t}.css";\n@import "@ux-builder/ui/ui.css";\n@import "@ux-builder/ui/patterns.css";`;
  const block = (ap) => `[data-theme="${t}"][data-appearance="${ap}"] {\n${Object.entries(theme.appearances[ap].tokens).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}`;
  const auto = `<!-- In <head>, before the page paints -->\n<script>\n  const dark = matchMedia("(prefers-color-scheme: dark)");\n  const apply = () => document.documentElement.dataset.appearance =\n    ${aps.length === 2 ? 'dark.matches ? "dark" : "light"' : `"${aps[0]}"`};\n  apply(); dark.addEventListener("change", apply);\n</script>\n\n// Or, in React\n<ThemeProvider theme="${t}" appearance="system">\n  <App />\n</ThemeProvider>`;
  return (
    <>
      {["light", "dark"].map((ap) => (
        <section key={ap} id={`css-${ap}`} data-nav className="tp-section" aria-labelledby={`css-${ap}-h`}>
          <h2 id={`css-${ap}-h`}>CSS: {ap === "light" ? "Light" : "Dark"}</h2>
          {theme.appearances[ap] ? (
            <>
              <p className="tp-lede">Load the theme once, then set the attributes on <code>&lt;html&gt;</code>. Every widget takes these custom properties; app CSS uses the <code>--piq-*</code> role tokens, never raw values.</p>
              <Code label="CSS imports" text={imports} />
              <Code label="On <html>" text={`<html data-theme="${t}" data-appearance="${ap}">`} />
              <Code label={`${Object.keys(theme.appearances[ap].tokens).length} custom properties`} text={block(ap)} />
            </>
          ) : <p className="tp-lede">{theme.title} has no {ap} appearance; <code>data-appearance="{ap}"</code> falls back to {theme.default ?? aps[0]}.</p>}
        </section>
      ))}
      <section id="css-auto" data-nav className="tp-section" aria-labelledby="css-auto-h">
        <h2 id="css-auto-h">CSS: Auto</h2>
        <p className="tp-lede">Follow the user's light or dark setting{aps.length < 2 ? ` (${theme.title} has only ${aps[0]}, so it stays ${aps[0]})` : ""}. {theme.default ? `Without a setting it is ${theme.default}.` : ""}</p>
        <Code label="Follow the system setting" text={auto} />
      </section>
      <section id="css-bridges" data-nav className="tp-section" aria-labelledby="css-bridges-h">
        <h2 id="css-bridges-h">CSS: Generative UI bridges</h2>
        <p className="tp-lede">AI Elements and assistant-ui wear {theme.title} through these stylesheets: the theme's values mapped onto the variables each library is styled by, in every appearance, contrast-checked. Load one after the theme; it follows <code>data-theme</code> and <code>data-appearance</code>, with no <code>.dark</code> class.</p>
        {Object.entries(theme.bridges ?? {}).map(([s, b]) => (
          <Code key={s} label={`${b.title}: @import "@ux-builder/tokens/bridges/${s}/${t}.css";`} text={b.css} />
        ))}
      </section>
    </>
  );
}

/* Every widget or pattern, each with its story rendered in the theme. */
function Catalogue({ id, title, items, from, link }) {
  return (
    <section id={id} className="tp-section tp-catalogue" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      {items.map((w) => <Entry key={w.name} kind={id === "widgets" ? "widget" : id === "assistant" ? "assistant" : "pattern"} item={w} from={from} link={link} />)}
    </section>
  );
}

function Entry({ kind, item, from, link }) {
  const stories = INDEX.byComponent.get(item.name) ?? [];
  const [first, ...more] = stories;
  const id = slug(kind, item.name);
  return (
    <article id={id} data-nav className="tp-entry" aria-labelledby={`${id}-h`}>
      <div className="tp-entry__head">
        <h3 id={`${id}-h`}>{item.name}</h3>
        {first && <a className="tp-ext" href={link(first.id)} target="_blank" rel="noreferrer">Open in Storybook<Icon name="external-link" /></a>}
      </div>
      <p className="tp-entry__purpose">{item.purpose}</p>
      <code className="tp-entry__import">{`import { ${item.name} } from "${from}";`}</code>
      {first
        ? <Sample story={first} />
        : <p className="tp-hint">No story yet.</p>}
      {more.length > 0 && (
        <p className="tp-entry__more">Also in: {more.slice(0, 6).map((s, i) => <span key={s.id}>{i ? ", " : ""}<a href={link(s.id)} target="_blank" rel="noreferrer">{s.title.split("/").at(-1)} › {s.key}</a></span>)}</p>
      )}
    </article>
  );
}

/* The AI Components: other libraries' components, kept apart from the SDK's
   own. They wear the theme through the shadcn bridge, whose variables are
   set here from the theme's tokens (the page is an embedded view, so the
   bridge stylesheets, scoped by data-theme, do not reach it); on <html> too,
   for their menus and tooltips, which render at the end of the page. */
function AiCatalogue({ theme, tokens, appearance, link }) {
  const vars = useMemo(() => Object.fromEntries(Object.entries(SURFACES.shadcn.variables(tokens)).filter(([, v]) => v)), [tokens]);
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.dataset.appearance = appearance;
    return () => { for (const k of Object.keys(vars)) root.style.removeProperty(k); delete root.dataset.appearance; };
  }, [vars, appearance]);
  return (
    <section id="ai" data-nav className="tp-section tp-catalogue tp-ai" aria-labelledby="ai-h" style={vars} data-appearance={appearance}>
      <div className="tp-ai__intro">
        <h2 id="ai-h">AI Components</h2>
        <p className="tp-lede">Components from <a href="https://elements.ai-sdk.dev" target="_blank" rel="noreferrer">AI Elements</a> (Apache-2.0) and <a href="https://www.assistant-ui.com" target="_blank" rel="noreferrer">assistant-ui</a> (MIT), not the SDK's: an app copies them in with each library's command line. They wear {theme.title} through the shadcn bridge, imported after the theme:</p>
        <code className="tp-entry__import">{`@import "@ux-builder/tokens/bridges/shadcn/${theme.name}.css";`}</code>
      </div>
      {AI.map((c) => {
        const id = slug("ai", c.name);
        return (
          <article key={c.name} id={id} data-nav className="tp-entry" aria-labelledby={`${id}-h`}>
            <div className="tp-entry__head">
              <h3 id={`${id}-h`}>{c.name} <span className="tp-chip">{c.library} · {c.licence}</span></h3>
              <span className="tp-entry__links">
                <a className="tp-ext" href={c.docs} target="_blank" rel="noreferrer">Docs<Icon name="external-link" /></a>
                {c.story && <a className="tp-ext" href={link(c.story.id)} target="_blank" rel="noreferrer">Open in Storybook<Icon name="external-link" /></a>}
              </span>
            </div>
            <p className="tp-entry__purpose">{c.description}</p>
            {c.story ? <Sample story={c.story} /> : <p className="tp-hint">No story yet.</p>}
          </article>
        );
      })}
    </section>
  );
}

/* One story, rendered as Storybook renders it. */
function Sample({ story }) {
  return (
    <figure className="tp-sample" data-story={story.id}>
      <figcaption>{story.title} › {story.key}</figcaption>
      <div className="tp-sample__canvas"><Boundary><StoryRender story={story} /></Boundary></div>
    </figure>
  );
}

function StoryRender({ story: s }) {
  const st = typeof s.story === "function" ? { render: s.story } : s.story;
  const args = useMemo(() => ({ ...s.meta.args, ...st.args }), [s, st]);
  const render = st.render ?? s.meta.render;
  return render ? render(args, { args, id: s.id, name: s.key, title: s.title, globals: {}, parameters: { ...s.meta.parameters, ...st.parameters } }) : createElement(s.meta.component, args);
}

class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <p className="tp-hint" role="alert">This story did not render here: {this.state.error.message}</p> : this.props.children; }
}
