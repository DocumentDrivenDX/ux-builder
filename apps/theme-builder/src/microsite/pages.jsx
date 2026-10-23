import { DataTable, Icon, Notice, StatusPill } from "@ux-builder/ui";
import { iconBot, iconPalette, iconScanEye, iconShieldCheck, iconSparkles, iconWand2 } from "@ux-builder/ui/icons";
import { Fragment } from "react";
import { AiSection, Command, GUARDS, LiveDemo, PACKAGES } from "../home/Home.jsx";
import { ROOT } from "../site-root.js";
import { href } from "./nav.js";
import { AdaptiveCards, Cli, EntryPoints, Rules, Sources, Traceability } from "./reference.jsx";
import { AI, CONTRACT_LIST, DECISIONS, FEATURES, PATTERNS, RELEASES, REPO, WIDGETS } from "./sources.js";

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

// The Why, Start and Concepts pages' live demos, generated drawings and counts (SD-002, 2026-10-21).
import { AI_AUDIT_CHECKS, AI_RULE_FAMILIES, ASSISTANT_COMPONENTS, AdaptiveCardDemo, ApprovalDemo, BlueprintCheckDemo, CARD_CHECKS, CardCheckDemo, ConversationDemo, DRAFT_CARD, FLOW_JOURNEY_RULES, FLOW_MERMAID, FlowDiagram, HybridDemo, RENDERABLE_NAMES, SAMPLE_BLUEPRINT, THEME_BUILDER_MANIFEST, Wireframes } from "./demos.jsx";
import { LATER, LATER_EPIC, NEXT } from "./roadmap.js";

