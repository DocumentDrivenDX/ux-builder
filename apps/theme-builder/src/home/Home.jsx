import { Button, Card, ChoicePicker, DataTable, Icon, Notice, ProgressBar, Select, StatusPill, Switch, TextField, ThemeProvider } from "@ux-builder/ui";
import { iconArrowRight, iconBell, iconBot, iconCheck, iconCopy, iconHistory, iconPackage, iconPalette, iconPencilRuler, iconPlug, iconScanEye, iconShieldCheck, iconSparkles, iconTerminal, iconWand2 } from "@ux-builder/ui/icons";
import catalogue from "@ux-builder/ui/catalogue.json";
import { useState } from "react";
import { ROOT } from "../site-root.js";
import { href } from "../microsite/nav.js";
import { Conversation } from "../../../../packages/ui/src/assistant/index.js";
import { useDemoConversation } from "../../../../packages/ui/src/assistant/story-data.js";
import { PAY_INVOICE } from "../../../../packages/ui/src/adaptive-cards/story-data.js";
import { AiFrame } from "../../../../packages/ui/ai/stories/frame.jsx";
import { CodeBlock, CodeBlockCopyButton } from "../../../../packages/ui/ai/vendor/ai-elements/code-block";
import { Message, MessageContent, MessageResponse } from "../../../../packages/ui/ai/vendor/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "../../../../packages/ui/ai/vendor/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../../../../packages/ui/ai/vendor/ai-elements/reasoning";
import { Suggestion, Suggestions } from "../../../../packages/ui/ai/vendor/ai-elements/suggestion";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "../../../../packages/ui/ai/vendor/ai-elements/tool";
import logoOnDark from "../../../../brand/ux-builder/logo-on-dark.svg?url";
import logoOnLight from "../../../../brand/ux-builder/logo-on-light.svg?url";
import tokensPkg from "../../../../packages/tokens/package.json";
import uiPkg from "../../../../packages/ui/package.json";
import createPkg from "../../../../packages/create-app/package.json";
import auditPkg from "../../../../packages/audit/package.json";
import mcpPkg from "../../../../packages/mcp/package.json";
import tracePkg from "../../../../packages/trace/package.json";
import designPkg from "../../../../packages/design/package.json";
import glossary from "../../../../packages/design/glossary.json";
import siteData from "virtual:microsite-data";

/* The GitHub Pages home page's sections (tools/build-pages.mjs), shown by the
   site's shell (microsite/Site.jsx). They wear the SDK's own
   ux-builder-databricks theme and are built only from the SDK: its widgets,
   its own assistant and Adaptive Cards renderer, the AI Components (AI
   Elements, through the theme's shadcn bridge) and its role tokens. Counts
   come from the catalogue. The intro video before the page is in home.html. */

const REPO = "https://github.com/DocumentDrivenDX/ux-builder";
const count = (kind) => catalogue[kind].filter((x) => x.type === "component").length;
const ICONS = catalogue.iconLibrary.count.toLocaleString("en");
// The audit's AI checks: those the AI, agent, generated-UI and card rules name.
const AI_CHECKS = new Set(catalogue.interaction.rules.filter((r) => /^(ai|agent|genui|card)\./.test(r.id)).flatMap((r) => r.checks.filter((c) => c.kind === "audit").map((c) => c.id))).size;

// The UX Builder brand on each shared design system, light and dark: the build's own resolved tokens.
const RESOLVED = import.meta.glob("../../../../packages/tokens/dist/resolved/ux-builder.*.json", { eager: true, import: "default" });
const SYSTEMS = [
  { value: "databricks", label: "Databricks", set: undefined },
  { value: "material", label: "Material 3", set: "material" },
  { value: "fluent", label: "Fluent 2", set: "fluent" },
  { value: "carbon", label: "Carbon", set: "carbon" },
];
function previewTokens(system, appearance) {
  const file = Object.entries(RESOLVED).find(([path]) => path.endsWith(`/ux-builder.${system}.${appearance}.json`))?.[1];
  // The artwork's url()s are relative to the package, and an embedded view's Logo draws nothing (CONTRACT-001), so the demo shows the artwork itself.
  const tokens = Object.fromEntries(Object.entries(file?.tokens ?? {}).filter(([k, v]) => k.startsWith("piq-") && !String(v).startsWith("url(")));
  return { tokens, logo: appearance === "dark" ? logoOnDark : logoOnLight };
}

