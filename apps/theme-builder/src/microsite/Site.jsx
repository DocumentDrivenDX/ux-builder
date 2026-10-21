import { AppearanceSwitch, Icon, Logo, ThemeProvider, useTheme } from "@ux-builder/ui";
import { iconArrowRight, iconBot, iconPalette, iconShieldCheck, iconSparkles, iconTerminal } from "@ux-builder/ui/icons";
import { useEffect, useState } from "react";
import { AiSection, GetStarted, Guardrails, Hero, LiveDemo, Loop, Packages } from "../home/Home.jsx";
import { ROOT } from "../site-root.js";
import { SECTIONS, href, locate, neighbours } from "./nav.js";
import { PAGES } from "./pages.jsx";
import { DECISIONS, FEATURES, PATTERNS, REPO, WIDGETS } from "./sources.js";

/* The project site (tools/build-pages.mjs), laid out by HELIX's
   product-microsite-ia concern: the home page (the hero, the reader paths,
   the live demo, the AI section, plan-check-build-assess, guardrails, packages, a quick start and
   proof), then one section per reader mode (Why, Start, Concepts, Reference,
   Proof), each with a landing page. On a section page the left menu is the
   site's hierarchy and the current page; the right menu is this page's
   headings only. It wears ux-builder-databricks. */

const THEME = "ux-builder-databricks";
const PREF = "uxm-appearance";
const APPEARANCES = ["system", "light", "dark"];
const saved = () => { try { const v = localStorage.getItem(PREF); return APPEARANCES.includes(v) ? v : "system"; } catch { return "system"; } };
const ICONS = { why: iconSparkles, start: iconTerminal, concepts: iconPalette, reference: iconBot, proof: iconShieldCheck };

