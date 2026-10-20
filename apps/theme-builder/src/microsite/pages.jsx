import { DataTable, Icon, Notice, StatusPill } from "@ux-builder/ui";
import { iconBot, iconPalette, iconScanEye, iconShieldCheck, iconSparkles, iconWand2 } from "@ux-builder/ui/icons";
import { Fragment } from "react";
import { AiSection, Command, GUARDS, LiveDemo, PACKAGES } from "../home/Home.jsx";
import { ROOT } from "../site-root.js";
import { href } from "./nav.js";
import { AI, CONTRACT_LIST, DECISIONS, FEATURES, ICON_COUNT, PATTERNS, RELEASES, REPO, WIDGETS } from "./sources.js";

/* The microsite's pages. The Why pages follow the product vision
   (docs/helix/00-discover/product-vision.md), the Concepts pages the ADRs and
   contracts they cite, and the Reference and Proof pages are generated from
   the catalogue, the HELIX artifacts and the changelogs (sources.js). */

const THEME_PAGE = `${ROOT}themes/?theme=ux-builder-databricks`;

/* Inline `code` and **bold** in generated text, nothing more. */
export function Md({ children }) {
  const parts = String(children ?? "").split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>);
}

const H2 = ({ id, children }) => <h2 id={id}>{children}</h2>;
const Cite = ({ ids }) => <p className="uxm-cite">From {ids.map((id, i) => <Fragment key={id}>{i ? ", " : ""}<a href={`${REPO}/tree/main/docs/helix`}>{id}</a></Fragment>)}</p>;

/* ---- Why ---- */

function Problem() {
  return (
    <>
      <p className="uxm-lede">Every app UX Builder touches should look and behave like its brand from its first commit, and keep doing so as brands, design systems and people change, without anyone hard-coding a colour, a font or a widget.</p>
      <H2 id="problem">The problem</H2>
      <p>Each new app starts by re-deciding its look. Colours are copied from a logo by eye and fail contrast; widgets are rebuilt, then drift; fonts load differently in every app; moving an app to another design system means rewriting it.</p>
      <p>AI coding agents make it worse. Asked for "a filter bar", they invent one, with literal colours. The result is apps that look approximately like the brand, cost developer time to keep that way, and cannot be re-themed.</p>
      <H2 id="different">What makes it different</H2>
      <ol className="uxm-points">
        <li><b>A theme is a brand on a design system.</b> Identity (colours, logo, fonts) is separate from anatomy (shapes, type, density, icons), so any brand can be shown in Material, Fluent, Carbon, Databricks or its own look, and a new brand is a file, not a fork.</li>
        <li><b>AI steers; a deterministic engine decides.</b> A model turns "more conservative, it's a law firm" into bounded settings; the engine chooses every colour, so every option is reproducible and passes contrast before anyone sees it.</li>
        <li><b>Accessible by construction.</b> Every theme, in every appearance, on every design system, passes the same 4.5:1 contrast gate in CI. Nothing ships that fails.</li>
        <li><b>Built for agents as much as people.</b> The same source generates the documentation, the catalogue and the agent guidance, so they cannot drift from what ships.</li>
        <li><b>Whole screens, at any width.</b> Patterns carry the structure and states (empty, error, loading) that widgets alone do not, and adapt from a desktop window to a phone or a narrow embedded panel.</li>
      </ol>
      <H2 id="not">What it is not</H2>
      <ul>
        <li>Not a design system competing with Material or Carbon: it carries them.</li>
        <li>Not a page builder or app framework: apps own their content, data, routing and logic.</li>
        <li>Not a chat library or AI runtime: it styles the library an app chooses.</li>
        <li>Not a way to publish without review: themes go through ordinary code review.</li>
      </ul>
      <Cite ids={["Product vision", "ADR-013", "ADR-014"]} />
    </>
  );
}