export const PACKAGES = [
  { pkg: designPkg, icon: iconPencilRuler, what: "The guided design loop: an agent leads you from intent to a tested design, stopping for your decision at each checkpoint, with the brief, alternatives, prototypes, tests with people and production insights." },
  { pkg: tokensPkg, icon: iconPalette, what: "Every theme as CSS, every token's value as JSON, the fonts and brand artwork." },
  { pkg: uiPkg, icon: iconWand2, what: `React 19 widgets, screen patterns, the assistant and Adaptive Cards, ThemeProvider, ${ICONS} icons, the blueprint, lint rules and agent guidance.` },
  { pkg: createPkg, icon: iconSparkles, what: "A new React + Vite app on the SDK and on HELIX from its first commit, with lint, the audit, a browser test and CI." },
  { pkg: auditPkg, icon: iconScanEye, what: "Drives the running app through every theme in light and dark and reports anything off-theme; assesses a HELIX app's journeys." },
  { pkg: mcpPkg, icon: iconPlug, what: "The SDK over MCP: themes, widgets, tokens, icons and rules, and checks of blueprints and cards, for any coding agent." },
  { pkg: tracePkg, icon: iconHistory, what: "The episode trace each build of an app leaves in its repository, and the export its owner shares only by choice." },
];

export function Copy({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* no clipboard */ } };
  return <Button variant="text" size="sm" onClick={copy} aria-label={`${label}: ${text}`}><Icon icon={copied ? iconCheck : iconCopy} />{copied ? "Copied" : label}</Button>;
}

/* A line to copy: a shell command gets a prompt; code does not, and wraps rather than scrolls. */
export function Command({ text, code = false }) {
  return <div className={`uxh-cmd${code ? " uxh-cmd--code" : ""}`}><code>{!code && <span aria-hidden="true">$ </span>}{text}</code><Copy text={text} /></div>;
}

export function Hero() {
  return (
    <section className="uxh-hero" aria-labelledby="hero-h">
      <div className="uxh-wrap uxh-hero__grid">
        <div className="uxh-col">
          <span className="uxh-eyebrow"><Icon icon={iconSparkles} />Guided UX design and a UI SDK for AI-era apps</span>
          <h1 id="hero-h">From an idea to an app people <em>can actually use</em>.</h1>
          <p className="uxh-lede">Your AI coding agent guides you through the design, step by step, and shows you every piece for your approval. Then it builds the app on your brand, and checks it at every step: the plan before any code, the running app after, and real people last.</p>
          <Command text="npm create @ux-builder/app@latest my-idea" />
          <div className="uxh-row">
            <a className="uxh-btn uxh-btn--primary" href={href("start", "design")}>See how the design works<Icon name="arrow-right" /></a>
            <a className="uxh-btn" href={href("start", "theme-from-logo")}>Make a theme from your logo</a>
          </div>
          <ul className="uxh-stats" aria-label="In the box">
            <li><b>{siteData.guide.steps.length}</b><span>guided design steps</span></li>
            <li><b>{glossary.terms.length}</b><span>terms explained</span></li>
            <li><b>{count("widgets")}</b><span>widgets</span></li>
            <li><b>{count("patterns")}</b><span>screen patterns</span></li>
          </ul>
        </div>
        <HeroDesign />
      </div>
    </section>
  );
}

/* One moment of the guided design, made of the SDK's widgets: the agent
   shows a target user for the person's review, explains the term, and
   waits for their approval (FEAT-018 GDL-79). */
export function HeroDesign() {
  const [approved, setApproved] = useState(false);
  return (
    <div className="uxh-heroapp"><Card title="Step 2 of 8: Understand users" actions={<StatusPill state={approved ? "live" : "evaluation"}>{approved ? "Approved" : "Awaiting your review"}</StatusPill>}>
      <div className="uxh-col">
        <p>Here is the first target user I drafted from what you told me. Is this who the app is for?</p>
        <dl className="uxh-item">
          <dt>U-1</dt><dd><b>Weekend anglers</b>: on a phone at the river, often with one free hand; want a spot within an hour's drive.</dd>
          <dt>Status</dt><dd>Hypothesis, until research confirms it</dd>
        </dl>
        <Notice tone="info" title="Target user">A group of people the app is for, described by their context and goals, not their demographics. Naming them keeps every screen answerable to someone real.</Notice>
        <div className="uxh-row"><Button onClick={() => setApproved(true)} disabled={approved}>{approved ? "Approved" : "Approve"}</Button><Button variant="secondary" disabled={approved}>Give feedback</Button></div>
      </div>
    </Card></div>
  );
}