/* Where the rules come from, and that UX Builder is no one else's: on every page that cites a guideline. */
const Affiliation = () => (
  <p className="uxm-cite">The rules restate Apple's Human Interface Guidelines, Material Design 3, WCAG 2.2 and the WAI-ARIA Authoring Practices in UX Builder's own words, with links to each. The AI rules also restate Microsoft's HAX Toolkit, its design and Learn guidance and the Adaptive Cards documentation, Google PAIR's People + AI Guidebook, and Cheng, Liang, Schoop and Nichols (IUI '26). UX Builder is not affiliated with or endorsed by Apple, Google or Microsoft. Human Interface Guidelines is a trademark of Apple Inc.; Material Design is a trademark of Google LLC; Microsoft, Copilot, Microsoft Teams, Adaptive Cards and HAX Toolkit are trademarks of the Microsoft group of companies.</p>
);

function Problem() {
  return (
    <>
      <p className="uxm-lede">Every app UX Builder touches should look and behave like its brand from its first commit, and keep doing so as brands, design systems and people change, without anyone hard-coding a colour, a font or a widget.</p>
      <H2 id="problem">The problem</H2>
      <p>Each new app starts by re-deciding its look. Colours are copied from a logo by eye and fail contrast; widgets are rebuilt, then drift; fonts load differently in every app; moving an app to another design system means rewriting it.</p>
      <p>AI coding agents make it worse. Asked for "a filter bar", they invent one, with literal colours. Asked for a chat screen, they build it from memory, with no way to stop a reply and approvals that are automatic or missing. The result is apps that look approximately like the brand, cost developer time to keep that way, and cannot be re-themed.</p>
      <H2 id="different">What makes it different</H2>
      <ol className="uxm-points">
        <li><b>A theme is a brand on a design system.</b> Identity (colours, logo, fonts) is separate from anatomy (shapes, type, density, icons), so any brand can be shown in Material, Fluent, Carbon, Databricks or its own look, and a new brand is a file, not a fork.</li>
        <li><b>AI steers; a deterministic engine decides.</b> A model turns "more conservative, it's a law firm" into bounded settings; the engine chooses every colour, so every option is reproducible and passes contrast before anyone sees it.</li>
        <li><b>Accessible by construction.</b> Every theme, in every appearance, on every design system, passes the same 4.5:1 contrast gate in CI. Nothing ships that fails.</li>
        <li><b>Built for agents as much as people.</b> The same source generates the documentation, the catalogue and the agent guidance, so they cannot drift from what ships.</li>
        <li><b>Whole screens, at any width.</b> Patterns carry the structure and states (empty, error, loading) that widgets alone do not, and adapt from a desktop window to a phone or a narrow embedded panel.</li>
        <li><b>Planned, checked, then assessed.</b> The blueprint holds an app's screens, flows and AI roles to cited rules before any code exists; lint and the audit check what was built; the UX assessment walks its journeys against its HELIX stories.</li>
      </ol>
      <H2 id="not">What it is not</H2>
      <ul>
        <li>Not a design system competing with Material or Carbon: it carries them.</li>
        <li>Not a page builder or app framework: apps own their content, data, routing and logic.</li>
        <li>Not an AI runtime or model provider. It ships its own assistant components (<code>@ux-builder/ui/assistant</code>) and an Adaptive Cards renderer (<code>@ux-builder/ui/adaptive-cards</code>), with adapters for the AI SDK and assistant-ui, but the app brings the model, the runtime and the data, and nothing the SDK ships calls a model.</li>
        <li>Not a way to publish without review: themes go through ordinary code review, and the assessment proposes changes as patches a person accepts.</li>
        <li>Not proof of usability: a clean audit or assessment says what it checked and what is left for representative users to confirm.</li>
      </ul>
      <Cite ids={["Product vision", "ADR-013", "ADR-014", "ADR-023", "ADR-029"]} />
    </>
  );
}

const AUDIENCE = [
  { who: "App developers", icon: iconWand2, get: "Widgets, screen patterns, an assistant, fonts, icons and themes from packages; a starter that is on the design system and on HELIX from the first commit; lint rules and an audit that keep it there." },
  { who: "Brand owners", icon: iconPalette, get: "A guided builder: logo in, palette options shown on real widgets in light and dark, plain-language feedback, a theme saved for review." },
  { who: "AI coding agents", icon: iconBot, get: "Guidance, a catalogue and an MCP server that name the real widgets, patterns, tokens and rules, and check a blueprint or an Adaptive Card before anything is built or sent." },
  { who: "App owners and UX reviewers", icon: iconScanEye, get: "An assessment of the running app against its HELIX stories: journeys walked in place, AI journeys in three scenarios, and a report of what was checked, seen and left uncertain, with proposals as patches." },
  { who: "Design-system maintainers", icon: iconShieldCheck, get: "One design system to maintain instead of one per app; brands delivered as data, not code." },
];
function Audience() {
  return (
    <>
      <p className="uxm-lede">UX Builder serves {AUDIENCE.length} readers at once. Each gets something different from the same source.</p>
      <ul className="uxm-grid">{AUDIENCE.map((a) => <li key={a.who} className="uxm-tile"><span className="uxm-tile__icon"><Icon icon={a.icon} /></span><h3>{a.who}</h3><p>{a.get}</p></li>)}</ul>
      <H2 id="paths">Where to go next</H2>
      <ul>
        <li>Developers: <a href={href("start", "new-app")}>start a new app</a> or <a href={href("start", "existing-app")}>add it to an existing one</a>.</li>
        <li>Brand owners: <a href={href("start", "theme-from-logo")}>make a theme from your logo</a>.</li>
        <li>Agents and the people who run them: <a href={href("start", "agents")}>work with AI coding agents</a>.</li>
        <li>App owners and UX reviewers: <a href={href("start", "assess")}>assess an app's UX</a>.</li>
      </ul>
      <Cite ids={["Product vision", "FEAT-009"]} />
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

const NOW = [
  ["FEAT-001 to FEAT-003", "Role-based tokens and themes on four shared design systems, the palette engine and the guided theme builder"],
  ["FEAT-004, FEAT-006", "Widgets, screen patterns, fonts and icons on the public npm registry; lint rules, the audit, agent guidance and the MCP server"],
  ["FEAT-007", "The SDK's own assistant, with adapters for the AI SDK and assistant-ui, and bridges that dress AI Elements and assistant-ui"],
  ["FEAT-008", "Interaction rules and the blueprint check, before any code"],
  ["FEAT-009", "The UX assessment of a HELIX-governed app"],
  ["FEAT-010", "A starter that begins on HELIX"],
  ["FEAT-011", "AI and agent experience rules, the audit's AI checks, and Adaptive Cards in your theme"],
  ["FEAT-012", "Screen flows and journeys in the blueprint, drawn and drafted into HELIX"],
  ["FEAT-013", "Annotated walkthrough videos of each assessed journey"],
  ["FEAT-014", "App modalities: responsive web, chat and hybrid chat, chosen when the app is created"],
  ["FEAT-015", "Findings by journey, each with its rule spelled out"],
  ["FEAT-016", "The episode trace, and learning from the builds owners choose to share"],
  ["FEAT-017", "Diagram and chart tokens in every theme"],
];
const Item = ({ x }) => <li><span>{x.title}</span>{x.features.length > 0 && <span className="uxm-hint"> ({x.features.join(", ")})</span>}</li>;
function Roadmap() {
  return (
    <>
      <p className="uxm-lede">Where UX Builder is, where it is going, and the numbers it is judged by. Next and Later are read from the project's open work items when this site is built.</p>
      <div className="uxm-grid uxm-grid--3">
        <div className="uxm-tile" data-roadmap="now"><StatusPill state="live">Now</StatusPill><ul>{NOW.map(([f, t]) => <li key={f}>{t} <span className="uxm-hint">({f})</span></li>)}</ul></div>
        <div className="uxm-tile" data-roadmap="next"><StatusPill state="evaluation">Next</StatusPill><ul>{NEXT.map((x) => <Item key={x.id} x={x} />)}</ul></div>
        <div className="uxm-tile" data-roadmap="later"><StatusPill state="purchasing">Later</StatusPill>{LATER_EPIC && <p>{LATER_EPIC.title}:</p>}<ul>{LATER.map((x) => <Item key={x.id} x={x} />)}<li>A hosted builder for brand owners who are not developers</li><li>Frameworks beyond React if a team needs one</li></ul></div>
      </div>
      <H2 id="measures">Measures of success</H2>
      <ul className="uxm-stats">
        <li><b>0</b><span>hard-coded presentation values in adopting apps</span></li>
        <li><b>&lt;30 min</b><span>from a logo to a reviewed theme</span></li>
        <li><b>&lt;1 hr</b><span>from nothing to a themed screen</span></li>
        <li><b>90%</b><span>of agent-built components on SDK widgets and tokens</span></li>
      </ul>
      <Cite ids={["Product vision", "FEAT-005", "FEAT-007", "FEAT-008", "FEAT-009", "FEAT-010", "FEAT-011", "FEAT-012", "FEAT-013", "FEAT-014", "FEAT-015", "FEAT-016", "FEAT-017"]} />
    </>
  );
}

/* ---- Start ---- */

const MODALITIES = [
  { modality: "responsive-web", starts: "An `AppShell` with one empty Home screen, whose navigation adapts by size class" },
  { modality: "chat", starts: "A full-screen `Conversation` from `@ux-builder/ui/assistant`, with its composer and AI disclosure" },
  { modality: "hybrid-chat", starts: "A `Conversation` whose replies draw Adaptive Card parts" },
];
const HELIX_OPTIONS = [
  { option: "--helix-version <tag>", effect: "Start on this HELIX release instead of the latest. If it cannot be fetched and verified, nothing is written." },
  { option: "--helix-offline", effect: "Use the HELIX bundled with the starter, with no network request. Not with `--helix-version`." },
  { option: "--no-helix", effect: "Leave HELIX out: no marker, documents, skill or `ux-assessment.yml`. The app still gets `e2e/starter.spec.js` and `npm run test:e2e`, without `@covers` lines." },
];
function NewApp() {
  return (
    <>
      <p className="uxm-lede">One command gives you a React + Vite app that wears a theme from its first commit, is governed by HELIX, and has lint, the audit, a browser test and CI already wired up.</p>
      <H2 id="create">Create the app</H2>
      <Command text="npm create @ux-builder/app my-app -- --modality responsive-web --theme ux-builder-databricks" />
      <Command text="cd my-app && npm install && npm run dev" />
      <H2 id="modalities">Choose its modalities</H2>
      <p><code>--modality</code> says what the app is, and the starter builds that shell from SDK components, with no sample data. Name several, comma-separated, for an <code>AppShell</code> with one destination per modality. In a terminal, without it, the starter asks; without one (an agent, CI) it is required, and nothing is written without it.</p>
      <DataTable caption="Modalities" rowKey="modality" columns={[{ key: "modality", label: "Modality", render: (r) => <code>{r.modality}</code> }, { key: "starts", label: "The app starts as", render: (r) => <Md>{r.starts}</Md> }]} rows={MODALITIES} />
      <p>The modalities are recorded in <code>app.blueprint.json</code> as <code>supports.modalities</code>. They choose the rules the blueprint check applies and the widths and checks the audit runs, and the app's <code>AGENTS.md</code> names the components and rule families for each. Native iOS, Android, macOS and Windows apps are future modalities and are refused.</p>
      <H2 id="inside">What's inside</H2>
      <ul>
        <li>The theme's CSS and fonts, and <code>ThemeProvider</code> with a light, auto and dark switch</li>
        <li>The theme's logo and favicon</li>
        <li>The empty shell of its modalities, built only from SDK components</li>
        <li><code>npm run lint</code> (including the <code>ux-builder/ai-neutral-voice</code> warning) and <code>npm run audit</code>, and a CI workflow that runs the blueprint check, lint and the audit</li>
        <li><code>CLAUDE.md</code> and <code>AGENTS.md</code> pointing at the SDK's guidance, and the Claude Code skill <code>ux-builder-ui</code></li>
        <li><code>app.blueprint.json</code>, the plan of the app's screens, and <code>npm run check:blueprint</code></li>
        <li>HELIX, its documents, <code>ux-assessment.yml</code> and <code>e2e/starter.spec.js</code> (below)</li>
        <li>The episode trace (<code>@ux-builder/trace</code>): creating the app is its first episode, <code>npm run lint</code> records each run, and a Claude Code hook attaches each session's transcript (<a href={`${href("start", "agents")}#trace`}>below, for agents</a>)</li>
      </ul>
      <H2 id="helix">On HELIX from the first commit</H2>
      <p>The app is created on the latest HELIX release: its skill and catalogue in <code>.claude/skills/helix/</code>, with <code>HELIX-VERSION.json</code> recording the version, where it came from and its digest; the <code>.helix.yml</code> marker; and the starter set of HELIX documents in <code>docs/helix/</code>, drafted from that release's templates:</p>
      <ul>
        <li>the product vision, the PRD and the concerns;</li>
        <li><code>FEAT-001</code> and <code>US-001</code> for the shell of its modalities;</li>
        <li><code>DESIGN.md</code>, the test plan and <code>STP-001</code>.</li>
      </ul>
      <p>What the starter knows (the name, theme, stack, the screen's criteria, design choices and checks) is filled in. The product's purpose, users, goals and metrics are yours to write. The release is verified against GitHub's SHA-256 digest; if it cannot be fetched, the HELIX bundled with the starter is used, and the app records why.</p>
      <H2 id="order">Work docs first</H2>
      <p>The app's <code>CLAUDE.md</code> and <code>AGENTS.md</code> give people and agents the same order of work:</p>
      <ol className="uxm-points">
        <li><b>Frame the requirement in HELIX first</b> (<code>/helix frame</code>, <code>/helix evolve</code>): a story with acceptance criteria, before any code.</li>
        <li><b>Plan its screens</b> in <code>app.blueprint.json</code> and run <code>npm run check:blueprint</code>.</li>
        <li><b>Build each screen</b> from its pattern inside a <code>Page</code>, within the app's <code>AppShell</code>.</li>
        <li><b>Cite the story's criteria in its tests</b> (<code>// @covers US-&lt;n&gt;-AC&lt;m&gt;</code>), then run <code>npm run lint</code>, <code>npm run test:e2e</code> and <code>npm run audit</code>.</li>
        <li><b>Assess the UX</b>: <code>npm run assess:validate</code>, then the <code>ux-builder-assess</code> skill (<a href={href("start", "assess")}>Assess an app's UX</a>).</li>
      </ol>
      <H2 id="tests">The manifest and the starter's test</H2>
      <ul>
        <li><code>ux-assessment.yml</code> binds the UX assessment to the app's HELIX documents through <code>.helix.yml</code>, with one journey for <code>US-001</code>. <code>npm run assess:validate</code> checks it.</li>
        <li><code>e2e/starter.spec.js</code> is a Playwright test of the starter screen that cites <code>US-001</code>'s criteria. <code>npm run test:e2e</code> runs it.</li>
      </ul>
      <H2 id="helix-options">HELIX options</H2>
      <DataTable caption="HELIX options" rowKey="option" columns={[{ key: "option", label: "Option", render: (r) => <code>{r.option}</code> }, { key: "effect", label: "Effect", render: (r) => <Md>{r.effect}</Md> }]} rows={HELIX_OPTIONS} />
      <Command text="npm create @ux-builder/app my-app -- --theme ux-builder-databricks --helix-offline" />
      <p>The HELIX request reads <code>GITHUB_TOKEN</code> if it is set (never written) and honours <code>HTTPS_PROXY</code>, <code>HTTP_PROXY</code> and <code>NO_PROXY</code>.</p>
      <H2 id="plan">Plan the screens first</H2>
      <p>Before building a screen, add it to <code>app.blueprint.json</code>: its pattern, its actions and where each leads, what it deletes and how that is safeguarded, its states, its modals, and what AI does on it, if anything. The check holds the plan to the interaction rules (navigation for the space available, one modal at a time, safeguards, states, flows and journeys) before any code exists. To start from your own plan:</p>
      <Command text="npm create @ux-builder/app my-app -- --blueprint plan.json" />
      <p>A plan with an error is refused, with each error, and nothing is written. <a href={href("concepts", "flows-journeys")}>Flows and journeys</a> explains the plan's model.</p>
      <Affiliation />
      <Notice tone="info" title="Node 20 or later, React 19">Without <code>--theme</code>, the app starts on <code>plain</code>.</Notice>
      <Cite ids={["FEAT-010", "ADR-027", "FEAT-008", "FEAT-014", "ADR-032", "FEAT-016"]} />
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
      <H2 id="rules">Adopt the interaction rules</H2>
      <p>Describe the screens you already have, check the plan, and let the audit fail only on what is new:</p>
      <Command text="npx ux-builder-blueprint init" />
      <Command text="npx ux-builder-blueprint check app.blueprint.json" />
      <Command text="npx ux-builder-audit --write-baseline audit-baseline.json http://localhost:4173/" />
      <Command text="npx ux-builder-audit --baseline audit-baseline.json http://localhost:4173/" />
      <p>Commit the blueprint and the baseline. Findings you fix show as resolved, so the baseline only shrinks. If the app is governed by HELIX, <a href={href("start", "assess")}>assess its UX</a> next.</p>
      <Affiliation />
      <Cite ids={["CONTRACT-003", "CONTRACT-004", "CONTRACT-005"]} />
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
      <p>Any MCP client can run it over stdio. It answers with themes, widgets and their props, tokens with their purposes, icons, rules, recipes and guidance, and it checks plans and cards: <code>check_blueprint</code> checks a blueprint, <code>propose_from_blueprint</code> drafts HELIX content from one, <code>check_card</code> checks an Adaptive Card before an agent sends it, and <code>get_assessment_skill</code> and <code>validate_assessment_manifest</code> serve the UX assessment to agents without a shell.</p>
      <H2 id="guidance">Guidance and the skills</H2>
      <ul>
        <li><code>node_modules/@ux-builder/ui/AGENTS.md</code>: the rules, set-up, and a reference of every component, prop, token, icon and theme.</li>
        <li>The Claude Code skill <code>ux-builder-ui</code>, which the starter installs.</li>
        <li>The skill <code>ux-builder-assess</code>, in <code>node_modules/@ux-builder/audit/skill/</code>, for <a href={href("start", "assess")}>assessing an app's UX</a>.</li>
      </ul>
      <H2 id="loop">Plan, check, build, lint, audit, assess</H2>
      <p>Agents get the interaction rules where they plan. Over MCP, <code>list_recipes</code> suggests patterns for a job, <code>get_rules</code> gives the rules for a context, size classes, inputs (never a device) and AI roles, and <code>check_blueprint</code> checks the plan. Each finding has a rule ID, a path and a fix. Then the agent builds each screen from its pattern, lint and the audit check the result against the same rule IDs, and the assessment walks the journeys.</p>
      <H2 id="trace">The episode trace</H2>
      <p>Every change to an app's UI is an <b>episode</b>. The SDK's tools record what they told the agent and every check, with how many tries it took to pass, in <code>.ux-builder/trace/</code>, committed with the code. The agent adds its side: it opens an episode, records each pattern choice, departure and workaround with its reason, ends each commit message with the <code>UX-Episode:</code> trailer, and closes the episode. A created app's <code>AGENTS.md</code> asks for this.</p>
      <Command text={'npx ux-builder-trace start --goal "Review screen" --story US-003'} />
      <Command text={'npx ux-builder-trace decide --chose CollectionList --why "a queue the reviewer works through"'} />
      <Command text="npx ux-builder-trace end" />
      <p>Over MCP, <code>start_episode</code>, <code>record_decision</code> and <code>end_episode</code> do the same. Secrets are masked, and nothing is ever sent anywhere: an owner shares episodes only by running <code>ux-builder-trace export</code>, which lists every file and asks first.</p>
      <Affiliation />
      <H2 id="demo">See it work</H2>
      <AiSection />
      <Cite ids={["FEAT-004", "FEAT-011", "ADR-023", "FEAT-016", "ADR-035", "CONTRACT-007"]} />
    </>
  );
}

function Ci() {
  return (
    <>
      <p className="uxm-lede">Lint reads the source and the audit drives the running app; on AI screens, the audit's AI checks read the markers the SDK's assistant emits. The blueprint check holds the plan of the screens to the interaction rules before any of it is built.</p>
      <ul className="uxm-grid">{GUARDS.map((g) => <li key={g.title} className="uxm-tile"><span className="uxm-tile__icon"><Icon icon={g.icon} /></span><h3>{g.title}</h3><p>{g.text}</p><code className="uxm-tile__code">{g.code}</code></li>)}</ul>
      <H2 id="lint">Lint</H2>
      <Command code text={'// eslint.config.js\nimport uxBuilder from "@ux-builder/ui/eslint";\nexport default [{\n  files: ["src/**/*.{js,jsx}"],\n  plugins: { "ux-builder": uxBuilder },\n  rules: {\n    "ux-builder/no-hard-coded-values": ["error", { theme: "ux-builder-databricks" }],\n    "ux-builder/no-foreign-ui": "error",\n    "ux-builder/no-inline-svg": "error",\n    "ux-builder/ai-neutral-voice": "warn",\n  },\n}];'} />
      <p><code>ux-builder/ai-neutral-voice</code> warns on UI text that presents an AI as thinking or feeling ("I think", "I understand"), and on labels that make the AI the actor ("Copilot, summarize") where the user's verb should lead.</p>
      <H2 id="audit">The audit</H2>
      <Command text={'npx ux-builder-audit --serve "npm run preview -- --port 4173" http://localhost:4173/'} />
      <p>It writes <code>audit-report/index.html</code> with screenshots and exits 1 on an error. Every finding names its rule: its ID, its statement in full, its sources and the fix.</p>
      <p>The report opens with two verdicts: the <b>theme</b> (applied, SDK components only, contrast in light and dark) and the <b>fit of each modality</b> (the components it needs, and whether its rule families were checked). The modalities come from the blueprint, else <code>--modality</code>, and choose the widths and checks that run. With <code>--blueprint</code> and its journeys, the report then follows each journey step by step, with each screen's screenshot and its findings drawn on it.</p>
      <H2 id="ai-checks">The AI checks</H2>
      <p>{AI_AUDIT_CHECKS.length} checks look only at AI markup (<code>data-piq-ai</code> and its companions), which the SDK's assistant components and Adaptive Cards emit and an app's own AI UI adds, so a page without it gets no AI finding: {AI_AUDIT_CHECKS.map((c, i) => <Fragment key={c}>{i ? ", " : ""}<code>{c}</code></Fragment>)}. With <code>--blueprint app.blueprint.json</code>, a screen showing AI markup must declare an AI role, and its roles select the agent checks.</p>
      <Command text="npx ux-builder-audit --blueprint app.blueprint.json --width 390 --width 1280 http://localhost:4173/" />
      <H2 id="blueprint">The blueprint check</H2>
      <Command text="npx ux-builder-blueprint check app.blueprint.json" />
      <p>It exits 1 on an error. In an existing app, <code>--baseline</code> lets the audit fail only on new findings.</p>
      <Cite ids={["FEAT-004", "FEAT-008", "FEAT-011", "FEAT-014", "FEAT-015", "CONTRACT-005"]} />
    </>
  );
}

function Assess() {
  return (
    <>
      <p className="uxm-lede">The UX assessment walks a HELIX-governed app's journeys the way a careful reviewer would, and reports what it checked, what it saw and what is left for representative users to confirm. A coding agent does the reasoning, guided by a skill; <code>ux-builder-audit assess</code> does the deterministic work. It changes nothing in the app or its HELIX documents.</p>
      <H2 id="manifest">1. The manifest</H2>
      <p><code>ux-assessment.yml</code> binds HELIX rather than restating it: it names the flow, how to start the app (local or staging only), the roles, and the journeys by story ID, or by a journey of the app's <a href={href("concepts", "flows-journeys")}>blueprint</a>. The starter writes one; for any other app, <code>init</code> proposes one, with placeholders for what it cannot work out.</p>
      <Command code text={'version: 1\napp: { name: Review app }\nhelix: { flow: helix }\nrun: { start: npm run preview, baseUrl: http://127.0.0.1:4173/, environment: local }\nroles: [{ id: reviewer, auth: { storageState: .auth/reviewer.json } }]\njourneys:\n  - { id: J-review, story: US-012, priority: critical, role: reviewer, entry: /queue }\ntests: [{ id: e2e, command: npm run test:e2e }]\nrestrictions: { writes: report-only }'} />
      <Command text="npx ux-builder-audit assess init" />
      <Command text="npx ux-builder-audit assess validate" />
      <p><code>validate</code> checks the manifest against its schema, the repository and HELIX: the marker as HELIX reads it, existing stories, criteria and commands, credentials only by reference.</p>
      <H2 id="skill">2. The skill</H2>
      <p>Point your agent at <code>ux-builder-assess</code> (in <code>node_modules/@ux-builder/audit/skill/</code>, or over MCP with <code>get_assessment_skill</code>). It runs the stages in order, each writing under <code>ux-assessment/&lt;run&gt;/</code>:</p>
      <ol className="uxm-points">
        <li><b>Context</b>: <code>assess validate</code>.</li>
        <li><b>Traceability</b>: <code>assess collect</code> maps each journey to its HELIX criteria and the tests that cite them with <code>@covers</code>, or marks them uncovered.</li>
        <li><b>Baseline</b>: <code>assess baseline</code> runs the declared tests and the audit before anything else.</li>
        <li><b>Plan</b>: <code>assess plan</code> writes each journey's goal, criteria and expected outcomes, and a coverage matrix of every journey and state.</li>
        <li><b>Walk and inspect</b>, below.</li>
        <li><b>Findings, proposals and the report</b>, below.</li>
      </ol>
      <H2 id="walkthroughs">3. Walkthroughs</H2>
      <p><code>assess browser</code> starts Chromium for the agent's browser driver and refuses every host outside the manifest's origins. The agent walks each journey from its entry, and at each significant step <code>assess inspect</code> inspects the page in place, with no reload, writing the audit's findings, a screenshot and the accessibility tree. A state the agent did not reach is recorded as not assessed, never as passed.</p>
      <H2 id="scenarios">4. AI journeys: three scenarios</H2>
      <p>A journey through an assistant or an agent is marked <code>ai: true</code> and walked three times, with the catalogue's AI rules as its heuristics:</p>
      <ul className="uxm-grid">
        <li className="uxm-tile"><h3>Normal</h3><p>The task as intended.</p></li>
        <li className="uxm-tile"><h3>Error-prone</h3><p>An ambiguous or failing request: is the error shown in place, and can the user recover without starting again?</p></li>
        <li className="uxm-tile"><h3>Risky</h3><p>A step with a high-impact action. The walk stops at the approval, records it, chooses Deny and takes nothing more.</p></li>
      </ul>
      <Notice tone="warning" title="Never approve">No step that would activate an approve control (<code>data-piq-ai-control="approve"</code>) is ever taken, in any scenario, and no manifest can allow one. If the high-impact step is reached with no approval on screen, the walk stops before it and records a P1 finding against <code>agent.approve-high-impact</code>.</Notice>
      <Command code text={'scenarios:\n  normal:     { description: "the task as intended" }\n  errorProne: { description: "an ambiguous or failing request" }\n  risky:      { description: "a step with a high-impact action", step: 4 }'} />
      <H2 id="report">5. The report</H2>
      <p><code>assess merge</code> makes one finding per user problem, each with a stable ID and every piece of evidence. <code>assess propose</code> writes a change to a HELIX artifact as a patch, applied only by a person. Then:</p>
      <Command text="npx ux-builder-audit assess report ux-assessment/<run>" />
      <p>It writes <code>report.html</code>, <code>report.md</code> and <code>evidence.json</code>: what was checked, seen and left uncertain. Findings are grouped by journey, then the state it was walked in, then step, each with its rule's ID and full statement (or its heuristic and source), the evidence, a severity on Nielsen's 0 to 4 scale and the fix. <code>report.md</code> is a HELIX <i>usability-evaluation-report</i>. Every conclusion is labelled deterministic, observed, heuristic, SDK adoption or real user; confusion, trust and time saved are left for representative users. <code>assess compare</code> says which findings are new, persistent, resolved or regressed between two runs, and <code>assess gate --fail-on P1</code> fails CI on an open finding at that priority.</p>
      <H2 id="video">6. Walkthrough videos</H2>
      <p><code>assess video</code> replays each walked journey in a browser of its own, signed in as its role, with sensitive data masked from the first frame, and pauses at each finding. For every journey it writes an MP4 with the findings drawn in, captions and a chapter per step, and a player whose findings pop up, pause the video and link to the report. Each caption gives the problem in plain English, the rule and the fix. It needs <code>ffmpeg</code> on the path.</p>
      <Command text="npx ux-builder-audit assess video --run <run> --pace slow" />
      <p><code>--pace</code> is <code>slow</code>, <code>normal</code> (the default) or <code>fast</code>; a finding stays on screen long enough to read its caption.</p>
      <H2 id="example">Example: the theme builder assesses itself</H2>
      <p>This project's own guided builder has a manifest, <a href={`${REPO}/blob/main/apps/theme-builder/ux-assessment.yml`}><code>apps/theme-builder/ux-assessment.yml</code></a>: three journeys from its HELIX stories (logo to theme, US-015; refining with feedback, US-018; saving and adopting, US-019), run on the mock model and a throwaway repository, audited at 390 and 1280 pixels, report only. Its assessment of 21 October 2026 proposed three changes to the builder's stories, which wait for the operator's decision.</p>
      <details className="uxm-details"><summary>The whole manifest</summary><Command code text={THEME_BUILDER_MANIFEST.trim()} /></details>
      <p className="uxm-cite">A clean audit is not proof of usability or of full accessibility compliance, and passing functional tests do not show that usability criteria are met.</p>
      <Cite ids={["FEAT-009", "FEAT-011", "FEAT-013", "FEAT-015", "ADR-026", "ADR-031", "ADR-033", "CONTRACT-006"]} />
    </>
  );
}

function MicrosoftAgents() {
  return (
    <>
      <p className="uxm-lede">Agents built for Microsoft's hosts (Teams, Outlook, Copilot) and Bot Framework agents answer with Adaptive Cards. <code>@ux-builder/ui/adaptive-cards</code> draws those cards with the SDK's own components in your app's theme, and <code>checkCard</code> checks a card before the agent sends it.</p>
      <H2 id="render">Render a card in your theme</H2>
      <Command code text={'import { AdaptiveCard } from "@ux-builder/ui/adaptive-cards";\n\n<AdaptiveCard card={payload} onAction={({ type, id, verb, data, inputs }) => reply({ verb, data, inputs })} />'} />
      <p>Every element of the open-source schema 1.6 becomes an SDK widget or pattern, so a card takes the app's theme like any screen. The theme is the host config: spacing, type sizes, container styles (<code>emphasis</code>, <code>good</code>, <code>attention</code>, <code>warning</code>, <code>accent</code>) and action styles map to role tokens; a card cannot set colours or fonts. A <code>ColumnSet</code> stacks at the compact size class. <code>onAction</code> is called for <code>Action.Submit</code> and <code>Action.Execute</code>; <code>Action.OpenUrl</code> is a link marked as leaving the app. Text is never inserted as HTML. Try it: this card's Pay action is marked high-impact.</p>
      <AdaptiveCardDemo />
      <H2 id="conversation">In a conversation</H2>
      <p>In the SDK's <code>Conversation</code>, a tool result <code>{'{ type: "adaptive-card", card }'}</code>, or the card itself, is an <code>adaptive-card</code> part, and <code>onCardAction</code> receives its actions. The AI SDK and assistant-ui adapters turn such tool outputs into card parts.</p>
      <H2 id="high-impact">Mark high-impact actions</H2>
      <p>An action that pays, sends, deletes or publishes carries a marker in its <code>data</code>. The user approves it before <code>onAction</code> fires, and the marker is removed from <code>data</code>. An action with <code>style: "destructive"</code> gets the destructive-action safeguard.</p>
      <Command code text={'{ "type": "Action.Execute", "title": "Pay invoice", "verb": "pay",\n  "data": { "invoice": "INV-2041",\n            "ux-builder": { "highImpact": true, "consequence": "Pay £120.00 to Acme Ltd" } } }'} />
      <p>Approval never depends on guessing: the marker is the only signal, and nothing in the card or claimed by a tool decides it.</p>
      <H2 id="check">Check a card before it is sent</H2>
      <Command code text={'import { checkCard } from "@ux-builder/ui/adaptive-cards";   // or "@ux-builder/ui/adaptive-cards/check" in Node\n\nconst findings = checkCard(card);   // [{ rule, severity, path, message, fix }]'} />
      <p>It checks the payload against the vendored 1.6 JSON Schema, then the card rules: {CARD_CHECKS.map((c, i) => <Fragment key={c}>{i ? ", " : ""}<code>{c}</code></Fragment>)}. Each finding has a JSON Pointer into the card. Over MCP, <code>check_card</code> returns the same, so an agent checks its own card. This is an agent's first draft of the card above, and what <code>checkCard</code> says about it, live:</p>
      <Command code text={JSON.stringify(DRAFT_CARD, null, 2)} />
      <CardCheckDemo />
      <H2 id="unsupported">What is not supported</H2>
      <ul>
        <li><b>Hub-only and host-specific elements</b>, such as <code>Chart</code>, <code>Badge</code>, <code>Carousel</code>, <code>CodeBlock</code> and <code>Rating</code>: each shows its <code>fallback</code>, or is dropped with a plain notice.</li>
        <li><b>Templating</b>: a <code>{"${…}"}</code> expression is not evaluated; it stays as text. Bind the data before the card is sent.</li>
        <li><b><code>Refresh</code> and <code>Authentication</code></b>: not supported; they fall back in the same way.</li>
        <li><b>Versions above 1.6</b>: the card's supported parts render, and it says so.</li>
        <li><b>Emitting cards</b> and Adaptive Cards host config from your themes, for apps that post to Teams, Outlook or Copilot, is not built yet; it is on the <a href={href("why", "roadmap")}>roadmap</a>.</li>
      </ul>
      <Affiliation />
      <Cite ids={["ADR-029", "FEAT-011", "CONTRACT-004"]} />
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
      <H2 id="diagrams">Diagrams and charts</H2>
      <p>Every theme also carries the colours and shapes a diagram or chart draws with, so neither needs a raw hex:</p>
      <ul>
        <li><b>Status</b>: <code>--piq-color-status-positive</code>, <code>-caution</code>, <code>-negative</code> and <code>-info</code>, each with a <code>-subtle</code> fill.</li>
        <li><b>Series</b>: <code>--piq-color-series-1</code> to <code>-8</code>. Slot <i>n</i> is the same hue family in every theme (1 blue, 2 orange, 3 aqua…), so a legend means the same thing on any site.</li>
        <li><b>Structure</b>: three region tints for groups, three edge weights, and lifecycle tints for parts planned, decided or unknown.</li>
        <li><b>Shape</b>: <code>--piq-size-diagram-stroke</code>, <code>-stroke-strong</code> and <code>--piq-radius-diagram-node</code>, which each design system may set.</li>
      </ul>
      <p>The contrast gate checks every pairing they draw, and that neighbouring series stay apart for readers with a colour-vision deficiency. Each <a href={THEME_PAGE}>theme's page</a> shows them. The availability colours (<code>state.*</code>) the <code>StatusPill</code> uses are a separate family.</p>
      <Cite ids={["ADR-015", "CONTRACT-001", "FEAT-017"]} />
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
      <p><a href={href("reference", "screen-patterns")}>Every pattern in the reference →</a> How screens connect is in <a href={href("concepts", "flows-journeys")}>Flows and journeys</a>.</p>
      <Cite ids={["ADR-020", "ADR-021", "ADR-022", "FEAT-006"]} />
    </>
  );
}

function GenerativeUi() {
  return (
    <>
      <p className="uxm-lede">AI UI in an app on the SDK takes one of three routes, and each wears the theme: <b>the SDK's own assistant</b>, a <b>bridge</b> for a chat library the app already uses, or a <b>view embedded</b> in a host that dresses it.</p>
      <H2 id="assistant">The SDK's own assistant</H2>
      <p><code>@ux-builder/ui/assistant</code> has {ASSISTANT_COMPONENTS.length} components ({ASSISTANT_COMPONENTS.map((c, i) => <Fragment key={c}>{i ? ", " : ""}<code>{c}</code></Fragment>)}). A conversation announces each finished reply once, never token by token, keeps focus in the composer, can be stopped from the keyboard, shows its reasoning, tool calls and sources, and never acts without the user's explicit approval. The components take messages and callbacks as props and import no AI library; an adapter connects them to a runtime:</p>
      <Command code text={'import { Conversation } from "@ux-builder/ui/assistant";\nimport { useAiSdkConversation } from "@ux-builder/ui/assistant/ai-sdk";   // or /assistant-ui: useAssistantUiConversation\n\nconst chat = useChat();   // @ai-sdk/react\n<Conversation {...useAiSdkConversation(chat)} />'} />
      <p>This one runs on a stand-in runtime that streams canned replies. Send a message, stop it, approve or deny the bill:</p>
      <ConversationDemo />
      <H2 id="generated">Generated UI from the catalogue</H2>
      <p>When the agent answers with a table or a form, the conversation renders the SDK's own component, not a block of HTML. Only renderable components are allowed ({RENDERABLE_NAMES.map((c, i) => <Fragment key={c}>{i ? ", " : ""}<code>{c}</code></Fragment>)}), with their props validated against a schema; anything else is refused with a plain notice. An agent built for Microsoft hosts may send an <a href={href("start", "microsoft-agents")}>Adaptive Card</a> instead.</p>
      <H2 id="bridges">Bridges for other libraries</H2>
      <p>An app that already uses AI Elements or assistant-ui keeps it: one stylesheet maps your theme onto the variables those libraries are styled by. They are bridged, not adopted as design systems.</p>
      <Command code text={'import "@ux-builder/tokens/themes/ux-builder-databricks.css";\nimport "@ux-builder/tokens/bridges/shadcn/ux-builder-databricks.css";   // after the theme'} />
      <p>Each bridge is contrast-checked like the theme, and follows <code>data-theme</code> and <code>data-appearance</code> with no <code>.dark</code> class.</p>
      <H2 id="embedded">Embedded views</H2>
      <p>A host can hand a view a theme's resolved values instead of a stylesheet: <code>&lt;ThemeProvider tokens={"{resolved.tokens}"}&gt;</code>. The view wears the host's theme and never draws the brand itself.</p>
      <p>The rules an AI screen is held to are in <a href={href("concepts", "ai-agent-experience")}>AI and agent experience</a>.</p>
      <Cite ids={["ADR-011", "ADR-012", "ADR-023", "ADR-024", "ADR-029", "FEAT-007"]} />
    </>
  );
}

const AI_MARKERS = [
  { marker: '`data-piq-ai="generated"`', on: "Content made by AI", audit: "A visible disclosure and a retry, regenerate, edit or undo control" },
  { marker: '`data-piq-ai="status"`', on: "The live region saying what the AI is doing", audit: "While busy, a reachable Stop or Pause in or beside it" },
  { marker: '`data-piq-ai="plan"`, `"step"`', on: "An agent's steps", audit: "Each step's status, in text" },
  { marker: '`data-piq-ai="approval"`', on: "A request for the user's approval", audit: "An approve and a deny control, neither pre-chosen" },
  { marker: '`data-piq-ai-actor`', on: "Who is acting now, on takeover", audit: "A live region that changes on takeover and hand-back" },
  { marker: '`data-piq-ai="prompt"`', on: "Where the user asks", audit: "Suggested starting points in an empty conversation" },
];
function AiAgentExperience() {
  return (
    <>
      <p className="uxm-lede">An AI feature is planned, built and checked like any other screen. A screen declares what AI does on it; that role selects the rules; the SDK's components mark their markup so the audit can check it; and the assessment walks the journey three times. Every demo on this page is the SDK's real component, in this site's theme.</p>
      <H2 id="roles">AI roles, per screen</H2>
      <ul className="uxm-grid">
        <li className="uxm-tile"><h3><code>generative</code></h3><p>AI output inside an ordinary screen: a summary, a draft, a suggestion.</p></li>
        <li className="uxm-tile"><h3><code>assistant</code></h3><p>A conversation.</p></li>
        <li className="uxm-tile"><h3><code>agent</code></h3><p>The AI acts for the user: changes data, sends, buys, or operates a UI.</p></li>
      </ul>
      <p>A screen declares its roles in the blueprint, with what the AI may do there:</p>
      <Command code text={'{ "id": "reminders", "title": "Invoice reminders", "pattern": "TaskList",\n  "ai": { "roles": ["agent"], "acts": true, "takeover": true,\n          "highImpactActions": [{ "label": "Pay", "approval": "each" }],\n          "renders": ["Wizard"], "dataLeavesDevice": false } }'} />
      <p>Before any code, the blueprint check warns on an agent that acts with no high-impact action declared, a high-impact action with no approval, a generative add-on with no non-AI fallback, data leaving the device with no consent screen, and an inline pattern that is not renderable or fails at the size class of the conversation's column. <code>get_rules</code> over MCP takes the roles too; a screen with no AI role gets no AI rule.</p>
      <H2 id="families">The rule families</H2>
      <ul className="uxm-grid">{AI_RULE_FAMILIES.map((f) => <li key={f.prefix} className="uxm-tile"><h3><code>{f.prefix}.*</code>: {f.title}</h3><p><b>{f.count} rules.</b> {f.about}</p></li>)}</ul>
      <p>Each rule cites at least one source and paraphrases it. Rules that cannot be seen in a UI (bias, datasets, model choice) are review checks: they reach the guidance and the assessment, not the audit.</p>
      <H2 id="markers">The markers the audit reads</H2>
      <p>The SDK's assistant and card components emit these attributes, so the audit sees the AI answer, the Stop control and the approval without any app markup. An app with its own AI UI adds them.</p>
      <DataTable caption="AI markers" rowKey="marker" columns={[{ key: "marker", label: "Marker", render: (r) => <Md>{r.marker}</Md> }, { key: "on", label: "On" }, { key: "audit", label: "What the audit looks for" }]} rows={AI_MARKERS} />
      <p>The audit's {AI_AUDIT_CHECKS.length} AI checks run on that markup only: <a href={href("start", "ci")}>Keep it on-theme in CI</a> lists them.</p>
      <H2 id="approvals">Approvals</H2>
      <p>Each high-impact action has an approval that can be denied. Approval is never inferred, never pre-selected and never focused to submit; once the user chooses, the choice is recorded in place of the buttons, and a newer request for the same action makes the older one stale.</p>
      <ApprovalDemo />
      <H2 id="conversation">A conversation, with its work shown</H2>
      <p>Reasoning, tool calls, cited sources, an approval and an artifact, in one reply. Send a message to watch it stream; the third send fails, so you can retry.</p>
      <ConversationDemo />
      <H2 id="hybrid">Hybrid chat: a Wizard inside a reply</H2>
      <p>An assistant can render one of the SDK's own patterns in its answer. The inline <code>Wizard</code> keeps its own rules, checked at the size class of the conversation's column, not the window. Its pre-filled values stay editable, nothing is sent until the user submits, regenerating never discards what they typed, and afterwards it stays readable in the history.</p>
      <HybridDemo />
      <H2 id="cards">Adaptive Cards</H2>
      <p>An agent written for Microsoft hosts sends an Adaptive Card instead. It is drawn with the same widgets, carries the same markers, and its marked Pay action asks for approval first. <a href={href("start", "microsoft-agents")}>Show cards from Microsoft agents</a> covers the rest.</p>
      <AdaptiveCardDemo />
      <H2 id="voice">Voice</H2>
      <p>The lint rule <code>ux-builder/ai-neutral-voice</code> warns on copy that presents the AI as a person ("I think", "I feel") and on labels where the AI, not the user's verb, leads.</p>
      <H2 id="assessment">Assessed three ways</H2>
      <p>The UX assessment walks every AI journey in a normal, an error-prone and a risky scenario, and in the risky one stops at the approval and denies it. <a href={href("start", "assess")}>Assess an app's UX</a> shows how.</p>
      <Affiliation />
      <Cite ids={["FEAT-011", "ADR-028", "ADR-029", "CONTRACT-005", "FEAT-007"]} />
    </>
  );
}

function FlowsJourneys() {
  return (
    <>
      <p className="uxm-lede">The blueprint started as a tree of destinations and screens. With actions that say where they lead, it becomes a graph, and journeys are a story's paths through it. The check reasons about how people move, and the same plain JSON draws the flow and the wireframes and drafts HELIX documents.</p>
      <H2 id="tree">From a tree</H2>
      <p>A destination points to one screen, and a screen holds its modals. Those are its only links, so the check could reason about a screen, but not about how a user moves through the app.</p>
      <pre className="uxm-pre" aria-label="The blueprint as a tree">{"app (kind, supports: sizeClasses, inputs)\n├─ destinations ──► screen      (e.g. \"Review\" → queue)\n└─ screens\n   ├─ queue    pattern, primaryAction, destructiveActions, states\n   │   └─ modals ─ reject-reason (dialog) ─ nested modals…\n   └─ settings pattern"}</pre>
      <H2 id="graph">To a graph</H2>
      <p>With <code>actions[].to</code> (a screen, <code>modal:&lt;id&gt;</code>, <code>back</code>, <code>state:&lt;state&gt;</code> or <code>external</code>), screens and modals are nodes and actions are edges. A <b>journey</b> is a named path through them for one HELIX story, with its acceptance criteria and alternates for errors, cancelling and empty states.</p>
      <pre className="uxm-pre" aria-label="The blueprint as a graph">{"queue ──open──► entry ──approve──► queue (empty)\n  │               └──reject──► modal:reject-reason ──back──► entry\n  └──help──► external"}</pre>
      <Command code text={JSON.stringify(SAMPLE_BLUEPRINT.journeys[0], null, 2)} />
      <H2 id="checks">The checks</H2>
      <ul>{FLOW_JOURNEY_RULES.map((r) => <li key={r.id}><code>{r.id}</code>: {r.statement}</li>)}</ul>
      <p>With a HELIX marker, the check also reads the flow's stories, and never writes them. On this page's sample blueprint, a review app with three destinations, the check reports, live:</p>
      <BlueprintCheckDemo />
      <H2 id="draw">Drawn from the blueprint</H2>
      <p><code>draw</code> writes an IA map, the flow and one diagram per journey, as Mermaid and as SVG, byte for byte the same for the same blueprint. <code>wireframes</code> renders each screen's pattern with placeholder content, in the neutral <code>plain</code> theme, at each supported size class, as HTML and PNG; the SDK's real components draw it, so a wireframe is the layout the app will get. These were made from the sample by those commands:</p>
      <Command text="npx ux-builder-blueprint draw app.blueprint.json" />
      <Command text="npx ux-builder-blueprint wireframes app.blueprint.json" />
      <FlowDiagram />
      <details className="uxm-details"><summary>The flow as Mermaid</summary><Command code text={FLOW_MERMAID.trim()} /></details>
      <Wireframes />
      <H2 id="propose">Proposed into HELIX, as patches</H2>
      <p>In a HELIX-governed repository, <code>propose</code> drafts HELIX content from the blueprint as patches in a proposals folder, and applies nothing:</p>
      <ul>
        <li>a story's walkthrough, from its journey;</li>
        <li>a Mermaid flowchart of the flow, for the solution design;</li>
        <li>a sequence diagram of the primary journey, for the architecture's data flow;</li>
        <li>the design system's navigation table, destinations by size class;</li>
        <li>test plan scenarios, from steps and alternates.</li>
      </ul>
      <Command text="npx ux-builder-blueprint propose app.blueprint.json --out helix-proposals" />
      <p>Drafts follow the installed HELIX's templates and leave a person's text alone. Where a HELIX document already says something different, the proposal is a reported disagreement, not a rewrite. Over MCP, <code>propose_from_blueprint</code> does the same without writing anything.</p>
      <H2 id="assessment">One journey, not three copies</H2>
      <p>The UX assessment's manifest can name a blueprint journey instead of restating it, so the story, the plan and the walk share one definition: <code>{"{ blueprint: J-review, role: reviewer, priority: critical }"}</code>. <a href={href("start", "assess")}>Assess an app's UX</a> shows the rest.</p>
      <Cite ids={["FEAT-012", "ADR-030", "CONTRACT-005", "FEAT-008"]} />
    </>
  );
}

/* ---- Reference ---- */

function Packages() {
  return (
    <>
      <p className="uxm-lede">{PACKAGES.length} packages on the public npm registry, installable with no token or registry configuration. Their entry points below are generated from each package's own <code>exports</code>.</p>
      <ul className="uxm-grid">
        {PACKAGES.map(({ pkg, icon, what }) => (
          <li key={pkg.name}><a className="uxm-tile uxm-tile--link" href={`https://www.npmjs.com/package/${pkg.name}`}><span className="uxm-tile__icon"><Icon icon={icon} /></span><h3><code>{pkg.name}</code></h3><p>{what}</p><span className="uxm-version">v{pkg.version}</span></a></li>
        ))}
      </ul>
      <H2 id="entry">Entry points</H2>
      <EntryPoints />
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
  // Pages added for FEAT-007 to FEAT-012 (SD-002, 2026-10-21).
  "start/assess": Assess, "start/microsoft-agents": MicrosoftAgents, "concepts/ai-agent-experience": AiAgentExperience, "concepts/flows-journeys": FlowsJourneys,
  "why/problem": Problem, "why/audience": Audience, "why/principles": Principles, "why/roadmap": Roadmap,
  "start/new-app": NewApp, "start/existing-app": ExistingApp, "start/theme-from-logo": ThemeFromLogo, "start/agents": Agents, "start/ci": Ci,
  "concepts/themes": Themes, "concepts/tokens": Tokens, "concepts/patterns": Patterns, "concepts/generative-ui": GenerativeUi,
  "reference/packages": Packages, "reference/components": Components, "reference/screen-patterns": ScreenPatterns, "reference/ai-components": AiComponents, "reference/cli": Cli, "reference/rules": Rules, "reference/adaptive-cards": AdaptiveCards,
  "proof/decisions": Decisions, "proof/features": Features, "proof/live": Live, "proof/releases": Releases, "proof/traceability": Traceability, "proof/sources": Sources,
};