const AUDIENCE = [
  { who: "App developers", icon: iconWand2, get: "Widgets, screen patterns, fonts, icons and themes from packages; a starter that is on the design system from the first commit; lint rules and an audit that keep it there." },
  { who: "Brand owners", icon: iconPalette, get: "A guided builder: logo in, palette options shown on real widgets in light and dark, plain-language feedback, a theme saved for review." },
  { who: "AI coding agents", icon: iconBot, get: "Guidance, a catalogue and an MCP server that name the real widgets, patterns and tokens, so generated UI uses them." },
  { who: "Design-system maintainers", icon: iconShieldCheck, get: "One design system to maintain instead of one per app; brands delivered as data, not code." },
];
function Audience() {
  return (
    <>
      <p className="uxm-lede">UX Builder serves four readers at once. Each gets something different from the same source.</p>
      <ul className="uxm-grid">{AUDIENCE.map((a) => <li key={a.who} className="uxm-tile"><span className="uxm-tile__icon"><Icon icon={a.icon} /></span><h3>{a.who}</h3><p>{a.get}</p></li>)}</ul>
      <H2 id="paths">Where to go next</H2>
      <ul>
        <li>Developers: <a href={href("start", "new-app")}>start a new app</a> or <a href={href("start", "existing-app")}>add it to an existing one</a>.</li>
        <li>Brand owners: <a href={href("start", "theme-from-logo")}>make a theme from your logo</a>.</li>
        <li>Agents and the people who run them: <a href={href("start", "agents")}>work with AI coding agents</a>.</li>
      </ul>
      <Cite ids={["Product vision"]} />
    </>
  );
}

const PRINCIPLES = [
  ["Nothing presentational is hard-coded in an app.", "If it is a colour, a font or a radius, it comes from a token."],
  ["Generated, not written by hand,", "wherever a hand-written copy could drift: galleries, catalogues, guidance, icon sets, and this site's reference pages."],
  ["Reviewed, not published.", "Themes made in the builder go through normal code review; releases carry a gallery of every theme."],
  ["Prefer the platform.", "Native elements restyled, CSS custom properties, React for components but framework-free CSS."],
  ["Scope by need.", "Widgets and patterns are admitted when an app needs them, not to be complete."],
  ["Licences checked, nothing reported.", "Every third-party licence is checked before release, and nothing the SDK ships reports usage."],
];
function Principles() {
  return (
    <>
      <p className="uxm-lede">Six rules every package, theme and widget is held to. Most are enforced by a check, not by good intentions.</p>
      <ol className="uxm-points">{PRINCIPLES.map(([b, t]) => <li key={b}><b>{b}</b> {t}</li>)}</ol>
      <Notice tone="info" title="Enforced, not aspirational">The lint rule fails on literal colours, fonts and radii; CI fails any theme below 4.5:1; the licence check fails on an unapproved licence.</Notice>
      <Cite ids={["Product vision", "ADR-016", "ADR-023"]} />
    </>
  );
}