/* A small app made of the SDK's widgets, wearing the page's theme. */
export function HeroApp() {
  const [previews, setPreviews] = useState(true);
  return (
    <div className="uxh-heroapp"><Card title="Deploy settings" actions={<StatusPill state="live" />}>
      <div className="uxh-col">
        <TextField label="Project name" defaultValue="acme-assistant" />
        <Select label="Region" defaultValue="eu" options={[{ value: "us", label: "US East" }, { value: "eu", label: "EU West" }, { value: "ap", label: "Asia Pacific" }]} />
        <Switch label="Preview every pull request" checked={previews} onChange={(e) => setPreviews(e.target.checked)} />
        <ProgressBar label="Build" value={72} showValue />
        <div className="uxh-row"><Button>Deploy</Button><Button variant="secondary">Roll back</Button></div>
      </div>
    </Card></div>
  );
}

const ROWS = [
  { id: 1, name: "checkout-assistant", owner: "Payments", calls: 18240, state: "live" },
  { id: 2, name: "support-copilot", owner: "Support", calls: 9615, state: "limited" },
  { id: 3, name: "contract-review", owner: "Legal ops", calls: 4120, state: "evaluation" },
  { id: 4, name: "sales-briefs", owner: "Revenue", calls: 2210, state: "purchasing" },
];
const COLUMNS = [
  { key: "name", label: "Assistant", sortable: true },
  { key: "owner", label: "Team", sortable: true },
  { key: "calls", label: "Calls this week", numeric: true, sortable: true, render: (r) => r.calls.toLocaleString("en") },
  { key: "state", label: "Status", render: (r) => <StatusPill state={r.state} /> },
];

/* The same screen in the UX Builder brand on each shared design system. */
export function LiveDemo() {
  const [system, setSystem] = useState("databricks");
  const [ap, setAp] = useState("light");
  const { tokens, logo } = previewTokens(system, ap);
  const set = SYSTEMS.find((s) => s.value === system)?.set;
  return (
    <section className="uxh-section" aria-labelledby="demo-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon icon={iconPalette} />The theme, live, not a screenshot</span>
          <h2 id="demo-h">Your brand, in any design system.</h2>
          <p className="uxh-lede">A theme is a brand on a design system. Switch the system and the same widgets take its type, shape, density and icons, while the brand's colours and logo stay. App code doesn't change at all.</p>
        </div>
        <div className="uxh-row uxh-controls">
          <ChoicePicker label="Design system" options={SYSTEMS.map(({ value, label }) => ({ value, label }))} value={system} onChange={setSystem} />
          <ChoicePicker label="Appearance" options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} value={ap} onChange={setAp} />
        </div>
        <ThemeProvider tokens={tokens} appearance={ap} favicon={false} className="uxh-stage" data-preview={`ux-builder.${system}.${ap}`}>
          <div className="uxh-stage__bar">
            <img className="uxh-stage__logo" src={logo} alt={`UX Builder on ${SYSTEMS.find((s) => s.value === system)?.label}`} />
            <span className="uxh-row uxh-stage__icons"><Icon name="search" set={set} label="Search" /><Icon icon={iconBell} set={set} label="Notifications" /><Icon name="settings" set={set} label="Settings" /></span>
          </div>
          <Notice tone="info" title="3 assistants need review">Their evaluations finished overnight. Review them before Friday's release.</Notice>
          <DataTable caption="Assistants" columns={COLUMNS} rows={ROWS} pageSize={4} initialSort={{ key: "calls", dir: "descending" }} />
          <div className="uxh-row"><Button>Review now</Button><Button variant="secondary">Export</Button><Button variant="text">Dismiss</Button></div>
        </ThemeProvider>
      </div>
    </section>
  );
}