export function Site() {
  const [appearance, setAppearance] = useState(saved);
  const choose = (v) => { setAppearance(v); try { localStorage.setItem(PREF, v); } catch { /* not remembered */ } };
  const { section, page } = locate(new URLSearchParams(location.search).get("p"));
  useEffect(() => {
    document.title = section ? `${page?.title ?? section.title} · UX Builder` : "UX Builder: turn a logo into a theme";
    window.uxbPageReady?.();
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [section, page]);
  return (
    <ThemeProvider theme={THEME} appearance={appearance} className="uxh uxm">
      <PageAppearance />
      <header className="uxh-top"><div className="uxh-wrap uxh-row uxh-spread">
        <a href="./" className="uxh-brand" aria-label="UX Builder home"><Logo /></a>
        <nav aria-label="Sections" className="uxm-sections">
          {SECTIONS.map((s) => <a key={s.id} href={href(s.id)} aria-current={section?.id === s.id ? "true" : undefined}>{s.title}</a>)}
        </nav>
        <div className="uxh-row">
          <a className="uxm-gh" href={REPO}>GitHub</a>
          <AppearanceSwitch value={appearance} onChange={choose} />
        </div>
      </div></header>
      {section ? <SectionPage section={section} page={page} /> : <HomePage />}
      <footer className="uxh-foot"><div className="uxh-wrap uxh-row uxh-spread">
        <Logo variant="mark" size="sm" />
        <p>Open source under MIT OR Apache-2.0. Built with the SDK it describes, in the <code>{THEME}</code> theme. Not affiliated with or endorsed by Apple, Google or Microsoft; their names and marks are theirs.</p>
        <nav aria-label="Footer" className="uxh-row">{SECTIONS.map((s) => <a key={s.id} href={href(s.id)}>{s.title}</a>)}<a href={REPO}>GitHub</a></nav>
      </div></footer>
    </ThemeProvider>
  );
}

function PageAppearance() {
  const { appearance } = useTheme();
  useEffect(() => { document.documentElement.dataset.theme = THEME; document.documentElement.dataset.appearance = appearance; }, [appearance]);
  return null;
}

/* ---- Home: what it is, why it matters, and the next action, in the first viewport ---- */

function HomePage() {
  return (
    <main>
      <Hero />
      <Paths />
      <LiveDemo />
      <AiSection />
      <Loop />
      <Guardrails />
      <Packages />
      <GetStarted />
      <Proof />
    </main>
  );
}

/* One path per reader mode, each to its section. */
function Paths() {
  return (
    <section className="uxh-section" aria-labelledby="paths-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head"><h2 id="paths-h">Where do you want to start?</h2><p className="uxh-lede">Five paths, one for each question you might be asking.</p></div>
        <ul className="uxm-paths">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a className="uxh-card uxh-card--link" href={href(s.id)}>
                <span className="uxh-card__icon"><Icon icon={ICONS[s.id]} /></span>
                <span className="uxm-mode">{s.mode}</span>
                <h3>{s.question}</h3>
                <p>{s.lede}</p>
                <span className="uxm-go">{s.title}<Icon icon={iconArrowRight} /></span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* Counts generated from what ships, and where to check them. */
function Proof() {
  return (
    <section className="uxh-section" aria-labelledby="proof-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head"><span className="uxh-eyebrow"><Icon icon={iconShieldCheck} />Proof, not claims</span><h2 id="proof-h">Everything here is generated from what ships.</h2></div>
        <ul className="uxh-stats uxm-proof">
          <li><b>{WIDGETS.length}</b><span>widgets</span></li>
          <li><b>{PATTERNS.length}</b><span>screen patterns</span></li>
          <li><b>4.5:1</b><span>contrast, every theme, every appearance</span></li>
          <li><b>{DECISIONS.length}</b><span>recorded decisions</span></li>
          <li><b>{FEATURES.length}</b><span>specified features</span></li>
        </ul>
        <div className="uxh-row">
          <a className="uxh-btn uxh-btn--primary" href={href("proof", "decisions")}>Read the decisions<Icon icon={iconArrowRight} /></a>
          <a className="uxh-btn" href={`${ROOT}themes/?theme=ux-builder-databricks`}>See every component live</a>
        </div>
      </div>
    </section>
  );
}

/* ---- A section: its landing page, or one of its pages ---- */

function SectionPage({ section, page }) {
  const Content = page ? PAGES[`${section.id}/${page.id}`] : null;
  const { prev, next } = neighbours(section, page);
  const outline = useOutline(page?.id ?? section.id);
  return (
    <div className="uxh-wrap uxm-layout">
      <SectionNav section={section} page={page} />
      <main className="uxm-main" id="content">
        <nav aria-label="Breadcrumb" className="uxm-crumbs"><a href="./">Home</a><span aria-hidden="true">/</span>{page ? <><a href={href(section.id)}>{section.title}</a><span aria-hidden="true">/</span><span aria-current="page">{page.title}</span></> : <span aria-current="page">{section.title}</span>}</nav>
        <span className="uxh-eyebrow"><Icon icon={ICONS[section.id]} />{section.mode}: {section.question}</span>
        <h1>{page ? page.title : section.title}</h1>
        {page ? <article className="uxm-prose"><Content /></article> : <Landing section={section} />}
        <nav aria-label="More pages" className="uxm-pager">
          {prev ? <a href={href(prev.s.id, prev.p?.id)}><span>Previous</span>{prev.p?.title ?? prev.s.title}</a> : <span />}
          {next ? <a href={href(next.s.id, next.p?.id)} className="uxm-pager__next"><span>Next</span>{next.p?.title ?? next.s.title}</a> : <span />}
        </nav>
      </main>
      <aside className="uxm-outline" aria-label="On this page">
        {outline.items.length > 0 && <><p>On this page</p><ul>{outline.items.map((h) => <li key={h.id}><a href={`#${h.id}`} aria-current={outline.current === h.id ? "true" : undefined}>{h.text}</a></li>)}</ul></>}
      </aside>
    </div>
  );
}

/* The section's landing page orients before it sends the reader deeper. */
function Landing({ section }) {
  return (
    <>
      <p className="uxm-lede">{section.lede}</p>
      <ul className="uxm-landing">
        {section.pages.map((p) => (
          <li key={p.id}><a className="uxh-card uxh-card--link" href={href(section.id, p.id)}><h3 id={p.id}>{p.title}</h3><p>{p.blurb}</p><span className="uxm-go">Read<Icon icon={iconArrowRight} /></span></a></li>
        ))}
      </ul>
    </>
  );
}

/* Left: the site's hierarchy, with the current section open and the current page marked. On a phone it folds into a menu. */
function SectionNav({ section, page }) {
  const tree = (
    <ul className="uxm-tree">
      {SECTIONS.map((s) => (
        <li key={s.id}>
          <a href={href(s.id)} className="uxm-tree__section" aria-current={s.id === section.id && !page ? "page" : undefined}>{s.title}</a>
          {s.id === section.id && <ul>{s.pages.map((p) => <li key={p.id}><a href={href(s.id, p.id)} aria-current={page?.id === p.id ? "page" : undefined}>{p.title}</a></li>)}</ul>}
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <nav className="uxm-side" aria-label="Site">{tree}</nav>
      <details className="uxm-drawer"><summary>{section.title}{page ? `: ${page.title}` : ""}</summary><nav aria-label="Site">{tree}</nav></details>
    </>
  );
}

/* Right: only this page's own headings, the one at the top of the screen marked. */
function useOutline(key) {
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    const hs = [...document.querySelectorAll(".uxm-main h2[id]:not([data-demo] h2)")].map((h) => ({ id: h.id, text: h.textContent }));
    setItems(hs);
    let frame = 0;
    const update = () => {
      frame = 0;
      let at = hs[0]?.id ?? null;
      for (const h of hs) { const el = document.getElementById(h.id); if (el && el.getBoundingClientRect().top <= 120) at = h.id; }
      setCurrent(at);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [key]);
  return { items, current };
}