function Roadmap() {
  const now = ["Role-based tokens and themes on four shared design systems (Material, Fluent, Carbon, Databricks)", "Widgets, screen patterns, fonts and icons in @ux-builder/* on the public npm registry", "The palette engine and the guided theme builder", "The starter, lint rules, the audit, agent guidance and the MCP server", "Bridges that dress AI Elements and assistant-ui in every theme"];
  const next = ["The SDK's own assistant patterns, with generative UI limited to catalogue components", "First apps adopting the SDK in production", "One presentation contract shared by an AI harness and its embedded products", "Measuring agent-built UI against the guidance"];
  const later = ["Client brands released apart from the public core", "A hosted builder for brand owners who are not developers", "Frameworks beyond React if a team needs one"];
  return (
    <>
      <p className="uxm-lede">Where UX Builder is, where it is going, and the numbers it is judged by.</p>
      <div className="uxm-grid uxm-grid--3">
        <div className="uxm-tile"><StatusPill state="live">Now</StatusPill><ul>{now.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="uxm-tile"><StatusPill state="evaluation">Next</StatusPill><ul>{next.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="uxm-tile"><StatusPill state="purchasing">Later</StatusPill><ul>{later.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>
      <H2 id="measures">Measures of success</H2>
      <ul className="uxm-stats">
        <li><b>0</b><span>hard-coded presentation values in adopting apps</span></li>
        <li><b>&lt;30 min</b><span>from a logo to a reviewed theme</span></li>
        <li><b>&lt;1 hr</b><span>from nothing to a themed screen</span></li>
        <li><b>90%</b><span>of agent-built components on SDK widgets and tokens</span></li>
      </ul>
      <Cite ids={["Product vision", "FEAT-005", "FEAT-007"]} />
    </>
  );
}

/* ---- Start ---- */

function NewApp() {
  return (
    <>
      <p className="uxm-lede">One command gives you a React + Vite app that wears a theme from its first commit, with lint, the audit and CI already wired up.</p>
      <H2 id="create">Create the app</H2>
      <Command text="npm create @ux-builder/app my-app -- --theme ux-builder-databricks" />
      <Command text="cd my-app && npm install && npm run dev" />
      <H2 id="inside">What's inside</H2>
      <ul>
        <li>The theme's CSS and fonts, and <code>ThemeProvider</code> with a light, auto and dark switch</li>
        <li>The theme's logo and favicon</li>
        <li>A page built only from SDK widgets</li>
        <li><code>npm run lint</code> and <code>npm run audit</code>, and a CI workflow that runs both</li>
        <li><code>CLAUDE.md</code> and <code>AGENTS.md</code> pointing at the SDK's guidance</li>
      </ul>
      <Notice tone="info" title="Node 20 or later, React 19">Without <code>--theme</code>, the app starts on <code>plain</code>.</Notice>
    </>
  );
}

function ExistingApp() {
  return (
    <>
      <p className="uxm-lede">Three steps put an existing React app on a theme. Without React, the CSS works on its own markup.</p>
      <H2 id="install">1. Install</H2>
      <Command text="npm install @ux-builder/tokens @ux-builder/ui" />
      <H2 id="load">2. Load the theme, once, before your own CSS</H2>
      <Command code text={'import "@ux-builder/tokens/themes/ux-builder-databricks.css";\nimport "@ux-builder/tokens/fonts/ux-builder-databricks.css";\nimport "@ux-builder/ui/ui.css";'} />
      <H2 id="wrap">3. Wrap the app</H2>
      <Command code text={'import { ThemeProvider } from "@ux-builder/ui";\n\n<ThemeProvider theme="ux-builder-databricks" appearance="system">\n  <App />\n</ThemeProvider>'} />
      <H2 id="no-react">Without React</H2>
      <p>Set <code>data-theme</code> (and optionally <code>data-appearance</code>) on <code>&lt;html&gt;</code>, and use the <code>.piq-*</code> class names each component renders.</p>
      <Command code text={'<html data-theme="ux-builder-databricks" data-appearance="light">'} />
      <Cite ids={["CONTRACT-003", "CONTRACT-004"]} />
    </>
  );
}

function ThemeFromLogo() {
  return (
    <>
      <p className="uxm-lede">The guided builder turns a logo into a theme in six steps, and saves it as a pull request for review. It runs on your machine, so your API key stays there.</p>
      <H2 id="steps">The six steps</H2>
      <ol className="uxm-points">
        <li><b>Upload the logo.</b> The engine finds the brand colours.</li>
        <li><b>Pick palettes.</b> Options that already pass contrast in light and dark.</li>
        <li><b>Pick design systems.</b> Material, Fluent, Carbon, Databricks or the brand's own.</li>
        <li><b>Compare</b> them on real widgets and screens. Type feedback like "more conservative" and a model turns it into engine settings.</li>
        <li><b>Save</b> the brand and theme files on a branch, as a pull request.</li>
        <li><b>Use it</b>: copyable steps for React + Vite, Next.js or plain HTML.</li>
      </ol>
      <H2 id="run">Run it</H2>
      <Command text="git clone https://github.com/DocumentDrivenDX/ux-builder && cd ux-builder && npm install && npm run builder" />
      <p>Or from the command line, without the builder:</p>
      <Command text="npm run brand -- logo.svg --out tokens/brands/acme.brand.json --strategy muted --title Acme --design-system databricks" />
      <Cite ids={["FEAT-002", "FEAT-003", "ADR-014", "ADR-019"]} />
    </>
  );
}

function Agents() {
  return (
    <>
      <p className="uxm-lede">Agents get the same truth as people: generated from the source, for the version you installed, so what they write uses real widgets and tokens.</p>
      <H2 id="mcp">The MCP server</H2>
      <Command text="claude mcp add ux-builder -- npx @ux-builder/mcp" />
      <p>Any MCP client can run it over stdio. It answers with themes, widgets and their props, tokens with their purposes, icons and guidance.</p>
      <H2 id="guidance">Guidance and the skill</H2>
      <ul>
        <li><code>node_modules/@ux-builder/ui/AGENTS.md</code>: the rules, set-up, and a reference of every component, prop, token, icon and theme.</li>
        <li>The Claude Code skill <code>ux-builder-ui</code>, which the starter installs.</li>
      </ul>
      <H2 id="demo">See it work</H2>
      <AiSection />
      <Cite ids={["FEAT-004", "ADR-023"]} />
    </>
  );
}

function Ci() {
  return (
    <>
      <p className="uxm-lede">Two checks keep an app on its theme: lint reads the source, the audit drives the running app.</p>
      <ul className="uxm-grid">{GUARDS.map((g) => <li key={g.title} className="uxm-tile"><span className="uxm-tile__icon"><Icon icon={g.icon} /></span><h3>{g.title}</h3><p>{g.text}</p><code className="uxm-tile__code">{g.code}</code></li>)}</ul>
      <H2 id="lint">Lint</H2>
      <Command code text={'// eslint.config.js\nimport uxBuilder from "@ux-builder/ui/eslint";\nexport default [{\n  files: ["src/**/*.{js,jsx}"],\n  plugins: { "ux-builder": uxBuilder },\n  rules: {\n    "ux-builder/no-hard-coded-values": ["error", { theme: "ux-builder-databricks" }],\n    "ux-builder/no-foreign-ui": "error",\n    "ux-builder/no-inline-svg": "error",\n  },\n}];'} />
      <H2 id="audit">The audit</H2>
      <Command text={'npx ux-builder-audit --serve "npm run preview -- --port 4173" http://localhost:4173/'} />
      <p>It writes <code>audit-report/index.html</code> with screenshots and exits 1 on an error.</p>
    </>
  );
}

/* ---- Concepts ---- */

function Themes() {
  return (
    <>
      <p className="uxm-lede">A <b>theme</b> is what an app selects. It is a <b>brand</b> (colours, logo, fonts) on a <b>design system</b> (type, shape, elevation, every widget's metrics).</p>
      <div className="uxm-equation" aria-label="brand plus design system equals theme"><span>Brand</span><b>+</b><span>Design system</span><b>=</b><span>Theme</span></div>
      <p>Because identity and anatomy are separate, one brand can be shown on any shared design system, and a new brand is a file, not a fork. Try it:</p>
      <LiveDemo />
      <H2 id="files">As files</H2>
      <Command code text={'// tokens/themes/ux-builder-databricks.theme.json\n{\n  "name": "ux-builder-databricks",\n  "title": "UX Builder Databricks",\n  "brand": "ux-builder",\n  "public": true,\n  "default": "light",\n  "designSystem": "databricks"\n}'} />
      <Cite ids={["ADR-013", "ADR-018", "CONTRACT-002", "CONTRACT-003"]} />
    </>
  );
}

function Tokens() {
  return (
    <>
      <p className="uxm-lede">Tokens are named by their <b>role</b>, not their value: <code>--piq-color-text</code>, not <code>--navy</code>. So a theme can change a value without an app noticing.</p>
      <H2 id="roles">Choosing by role</H2>
      <Command code text={'.matter-row {\n  color: var(--piq-color-text);\n  background: var(--piq-color-surface);\n  padding: var(--piq-space-4);\n  border-radius: var(--piq-radius-card);\n}'} />
      <H2 id="appearances">Light, dark and auto</H2>
      <p>Each theme declares the appearances it supports and a default. <code>data-appearance</code> chooses one; <code>ThemeProvider appearance="system"</code> follows the user's setting before first paint.</p>
      <H2 id="contrast">Contrast</H2>
      <p>Every text role must clear 4.5:1 against its ground in every theme and appearance. CI fails the build otherwise.</p>
      <Cite ids={["ADR-015", "CONTRACT-001"]} />
    </>
  );
}

function Patterns() {
  return (
    <>
      <p className="uxm-lede">Above the widgets sit <b>{PATTERNS.length} screen patterns</b>: layout, navigation and whole screens, with their empty, error and loading states.</p>
      <H2 id="size-classes">Size classes, not breakpoints</H2>
      <p>Patterns adapt to their <i>container</i>, so the same settings page works in a desktop window, on a phone, or in a narrow embedded panel. Layout measures are tokens too.</p>
      <H2 id="variants">Variants chosen by the design system</H2>
      <p>A pattern's look (a filled or outlined filter bar, say) is a named token bundle chosen by the design system, so switching design systems re-shapes screens without code changes.</p>
      <p><a href={href("reference", "screen-patterns")}>Every pattern in the reference →</a></p>
      <Cite ids={["ADR-020", "ADR-021", "ADR-022", "FEAT-006"]} />
    </>
  );
}

function GenerativeUi() {
  return (
    <>
      <p className="uxm-lede">Chat libraries are <b>bridged, not adopted as design systems</b>: one stylesheet maps your theme onto the variables AI Elements and assistant-ui are styled by.</p>
      <Command code text={'import "@ux-builder/tokens/themes/ux-builder-databricks.css";\nimport "@ux-builder/tokens/bridges/shadcn/ux-builder-databricks.css";   // after the theme'} />
      <p>Each bridge is contrast-checked like the theme, and follows <code>data-theme</code> and <code>data-appearance</code> with no <code>.dark</code> class.</p>
      <H2 id="embedded">Embedded views</H2>
      <p>A host can hand a view a theme's resolved values instead of a stylesheet: <code>&lt;ThemeProvider tokens={"{resolved.tokens}"}&gt;</code>. The view wears the host's theme and never draws the brand itself.</p>
      <Cite ids={["ADR-011", "ADR-012", "ADR-023", "ADR-024", "FEAT-007"]} />
    </>
  );
}

/* ---- Reference ---- */

function Packages() {
  return (
    <>
      <p className="uxm-lede">Five packages on the public npm registry, installable with no token or registry configuration.</p>
      <ul className="uxm-grid">
        {PACKAGES.map(({ pkg, icon, what }) => (
          <li key={pkg.name}><a className="uxm-tile uxm-tile--link" href={`https://www.npmjs.com/package/${pkg.name}`}><span className="uxm-tile__icon"><Icon icon={icon} /></span><h3><code>{pkg.name}</code></h3><p>{what}</p><span className="uxm-version">v{pkg.version}</span></a></li>
        ))}
      </ul>
      <H2 id="entry">Entry points</H2>
      <table className="uxm-table">
        <thead><tr><th>Import</th><th>What it gives an app</th></tr></thead>
        <tbody>
          <tr><td><code>@ux-builder/tokens/themes/&lt;theme&gt;.css</code></td><td>One theme, selected with <code>data-theme</code></td></tr>
          <tr><td><code>@ux-builder/tokens/fonts/&lt;theme&gt;.css</code></td><td>The faces that theme uses</td></tr>
          <tr><td><code>@ux-builder/tokens/resolved/&lt;theme&gt;.&lt;appearance&gt;.json</code></td><td>Every token's final value, for code that can't read CSS</td></tr>
          <tr><td><code>@ux-builder/tokens/bridges/shadcn/&lt;theme&gt;.css</code></td><td>The theme for AI Elements and assistant-ui</td></tr>
          <tr><td><code>@ux-builder/ui</code>, <code>/patterns</code>, <code>/icons</code></td><td>Widgets, screen patterns, {ICON_COUNT.toLocaleString("en")} icons</td></tr>
          <tr><td><code>@ux-builder/ui/ui.css</code>, <code>/patterns.css</code></td><td>The framework-free CSS</td></tr>
          <tr><td><code>@ux-builder/ui/eslint</code>, <code>/stylelint</code></td><td>The lint rules</td></tr>
          <tr><td><code>@ux-builder/ui/catalogue.json</code>, <code>/AGENTS.md</code></td><td>The machine-readable catalogue and agent guidance</td></tr>
        </tbody>
      </table>
    </>
  );
}

const catalogueColumns = (from, kind) => [
  { key: "name", label: "Name", sortable: true, render: (r) => <a href={`${THEME_PAGE}#${kind}-${r.name}`}><code>{r.name}</code></a> },
  { key: "purpose", label: "Purpose", render: (r) => r.purpose },
  { key: "import", label: "Import", render: (r) => <code>{`import { ${r.name} } from "${from}"`}</code> },
];
function Components() {
  return (
    <>
      <p className="uxm-lede">{WIDGETS.length} widgets in <code>@ux-builder/ui</code>, generated from its catalogue. Each name opens it rendered live in the theme.</p>
      <DataTable caption="UI components" columns={catalogueColumns("@ux-builder/ui", "widget")} rows={WIDGETS.map((w) => ({ ...w, id: w.name }))} pageSize={50} initialSort={{ key: "name", dir: "ascending" }} />
    </>
  );
}
function ScreenPatterns() {
  return (
    <>
      <p className="uxm-lede">{PATTERNS.length} patterns in <code>@ux-builder/ui/patterns</code>, generated from its catalogue. Each name opens it rendered live in the theme.</p>
      <DataTable caption="Screen patterns" columns={catalogueColumns("@ux-builder/ui/patterns", "pattern")} rows={PATTERNS.map((p) => ({ ...p, id: p.name }))} pageSize={60} initialSort={{ key: "name", dir: "ascending" }} />
    </>
  );
}
function AiComponents() {
  return (
    <>
      <p className="uxm-lede">{AI.length} components from other libraries, not the SDK's: an app copies them in with each library's command line, and they wear the theme through the shadcn bridge.</p>
      <DataTable caption="AI components" rowKey="name" pageSize={40} rows={AI}
        columns={[
          { key: "name", label: "Component", sortable: true, render: (r) => <a href={`${THEME_PAGE}#ai-${r.name}`}><code>{r.name}</code></a> },
          { key: "library", label: "Library", sortable: true, render: (r) => `${r.library} (${r.licence})` },
          { key: "description", label: "What it is", render: (r) => r.description },
        ]} />
    </>
  );
}
function Cli() {
  const tools = [["list_themes", "Every theme: brand, design system, appearances, its CSS and font imports"], ["get_theme", "One theme's imports, icon set and every role token's value"], ["list_widgets, get_widget", "Widgets; one widget's props, defaults and import line"], ["list_tokens, get_token", "Tokens with their purpose; one token's value in every theme"], ["list_icons", "Icon names, optionally matching a query"], ["get_guidance", "The SDK's rules and how-tos"]];
  const audit = [["--theme <name>", "Audit only this theme (repeat)"], ["--appearance <light|dark>", "Repeat. Default: both"], ["--width <px>", "Repeat, one per size class; adds the reflow and target-size checks"], ["--serve \"<command>\"", "Start the app first, stop it afterwards"], ["--fail-on <error|warning|never>", "What makes the exit code 1. Default error"]];
  return (
    <>
      <H2 id="create-app">npm create @ux-builder/app</H2>
      <table className="uxm-table"><thead><tr><th>Option</th><th>Effect</th></tr></thead><tbody>
        <tr><td><code>--theme &lt;name&gt;</code></td><td>The theme to start on. Default <code>plain</code></td></tr>
        <tr><td><code>--name &lt;name&gt;</code></td><td>The package name. Default: the directory's name</td></tr>
      </tbody></table>
      <H2 id="audit">ux-builder-audit</H2>
      <table className="uxm-table"><thead><tr><th>Option</th><th>Effect</th></tr></thead><tbody>{audit.map(([o, e]) => <tr key={o}><td><code>{o}</code></td><td>{e}</td></tr>)}</tbody></table>
      <H2 id="mcp">ux-builder-mcp tools</H2>
      <table className="uxm-table"><thead><tr><th>Tool</th><th>Returns</th></tr></thead><tbody>{tools.map(([t, r]) => <tr key={t}><td><code>{t}</code></td><td>{r}</td></tr>)}</tbody></table>
    </>
  );
}

/* ---- Proof ---- */

function Decisions() {
  return (
    <>
      <p className="uxm-lede">{DECISIONS.length} architecture decisions, generated from <code>docs/helix/02-design/adr/</code>. Each links to its full record.</p>
      <ol className="uxm-records">
        {DECISIONS.map((d) => (
          <li key={d.id} id={d.id.toLowerCase()} className="uxm-record">
            <div className="uxm-record__head"><a href={d.url}><b>{d.id}</b></a><span className="uxm-hint">{d.date}</span>{d.status && <StatusPill state={/accepted/i.test(d.status) ? "live" : "evaluation"}>{d.status}</StatusPill>}</div>
            <h3><Md>{d.title}</Md></h3>
            {d.decision && <p><Md>{d.decision}</Md></p>}
          </li>
        ))}
      </ol>
    </>
  );
}
function Features() {
  return (
    <>
      <p className="uxm-lede">What each feature promises, generated from <code>docs/helix/01-frame/features/</code>, and the contracts an app may rely on.</p>
      <ol className="uxm-records">
        {FEATURES.map((f) => (
          <li key={f.id} className="uxm-record">
            <div className="uxm-record__head"><a href={f.url}><b>{f.id}</b></a>{f.status && <StatusPill state="live">{f.status}</StatusPill>}</div>
            <h3>{f.title}</h3>
            {f.overview && <p><Md>{f.overview}</Md></p>}
          </li>
        ))}
      </ol>
      <H2 id="contracts">Contracts</H2>
      <ul>{CONTRACT_LIST.map((c) => <li key={c.id}><a href={c.url}><b>{c.id}</b></a>: {c.title}</li>)}</ul>
    </>
  );
}
function Live() {
  return (
    <>
      <p className="uxm-lede">Nothing on this site is a screenshot. These pages render the SDK's own components, in the theme, from the stories that test them.</p>
      <ul className="uxm-grid">
        <li><a className="uxm-tile uxm-tile--link" href={THEME_PAGE}><span className="uxm-tile__icon"><Icon icon={iconPalette} /></span><h3>The UX Builder theme</h3><p>Its logos, palette and CSS, and every widget, AI component and screen pattern wearing it.</p></a></li>
        <li><a className="uxm-tile uxm-tile--link" href={`${ROOT}themes/`}><span className="uxm-tile__icon"><Icon icon={iconSparkles} /></span><h3>All public themes</h3><p>Open any theme's page, or enter your own theme's name.</p></a></li>
        <li><a className="uxm-tile uxm-tile--link" href={`${ROOT}storybook/`}><span className="uxm-tile__icon"><Icon icon={iconScanEye} /></span><h3>Storybook</h3><p>Every widget and pattern, with controls and an accessibility panel.</p></a></li>
      </ul>
    </>
  );
}
function Releases() {
  return (
    <>
      <p className="uxm-lede">Generated from each package's changelog. Versions and notes come from Changesets.</p>
      {RELEASES.map((r) => (
        <section key={r.name} className="uxm-release">
          <H2 id={r.name.replace(/[@/]/g, "-").replace(/^-/, "")}><code>{r.name}</code></H2>
          {r.versions.map((v) => <div key={v.version}><h3>{v.version}</h3><ul>{v.notes.map((n, i) => <li key={i}><Md>{n}</Md></li>)}</ul></div>)}
          <p><a href={r.url}>Full changelog →</a></p>
        </section>
      ))}
    </>
  );
}

export const PAGES = {
  "why/problem": Problem, "why/audience": Audience, "why/principles": Principles, "why/roadmap": Roadmap,
  "start/new-app": NewApp, "start/existing-app": ExistingApp, "start/theme-from-logo": ThemeFromLogo, "start/agents": Agents, "start/ci": Ci,
  "concepts/themes": Themes, "concepts/tokens": Tokens, "concepts/patterns": Patterns, "concepts/generative-ui": GenerativeUi,
  "reference/packages": Packages, "reference/components": Components, "reference/screen-patterns": ScreenPatterns, "reference/ai-components": AiComponents, "reference/cli": Cli,
  "proof/decisions": Decisions, "proof/features": Features, "proof/live": Live, "proof/releases": Releases,
};