const SETTINGS_CODE = `import { SettingsPage } from "@ux-builder/ui/patterns";
import { Switch, TextField } from "@ux-builder/ui";

export function Settings() {
  return (
    <SettingsPage sections={[
      { id: "profile", label: "Profile",
        content: <TextField label="Display name" /> },
      { id: "alerts", label: "Notifications",
        content: <Switch label="Email me about deploys" /> },
    ]} />
  );
}`;

/* A reply that asks to pay an invoice with an Adaptive Card, as an agent built for Microsoft hosts sends one. */
const HOME_CHAT = [
  { id: "u1", role: "user", text: "Pay Acme's October invoice" },
  { id: "a1", role: "assistant", parts: [
    { type: "text", text: "Here is the invoice. Check the amount: paying asks for your approval first." },
    { type: "adaptive-card", id: "invoice", card: PAY_INVOICE },
  ] },
];
const SHOWS = [{ value: "sdk", label: "The SDK's assistant" }, { value: "bridge", label: "AI Elements, bridged" }];

/* AI both ways: the SDK's own assistant with an Adaptive Card in a reply,
   or a coding agent at work drawn with AI Elements, in the page's theme. */
export function AiSection() {
  const [show, setShow] = useState("sdk");
  return (
    <section className="uxh-section uxh-section--ai" aria-labelledby="ai-h">
      <div className="uxh-wrap uxh-ai">
        <div className="uxh-col uxh-gap">
          <span className="uxh-eyebrow"><Icon icon={iconBot} />Built for AI, both ways</span>
          <h2 id="ai-h">Your agent knows the SDK. Your users see your brand.</h2>
          <p className="uxh-lede">Coding agents read the SDK's generated <code>AGENTS.md</code>, Claude Code skills and an MCP server that describes the exact version you installed, so what they write follows the rules. The assistant you ship is the SDK's own, with approvals, and Adaptive Cards from Microsoft agents drawn in your theme; or AI Elements and assistant-ui, dressed by one stylesheet.</p>
          <ul className="uxh-checks">
            <li><Icon icon={iconCheck} />A conversation that streams, stops, retries and never acts without approval</li>
            <li><Icon icon={iconCheck} />Adaptive Cards drawn with SDK widgets, checked before they are sent</li>
            <li><Icon icon={iconCheck} />AI Elements and assistant-ui, contrast-checked in every theme</li>
            <li><Icon icon={iconCheck} />{AI_CHECKS} audit checks for AI screens, and lint that flags hard-coded values</li>
          </ul>
          <Command text="claude mcp add ux-builder -- npx @ux-builder/mcp" />
          <div className="uxh-row">
            <a className="uxh-btn" href={href("concepts", "ai-agent-experience")}>AI and agent experience<Icon icon={iconArrowRight} /></a>
            <a className="uxh-btn" href={href("start", "microsoft-agents")}>Cards from Microsoft agents</a>
          </div>
        </div>
        <div className="uxh-col uxh-gap">
          <ChoicePicker label="Show" options={SHOWS} value={show} onChange={setShow} />
          {show === "sdk" ? <SdkChat /> : <BridgeChat />}
        </div>
      </div>
    </section>
  );
}

/* @ux-builder/ui/assistant's Conversation, on a stand-in runtime that streams canned replies; the card's Pay action asks for approval. */
function SdkChat() {
  const chat = useDemoConversation(HOME_CHAT);
  return <div className="uxh-assistant" data-demo="home-assistant"><Conversation {...chat} suggestions={["When is the hearing?"]} /></div>;
}

/* A coding agent at work, drawn with AI Elements through the theme's shadcn bridge. */
function BridgeChat() {
  return (
    <AiFrame width="100%">
      <div className="uxh-chat">
        {/* A fixed exchange, laid out in full: Conversation would scroll it to its last message. */}
        <div className="uxh-chat__log">
            <Message from="user"><MessageContent>Add a settings page to the app, in our brand.</MessageContent></Message>
            <Message from="assistant">
              <MessageContent>
                <Reasoning duration={3} defaultOpen={false}>
                  <ReasoningTrigger />
                  <ReasoningContent>{"The app is on ux-builder-databricks. The SDK has a SettingsPage pattern, so I should use it with SDK fields rather than writing CSS."}</ReasoningContent>
                </Reasoning>
                <Tool defaultOpen={false}>
                  <ToolHeader type="tool-ux-builder.get_widget" state="output-available" />
                  <ToolContent>
                    <ToolInput input={{ name: "SettingsPage" }} />
                    <ToolOutput output={<p className="p-2 text-sm">sections, current, onChange · import from @ux-builder/ui/patterns</p>} errorText={undefined} />
                  </ToolContent>
                </Tool>
                <MessageResponse>{"Here it is. It uses only SDK widgets, so it follows the theme in light and dark and passes `ux-builder/no-hard-coded-values`:"}</MessageResponse>
                <CodeBlock code={SETTINGS_CODE} language="jsx"><CodeBlockCopyButton /></CodeBlock>
              </MessageContent>
            </Message>
        </div>
        <Suggestions>{["Add an API keys section", "Make dark mode the default", "Run the audit"].map((s) => <Suggestion key={s} suggestion={s} onClick={() => {}} />)}</Suggestions>
        <PromptInput onSubmit={() => {}}>
          <PromptInputBody><PromptInputTextarea placeholder="Ask your agent to build something" aria-label="Message the agent" /></PromptInputBody>
          <PromptInputFooter><PromptInputTools /><PromptInputSubmit status="ready" /></PromptInputFooter>
        </PromptInput>
      </div>
    </AiFrame>
  );
}

export const GUARDS = [
  { icon: iconShieldCheck, title: "Lint that knows your theme", text: "ESLint and Stylelint rules catch literal colours, fonts and radii, and suggest the role token to use instead.", code: `"ux-builder/no-hard-coded-values": ["error", { theme: "ux-builder-databricks" }]` },
  { icon: iconScanEye, title: "An audit of the running app", text: "Switches your app through every theme, light and dark, and reports anything that isn't the theme's: colours, fonts, icons, favicon, contrast.", code: "npx ux-builder-audit http://localhost:5173/" },
  { icon: iconTerminal, title: "A starter that begins on-theme", text: "A React + Vite app with ThemeProvider, an appearance switch, lint, the audit and CI, wired up from the first commit.", code: "npm create @ux-builder/app my-app -- --theme plain" },
  { icon: iconBot, title: "AI checks on AI screens", text: `${AI_CHECKS} audit checks read the markers the SDK's assistant emits: a disclosure, Stop while busy, approvals that can be denied, plans with step status, recovery. The blueprint check holds each AI role to its rules first.`, code: "npx ux-builder-audit --blueprint app.blueprint.json http://localhost:5173/" },
];

export function Guardrails() {
  return (
    <section className="uxh-section" aria-labelledby="guard-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon icon={iconShieldCheck} />Guardrails</span>
          <h2 id="guard-h">Drift gets caught before it ships.</h2>
        </div>
        <ul className="uxh-cards">
          {GUARDS.map((g) => (
            <li key={g.title} className="uxh-card">
              <span className="uxh-card__icon"><Icon icon={g.icon} /></span>
              <h3>{g.title}</h3>
              <p>{g.text}</p>
              <code className="uxh-card__code">{g.code}</code>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* How an app is made on the SDK, each step linked to where it is explained. */
const JOURNEY = [
  { step: "Design", what: "Eight guided steps from intent and users to alternatives, structure and a prototype, every item shown to you for approval.", to: href("start", "design"), link: "The guided design" },
  { step: "Build", what: "The app is built in the same folder from the design you approved, on your brand, from the SDK's screen patterns.", to: `${href("start", "new-app")}#design-first`, link: "Design first, the app last" },
  { step: "Check", what: "The plan is held to cited interaction and AI rules before any code; lint and the audit check what was built, in every theme.", to: href("start", "ci"), link: "Lint, the blueprint check and the audit" },
  { step: "Learn", what: "Test with real people from a generated kit, walk the journeys against the stories, and learn from how the app is used.", to: href("start", "assess"), link: "Assess and test" },
];
export function Journey() {
  return (
    <section className="uxh-section" aria-labelledby="journey-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon icon={iconSparkles} />How it works</span>
          <h2 id="journey-h">Design, build, check, learn.</h2>
        </div>
        <ol className="uxh-loop" aria-label="Design, build, check, learn">
          {JOURNEY.map((l, i) => (
            <li key={l.step}>
              <a className="uxh-card uxh-card--link" href={l.to}>
                <span className="uxh-loop__n" aria-hidden="true">{i + 1}</span>
                <h3>{l.step}</h3>
                <p>{l.what}</p>
                <span className="uxh-loop__go">{l.link}<Icon icon={iconArrowRight} /></span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* What sets the guided design apart, beside its eight steps (from @ux-builder/design). */
export function DesignedWithYou() {
  return (
    <section className="uxh-section" aria-labelledby="design-h">
      <div className="uxh-wrap uxh-ai">
        <div className="uxh-col uxh-gap">
          <span className="uxh-eyebrow"><Icon icon={iconPencilRuler} />The guided design</span>
          <h2 id="design-h">Designed with you, not for you.</h2>
          <p className="uxh-lede">The agent leads; you decide. It opens with an overview, tells you where you are, explains each term, and never moves on without your answer.</p>
          <ul className="uxh-checks">
            <li><Icon icon={iconCheck} />Every brief, user, job, story and screen is shown to you in the conversation, one at a time, for feedback and approval</li>
            <li><Icon icon={iconCheck} />What people need stays a labelled hypothesis until research or a test confirms it</li>
            <li><Icon icon={iconCheck} />Every added screen, step or input must earn its complexity; the simplest flow wins</li>
            <li><Icon icon={iconCheck} />Alternatives compared side by side, a clickable prototype, and a test kit for real people</li>
            <li><Icon icon={iconCheck} />Runs locally with your agent; nothing is hosted and nothing is sent anywhere</li>
          </ul>
          <div className="uxh-row"><a className="uxh-btn uxh-btn--primary" href={href("concepts", "guided-design")}>The guided design process<Icon name="arrow-right" /></a></div>
        </div>
        <ol className="uxh-steplist" aria-label="The eight steps">
          {siteData.guide.steps.map((st) => <li key={st.n}><span className="uxh-loop__n" aria-hidden="true">{st.n}</span><div><h3>{st.name}</h3><p>{st.you}</p></div></li>)}
        </ol>
      </div>
    </section>
  );
}

export function Packages() {
  return (
    <section className="uxh-section" aria-labelledby="pkg-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon icon={iconPackage} />On npm, no token needed</span>
          <h2 id="pkg-h">{PACKAGES.length} packages. Take what you need.</h2>
        </div>
        <ul className="uxh-cards uxh-cards--six">
          {PACKAGES.map(({ pkg, icon, what }) => (
            <li key={pkg.name}>
              <a className="uxh-card uxh-card--link" href={`https://www.npmjs.com/package/${pkg.name}`}>
                <span className="uxh-card__icon"><Icon icon={icon} /></span>
                <h3><code>{pkg.name}</code></h3>
                <p>{what}</p>
                <span className="uxh-version">v{pkg.version}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function GetStarted() {
  return (
    <section className="uxh-section uxh-section--start" aria-labelledby="start-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon icon={iconTerminal} />Get started</span>
          <h2 id="start-h">Start with an idea, or with the app you have.</h2>
        </div>
        <div className="uxh-paths2">
          <div className="uxh-col uxh-gap">
            <h3>Design first</h3>
            <ol className="uxh-steps">
              <li><b>Make a design folder</b><Command text="npm create @ux-builder/app@latest my-idea" /></li>
              <li><b>Install it</b><Command text="cd my-idea && npm install" /></li>
              <li><b>In Claude Code, start the guide</b><Command code text="/ux-builder-design" /></li>
            </ol>
            <a className="uxh-btn uxh-btn--primary" href={href("start", "design")}>Design the UX with your agent<Icon name="arrow-right" /></a>
          </div>
          <div className="uxh-col uxh-gap">
            <h3>An app you already have</h3>
            <ol className="uxh-steps">
              <li><b>Install</b><Command text="npm install @ux-builder/tokens @ux-builder/ui" /></li>
              <li><b>Load the theme</b><Command code text={'import "@ux-builder/tokens/themes/ux-builder-databricks.css";\nimport "@ux-builder/ui/ui.css";'} /></li>
              <li><b>Wrap the app</b><Command code text={'<ThemeProvider theme="ux-builder-databricks" appearance="system">\n  <App />\n</ThemeProvider>'} /></li>
            </ol>
            <a className="uxh-btn" href={href("start", "existing-app")}>Add it to an existing app<Icon name="arrow-right" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
